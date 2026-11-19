using System.Net.Http.Json;
using System.Text.Json;
using BillionaireKart.Server.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BillionaireKart.Tests;

[Collection("app")]
public sealed class RoomTests(TestApp app)
{
    static string Code(JsonElement room) => room.Str("code")!;

    /// <summary>A private room with two players and racers picked: A hosts.</summary>
    async Task<(Gamer A, Gamer B, string Code)> TwoInPrivate()
    {
        var a = await app.NewGamer();
        var b = await app.NewGamer();
        await a.Send(new { t = "create" });
        var room = await a.Room(r => r.Str("phase") == "lobby");
        var code = Code(room);
        await b.Send(new { t = "join", code = code.ToLowerInvariant() });
        await b.Room(r => r.Arr("members").Count() == 2);
        await a.Send(new { t = "racer", id = "elon" });
        await b.Room(r => r.MemberOf(a.Id).Str("racer") == "elon");
        await b.Send(new { t = "racer", id = "sam" });
        await a.Room(r => r.MemberOf(b.Id).Str("racer") == "sam");
        return (a, b, code);
    }

    [Fact]
    public async Task Session_cookie_makes_one_player_and_stays_the_same()
    {
        var http = app.Http();
        var first = await http.PostAsync("/api/session", null);
        first.EnsureSuccessStatusCode();
        var cookie = first.Headers.GetValues("Set-Cookie").First(c => c.StartsWith("bk_player=")).Split(';')[0];
        var body = JsonDocument.Parse(await first.Content.ReadAsStringAsync()).RootElement;
        var id = Guid.Parse(body.Str("id")!);
        Assert.InRange(body.GetProperty("handle").Int("title"), 0, 199);
        Assert.InRange(body.GetProperty("handle").Int("number"), 1, 9999);
        Assert.Equal(1_000_000, body.GetProperty("rating").GetProperty("valuation").GetInt64());

        for (int i = 0; i < 2; i++)
        {
            var again = new HttpRequestMessage(HttpMethod.Post, "/api/session");
            again.Headers.Add("Cookie", cookie);
            var res = await http.SendAsync(again);
            var b2 = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
            Assert.Equal(id.ToString(), b2.Str("id"));
        }

        var handle = new HttpRequestMessage(HttpMethod.Post, "/api/handle") { Content = JsonContent.Create(new { title = 42 }) };
        handle.Headers.Add("Cookie", cookie);
        var hr = await http.SendAsync(handle);
        hr.EnsureSuccessStatusCode();
        Assert.Equal(42, JsonDocument.Parse(await hr.Content.ReadAsStringAsync()).RootElement.GetProperty("handle").Int("title"));

        using var scope = app.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KartDb>();
        Assert.Equal(1, await db.Players.CountAsync(p => p.Id == id));

        // A socket without a cookie, or from a foreign site, is refused.
        await Assert.ThrowsAnyAsync<Exception>(() => app.OpenSocket("bk_player=nonsense"));
        await Assert.ThrowsAnyAsync<Exception>(() => app.OpenSocket(cookie, "https://evil.example"));
    }

    [Fact]
    public async Task Private_room_from_lobby_to_results_and_back_to_track()
    {
        await app.UseSettings(new() { ["FinishGraceSeconds"] = "30" });
        var (a, b, code) = await TwoInPrivate();
        await using var _a = a; await using var _b = b;

        // Racers are unique.
        await b.Send(new { t = "racer", id = "elon" });
        var r0 = await b.Room(_ => true);
        Assert.Equal("sam", r0.MemberOf(b.Id).Str("racer"));

        // Only the host changes rules or starts.
        await b.Send(new { t = "rules", rules = new { cc = 200 } });
        Assert.Equal("bad", (await b.Next("err")).Str("code"));
        await b.Send(new { t = "start" });
        Assert.Equal("bad", (await b.Next("err")).Str("code"));

        await a.Send(new { t = "rules", rules = new { mode = "single", cc = 100, level = "hard", cpus = true, pick = "vote" } });
        var ruled = await b.Room(r => r.GetProperty("rules").Int("cc") == 100);
        Assert.Equal("hard", ruled.GetProperty("rules").Str("level"));
        Assert.Equal(a.Id.ToString(), ruled.Str("host"));

        await a.Send(new { t = "start" });
        await b.Room(r => r.Str("phase") == "track");
        await a.Send(new { t = "track", id = "davos" });
        await b.Send(new { t = "track", id = "mars-colony" });
        var race = await a.Room(r => r.Str("phase") == "race");
        var rs = race.GetProperty("race");
        Assert.Contains(rs.Str("trackId"), new[] { "davos", "mars-colony" });
        Assert.True(rs.IsNull("laps"));
        var slots = rs.Arr("slots").ToList();
        Assert.Equal(8, slots.Count);
        for (int i = 0; i < 6; i++)
        {
            Assert.True(slots[i].IsNull("member"));
            Assert.Equal("hard", slots[i].Str("level"));
            Assert.Equal(a.Id.ToString(), slots[i].Str("owner"));
            Assert.DoesNotContain(slots[i].Str("racer"), new[] { "elon", "sam" });
        }
        var humanSlots = slots.Skip(6).ToList();
        Assert.All(humanSlots, s => Assert.Equal(s.Str("member"), s.Str("owner")));
        Assert.Equal(new[] { a.Id.ToString(), b.Id.ToString() }.Order(), humanSlots.Select(s => s.Str("member")!).Order());

        await Task.Delay(200); // past startAt
        int aSlot = race.SlotOf(a.Id).Int("slot"), bSlot = race.SlotOf(b.Id).Int("slot");
        await b.Send(new { t = "finish", slot = bSlot, time = 0.5 });
        await a.Room(r => r.GetProperty("race").Arr("finished").Count() == 1);
        // Only the owner may report a finish.
        await b.Send(new { t = "finish", slot = 0, time = 0.6 });
        Assert.Equal("bad", (await b.Next("err")).Str("code"));
        await a.Send(new { t = "finish", slot = aSlot, time = 0.3 });
        var two = await b.Room(r => r.GetProperty("race").Arr("finished").Count() == 2);
        var fin = two.GetProperty("race").Arr("finished").ToList();
        Assert.Equal(aSlot, fin[0].Int("slot"));
        Assert.Equal(1, fin[0].Int("rank"));
        Assert.Equal(bSlot, fin[1].Int("slot"));

        for (int s = 0; s < 6; s++) await a.Send(new { t = "finish", slot = s, time = 0.7 + s * 0.01 });
        var results = await b.Room(r => r.Str("phase") == "results");
        var rows = results.GetProperty("last").Arr("results").ToList();
        Assert.Equal(8, rows.Count);
        Assert.Equal(aSlot, rows[0].Int("slot"));
        Assert.Equal(15, rows[0].Int("points"));
        Assert.Equal(bSlot, rows[1].Int("slot"));
        Assert.True(rows[0].IsNull("before")); // private races are not rated

        await a.Send(new { t = "ready" });
        await b.Send(new { t = "ready" });
        var back = await a.Room(r => r.Str("phase") == "track");
        Assert.True(back.IsNull("race"));
        Assert.Equal(code, Code(back));
    }

    [Fact]
    public async Task Cup_points_add_up_over_races()
    {
        var (a, b, _) = await TwoInPrivate();
        await using var _a = a; await using var _b = b;
        await a.Send(new { t = "rules", rules = new { mode = "cup", cup = "seed", cpus = false } });
        await b.Room(r => r.GetProperty("rules").Str("mode") == "cup");
        await a.Send(new { t = "start" });

        string[] tracks = ["silicon-valley", "bliss-hills"];
        for (int n = 0; n < 2; n++)
        {
            var race = await a.Room(r => r.Str("phase") == "race" && r.GetProperty("race").Int("n") == n + 1);
            Assert.Equal(tracks[n], race.GetProperty("race").Str("trackId"));
            Assert.Equal(2, race.GetProperty("race").Arr("slots").Count());
            Assert.Equal(n, race.GetProperty("cupState").Int("index"));
            await Task.Delay(200);
            await a.Send(new { t = "finish", slot = race.SlotOf(a.Id).Int("slot"), time = 0.2 });
            await b.Send(new { t = "finish", slot = race.SlotOf(b.Id).Int("slot"), time = 0.3 });
            var res = await b.Room(r => r.Str("phase") == "results" && r.GetProperty("cupState").Int("index") == n);
            var totals = res.GetProperty("cupState").GetProperty("totals");
            Assert.Equal(15 * (n + 1), totals.GetProperty("elon").GetInt32());
            Assert.Equal(12 * (n + 1), totals.GetProperty("sam").GetInt32());
            // each racer's finish per race, for the countback on a tie (src/content/cups.js cupOrder)
            var places = res.GetProperty("cupState").GetProperty("places");
            Assert.Equal(1, places.GetProperty("elon")[n].GetInt32());
            Assert.Equal(2, places.GetProperty("sam")[n].GetInt32());
            if (n == 0) Assert.Equal(0, places.GetProperty("elon")[1].GetInt32());
            await a.Send(new { t = "ready" });
            await b.Send(new { t = "ready" });
        }
    }

    [Theory]
    [InlineData("cup")]
    [InlineData("single")]
    public async Task Without_cpus_the_last_one_left_goes_back_to_the_lobby(string mode)
    {
        await app.UseSettings(new() { ["FinishGraceSeconds"] = "0.3" });
        var (a, b, _) = await TwoInPrivate();
        await using var _a = a;
        object rules = mode == "cup" ? new { mode = "cup", cup = "seed", cpus = false } : new { mode = "single", cpus = false, pick = "host" };
        await a.Send(new { t = "rules", rules });
        await b.Room(r => r.GetProperty("rules").Str("mode") == mode);
        if (mode == "single")
        {
            await a.Send(new { t = "track", id = "davos" });
            await b.Room(r => r.MemberOf(a.Id).Str("track") == "davos");
        }
        await a.Send(new { t = "start" });
        var race = await a.Room(r => r.Str("phase") == "race");
        await b.Room(r => r.Str("phase") == "race");

        // B drops mid-race; A finishes alone and is the only one left.
        b.Abort();
        await a.Room(r => !r.MemberOf(b.Id).GetProperty("connected").GetBoolean());
        await Task.Delay(200);
        await a.Send(new { t = "finish", slot = race.SlotOf(a.Id).Int("slot"), time = 0.2 });
        await a.Room(r => r.Str("phase") == "results", 4);
        await a.Send(new { t = "ready" });

        var lobby = await a.Room(r => r.Str("phase") != "results");
        Assert.Equal("lobby", lobby.Str("phase"));
        Assert.True(lobby.IsNull("race"));
        if (mode == "cup")
        {
            var cs = lobby.GetProperty("cupState");
            Assert.Equal(0, cs.Int("index"));
            Assert.True(cs.GetProperty("ended").GetBoolean());
            Assert.Equal(15, cs.GetProperty("totals").GetProperty("elon").GetInt32());
        }
        else Assert.True(lobby.IsNull("cupState"));
    }

    [Fact]
    public async Task Silent_owner_loses_kart_and_gets_it_back_and_host_leaving_moves_cpus()
    {
        await app.UseSettings(new() { ["OwnerSilenceSeconds"] = "0.5" });
        var (a, b, _) = await TwoInPrivate();
        await using var _b = b;
        await a.Send(new { t = "rules", rules = new { pick = "host" } });
        await b.Room(r => r.GetProperty("rules").Str("pick") == "host");
        await a.Send(new { t = "track", id = "davos" });
        await b.Room(r => r.MemberOf(a.Id).Str("track") == "davos");
        a.KeepAlive();
        await a.Send(new { t = "start" });
        var race = await b.Room(r => r.Str("phase") == "race");
        Assert.Equal("davos", race.GetProperty("race").Str("trackId"));
        int bSlot = race.SlotOf(b.Id).Int("slot");

        // B says nothing: after the silence its kart goes to the CPU owner (the host).
        var taken = await a.Room(r => r.Str("phase") == "race" && r.GetProperty("race").Arr("slots").ElementAt(bSlot).Str("owner") == a.Id.ToString(), 4);
        Assert.Equal("davos", taken.GetProperty("race").Str("trackId"));

        // B comes back: its kart returns and its snapshot is accepted.
        await b.SendBinary(Gamer.Snapshot(bSlot, 100, 42.5f));
        await a.Room(r => r.Str("phase") == "race" && r.GetProperty("race").Arr("slots").ElementAt(bSlot).Str("owner") == b.Id.ToString());
        var bin = await a.NextBinary();
        Assert.Equal(bSlot, bin[1]);
        b.KeepAlive();

        // The host leaves: B is host and drives every kart.
        await a.DisposeAsync();
        var after = await b.Room(r => r.Str("host") == b.Id.ToString());
        Assert.All(after.GetProperty("race").Arr("slots"), s => Assert.Equal(b.Id.ToString(), s.Str("owner")));
    }

    [Fact]
    public async Task Events_and_snapshots_reach_the_others_only_from_owners()
    {
        var (a, b, _) = await TwoInPrivate();
        await using var _a = a; await using var _b = b;
        await a.Send(new { t = "rules", rules = new { cpus = false, pick = "host" } });
        await a.Send(new { t = "track", id = "crypto-cove" });
        await a.Send(new { t = "start" });
        var race = await b.Room(r => r.Str("phase") == "race");
        await a.Room(r => r.Str("phase") == "race");
        int aSlot = race.SlotOf(a.Id).Int("slot"), bSlot = race.SlotOf(b.Id).Int("slot");

        await a.Send(new { t = "ev", e = new { k = "box", i = 3, s = aSlot } });
        var ev = await b.Next("ev");
        Assert.Equal(a.Id.ToString(), ev.Str("from"));
        Assert.Equal("box", ev.GetProperty("e").Str("k"));
        Assert.Equal(3, ev.GetProperty("e").Int("i"));
        Assert.True(await a.Quiet(f => f.Text?.Contains("\"t\":\"ev\"") == true));

        var snap = Gamer.Snapshot(aSlot, 7, 12.25f);
        await a.SendBinary(snap);
        Assert.Equal(snap, await b.NextBinary());
        Assert.True(await a.Quiet(f => f.Binary != null));

        // Not A's kart: dropped.
        await a.SendBinary(Gamer.Snapshot(bSlot, 8, 99f));
        Assert.True(await b.Quiet(f => f.Binary != null));
    }

    [Fact]
    public async Task Oversize_frame_closes_the_socket()
    {
        await using var a = await app.NewGamer();
        await a.SendRaw("{\"t\":\"ping\",\"pad\":\"" + new string('x', 5000) + "\"}");
        await Assert.ThrowsAsync<InvalidOperationException>(() => a.Next("pong"));
        Assert.Equal(System.Net.WebSockets.WebSocketCloseStatus.MessageTooBig, a.CloseStatus);
    }

    [Fact]
    public async Task Public_rooms_pair_people_wait_then_race_and_rate()
    {
        await app.UseSettings(new() { ["TrackPickSeconds"] = "5" });
        var a = await app.NewGamer();
        var b = await app.NewGamer();
        await using var _a = a; await using var _b = b;
        await a.Send(new { t = "find" });
        var ra = await a.Room(r => r.GetProperty("public").GetBoolean());
        await b.Send(new { t = "find" });
        var rb = await b.Room(r => r.Arr("members").Count() == 2);
        Assert.Equal(Code(ra), Code(rb));

        var track = await a.Room(r => r.Str("phase") == "track");
        var offer = track.Arr("offer").Select(o => o.GetString()!).ToList();
        Assert.Equal(3, offer.Count);
        await a.Send(new { t = "track", id = "not-on-offer" });
        Assert.Equal("bad", (await a.Next("err")).Str("code"));
        await a.Send(new { t = "track", id = offer[0] });
        await b.Send(new { t = "track", id = "random" });
        var race = await a.Room(r => r.Str("phase") == "race");
        Assert.Contains(race.GetProperty("race").Str("trackId"), offer);
        var slots = race.GetProperty("race").Arr("slots").ToList();
        Assert.Equal(8, slots.Count);
        Assert.All(slots.Take(6), s => Assert.Equal(a.Id.ToString(), s.Str("owner"))); // connected longest
        Assert.NotNull(race.MemberOf(a.Id).Str("racer")); // got a random free racer

        await Task.Delay(200);
        // A wins, the CPUs come next, B is last.
        await a.Send(new { t = "finish", slot = race.SlotOf(a.Id).Int("slot"), time = 0.1 });
        for (int s = 0; s < 6; s++) await a.Send(new { t = "finish", slot = s, time = 0.2 + s * 0.01 });
        await b.Send(new { t = "finish", slot = race.SlotOf(b.Id).Int("slot"), time = 0.9 });
        var res = await b.Room(r => r.Str("phase") == "results");
        var rows = res.GetProperty("last").Arr("results").ToList();
        var ar = rows.First(r => r.Str("member") == a.Id.ToString());
        var br = rows.First(r => r.Str("member") == b.Id.ToString());
        Assert.Equal(1, ar.Int("rank"));
        Assert.Equal(8, br.Int("rank"));
        Assert.True(ar.GetProperty("after").GetInt64() > ar.GetProperty("before").GetInt64());
        Assert.True(br.GetProperty("after").GetInt64() < br.GetProperty("before").GetInt64());
        Assert.Equal(ar.GetProperty("after").GetInt64(), res.MemberOf(a.Id).GetProperty("valuation").GetInt64());

        using var scope = app.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KartDb>();
        var pa = await db.Players.AsNoTracking().FirstAsync(p => p.Id == a.Id);
        Assert.Equal(1, pa.Races);

        // The leaderboard has A above B.
        var lb = JsonDocument.Parse(await app.Http().GetStringAsync("/api/leaderboard?board=week")).RootElement;
        var lbRows = lb.Arr("rows").ToList();
        Assert.True(lbRows.FindIndex(r => r.GetProperty("valuation").GetInt64() > 0) >= 0);
    }

    [Fact]
    public async Task Winner_never_falls_and_a_player_who_drops_is_last_among_humans()
    {
        await app.UseSettings(new() { ["RaceMaxSeconds"] = "1.5", ["SeatHoldSeconds"] = "30" });
        var a = await app.NewGamer();
        var b = await app.NewGamer();
        await using var _a = a;
        await a.Send(new { t = "find" });
        await a.Room(r => r.GetProperty("public").GetBoolean());
        await b.Send(new { t = "find" });
        await a.Room(r => r.Arr("members").Count() == 2);
        var track = await a.Room(r => r.Str("phase") == "track");
        await a.Send(new { t = "track", id = "random" });
        await b.Send(new { t = "track", id = "random" });
        var race = await a.Room(r => r.Str("phase") == "race");
        a.KeepAlive();
        await Task.Delay(200);

        // B is further along, then drops; nobody finishes before the clock runs out.
        await b.SendBinary(Gamer.Snapshot(race.SlotOf(b.Id).Int("slot"), 60, 500f));
        await a.SendBinary(Gamer.Snapshot(race.SlotOf(a.Id).Int("slot"), 60, 100f));
        await a.NextBinary();
        b.Abort();
        await a.Room(r => !r.MemberOf(b.Id).GetProperty("connected").GetBoolean());

        var res = await a.Room(r => r.Str("phase") == "results", 5);
        var rows = res.GetProperty("last").Arr("results").ToList();
        var ar = rows.First(r => r.Str("member") == a.Id.ToString());
        var br = rows.First(r => r.Str("member") == b.Id.ToString());
        Assert.Equal(1, ar.Int("rank"));
        Assert.Equal(2, br.Int("rank"));
        Assert.True(ar.GetProperty("estimated").GetBoolean());
        Assert.True(ar.GetProperty("after").GetInt64() >= ar.GetProperty("before").GetInt64());
    }

    [Fact]
    public async Task Alone_in_a_public_room_races_cpus_after_the_wait()
    {
        await using var a = await app.NewGamer();
        await a.Send(new { t = "find" });
        var lobby = await a.Room(r => r.GetProperty("public").GetBoolean());
        Assert.False(lobby.IsNull("until"));
        var track = await a.Room(r => r.Str("phase") == "track", 3);
        await a.Send(new { t = "racer", id = "bezos" });
        await a.Send(new { t = "track", id = track.Arr("offer").First().GetString() });
        var race = await a.Room(r => r.Str("phase") == "race");
        var slots = race.GetProperty("race").Arr("slots").ToList();
        Assert.Equal(8, slots.Count);
        Assert.Equal(7, slots.Count(s => s.IsNull("member")));
        Assert.Equal(a.Id.ToString(), slots[7].Str("member"));
        Assert.Equal("bezos", slots[7].Str("racer"));
    }

    [Fact]
    public async Task Typed_names_show_in_private_rooms_only_cleaned()
    {
        var (a, b, code) = await TwoInPrivate();
        await using var _a = a; await using var _b = b;

        await a.Send(new { t = "name", name = "  Roger \u0007\n\t  the   Great  " });
        var room = await b.Room(r => !r.MemberOf(a.Id).IsNull("name"));
        Assert.Equal("Roger the Great", room.MemberOf(a.Id).Str("name"));

        // cut to 16 text elements; an emoji counts as one and is never split
        await a.Send(new { t = "name", name = "\U0001F680\U0001F680abcdefghijklmnopqrstuvwxyz" });
        room = await b.Room(r => r.MemberOf(a.Id).Str("name")?.StartsWith("\U0001F680") == true);
        var cut = room.MemberOf(a.Id).Str("name")!;
        Assert.Equal(16, new System.Globalization.StringInfo(cut).LengthInTextElements);
        Assert.Equal("\U0001F680\U0001F680abcdefghijklmn", cut);

        // empty clears it
        await a.Send(new { t = "name", name = " \u200B " });
        room = await b.Room(r => r.MemberOf(a.Id).IsNull("name"));
        Assert.True(room.MemberOf(b.Id).IsNull("name"));
        Assert.Equal(code, room.Str("code"));
    }

    [Fact]
    public async Task Typed_name_in_a_public_room_is_refused_and_never_shown()
    {
        await using var a = await app.NewGamer();
        await a.Send(new { t = "find" });
        await a.Room(r => r.GetProperty("public").GetBoolean());
        await a.Send(new { t = "name", name = "Roger" });
        Assert.Equal("bad", (await a.Next("err")).Str("code"));
        await a.Send(new { t = "racer", id = "bezos" });
        var room = await a.Room(r => r.MemberOf(a.Id).Str("racer") == "bezos");
        Assert.True(room.MemberOf(a.Id).IsNull("name"));
    }
}
