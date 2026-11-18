using System.Text;
using BillionaireKart.Server.Rooms;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Data;

public sealed class Player
{
    public Guid Id { get; set; }
    public int HandleTitle { get; set; }
    public int HandleNumber { get; set; }
    public double Mu { get; set; }
    public double Sigma { get; set; }
    /// <summary>Rated races taken part in.</summary>
    public int Races { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public DateTimeOffset? BannedAt { get; set; }
}

/// <summary>A rated (public) race. Private races are not stored.</summary>
public sealed class Race
{
    public long Id { get; set; }
    public string RoomCode { get; set; } = "";
    public string TrackId { get; set; } = "";
    public int Cc { get; set; }
    public CpuLevel Level { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset EndedAt { get; set; }
    public DateTimeOffset? VoidedAt { get; set; }
    public List<RaceResult> Results { get; set; } = [];
}

public sealed class RaceResult
{
    public long Id { get; set; }
    public long RaceId { get; set; }
    public Race Race { get; set; } = null!;
    public int Slot { get; set; }
    public string Racer { get; set; } = "";
    /// <summary>Null for a CPU kart.</summary>
    public Guid? PlayerId { get; set; }
    public CpuLevel? CpuLevel { get; set; }
    public int Rank { get; set; }
    public double? TimeSeconds { get; set; }
    public bool Estimated { get; set; }
    /// <summary>The member had left or was disconnected when the race ended.</summary>
    public bool Absent { get; set; }
    /// <summary>Failed a sanity check and was left out of the rating.</summary>
    public bool Voided { get; set; }
    public double? MuBefore { get; set; }
    public double? SigmaBefore { get; set; }
    public double? MuAfter { get; set; }
    public double? SigmaAfter { get; set; }
    public long? ValuationBefore { get; set; }
    public long? ValuationAfter { get; set; }
}

public enum ShareMode { Race, Gp, Trial, Cup }

/// <summary>A shared result: the card picture people see in a link preview, the words around it, and the challenge a friend races against.</summary>
public sealed class Share
{
    /// <summary>Made by the game before the upload, so the link exists the moment the player taps Share.</summary>
    public string Id { get; set; } = "";
    public Guid PlayerId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public ShareMode Mode { get; set; }
    public string Racer { get; set; } = "";
    public string? TrackId { get; set; }
    public string? CupId { get; set; }
    public int Cc { get; set; }
    public int? Rank { get; set; }
    public int? FieldSize { get; set; }
    /// <summary>Null when the racer did not finish, and for a cup.</summary>
    public int? TimeMs { get; set; }
    public int? Points { get; set; }
    /// <summary>The preview's title: the challenge, in the sharer's voice.</summary>
    public string Title { get; set; } = "";
    /// <summary>The preview's description: the card's headline.</summary>
    public string Description { get; set; } = "";
    public byte[] Image { get; set; } = [];
}

public sealed class SettingRow
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class KartDb(DbContextOptions<KartDb> options) : DbContext(options)
{
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Race> Races => Set<Race>();
    public DbSet<RaceResult> RaceResults => Set<RaceResult>();
    public DbSet<SettingRow> Settings => Set<SettingRow>();
    public DbSet<Share> Shares => Set<Share>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Player>(e =>
        {
            e.ToTable("players");
            e.HasIndex(p => p.HandleNumber);
        });
        b.Entity<Race>(e =>
        {
            e.ToTable("races");
            e.Property(r => r.Level).HasConversion<string>();
            e.HasIndex(r => r.EndedAt);
        });
        b.Entity<RaceResult>(e =>
        {
            e.ToTable("race_results");
            e.Property(r => r.CpuLevel).HasConversion<string>();
            e.HasOne(r => r.Race).WithMany(r => r.Results).HasForeignKey(r => r.RaceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Player>().WithMany().HasForeignKey(r => r.PlayerId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(r => new { r.PlayerId, r.RaceId });
        });
        b.Entity<Share>(e =>
        {
            e.ToTable("shares");
            e.Property(x => x.Id).HasMaxLength(16);
            e.Property(x => x.Mode).HasConversion<string>();
            e.Property(x => x.Racer).HasMaxLength(64);
            e.Property(x => x.TrackId).HasMaxLength(64);
            e.Property(x => x.CupId).HasMaxLength(64);
            e.Property(x => x.Title).HasMaxLength(140);
            e.Property(x => x.Description).HasMaxLength(240);
            e.HasOne<Player>().WithMany().HasForeignKey(x => x.PlayerId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.PlayerId, x.CreatedAt });
        });
        b.Entity<SettingRow>(e =>
        {
            e.ToTable("settings");
            e.HasKey(s => s.Key);
        });

        // snake_case names throughout, without another package.
        foreach (var entity in b.Model.GetEntityTypes())
        {
            foreach (var p in entity.GetProperties()) p.SetColumnName(Snake(p.Name));
            foreach (var k in entity.GetKeys()) k.SetName(Snake(k.GetName() ?? ""));
            foreach (var fk in entity.GetForeignKeys()) fk.SetConstraintName(Snake(fk.GetConstraintName() ?? ""));
            foreach (var ix in entity.GetIndexes()) ix.SetDatabaseName(Snake(ix.GetDatabaseName() ?? ""));
        }
    }

    static string Snake(string name)
    {
        var sb = new StringBuilder(name.Length + 8);
        for (int i = 0; i < name.Length; i++)
        {
            char c = name[i];
            if (char.IsUpper(c))
            {
                if (i > 0 && name[i - 1] != '_' && !char.IsUpper(name[i - 1])) sb.Append('_');
                sb.Append(char.ToLowerInvariant(c));
            }
            else sb.Append(c);
        }
        return sb.ToString();
    }
}
