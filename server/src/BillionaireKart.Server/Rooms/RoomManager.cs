using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;
using BillionaireKart.Server.Rating;
using BillionaireKart.Server.Settings;

namespace BillionaireKart.Server.Rooms;

/// <summary>
/// Every room and connection, in memory (lost on restart, by design). Reads frames from each socket and hands them to
/// the player's room, one at a time per room.
/// </summary>
public sealed class RoomManager(SettingsService settings, RatingService rating, ILogger<RoomManager> log)
{
    public SettingsService Settings { get; } = settings;
    public RatingService Rating { get; } = rating;
    public ILogger Log { get; } = log;

    public ConcurrentDictionary<string, Room> Rooms { get; } = new();
    /// <summary>Which room a player has a seat in. Changed only with that room's gate held.</summary>
    public ConcurrentDictionary<Guid, Room> MemberOf { get; } = new();
    public ConcurrentDictionary<Guid, Connection> Connections { get; } = new();

    readonly SemaphoreSlim _findGate = new(1, 1);

    public int ConnectedCount => Connections.Count;

    // ---------- shutting down for an update (docs/online-protocol.md, "Server updates") ----------

    volatile bool _draining;
    long _drainDeadline;
    Task? _drain;
    readonly object _drainLock = new();

    /// <summary>True once shutdown has begun: no new rooms or races, and races in progress are left to finish.</summary>
    public bool Draining => _draining;

    bool AnyRacing => Rooms.Values.Any(r => r.Phase == Phase.Race);

    /// <summary>Seconds until every socket is closed: 0 when nothing is racing.</summary>
    int ByeSeconds(long now) => AnyRacing ? (int)Math.Ceiling(Math.Max(0, Interlocked.Read(ref _drainDeadline) - now) / 1000.0) : 0;

    void SendBye(Connection c, long now) => c.SendText($$"""{"t":"bye","why":"update","in":{{ByeSeconds(now)}}}""");

    /// <summary>
    /// Begins shutdown and returns the task that finishes it: tells every device, waits for races to finish (up to
    /// ShutdownDrainSeconds), then closes every socket. Calling it again returns the same task.
    /// </summary>
    public Task DrainAsync()
    {
        lock (_drainLock)
        {
            if (_drain != null) return _drain;
            long now = Clock.Now;
            double seconds = Math.Clamp(Settings.Current.ShutdownDrainSeconds, 0, SettingDef.MaxShutdownDrainSeconds);
            Interlocked.Exchange(ref _drainDeadline, now + (long)(seconds * 1000));
            _draining = true;
            int racing = Rooms.Values.Count(r => r.Phase == Phase.Race);
            Log.LogInformation("Shutting down: {Racing} race(s) in progress, waiting up to {Seconds} s", racing, seconds);
            foreach (var c in Connections.Values) SendBye(c, now);
            return _drain = Task.Run(FinishDrainAsync);
        }
    }

    async Task FinishDrainAsync()
    {
        while (AnyRacing && Clock.Now < Interlocked.Read(ref _drainDeadline)) await Task.Delay(100);
        int cut = Rooms.Values.Count(r => r.Phase == Phase.Race);
        if (cut > 0) Log.LogWarning("Shutdown: {Count} race(s) did not finish in time", cut);
        foreach (var c in Connections.Values) c.Close(WebSocketCloseStatus.EndpointUnavailable, "update");
        // Give the writers a moment to send what is queued and the close frames.
        for (int i = 0; i < 20 && !Connections.IsEmpty; i++) await Task.Delay(50);
        Log.LogInformation("Shutdown: sockets closed");
    }

    // ---------- connection loop ----------

    public async Task RunAsync(WebSocket ws, PlayerInfo player, CancellationToken ct)
    {
        var conn = new Connection(ws, player, Log);
        var writer = conn.RunWriterAsync(ct);
        try
        {
            await ReadLoopAsync(ws, conn, ct);
        }
        catch (Exception e) when (e is WebSocketException or OperationCanceledException)
        {
            // Device went away.
        }
        catch (Exception e)
        {
            Log.LogError(e, "Connection for player {PlayerId} failed", player.Id);
        }
        finally
        {
            conn.Close(WebSocketCloseStatus.NormalClosure, "");
            Connections.TryRemove(new KeyValuePair<Guid, Connection>(player.Id, conn));
            if (MemberOf.TryGetValue(player.Id, out var room))
                await WithRoom(room, r => r.DetachAsync(conn, Clock.Now));
            try { await writer.WaitAsync(TimeSpan.FromSeconds(5)); } catch (TimeoutException) { }
        }
    }

    async Task ReadLoopAsync(WebSocket ws, Connection conn, CancellationToken ct)
    {
        var buf = new byte[Wire.MaxTextBytes + 1];
        long windowStart = Clock.Now;
        int framesInWindow = 0;

        while (ws.State == WebSocketState.Open && !conn.IsClosed)
        {
            int len = 0;
            ValueWebSocketReceiveResult r;
            do
            {
                r = await ws.ReceiveAsync(buf.AsMemory(len), ct);
                if (r.MessageType == WebSocketMessageType.Close) return;
                len += r.Count;
                int limit = r.MessageType == WebSocketMessageType.Text ? Wire.MaxTextBytes : Wire.MaxBinaryBytes;
                if (len > limit)
                {
                    conn.Close(WebSocketCloseStatus.MessageTooBig, "frame too large");
                    return;
                }
            } while (!r.EndOfMessage);

            long now = Clock.Now;
            if (now - windowStart >= 1000) { windowStart = now; framesInWindow = 0; }
            if (++framesInWindow > Wire.MaxFramesPerSecond)
            {
                conn.SendText("""{"t":"err","code":"rate"}""");
                conn.Close(WebSocketCloseStatus.PolicyViolation, "too many frames");
                return;
            }

            if (r.MessageType == WebSocketMessageType.Binary)
            {
                if (!conn.HasSaidHello) continue;
                if (MemberOf.TryGetValue(conn.PlayerId, out var room))
                {
                    var frame = buf.AsMemory(0, len);
                    await WithRoom(room, rm =>
                    {
                        rm.Touch(conn.PlayerId, now);
                        rm.RelaySnapshot(conn.PlayerId, frame.Span);
                        return Task.CompletedTask;
                    });
                }
                continue;
            }

            JsonDocument doc;
            try { doc = JsonDocument.Parse(buf.AsMemory(0, len)); }
            catch (JsonException) { conn.SendText("""{"t":"err","code":"bad"}"""); continue; }
            using (doc)
            {
                await HandleTextAsync(conn, doc.RootElement, now);
            }
        }
    }

    async Task HandleTextAsync(Connection conn, JsonElement msg, long now)
    {
        string? t = msg.ValueKind == JsonValueKind.Object && msg.TryGetProperty("t", out var tp) && tp.ValueKind == JsonValueKind.String
            ? tp.GetString() : null;
        var id = conn.PlayerId;

        if (!conn.HasSaidHello)
        {
            if (t != "hello") { conn.SendText("""{"t":"err","code":"bad"}"""); return; }
            int proto = msg.TryGetProperty("proto", out var pp) && pp.TryGetInt32(out var pv) ? pv : 0;
            if (proto < Wire.MinProto || proto > Wire.Proto)
            {
                conn.SendText("""{"t":"old"}""");
                conn.Close(WebSocketCloseStatus.NormalClosure, "old");
                return;
            }
            conn.HasSaidHello = true;
            // A second connection from the same player replaces the first.
            Connections.AddOrUpdate(id, conn, (_, old) =>
            {
                if (old != conn) old.Close(WebSocketCloseStatus.PolicyViolation, "replaced");
                return conn;
            });
            conn.SendText(JsonSerializer.Serialize(new { t = "welcome", you = id, now }, RoomView.Json));
            if (_draining) SendBye(conn, now);
            if (MemberOf.TryGetValue(id, out var seat))
                await WithRoom(seat, r => { if (r.Find(id) is Member m) r.Attach(m, conn, now); return Task.CompletedTask; });
            return;
        }

        if (t == "ping")
        {
            var c = msg.TryGetProperty("c", out var cp) && cp.ValueKind == JsonValueKind.Number ? cp.GetRawText() : "0";
            conn.SendText($$"""{"t":"pong","c":{{c}},"now":{{now}}}""");
            if (MemberOf.TryGetValue(id, out var pr)) await WithRoom(pr, r => { r.Touch(id, now); return Task.CompletedTask; });
            return;
        }

        if (_draining && t is "create" or "join" or "find") { SendBye(conn, now); return; }

        switch (t)
        {
            case "hello": return;
            case "create": await CreateAsync(conn, now); return;
            case "join":
                var code = msg.TryGetProperty("code", out var cdp) && cdp.ValueKind == JsonValueKind.String ? cdp.GetString() : null;
                await JoinAsync(conn, code, now);
                return;
            case "find": await FindAsync(conn, now); return;
            case "leave": await LeaveCurrentAsync(id, now); return;
        }

        if (!MemberOf.TryGetValue(id, out var room)) { conn.SendText("""{"t":"err","code":"no_room"}"""); return; }
        await WithRoom(room, async r =>
        {
            r.Touch(id, now);
            switch (t)
            {
                case "racer": r.SetRacer(id, Str(msg, "id")); break;
                case "name": r.SetName(id, msg.TryGetProperty("name", out var nm) ? nm : default); break;
                case "rules": r.SetRules(id, msg.TryGetProperty("rules", out var rl) ? rl : default); break;
                case "start": r.Start(id, now); break;
                case "track": await r.PickTrackAsync(id, Str(msg, "id"), now); break;
                case "ready": await r.ReadyAsync(id, now); break;
                case "loaded": break;
                case "away":
                    if (msg.TryGetProperty("on", out var on) && on.ValueKind is JsonValueKind.True or JsonValueKind.False) r.SetAway(id, on.GetBoolean());
                    else conn.SendText("""{"t":"err","code":"bad"}""");
                    break;
                case "ev":
                    if (msg.TryGetProperty("e", out var e)) r.RelayEvent(id, e);
                    break;
                case "finish":
                    if (msg.TryGetProperty("slot", out var sp) && sp.TryGetInt32(out var slot) &&
                        msg.TryGetProperty("time", out var tm) && tm.TryGetDouble(out var time))
                        await r.FinishAsync(id, slot, time, now);
                    else conn.SendText("""{"t":"err","code":"bad"}""");
                    break;
                default: conn.SendText("""{"t":"err","code":"bad"}"""); break;
            }
        });
    }

    static string? Str(JsonElement msg, string name) =>
        msg.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;

    // ---------- rooms ----------

    public static async Task WithRoom(Room room, Func<Room, Task> action)
    {
        await room.Gate.WaitAsync();
        try { await action(room); }
        finally { room.Gate.Release(); }
    }

    async Task LeaveCurrentAsync(Guid id, long now)
    {
        if (MemberOf.TryGetValue(id, out var room)) await WithRoom(room, r => r.LeaveAsync(id, now));
    }

    Room? NewRoom(bool isPublic, long now)
    {
        if (Rooms.Count >= Settings.Current.MaxRooms) return null;
        for (int tries = 0; tries < 1000; tries++)
        {
            var code = string.Create(4, 0, (span, _) =>
            {
                for (int i = 0; i < span.Length; i++) span[i] = Wire.RoomCodeLetters[Random.Shared.Next(Wire.RoomCodeLetters.Length)];
            });
            var room = new Room(code, isPublic, this, now);
            room.Setup(now);
            if (Rooms.TryAdd(code, room)) return room;
        }
        return null;
    }

    async Task CreateAsync(Connection conn, long now)
    {
        await LeaveCurrentAsync(conn.PlayerId, now);
        var room = NewRoom(false, now);
        if (room == null) { conn.SendText("""{"t":"err","code":"full"}"""); return; }
        Log.LogInformation("Room {Room} created by {PlayerId}", room.Code, conn.PlayerId);
        await WithRoom(room, r => { r.Join(conn.Player, conn, now); return Task.CompletedTask; });
    }

    async Task JoinAsync(Connection conn, string? code, long now)
    {
        code = code?.Trim().ToUpperInvariant();
        if (code == null || !Rooms.TryGetValue(code, out var room)) { conn.SendText("""{"t":"err","code":"no_room"}"""); return; }
        if (MemberOf.TryGetValue(conn.PlayerId, out var current) && current != room) await LeaveCurrentAsync(conn.PlayerId, now);
        string? err = null;
        await WithRoom(room, r => { err = r.Join(conn.Player, conn, now); return Task.CompletedTask; });
        if (err != null) conn.SendText($$"""{"t":"err","code":"{{err}}"}""");
    }

    /// <summary>Joins the open public room whose members' average rating is closest, or opens a new one.</summary>
    async Task FindAsync(Connection conn, long now)
    {
        await _findGate.WaitAsync();
        try
        {
            if (MemberOf.TryGetValue(conn.PlayerId, out var current))
            {
                if (current.IsPublic) { await WithRoom(current, r => { r.Join(conn.Player, conn, now); return Task.CompletedTask; }); return; }
                await LeaveCurrentAsync(conn.PlayerId, now);
            }
            int max = Settings.Current.MaxMembersPerRoom;
            Room? best = null;
            double bestGap = double.MaxValue;
            foreach (var room in Rooms.Values.Where(r => r.IsPublic))
            {
                await WithRoom(room, r =>
                {
                    if (r.Closed || r.Members.Count >= max || !r.Members.Any(m => m.Connected)) return Task.CompletedTask;
                    double gap = Math.Abs(r.Members.Average(m => m.Player.Ordinal) - conn.Player.Ordinal);
                    if (gap < bestGap) { bestGap = gap; best = r; }
                    return Task.CompletedTask;
                });
            }
            string? err = "full";
            if (best != null) await WithRoom(best, r => { err = r.Join(conn.Player, conn, now); return Task.CompletedTask; });
            if (err != null)
            {
                var room = NewRoom(true, now);
                if (room == null) { conn.SendText("""{"t":"err","code":"full"}"""); return; }
                Log.LogInformation("Public room {Room} opened", room.Code);
                await WithRoom(room, r => { err = r.Join(conn.Player, conn, now); return Task.CompletedTask; });
            }
        }
        finally { _findGate.Release(); }
    }

    public async Task UpdateHandleAsync(Guid id, int title)
    {
        if (Connections.TryGetValue(id, out var c)) c.Player.HandleTitle = title;
        if (MemberOf.TryGetValue(id, out var room)) await WithRoom(room, r => { r.UpdateHandle(id, title); return Task.CompletedTask; });
    }

    public void Kick(Guid id)
    {
        if (Connections.TryGetValue(id, out var c)) c.Close(WebSocketCloseStatus.PolicyViolation, "banned");
    }

    public async Task TickAsync()
    {
        foreach (var room in Rooms.Values)
        {
            try { await WithRoom(room, r => r.TickAsync(Clock.Now)); }
            catch (Exception e) { Log.LogError(e, "Tick failed for room {Room}", room.Code); }
        }
    }
}

/// <summary>Advances any room whose timer has run out, and notices silent devices.</summary>
public sealed class RoomTicker(RoomManager rooms) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(100));
        while (await timer.WaitForNextTickAsync(ct)) await rooms.TickAsync();
    }
}

/// <summary>
/// A graceful restart. Shutdown begins when the host signals ApplicationStopping (SIGINT from systemd), before the web
/// server stops, so the drain runs while sockets are still open; StopAsync then waits for it. Registered after
/// <see cref="RoomTicker"/>, so it stops first and the ticker keeps ending races while it waits.
/// </summary>
public sealed class ShutdownDrain(RoomManager rooms, IHostApplicationLifetime lifetime) : IHostedService
{
    public Task StartAsync(CancellationToken ct)
    {
        lifetime.ApplicationStopping.Register(() => rooms.DrainAsync());
        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken ct)
    {
        try { await rooms.DrainAsync().WaitAsync(ct); }
        catch (OperationCanceledException) { }
    }
}
