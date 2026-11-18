using System.Globalization;
using BillionaireKart.Server.Rooms;

namespace BillionaireKart.Server.Settings;

/// <summary>One immutable snapshot of every business number. Read it once per decision; the service swaps in a new one on save.</summary>
public sealed record KartSettings
{
    public int MaxRooms { get; init; }
    public int MaxMembersPerRoom { get; init; }
    public double TrackPickSeconds { get; init; }
    public double ResultsSeconds { get; init; }
    public double PublicWaitSeconds { get; init; }
    public double PublicSoloWaitSeconds { get; init; }
    public int PublicTrackOfferCount { get; init; }
    public int PublicCc { get; init; }
    public CpuLevel PublicLevel { get; init; }
    public double RaceStartLeadSeconds { get; init; }
    public double FinishGraceSeconds { get; init; }
    public double RaceMaxSeconds { get; init; }
    public double OwnerSilenceSeconds { get; init; }
    public double SeatHoldSeconds { get; init; }
    public double RoomIdleMinutes { get; init; }
    public double HandoffMinutes { get; init; }
    public double AppSeenDays { get; init; }
    public double ShutdownDrainSeconds { get; init; }
    public double ValuationBaseDollars { get; init; }
    public double ValuationDoublingPoints { get; init; }
    public double CpuMuEasy { get; init; }
    public double CpuMuNormal { get; init; }
    public double CpuMuHard { get; init; }
    public double CpuSigma { get; init; }
    public IReadOnlyList<string> Tracks { get; init; } = [];
    public IReadOnlyDictionary<string, IReadOnlyList<string>> Cups { get; init; } = new Dictionary<string, IReadOnlyList<string>>();
    public IReadOnlyList<string> Racers { get; init; } = [];
    public IReadOnlyDictionary<string, double> TrackMinRaceSeconds { get; init; } = new Dictionary<string, double>();

    public double CpuMu(CpuLevel level) => level switch
    {
        CpuLevel.Easy => CpuMuEasy,
        CpuLevel.Normal => CpuMuNormal,
        CpuLevel.Hard => CpuMuHard,
        _ => throw new ArgumentOutOfRangeException(nameof(level)),
    };

    public long Valuation(double mu, double sigma) =>
        (long)Math.Round(ValuationBaseDollars * Math.Pow(2, (mu - 3 * sigma) / ValuationDoublingPoints));
}

public enum SettingKind { Integer, Number, Choice, List, Map, TrackSeconds }

/// <summary>How a setting looks in /admin and how its stored text is checked.</summary>
public sealed record SettingDef(
    string Key, string Group, string Label, string Description, SettingKind Kind, string Default,
    double Min = 0, double Max = 0, string[]? Choices = null, string Unit = "")
{
    public static readonly string[] AllTracks =
    [
        "silicon-valley", "bliss-hills", "crypto-cove", "datacenter-dash", "capitol-hill", "burning-circuit",
        "mars-colony", "singularity-speedway", "davos", "international-waters", "wework-memorial", "boring-tunnel",
    ];

    /// <summary>systemd stops the service with TimeoutStopSec=30 (ops/systemd/billionaire-kart.service); the drain must end
    /// before that, with time left to close sockets. Raise both together.</summary>
    public const double MaxShutdownDrainSeconds = 25;

    public static readonly IReadOnlyList<SettingDef> All =
    [
        new("MaxRooms", "Rooms", "Most rooms at once", "New rooms are refused once this many are open.", SettingKind.Integer, "200", 1, 10000),
        new("MaxMembersPerRoom", "Rooms", "Most people in a room", "Includes people watching. A race has 8 karts at most.", SettingKind.Integer, "8", 1, 8),
        new("SeatHoldSeconds", "Rooms", "Seat hold after a drop", "How long someone who lost their connection keeps their place.", SettingKind.Number, "120", 0, 3600, Unit: "seconds"),
        new("RoomIdleMinutes", "Rooms", "Empty room lifetime", "An empty room is closed after this long.", SettingKind.Number, "5", 0, 1440, Unit: "minutes"),
        new("HandoffMinutes", "Rooms", "Room link handoff", "A room link opened in Safari waits this long for the game on the Home Screen to pick it up.", SettingKind.Number, "10", 0, 1440, Unit: "minutes"),
        new("AppSeenDays", "Rooms", "Installed game memory", "A room link opened in the browser offers to open the installed game, not to install it, if the game was opened on that phone within this long.", SettingKind.Number, "30", 0, 3650, Unit: "days"),

        new("TrackPickSeconds", "Timers", "Track pick time", "How long everyone has to pick a track.", SettingKind.Number, "20", 0, 300, Unit: "seconds"),
        new("ResultsSeconds", "Timers", "Results time", "How long the results stay up before the next race.", SettingKind.Number, "25", 0, 300, Unit: "seconds"),
        new("RaceStartLeadSeconds", "Timers", "Loading time before a race", "Time between announcing a race and its countdown, so every device can load the track.", SettingKind.Number, "6", 0, 60, Unit: "seconds"),
        new("FinishGraceSeconds", "Timers", "Time after the first finish", "The race ends this long after the first person crosses the line.", SettingKind.Number, "30", 0, 600, Unit: "seconds"),
        new("RaceMaxSeconds", "Timers", "Longest race", "A race ends this long after its start, whoever has finished.", SettingKind.Number, "480", 1, 3600, Unit: "seconds"),
        new("ShutdownDrainSeconds", "Timers", "Wait for races before an update", "When the server restarts for an update, races in progress get this long to finish first.", SettingKind.Number, "25", 0, MaxShutdownDrainSeconds, Unit: "seconds"),
        new("OwnerSilenceSeconds", "Timers", "Silence before a CPU takes over", "A kart whose device has been quiet this long is driven by a CPU until it comes back.", SettingKind.Number, "2", 0.1, 60, Unit: "seconds"),

        new("PublicSoloWaitSeconds", "Public races", "Wait when alone", "How long one person waits for company before racing CPUs.", SettingKind.Number, "20", 0, 600, Unit: "seconds"),
        new("PublicWaitSeconds", "Public races", "Wait after a second person arrives", "Once a second person joins, the race waits this long for more.", SettingKind.Number, "30", 0, 600, Unit: "seconds"),
        new("PublicTrackOfferCount", "Public races", "Tracks on offer", "How many tracks a public room votes between.", SettingKind.Integer, "3", 1, 12),
        new("PublicCc", "Public races", "Engine class", "The engine class for public races.", SettingKind.Choice, "150", Choices: ["50", "100", "150", "200"], Unit: "cc"),
        new("PublicLevel", "Public races", "CPU skill", "How well the CPUs drive in public races.", SettingKind.Choice, "normal", Choices: ["easy", "normal", "hard"]),

        new("ValuationBaseDollars", "Ratings", "Starting valuation", "The valuation of a brand-new player.", SettingKind.Number, "1000000", 1, 1e12, Unit: "dollars"),
        new("ValuationDoublingPoints", "Ratings", "Points per doubling", "How many rating points double a valuation.", SettingKind.Number, "4", 0.1, 100, Unit: "points"),
        new("CpuMuEasy", "Ratings", "Easy CPU rating", "The fixed skill an easy CPU counts as.", SettingKind.Number, "20", 0, 50),
        new("CpuMuNormal", "Ratings", "Normal CPU rating", "The fixed skill a normal CPU counts as.", SettingKind.Number, "24", 0, 50),
        new("CpuMuHard", "Ratings", "Hard CPU rating", "The fixed skill a hard CPU counts as.", SettingKind.Number, "27", 0, 50),
        new("CpuSigma", "Ratings", "CPU uncertainty", "How unsure the rating is about a CPU. Smaller is surer.", SettingKind.Number, "1.5", 0.1, 10),
        new("TrackMinRaceSeconds", "Ratings", "Fastest believable race", "A finish faster than this on a track is left out of the rating. Leave a track empty for no check.", SettingKind.TrackSeconds, "", Unit: "seconds"),

        new("Tracks", "Content", "Tracks", "Track ids, separated by commas. Used for random picks and public offers.", SettingKind.List, string.Join(", ", AllTracks)),
        new("Cups", "Content", "Cups", "One cup per line: the cup id, a colon, and its four track ids.", SettingKind.Map,
            "seed: silicon-valley, bliss-hills, crypto-cove, datacenter-dash\nunicorn: capitol-hill, burning-circuit, mars-colony, singularity-speedway\noffshore: international-waters, boring-tunnel, davos, wework-memorial"),
        new("Racers", "Content", "Racers", "Racer ids, separated by commas.", SettingKind.List,
            "elon, sam, zuck, bezos, jensen, satya, dario, demis, trump, cook, larrysergey, bill, thiel, holmes, ellison, murdoch"),
    ];

    public static readonly IReadOnlyDictionary<string, SettingDef> ByKey = All.ToDictionary(d => d.Key);

    static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    /// <summary>Checks a value and returns it in its stored form, or an error a person can act on.</summary>
    public (string? Value, string? Error) Normalize(string? raw)
    {
        raw = (raw ?? "").Trim();
        switch (Kind)
        {
            case SettingKind.Integer:
                if (!int.TryParse(raw, NumberStyles.Integer, Inv, out var i)) return (null, "Enter a whole number.");
                if (i < Min || i > Max) return (null, $"Enter a number from {Min.ToString(Inv)} to {Max.ToString(Inv)}.");
                return (i.ToString(Inv), null);
            case SettingKind.Number:
                if (!double.TryParse(raw, NumberStyles.Float, Inv, out var d) || !double.IsFinite(d)) return (null, "Enter a number.");
                if (d < Min || d > Max) return (null, $"Enter a number from {Min.ToString(Inv)} to {Max.ToString(Inv)}.");
                return (d.ToString("R", Inv), null);
            case SettingKind.Choice:
                return Choices!.Contains(raw) ? (raw, null) : (null, "Pick one of the choices.");
            case SettingKind.List:
            {
                var items = SplitList(raw);
                if (items.Count == 0) return (null, "Enter at least one id.");
                if (items.Any(x => !IsId(x))) return (null, "Ids use lowercase letters, digits, and dashes.");
                return (string.Join(", ", items.Distinct()), null);
            }
            case SettingKind.Map:
            {
                var map = ParseMap(raw, out var err);
                if (err != null) return (null, err);
                if (map.Count == 0) return (null, "Enter at least one cup.");
                if (map.Values.Any(v => v.Count != 4)) return (null, "Each cup needs exactly four tracks.");
                return (string.Join("\n", map.Select(kv => $"{kv.Key}: {string.Join(", ", kv.Value)}")), null);
            }
            case SettingKind.TrackSeconds:
            {
                var map = ParseMap(raw, out var err);
                if (err != null) return (null, err);
                var parts = new List<string>();
                foreach (var (track, vals) in map)
                {
                    if (vals.Count != 1 || !double.TryParse(vals[0], NumberStyles.Float, Inv, out var s) || s < 0 || s > 3600)
                        return (null, $"Enter seconds from 0 to 3600 for {track}.");
                    parts.Add($"{track}: {s.ToString("R", Inv)}");
                }
                return (string.Join("\n", parts), null);
            }
            default:
                throw new ArgumentOutOfRangeException(nameof(Kind));
        }
    }

    public static List<string> SplitList(string raw) =>
        raw.Split([',', '\n', ' ', '\t', '\r'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    public static bool IsId(string s) => s.Length is > 0 and <= 64 && s.All(c => c is >= 'a' and <= 'z' or >= '0' and <= '9' or '-');

    public static Dictionary<string, List<string>> ParseMap(string raw, out string? error)
    {
        error = null;
        var map = new Dictionary<string, List<string>>();
        foreach (var line0 in raw.Split('\n'))
        {
            var line = line0.Trim();
            if (line.Length == 0) continue;
            var colon = line.IndexOf(':');
            if (colon <= 0) { error = $"Put a colon after the id in \"{line}\"."; return map; }
            var key = line[..colon].Trim();
            if (!IsId(key)) { error = $"\"{key}\" is not a valid id."; return map; }
            var vals = SplitList(line[(colon + 1)..]);
            if (vals.Count == 0) continue;
            map[key] = vals;
        }
        return map;
    }

    public static KartSettings Build(IReadOnlyDictionary<string, string> v)
    {
        string S(string k) => v.TryGetValue(k, out var s) ? s : ByKey[k].Default;
        int I(string k) => int.Parse(S(k), Inv);
        double D(string k) => double.Parse(S(k), Inv);
        return new KartSettings
        {
            MaxRooms = I("MaxRooms"),
            MaxMembersPerRoom = I("MaxMembersPerRoom"),
            TrackPickSeconds = D("TrackPickSeconds"),
            ResultsSeconds = D("ResultsSeconds"),
            PublicWaitSeconds = D("PublicWaitSeconds"),
            PublicSoloWaitSeconds = D("PublicSoloWaitSeconds"),
            PublicTrackOfferCount = I("PublicTrackOfferCount"),
            PublicCc = I("PublicCc"),
            PublicLevel = Enum.Parse<CpuLevel>(S("PublicLevel"), ignoreCase: true),
            RaceStartLeadSeconds = D("RaceStartLeadSeconds"),
            FinishGraceSeconds = D("FinishGraceSeconds"),
            RaceMaxSeconds = D("RaceMaxSeconds"),
            OwnerSilenceSeconds = D("OwnerSilenceSeconds"),
            SeatHoldSeconds = D("SeatHoldSeconds"),
            RoomIdleMinutes = D("RoomIdleMinutes"),
            HandoffMinutes = D("HandoffMinutes"),
            AppSeenDays = D("AppSeenDays"),
            ShutdownDrainSeconds = D("ShutdownDrainSeconds"),
            ValuationBaseDollars = D("ValuationBaseDollars"),
            ValuationDoublingPoints = D("ValuationDoublingPoints"),
            CpuMuEasy = D("CpuMuEasy"),
            CpuMuNormal = D("CpuMuNormal"),
            CpuMuHard = D("CpuMuHard"),
            CpuSigma = D("CpuSigma"),
            Tracks = SplitList(S("Tracks")),
            Cups = ParseMap(S("Cups"), out _).ToDictionary(kv => kv.Key, kv => (IReadOnlyList<string>)kv.Value),
            Racers = SplitList(S("Racers")),
            TrackMinRaceSeconds = ParseMap(S("TrackMinRaceSeconds"), out _)
                .ToDictionary(kv => kv.Key, kv => double.Parse(kv.Value[0], Inv)),
        };
    }
}
