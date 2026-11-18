using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BillionaireKart.Server.Data;
using BillionaireKart.Server.Rooms;
using BillionaireKart.Server.Web;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BillionaireKart.Tests;

[Collection("app")]
public sealed class HandoffTests(TestApp app)
{
    const string IPhoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
    const string IPhoneHomeScreen = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
    const string IPadSafari = "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
    const string AndroidChrome = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36";
    const string AndroidWebView = "Mozilla/5.0 (Linux; Android 14; SM-S921B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.0.0 Mobile Safari/537.36";

    async Task<HttpResponseMessage> Send(HttpMethod method, string path, string userAgent, object? body = null, string origin = TestApp.Origin, string? cookie = null)
    {
        var req = new HttpRequestMessage(method, path);
        req.Headers.TryAddWithoutValidation("User-Agent", userAgent);
        req.Headers.Add("Origin", origin);
        if (cookie != null) req.Headers.Add("Cookie", cookie);
        if (body != null) req.Content = JsonContent.Create(body);
        return await app.Http().SendAsync(req);
    }

    Task<HttpResponseMessage> Offer(string code, string ua = IPhoneSafari) => Send(HttpMethod.Post, "/api/handoff", ua, new { code });
    Task<HttpResponseMessage> Claim(string ua = IPhoneHomeScreen) => Send(HttpMethod.Post, "/api/handoff/claim", ua);

    [Fact]
    public async Task Room_link_hands_off_once_to_the_same_device()
    {
        await app.UseSettings();
        var rooms = app.Factory.Services.GetRequiredService<RoomManager>();
        var host = await app.NewGamer();
        await using var _h = host;
        await host.Send(new { t = "create" });
        var code = (await host.Room(r => r.Str("phase") == "lobby")).Str("code")!;

        // Safari leaves the code; the Home Screen game on the same iPhone takes it exactly once.
        Assert.Equal(HttpStatusCode.NoContent, (await Offer(code.ToLowerInvariant())).StatusCode);
        var claimed = await Claim();
        Assert.Equal(HttpStatusCode.OK, claimed.StatusCode);
        Assert.Equal(code, JsonDocument.Parse(await claimed.Content.ReadAsStringAsync()).RootElement.Str("code"));
        Assert.Equal(HttpStatusCode.NoContent, (await Claim()).StatusCode);

        // Another device on the same network, or another site, cannot take it or use it up.
        await Offer(code);
        Assert.Equal(HttpStatusCode.NoContent, (await Claim(IPadSafari)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Claim(AndroidChrome)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(HttpMethod.Post, "/api/handoff/claim", IPhoneHomeScreen, origin: "https://evil.example")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Claim()).StatusCode);

        // Playing in Safari instead forgets it.
        await Offer(code);
        Assert.Equal(HttpStatusCode.NoContent, (await Send(HttpMethod.Delete, "/api/handoff", IPhoneSafari)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Claim()).StatusCode);

        // A room that is not open, or something that is not a room code.
        var missing = Enumerable.Range(0, 100).Select(_ => string.Concat(Enumerable.Range(0, 4).Select(_ => Wire.RoomCodeLetters[Random.Shared.Next(Wire.RoomCodeLetters.Length)])))
            .First(c => !rooms.Rooms.ContainsKey(c));
        Assert.Equal(HttpStatusCode.NotFound, (await Offer(missing)).StatusCode);
        foreach (var bad in new[] { "BCD", "BCDFG", "AEIO", "12 4", "" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Offer(bad)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Send(HttpMethod.Post, "/api/handoff", IPhoneSafari, new { })).StatusCode);

        // It expires.
        await app.UseSettings(new() { ["HandoffMinutes"] = "0" });
        await Offer(code);
        Assert.Equal(HttpStatusCode.NoContent, (await Claim()).StatusCode);
        await app.UseSettings();

        // A room that closed after the link was opened hands off nothing.
        await Offer(code);
        await host.DisposeAsync();
        for (int i = 0; i < 50 && rooms.Rooms.ContainsKey(code); i++) await Task.Delay(100);
        Assert.False(rooms.Rooms.ContainsKey(code));
        Assert.Equal(HttpStatusCode.NoContent, (await Claim()).StatusCode);
    }

    async Task<bool> AppSeen(string ua, string? cookie = null)
    {
        var res = await Send(HttpMethod.Get, "/api/app", ua, cookie: cookie);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement.GetProperty("app").GetBoolean();
    }

    async Task<DateTimeOffset?> AppSeenAt(Guid id)
    {
        using var scope = app.Factory.Services.CreateScope();
        return (await scope.ServiceProvider.GetRequiredService<KartDb>().Players.AsNoTracking().SingleAsync(p => p.Id == id)).AppSeenAt;
    }

    [Fact]
    public async Task Browser_learns_the_installed_game_was_opened_by_this_player_or_on_this_device()
    {
        await app.UseSettings();
        // OS versions no other test uses, so these device keys start unseen.
        string phoneSafari = IPhoneSafari.Replace("18_6", "17_4"), phoneApp = IPhoneHomeScreen.Replace("18_6", "17_4");
        string tabletSafari = IPadSafari.Replace("18_6", "17_4"), tabletApp = tabletSafari.Replace(" Version/18.6", "").Replace(" Safari/604.1", "");
        string otherPhone = AndroidChrome.Replace("Android 10", "Android 9");

        var session = await app.Http().PostAsync("/api/session", null);
        var cookie = session.Headers.GetValues("Set-Cookie").First(c => c.StartsWith("bk_player=")).Split(';')[0];
        var id = Guid.Parse(JsonDocument.Parse(await session.Content.ReadAsStringAsync()).RootElement.Str("id")!);

        Assert.False(await AppSeen(phoneSafari, cookie));
        Assert.False(await AppSeen(phoneSafari));
        Assert.Null(await AppSeenAt(id));

        // The installed game opens with the player's cookie (copied in at install) on another network or device key:
        // the cookie alone is enough for the browser.
        Assert.Equal(HttpStatusCode.NoContent, (await Send(HttpMethod.Post, "/api/app", otherPhone, cookie: cookie)).StatusCode);
        Assert.True(await AppSeen(phoneSafari, cookie));
        Assert.False(await AppSeen(phoneSafari));
        // A second launch soon after does not write the row again.
        var first = await AppSeenAt(id);
        Assert.NotNull(first);
        await Send(HttpMethod.Post, "/api/app", otherPhone, cookie: cookie);
        Assert.Equal(first, await AppSeenAt(id));

        // Without a cookie, the device key counts: the iPad's browser hears yes, the iPhone's does not.
        Assert.Equal(HttpStatusCode.NoContent, (await Send(HttpMethod.Post, "/api/app", tabletApp)).StatusCode);
        Assert.True(await AppSeen(tabletSafari));
        Assert.False(await AppSeen(phoneSafari));
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(HttpMethod.Get, "/api/app", tabletSafari, origin: "https://evil.example")).StatusCode);

        // A zero-day memory forgets both.
        await app.UseSettings(new() { ["AppSeenDays"] = "0" });
        Assert.False(await AppSeen(phoneSafari, cookie));
        Assert.False(await AppSeen(tabletSafari));
        await app.UseSettings();
        Assert.True(await AppSeen(phoneApp, cookie));
    }

    [Fact]
    public void Device_key_is_the_hardware_and_os_not_the_browser()
    {
        var home = IPAddress.Parse("203.0.113.7");
        Assert.Equal("203.0.113.7 iPhone 18_6", RoomHandoff.Key(home, IPhoneSafari));
        Assert.Equal(RoomHandoff.Key(home, IPhoneSafari), RoomHandoff.Key(home, IPhoneHomeScreen));
        Assert.NotEqual(RoomHandoff.Key(home, IPhoneSafari), RoomHandoff.Key(home, IPadSafari));
        Assert.NotEqual(RoomHandoff.Key(home, IPhoneSafari), RoomHandoff.Key(IPAddress.Parse("198.51.100.2"), IPhoneSafari));
        Assert.NotEqual(RoomHandoff.Key(home, IPhoneSafari), RoomHandoff.Key(home, IPhoneSafari.Replace("18_6", "18_5")));

        // IPv6 counts by its /64, so a rotated privacy address still matches.
        Assert.Equal(RoomHandoff.Key(IPAddress.Parse("2001:db8:1:2::aaaa"), IPhoneSafari), RoomHandoff.Key(IPAddress.Parse("2001:db8:1:2:1234::1"), IPhoneHomeScreen));
        Assert.Equal(RoomHandoff.Key(home, IPhoneSafari), RoomHandoff.Key(IPAddress.Parse("::ffff:203.0.113.7"), IPhoneSafari));

        Assert.Equal("iPad 18_6", RoomHandoff.DeviceOf(IPadSafari));
        Assert.Equal("Android 10 K", RoomHandoff.DeviceOf(AndroidChrome));
        Assert.Equal("Android 14 SM-S921B", RoomHandoff.DeviceOf(AndroidWebView));
        Assert.Equal("Mac 10_15_7", RoomHandoff.DeviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15"));
        var desktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
        Assert.StartsWith("ua ", RoomHandoff.DeviceOf(desktop));
        Assert.Equal(RoomHandoff.DeviceOf(desktop), RoomHandoff.DeviceOf(desktop));
        Assert.Equal("none", RoomHandoff.DeviceOf(null));
    }
}
