using System.Collections.Concurrent;
using BillionaireKart.Server.Settings;

namespace BillionaireKart.Server.Web;

/// <summary>
/// Which devices have opened the installed (Home Screen) game lately, by <see cref="RoomHandoff.Key(HttpContext)"/>, so a
/// room link opened in the phone's browser can say "open the game" instead of "install it". In memory only; the
/// player's AppSeenAt column covers the same question across restarts and networks.
/// </summary>
public sealed class InstalledApp(SettingsService settings)
{
    /// <summary>Above this many entries, stale ones are swept, at most once a minute.</summary>
    public const int SweepAt = 1_000;
    /// <summary>Never more than this many; the longest unseen go first.</summary>
    public const int MaxEntries = 10_000;
    /// <summary>A player's AppSeenAt is written at most this often.</summary>
    public static readonly TimeSpan WriteEvery = TimeSpan.FromMinutes(10);

    readonly ConcurrentDictionary<string, DateTimeOffset> _seen = new();
    DateTimeOffset _lastSweep;

    public int Count => _seen.Count;

    public void Seen(string key)
    {
        var now = DateTimeOffset.UtcNow;
        _seen[key] = now;
        if (_seen.Count <= SweepAt) return;
        if (now - _lastSweep >= TimeSpan.FromMinutes(1))
        {
            _lastSweep = now;
            var since = Since(now);
            foreach (var (k, at) in _seen) if (at <= since) _seen.TryRemove(k, out _);
        }
        int over = _seen.Count - MaxEntries;
        if (over > 0)
            foreach (var (k, _) in _seen.OrderBy(kv => kv.Value).Take(over).ToList()) _seen.TryRemove(k, out _);
    }

    public bool SeenLately(string key) => _seen.TryGetValue(key, out var at) && at > Since(DateTimeOffset.UtcNow);

    /// <summary>Anything seen at or before this is too old to count.</summary>
    public DateTimeOffset Since(DateTimeOffset now) => now.AddDays(-settings.Current.AppSeenDays);
}
