using System.Diagnostics;
using System.Net.WebSockets;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace BillionaireKart.Tests;

/// <summary>A restart for an update (docs/online-protocol.md, "Server updates"). Each test runs its own server on the
/// shared database, so stopping it leaves the shared app alone.</summary>
[Collection("app")]
public sealed class ShutdownTests(TestApp app)
{
    const double Drain = 3;

    /// <summary>Two players racing each other (no CPUs) on a server of their own.</summary>
    async Task<(WebApplicationFactory<Program> Server, Gamer A, Gamer B, JsonElement Race)> TwoRacing()
    {
        await app.UseSettings(new() { ["ShutdownDrainSeconds"] = Drain.ToString(System.Globalization.CultureInfo.InvariantCulture) });
        var server = new WebApplicationFactory<Program>();
        _ = server.Server;
        var a = await app.NewGamer(factory: server);
        var b = await app.NewGamer(factory: server);
        await a.Send(new { t = "create" });
        var code = (await a.Room(r => r.Str("phase") == "lobby")).Str("code");
        await b.Send(new { t = "join", code });
        await a.Room(r => r.Arr("members").Count() == 2);
        await a.Send(new { t = "racer", id = "elon" });
        await b.Send(new { t = "racer", id = "sam" });
        await a.Send(new { t = "rules", rules = new { cpus = false, pick = "host" } });
        await a.Send(new { t = "track", id = "davos" });
        await a.Room(r => r.MemberOf(b.Id).Str("racer") == "sam" && r.MemberOf(a.Id).Str("track") == "davos");
        await a.Send(new { t = "start" });
        var race = await a.Room(r => r.Str("phase") == "race");
        await b.Room(r => r.Str("phase") == "race");
        await Task.Delay(200); // past startAt
        return (server, a, b, race);
    }

    static async Task SaysBye(Gamer g)
    {
        var bye = await g.Next("bye");
        Assert.Equal("update", bye.Str("why"));
        Assert.InRange(bye.Int("in"), 1, (int)Drain);
    }

    /// <summary>Waits for the server to close this player's socket.</summary>
    static async Task Closed(Gamer g)
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => g.Next("never", seconds: 5));
        Assert.Equal(WebSocketCloseStatus.EndpointUnavailable, g.CloseStatus);
    }

    [Fact]
    public async Task Shutdown_during_a_race_says_bye_lets_finishes_through_then_exits()
    {
        var (server, a, b, race) = await TwoRacing();
        await using var _a = a; await using var _b = b;
        var clock = Stopwatch.StartNew();
        var stopping = Task.Run(() => server.DisposeAsync().AsTask());
        await SaysBye(a);
        await SaysBye(b);

        // Nothing new starts while it waits.
        await b.Send(new { t = "create" });
        await b.Next("bye");

        // Finishes still count, and the race ends as usual.
        await a.Send(new { t = "finish", slot = race.SlotOf(a.Id).Int("slot"), time = 0.1 });
        await b.Room(r => r.Str("phase") == "race" && r.GetProperty("race").Arr("finished").Count() == 1);
        Assert.False(stopping.IsCompleted);
        await b.Send(new { t = "finish", slot = race.SlotOf(b.Id).Int("slot"), time = 0.2 });
        var results = await a.Room(r => r.Str("phase") == "results");
        Assert.Equal(2, results.GetProperty("last").Arr("results").Count());

        // No race left: the server closes every socket and exits without waiting out the drain.
        await Closed(a);
        await Closed(b);
        await stopping.WaitAsync(TimeSpan.FromSeconds(Drain + 3));
        Assert.True(clock.Elapsed.TotalSeconds < Drain, $"stopped after {clock.Elapsed.TotalSeconds:0.0} s");
    }

    [Fact]
    public async Task Shutdown_cuts_off_an_unfinished_race_at_the_drain()
    {
        var (server, a, b, race) = await TwoRacing();
        await using var _a = a; await using var _b = b;
        a.KeepAlive(); b.KeepAlive();
        var clock = Stopwatch.StartNew();
        var stopping = Task.Run(() => server.DisposeAsync().AsTask());
        await SaysBye(a);
        await a.Send(new { t = "finish", slot = race.SlotOf(a.Id).Int("slot"), time = 0.1 });
        await b.Room(r => r.Str("phase") == "race" && r.GetProperty("race").Arr("finished").Count() == 1);

        // B never finishes: at the cutoff every socket closes and the server exits.
        await Closed(b);
        await stopping.WaitAsync(TimeSpan.FromSeconds(Drain + 3));
        Assert.InRange(clock.Elapsed.TotalSeconds, Drain - 0.5, Drain + 2);
    }
}
