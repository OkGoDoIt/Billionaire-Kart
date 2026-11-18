using System.Globalization;
using BillionaireKart.Server.Rooms;

namespace BillionaireKart.Server.Pages.Admin;

/// <summary>How the admin writes values for people.</summary>
public static class Fmt
{
    static readonly CultureInfo Us = CultureInfo.InvariantCulture; // formats numbers and dates the US way

    /// <summary>The handle's words live in the game; the admin shows the two numbers.</summary>
    public static string Handle(int title, int number) => $"No. {number} (title {title})";

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
