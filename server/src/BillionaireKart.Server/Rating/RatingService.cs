using BillionaireKart.Server.Data;
using BillionaireKart.Server.Rooms;
using BillionaireKart.Server.Settings;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Rating;

/// <summary>One kart's place in a finished race, in finishing order.</summary>
public sealed record RatedEntry(int Slot, string Racer, Guid? PlayerId, CpuLevel? CpuLevel, double? Time, bool Estimated, bool Absent, bool Voided);

public sealed record RatingChange(long Before, long After, double Mu, double Sigma);

public sealed class RatingService(IServiceScopeFactory scopes, SettingsService settings, ILogger<RatingService> log)
{
    /// <summary>
    /// Rates a public race and stores it. <paramref name="entries"/> are in final order (index 0 won).
    /// Returns each rated human's valuation before and after. Voided karts and CPUs keep their ratings.
    /// </summary>
    public async Task<Dictionary<Guid, RatingChange>> RateAndStoreAsync(
        string roomCode, string trackId, int cc, CpuLevel level, DateTimeOffset startedAt, IReadOnlyList<RatedEntry> entries)
    {
        var s = settings.Current;
        var changes = new Dictionary<Guid, RatingChange>();
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KartDb>();

        var ids = entries.Where(e => e.PlayerId != null).Select(e => e.PlayerId!.Value).Distinct().ToList();
        var players = await db.Players.Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);

        var rated = entries.Where(e => !e.Voided && (e.PlayerId == null || players.ContainsKey(e.PlayerId.Value))).ToList();
        if (rated.Count < 2) return changes;

        var before = rated.Select(e => e.PlayerId is Guid id
            ? new Skill(players[id].Mu, players[id].Sigma)
            : new Skill(s.CpuMu(e.CpuLevel ?? CpuLevel.Normal), s.CpuSigma)).ToList();
        var after = OpenSkill.Rate(before);

        // The winner never falls and last place never rises.
        if (rated.Count >= 3)
        {
            after[0] = NotBelow(before[0], after[0]);
            after[^1] = NotAbove(before[^1], after[^1]);
        }

        var race = new Race
        {
            RoomCode = roomCode, TrackId = trackId, Cc = cc, Level = level,
            StartedAt = startedAt, EndedAt = DateTimeOffset.UtcNow,
        };
        for (int i = 0; i < entries.Count; i++)
        {
            var e = entries[i];
            var r = new RaceResult
            {
                Slot = e.Slot, Racer = e.Racer, PlayerId = e.PlayerId, CpuLevel = e.CpuLevel, Rank = i + 1,
                TimeSeconds = e.Time, Estimated = e.Estimated, Absent = e.Absent, Voided = e.Voided,
            };
            if (e.PlayerId is Guid pid && players.TryGetValue(pid, out var p))
            {
                r.MuBefore = p.Mu; r.SigmaBefore = p.Sigma;
                r.ValuationBefore = s.Valuation(p.Mu, p.Sigma);
                int k = rated.IndexOf(e);
                if (k >= 0)
                {
                    p.Mu = after[k].Mu; p.Sigma = after[k].Sigma; p.Races++;
                }
                r.MuAfter = p.Mu; r.SigmaAfter = p.Sigma;
                r.ValuationAfter = s.Valuation(p.Mu, p.Sigma);
                changes[pid] = new RatingChange(r.ValuationBefore.Value, r.ValuationAfter.Value, p.Mu, p.Sigma);
            }
            race.Results.Add(r);
        }
        db.Races.Add(race);
        await db.SaveChangesAsync();
        log.LogInformation("Rated race {RaceId} on {Track} in room {Room}: {Humans} people, {Karts} karts",
            race.Id, trackId, roomCode, changes.Count, entries.Count);
        return changes;
    }

    static Skill NotBelow(Skill before, Skill after) =>
        after.Ordinal >= before.Ordinal ? after : after with { Mu = before.Ordinal + 3 * after.Sigma };

    static Skill NotAbove(Skill before, Skill after) =>
        after.Ordinal <= before.Ordinal ? after : after with { Mu = before.Ordinal + 3 * after.Sigma };
}
