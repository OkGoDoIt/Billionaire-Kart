using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using BillionaireKart.Server.Rooms;
using BillionaireKart.Server.Settings;

namespace BillionaireKart.Server.Web;

/// <summary>
/// The room handoff. On iPhone a room link always opens in Safari, never in the game installed on the Home Screen, and
/// the two keep separate cookies. Safari leaves the room code here; the installed game picks it up a moment later. All
/// the two share is the network address and the device, so that is the key. In memory only, single use.
/// </summary>
public sealed partial class RoomHandoff(SettingsService settings)
{
    /// <summary>Above this many entries, expired ones are swept on each offer.</summary>
    public const int SweepAt = 1_000;
    /// <summary>Never more than this many; the ones closest to expiring go first.</summary>
    public const int MaxEntries = 10_000;

    readonly ConcurrentDictionary<string, (string Code, DateTimeOffset Expires)> _waiting = new();

    public int Count => _waiting.Count;

    /// <summary>Remembers <paramref name="code"/> for this key, replacing any earlier one.</summary>
    public void Offer(string key, string code)
    {
        var now = DateTimeOffset.UtcNow;
        _waiting[key] = (code, now.AddMinutes(settings.Current.HandoffMinutes));
        if (_waiting.Count <= SweepAt) return;
        foreach (var (k, e) in _waiting) if (e.Expires <= now) _waiting.TryRemove(k, out _);
        int over = _waiting.Count - MaxEntries;
        if (over > 0)
            foreach (var (k, _) in _waiting.OrderBy(kv => kv.Value.Expires).Take(over).ToList()) _waiting.TryRemove(k, out _);
    }

    /// <summary>The waiting code for this key, if it has not expired. Taking it removes it.</summary>
    public string? Claim(string key) =>
        _waiting.TryRemove(key, out var e) && e.Expires > DateTimeOffset.UtcNow ? e.Code : null;

    public void Forget(string key) => _waiting.TryRemove(key, out _);

    /// <summary>The room code in its canonical form, or null when it cannot be one.</summary>
    public static string? NormalizeCode(string? raw)
    {
        var code = raw?.Trim().ToUpperInvariant();
        return code is { Length: 4 } && code.All(c => Wire.RoomCodeLetters.Contains(c)) ? code : null;
    }

    public static string Key(HttpContext ctx) => Key(ctx.Connection.RemoteIpAddress, ctx.Request.Headers.UserAgent.ToString());

    /// <summary>Network plus device: "203.0.113.7 iPhone 18_6". An IPv6 address counts by its /64, since phones rotate the rest.</summary>
    public static string Key(IPAddress? address, string? userAgent) => $"{Network(address)} {DeviceOf(userAgent)}";

    static string Network(IPAddress? a)
    {
        if (a == null) return "unknown";
        if (a.IsIPv4MappedToIPv6) a = a.MapToIPv4();
        if (a.AddressFamily != AddressFamily.InterNetworkV6) return a.ToString();
        var bytes = a.GetAddressBytes();
        Array.Clear(bytes, 8, 8);
        return $"{new IPAddress(bytes)}/64";
    }

    /// <summary>
    /// A coarse device from the User-Agent: the hardware and OS version only ("iPhone 18_6", "iPad 18_6",
    /// "Mac 10_15_7", "Android 14 Pixel 8"). Safari and the installed Home Screen app on one iPhone differ only in the
    /// tail after the OS (Version/x Safari/y), so the tail is left out. Anything else is a short hash of the whole UA.
    /// </summary>
    public static string DeviceOf(string? userAgent)
    {
        var ua = userAgent?.Trim() ?? "";
        if (ua.Length == 0) return "none";
        if (AppleMobile().Match(ua) is { Success: true } ios) return $"{ios.Groups[1].Value} {ios.Groups[2].Value}";
        if (Mac().Match(ua) is { Success: true } mac) return $"Mac {mac.Groups[1].Value.Replace('.', '_')}";
        if (Android().Match(ua) is { Success: true } android)
        {
            var model = android.Groups[2].Value;
            int build = model.IndexOf(" Build/", StringComparison.Ordinal);
            if (build >= 0) model = model[..build];
            model = model.Trim();
            return model.Length == 0 ? $"Android {android.Groups[1].Value}" : $"Android {android.Groups[1].Value} {model}";
        }
        return "ua " + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(ua)))[..16];
    }

    [GeneratedRegex(@"\((iPhone|iPad|iPod)\b[^)]*? OS (\d+(?:_\d+)*)")]
    private static partial Regex AppleMobile();

    [GeneratedRegex(@"\(Macintosh;[^)]*?Mac OS X (\d+(?:[_.]\d+)*)")]
    private static partial Regex Mac();

    [GeneratedRegex(@"Android (\d+(?:\.\d+)*)(?:; ([^;)]*))?")]
    private static partial Regex Android();
}
