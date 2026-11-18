using System.Globalization;
using BillionaireKart.Server.Rooms;

namespace BillionaireKart.Server.Pages.Admin;

/// <summary>How the admin writes values for people.</summary>
public static class Fmt
{
    static readonly CultureInfo Us = CultureInfo.InvariantCulture; // formats numbers and dates the US way

    /// <summary>The handle's words live in the game (src/content/handles.js, embedded at build); the admin reads the same list.</summary>
    static readonly string[] Titles = LoadTitles();

    static string[] LoadTitles()
    {
        using var stream = typeof(Fmt).Assembly.GetManifestResourceStream("handles.js");
        if (stream == null) return [];
        var text = new StreamReader(stream).ReadToEnd();
        int a = text.IndexOf("HANDLE_TITLES = [", StringComparison.Ordinal), b = a < 0 ? -1 : text.IndexOf("];", a, StringComparison.Ordinal);
        return a < 0 || b < 0 ? [] : System.Text.RegularExpressions.Regex.Matches(text[a..b], "'([^']+)'").Select(m => m.Groups[1].Value).ToArray();
    }

    public static string Handle(int title, int number) =>
        $"{(title >= 0 && title < Titles.Length ? Titles[title] : "Racer")} {number:0000}";

    public static string Money(long dollars) => "$" + dollars.ToString("N0", Us);

    public static string Signed(long dollars) => (dollars >= 0 ? "+" : "−") + Money(Math.Abs(dollars));

    public static string When(DateTimeOffset t)
    {
        var ago = DateTimeOffset.UtcNow - t;
        if (ago < TimeSpan.FromMinutes(1)) return "just now";
        if (ago < TimeSpan.FromHours(1)) return $"{(int)ago.TotalMinutes} min ago";
        if (ago < TimeSpan.FromDays(1)) return $"{(int)ago.TotalHours} h ago";
        return t.UtcDateTime.ToString("MMM d, yyyy", Us);
    }

    public static string Time(double? seconds) =>
        seconds is double s ? TimeSpan.FromSeconds(s).ToString(s >= 3600 ? @"h\:mm\:ss\.ff" : @"m\:ss\.ff", Us) : "—";

    public static string Phase(Phase p) => p switch
    {
        Rooms.Phase.Lobby => "Lobby",
        Rooms.Phase.Track => "Picking a track",
        Rooms.Phase.Race => "Racing",
        Rooms.Phase.Results => "Results",
        _ => throw new ArgumentOutOfRangeException(nameof(p)),
    };

    public static string Level(CpuLevel l) => l switch
    {
        CpuLevel.Easy => "Easy",
        CpuLevel.Normal => "Normal",
        CpuLevel.Hard => "Hard",
        _ => throw new ArgumentOutOfRangeException(nameof(l)),
    };
}
