using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using BillionaireKart.Server.Settings;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace BillionaireKart.Tests;

/// <summary>One app for the whole run, on a fresh billionaire_kart_test database, with timers made tiny through the settings service.</summary>
public sealed class TestApp : IAsyncLifetime
{
    public const string Database = "billionaire_kart_test";
    public const string ConnectionString = $"Host=localhost;Database={Database}";
    public const string AdminToken = "test-admin-token";
    public const string Origin = "http://game.test";

    public WebApplicationFactory<Program> Factory { get; private set; } = null!;

    /// <summary>Fast timers for tests. Each test starts from these plus its own changes.</summary>
    public static readonly Dictionary<string, string> Fast = new()
    {
        ["TrackPickSeconds"] = "5",
        ["ResultsSeconds"] = "30",
        ["RaceStartLeadSeconds"] = "0.1",
        ["FinishGraceSeconds"] = "30",
        ["RaceMaxSeconds"] = "60",
        ["OwnerSilenceSeconds"] = "5",
        ["SeatHoldSeconds"] = "30",
        ["RoomIdleMinutes"] = "0.01",
        ["PublicSoloWaitSeconds"] = "0.3",
        ["PublicWaitSeconds"] = "0.3",
    };

    public async Task InitializeAsync()
    {
        await using (var conn = new NpgsqlConnection("Host=localhost;Database=postgres"))
        {
            await conn.OpenAsync();
            await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {Database} WITH (FORCE)", conn);
            await drop.ExecuteNonQueryAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE {Database}", conn);
            await create.ExecuteNonQueryAsync();
        }
        Environment.SetEnvironmentVariable("ConnectionStrings__Kart", ConnectionString);
        Environment.SetEnvironmentVariable("Kart__AdminToken", AdminToken);
        Environment.SetEnvironmentVariable("Kart__AllowedOrigins", Origin);
        // Development: migrates on start and allows plain-http cookies.
        Factory = new WebApplicationFactory<Program>();
        _ = Factory.Server;
        await UseSettings();
    }

    public async Task DisposeAsync() => await Factory.DisposeAsync();

    public SettingsService Settings => Factory.Services.GetRequiredService<SettingsService>();

    /// <summary>Every setting back to its default, then the fast timers, then <paramref name="changes"/>.</summary>
    public async Task UseSettings(Dictionary<string, string>? changes = null)
    {
        var all = SettingDef.All.ToDictionary(d => d.Key, d => d.Default);
        foreach (var (k, v) in Fast) all[k] = v;
        foreach (var (k, v) in changes ?? []) all[k] = v;
        var errors = await Settings.SaveAsync(all);
        Assert.Empty(errors);
    }

    public HttpClient Http(bool cookies = false) =>
        Factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = cookies, AllowAutoRedirect = false });

    /// <summary>A new guest: POST /api/session, then a WebSocket that has said hello.</summary>
    public async Task<Gamer> NewGamer(string? cookie = null)
    {
        var http = Http();
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/session");
        if (cookie != null) req.Headers.Add("Cookie", cookie);
        var res = await http.SendAsync(req);
        res.EnsureSuccessStatusCode();
        var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
        var setCookie = res.Headers.GetValues("Set-Cookie").First(c => c.StartsWith("bk_player="));
        cookie = setCookie.Split(';')[0];
        var g = new Gamer(Guid.Parse(body.GetProperty("id").GetString()!), cookie);
        await g.ConnectAsync(this);
        return g;
    }

    public async Task<WebSocket> OpenSocket(string cookie, string origin = Origin)
    {
        var client = Factory.Server.CreateWebSocketClient();
        client.ConfigureRequest = r =>
        {
            r.Headers["Origin"] = origin;
            r.Headers["Cookie"] = cookie;
        };
        return await client.ConnectAsync(new Uri(Factory.Server.BaseAddress, "/ws"), CancellationToken.None);
    }
}

[CollectionDefinition("app")]
public sealed class AppCollection : ICollectionFixture<TestApp>;

/// <summary>A test player with one socket. Incoming frames are queued; Next* waits for a matching one and drops the rest.</summary>
public sealed class Gamer(Guid id, string cookie) : IAsyncDisposable
{
    public Guid Id { get; } = id;
    public string Cookie { get; } = cookie;
    public WebSocket Ws { get; private set; } = null!;
    public WebSocketCloseStatus? CloseStatus { get; private set; }
    public JsonElement LastRoom { get; private set; }

    readonly Channel<(string? Text, byte[]? Binary)> _inbox = Channel.CreateUnbounded<(string?, byte[]?)>();
    readonly CancellationTokenSource _cts = new();
    Task? _keepAlive;

    public async Task ConnectAsync(TestApp app)
    {
        Ws = await app.OpenSocket(Cookie);
        _ = Task.Run(ReceiveLoop);
        await Send(new { t = "hello", proto = 1, build = "test" });
        var w = await Next("welcome");
        Assert.Equal(Id.ToString(), w.GetProperty("you").GetString());
    }

    async Task ReceiveLoop()
    {
        var buf = new byte[64 * 1024];
        try
        {
            while (Ws.State == WebSocketState.Open)
            {
                var ms = new MemoryStream();
                WebSocketReceiveResult r;
                do
                {
                    r = await Ws.ReceiveAsync(buf, _cts.Token);
                    if (r.MessageType == WebSocketMessageType.Close) { CloseStatus = r.CloseStatus; _inbox.Writer.TryComplete(); return; }
                    ms.Write(buf, 0, r.Count);
                } while (!r.EndOfMessage);
                if (r.MessageType == WebSocketMessageType.Text) _inbox.Writer.TryWrite((Encoding.UTF8.GetString(ms.ToArray()), null));
                else _inbox.Writer.TryWrite((null, ms.ToArray()));
            }
        }
        catch { }
        _inbox.Writer.TryComplete();
    }

    public Task Send(object msg) => SendRaw(JsonSerializer.Serialize(msg));

    public Task SendRaw(string text) =>
        Ws.SendAsync(Encoding.UTF8.GetBytes(text), WebSocketMessageType.Text, true, CancellationToken.None);

    public Task SendBinary(byte[] data) => Ws.SendAsync(data, WebSocketMessageType.Binary, true, CancellationToken.None);

    public static byte[] Snapshot(int slot, uint step, float distance)
    {
        var b = new byte[18];
        b[0] = 1;
        b[1] = (byte)slot;
        BitConverter.TryWriteBytes(b.AsSpan(2), step);
        BitConverter.TryWriteBytes(b.AsSpan(6), distance);
        b[10] = 0xAB;
        return b;
    }

    /// <summary>The next text message of type <paramref name="t"/> that matches.</summary>
    public async Task<JsonElement> Next(string t, Func<JsonElement, bool>? match = null, double seconds = 5)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(seconds));
        try
        {
            while (true)
            {
                var (text, _) = await _inbox.Reader.ReadAsync(cts.Token);
                if (text == null) continue;
                var msg = JsonDocument.Parse(text).RootElement;
                var type = msg.GetProperty("t").GetString();
                if (type == "room") LastRoom = msg.GetProperty("room");
                if (type == t && (match == null || match(msg))) return msg;
            }
        }
        catch (OperationCanceledException) { throw new TimeoutException($"No '{t}' message for player {Id} within {seconds} s"); }
        catch (ChannelClosedException) { throw new InvalidOperationException($"Socket closed while waiting for '{t}' (status {CloseStatus})"); }
    }

    /// <summary>The next room state that matches.</summary>
    public async Task<JsonElement> Room(Func<JsonElement, bool> match, double seconds = 5) =>
        (await Next("room", m => match(m.GetProperty("room")), seconds)).GetProperty("room");

    public async Task<byte[]> NextBinary(double seconds = 3)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(seconds));
        while (true)
        {
            var (_, bin) = await _inbox.Reader.ReadAsync(cts.Token);
            if (bin != null) return bin;
        }
    }

    /// <summary>True when nothing matching arrives within the wait (other frames are dropped).</summary>
    public async Task<bool> Quiet(Func<(string? Text, byte[]? Binary), bool> match, double seconds = 0.4)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(seconds));
        try
        {
            while (true)
            {
                var item = await _inbox.Reader.ReadAsync(cts.Token);
                if (item.Text != null && item.Text.Contains("\"t\":\"room\"")) LastRoom = JsonDocument.Parse(item.Text).RootElement.GetProperty("room");
                if (match(item)) return false;
            }
        }
        catch (OperationCanceledException) { return true; }
    }

    /// <summary>Sends a ping every 100 ms so the server sees this device as alive.</summary>
    public void KeepAlive()
    {
        _keepAlive ??= Task.Run(async () =>
        {
            while (!_cts.IsCancellationRequested && Ws.State == WebSocketState.Open)
            {
                try { await Send(new { t = "ping", c = 1 }); } catch { return; }
                await Task.Delay(100);
            }
        });
    }

    /// <summary>Drops the connection without saying goodbye.</summary>
    public void Abort()
    {
        _cts.Cancel();
        Ws.Abort();
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (Ws.State == WebSocketState.Open)
            {
                await Send(new { t = "leave" });
                _cts.CancelAfter(TimeSpan.FromSeconds(1));
                await Ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
            }
        }
        catch { }
        _cts.Cancel();
        Ws.Dispose();
    }
}

public static class Json
{
    public static string? Str(this JsonElement e, string name) => e.GetProperty(name).ValueKind == JsonValueKind.Null ? null : e.GetProperty(name).GetString();
    public static int Int(this JsonElement e, string name) => e.GetProperty(name).GetInt32();
    public static IEnumerable<JsonElement> Arr(this JsonElement e, string name) => e.GetProperty(name).EnumerateArray();
    public static JsonElement MemberOf(this JsonElement room, Guid id) => room.Arr("members").First(m => m.Str("id") == id.ToString());
    public static JsonElement SlotOf(this JsonElement room, Guid id) => room.GetProperty("race").Arr("slots").First(s => s.Str("member") == id.ToString());
    public static bool IsNull(this JsonElement e, string name) => e.GetProperty(name).ValueKind == JsonValueKind.Null;
}
