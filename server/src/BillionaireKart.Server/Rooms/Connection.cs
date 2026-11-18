using System.Net.WebSockets;
using System.Text;
using System.Threading.Channels;

namespace BillionaireKart.Server.Rooms;

/// <summary>Server time in ms on a monotonic clock. Clients learn its offset from ping/pong.</summary>
public static class Clock
{
    public static long Now => Environment.TickCount64;
}

/// <summary>What the server knows about a player while they are connected.</summary>
public sealed class PlayerInfo
{
    public required Guid Id { get; init; }
    public int HandleTitle { get; set; }
    public int HandleNumber { get; set; }
    public double Mu { get; set; }
    public double Sigma { get; set; }
    public double Ordinal => Mu - 3 * Sigma;
}

/// <summary>
/// One WebSocket. Sends go through a bounded queue drained by a single writer, so a room never waits on a slow device;
/// a device that falls this far behind is disconnected.
/// </summary>
public sealed class Connection(WebSocket ws, PlayerInfo player, ILogger log)
{
    const int QueueLimit = 2048;
    /// <summary>Snapshots are only worth sending fresh. Past this backlog (about a second of a full grid) new ones are
    /// skipped instead of queued, so a device that stalled catches up on the present, not on a replay of the past.</summary>
    const int SnapshotBacklogLimit = 240;

    readonly Channel<Frame> _frames = Channel.CreateBounded<Frame>(
        new BoundedChannelOptions(QueueLimit) { SingleReader = true, FullMode = BoundedChannelFullMode.Wait });
    WebSocketCloseStatus _closeStatus = WebSocketCloseStatus.NormalClosure;
    string _closeReason = "";
    int _closed;
    int _queued;

    public PlayerInfo Player { get; } = player;
    public Guid PlayerId => Player.Id;
    public bool HasSaidHello { get; set; }
    public bool IsClosed => Volatile.Read(ref _closed) == 1;

    public void SendText(string json) => Enqueue(Frame.Text(json));
    public void SendBinary(ReadOnlyMemory<byte> data) => Enqueue(Frame.Binary(data));

    void Enqueue(Frame f)
    {
        if (IsClosed) return;
        if (!f.IsText && Volatile.Read(ref _queued) > SnapshotBacklogLimit) return;
        Interlocked.Increment(ref _queued);
        if (!_frames.Writer.TryWrite(f))
        {
            Interlocked.Decrement(ref _queued);
            log.LogWarning("Send queue full for player {PlayerId}; disconnecting", PlayerId);
            Close(WebSocketCloseStatus.PolicyViolation, "too slow");
        }
    }

    /// <summary>Closes after everything already queued has been sent.</summary>
    public void Close(WebSocketCloseStatus status, string reason)
    {
        if (Interlocked.Exchange(ref _closed, 1) == 1) return;
        _closeStatus = status;
        _closeReason = reason;
        _frames.Writer.TryComplete();
    }

    public async Task RunWriterAsync(CancellationToken ct)
    {
        try
        {
            await foreach (var f in _frames.Reader.ReadAllAsync(ct))
            {
                Interlocked.Decrement(ref _queued);
                if (ws.State is not (WebSocketState.Open or WebSocketState.CloseReceived)) break;
                await ws.SendAsync(f.Data, f.IsText ? WebSocketMessageType.Text : WebSocketMessageType.Binary, true, ct);
            }
            if (ws.State is WebSocketState.Open or WebSocketState.CloseReceived)
                await ws.CloseOutputAsync(_closeStatus, _closeReason, ct);
        }
        catch (Exception e) when (e is WebSocketException or OperationCanceledException or ObjectDisposedException)
        {
            // The device went away; the reader notices too.
        }
    }

    readonly record struct Frame(ReadOnlyMemory<byte> Data, bool IsText)
    {
        public static Frame Text(string s) => new(Encoding.UTF8.GetBytes(s), true);
        public static Frame Binary(ReadOnlyMemory<byte> d) => new(d, false);
    }
}
