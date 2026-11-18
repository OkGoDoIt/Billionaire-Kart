namespace BillionaireKart.Server.Rooms;

public enum Phase { Lobby, Track, Race, Results }
public enum RaceMode { Single, Cup }
public enum CpuLevel { Easy, Normal, Hard }
public enum PickMode { Vote, Host }

public static class Wire
{
    public static string Name(Phase p) => p switch
    {
        Phase.Lobby => "lobby",
        Phase.Track => "track",
        Phase.Race => "race",
        Phase.Results => "results",
        _ => throw new ArgumentOutOfRangeException(nameof(p)),
    };

    public static string Name(RaceMode m) => m switch
    {
        RaceMode.Single => "single",
        RaceMode.Cup => "cup",
        _ => throw new ArgumentOutOfRangeException(nameof(m)),
    };

    public static string Name(CpuLevel l) => l switch
    {
        CpuLevel.Easy => "easy",
        CpuLevel.Normal => "normal",
        CpuLevel.Hard => "hard",
        _ => throw new ArgumentOutOfRangeException(nameof(l)),
    };

    public static string Name(PickMode p) => p switch
    {
        PickMode.Vote => "vote",
        PickMode.Host => "host",
        _ => throw new ArgumentOutOfRangeException(nameof(p)),
    };

    public static bool TryMode(string? s, out RaceMode m) => TryParse(s, out m);
    public static bool TryLevel(string? s, out CpuLevel l) => TryParse(s, out l);
    public static bool TryPick(string? s, out PickMode p) => TryParse(s, out p);

    /// <summary>Wire names are the enum names in lowercase; only exact lowercase names are accepted.</summary>
    static bool TryParse<T>(string? s, out T value) where T : struct, Enum
    {
        value = default;
        if (s == null || s.Length == 0 || s != s.ToLowerInvariant() || s.Any(char.IsDigit)) return false;
        return Enum.TryParse(s, ignoreCase: true, out value) && Enum.IsDefined(value);
    }

    public static readonly int[] CcChoices = [50, 100, 150, 200];
    public static readonly int[] CupPoints = [15, 12, 10, 8, 6, 4, 2, 1];
    public const string RoomCodeLetters = "BCDFGHJKLMNPQRSTVWXZ";
    public const int Proto = 1;
    /// <summary>The oldest client protocol still accepted: the one before the current, so a cached client survives a deploy.</summary>
    public const int MinProto = 1;   // becomes Proto - 1 at the first protocol change
    public const int MaxTextBytes = 4096;
    public const int MaxBinaryBytes = 256;
    public const int MaxFramesPerSecond = 400;
}

public sealed class Rules
{
    public RaceMode Mode { get; set; } = RaceMode.Single;
    public string? Cup { get; set; }
    public int Cc { get; set; } = 150;
    public CpuLevel Level { get; set; } = CpuLevel.Normal;
    public bool Cpus { get; set; } = true;
    public PickMode Pick { get; set; } = PickMode.Vote;
}

public sealed class Member
{
    public required PlayerInfo Player { get; set; }
    public Guid Id => Player.Id;
    public string? Racer { get; set; }
    /// <summary>A typed name, private rooms only. In memory only: never stored or logged.</summary>
    public string? Name { get; set; }
    public bool Ready { get; set; }
    public Connection? Conn { get; set; }
    public bool Connected => Conn != null;
    public bool Spectating { get; set; }
    public string? Track { get; set; }
    public long JoinedAt { get; set; }
    public long ConnectedSince { get; set; }
    public long DisconnectedAt { get; set; }
    public long LastFrameAt { get; set; }
}

public sealed class Slot
{
    public int Index { get; init; }
    public required string Racer { get; init; }
    public Guid? Member { get; init; }
    public CpuLevel? Level { get; init; }
    public Guid Owner { get; set; }
    public bool HasSnapshot { get; set; }
    public float Distance { get; set; }
    public uint Step { get; set; }
}

public sealed record FinishEntry(int Slot, double Time)
{
    public int Rank { get; set; }
}

public sealed class RaceState
{
    public int N { get; init; }
    public required string TrackId { get; init; }
    public int Seed { get; init; }
    public long StartAt { get; init; }
    public List<Slot> Slots { get; } = [];
    public List<FinishEntry> Finished { get; } = [];
    public long? FirstHumanFinishAt { get; set; }
}

public sealed class CupState
{
    public int Index { get; set; }
    public required List<string> Tracks { get; init; }
    public Dictionary<string, int> Totals { get; } = [];
    /// <summary>Kept for the whole cup so the CPU field (and its totals) stays the same. Not sent.</summary>
    public List<string> CpuRacers { get; } = [];
}

public sealed record ResultRow(int Slot, string Racer, Guid? Member, int Rank, double? Time, bool Estimated, int Points,
    long? Before, long? After);

public sealed record LastResults(string TrackId, List<ResultRow> Results);
