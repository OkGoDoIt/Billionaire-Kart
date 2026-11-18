using System.Net;
using System.Text.Json;

namespace BillionaireKart.Tests;

/// <summary>Shared results: the upload is checked against the player cookie and limits, and the link answers previewers
/// with the card and people with the way into the game, even when the previewer arrives before the upload.</summary>
[Collection("app")]
public sealed class ShareTests(TestApp app)
{
    const string Safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1";
    const string ApplePreview = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0";
    static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6, 7, 8, 0xFF, 0xD9];

    async Task<string> PlayerCookie()
    {
        var res = await app.Http().PostAsync("/api/session", null);
        res.EnsureSuccessStatusCode();
        return res.Headers.GetValues("Set-Cookie").First(c => c.StartsWith("bk_player=")).Split(';')[0];
    }

    static MultipartFormDataContent Form(string id, byte[]? image = null, string track = "silicon-valley")
    {
        var f = new MultipartFormDataContent
        {
            { new StringContent(id), "id" }, { new StringContent("race"), "mode" }, { new StringContent("jensen"), "racer" },
            { new StringContent(track), "track" }, { new StringContent("200"), "cc" }, { new StringContent("7"), "rank" },
            { new StringContent("8"), "fieldSize" }, { new StringContent("117650"), "timeMs" },
            { new StringContent("Beat my 1:57.650 on Silicon Valley Circuit"), "title" },
            { new StringContent("Jensen finishes 7th. Will ship a fix next week. <b>"), "description" },
        };
        var file = new ByteArrayContent(image ?? Jpeg);
        file.Headers.ContentType = new("image/jpeg");
        f.Add(file, "image", "card.jpg");
        return f;
    }

    static async Task<HttpResponseMessage> Post(HttpClient http, string? cookie, HttpContent body)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/shares") { Content = body };
        if (cookie != null) req.Headers.Add("Cookie", cookie);
        return await http.SendAsync(req);
    }

    static async Task<HttpResponseMessage> Get(HttpClient http, string path, string agent)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, path);
        req.Headers.TryAddWithoutValidation("User-Agent", agent);
        return await http.SendAsync(req);
    }

    [Fact]
    public async Task A_shared_result_is_a_link_whose_preview_is_the_card()
    {
        await app.UseSettings();
        var http = app.Http();
        var id = "Share" + Guid.NewGuid().ToString("N")[..7];

        // No player cookie, no upload.
        Assert.Equal(HttpStatusCode.Forbidden, (await Post(http, null, Form(id))).StatusCode);
        var cookie = await PlayerCookie();

        // The game shares the link the moment the player taps and uploads beside it: a previewer that asks first is held until the card lands.
        var early = Get(http, $"/s/{id}", ApplePreview);
        await Task.Delay(600);
        Assert.Equal(HttpStatusCode.Created, (await Post(http, cookie, Form(id))).StatusCode);
        var preview = await early;
        Assert.Equal(HttpStatusCode.OK, preview.StatusCode);
        var html = await preview.Content.ReadAsStringAsync();
        Assert.Contains($"<meta property=\"og:image\" content=\"http://localhost/s/{id}.jpg\">", html);
        Assert.Contains("<meta property=\"og:title\" content=\"Beat my 1:57.650 on Silicon Valley Circuit\">", html);
        Assert.Contains("Will ship a fix next week. &lt;b&gt;", html);
        Assert.DoesNotContain("location.replace", html);   // a previewer that runs scripts must still read this page

        // A person is sent on into the game with the challenge.
        var person = await (await Get(http, $"/s/{id}", Safari)).Content.ReadAsStringAsync();
        Assert.Contains($"location.replace(\"/?c={id}\")", person);

        var picture = await Get(http, $"/s/{id}.jpg", Safari);
        Assert.Equal("image/jpeg", picture.Content.Headers.ContentType!.MediaType);
        Assert.Equal(Jpeg, await picture.Content.ReadAsByteArrayAsync());

        var challenge = JsonDocument.Parse(await http.GetStringAsync($"/api/shares/{id}")).RootElement;
        Assert.Equal("race", challenge.GetProperty("mode").GetString());
        Assert.Equal("silicon-valley", challenge.GetProperty("track").GetString());
        Assert.Equal(117650, challenge.GetProperty("timeMs").GetInt32());
        Assert.Equal(200, challenge.GetProperty("cc").GetInt32());

        // The same id again, a picture that is not a JPEG, a free-text track, and a malformed link.
        Assert.Equal(HttpStatusCode.Conflict, (await Post(http, cookie, Form(id))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(http, cookie, Form(id + "x", [0x89, 0x50, 0x4E, 0x47, 1, 2]))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(http, cookie, Form(id + "y", track: "<script>"))).StatusCode);
        var nowhere = await Get(http, "/s/not-an-id!", Safari);
        Assert.Equal(HttpStatusCode.Redirect, nowhere.StatusCode);
        Assert.Equal("/", nowhere.Headers.Location!.ToString());

        // The hourly limit is a setting.
        await app.UseSettings(new() { ["SharesPerHour"] = "1" });
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Post(http, cookie, Form(id + "z"))).StatusCode);
        await app.UseSettings();
    }
}
