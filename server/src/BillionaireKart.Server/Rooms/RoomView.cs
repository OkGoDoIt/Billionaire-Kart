using System.Text.Json;
using BillionaireKart.Server.Settings;

namespace BillionaireKart.Server.Rooms;

/// <summary>The room as the wire contract spells it (docs/online-protocol.md).</summary>
public static class RoomView
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static object Build(Room r, KartSettings s) => new
    {
        code = r.Code,
        @public = r.IsPublic,
        host = r.Host,
        phase = Wire.Name(r.Phase),
        until = r.Until,
        rules = new
        {
            mode = Wire.Name(r.Rules.Mode),
            cup = r.Rules.Cup,
            cc = r.Rules.Cc,
            level = Wire.Name(r.Rules.Level),
            cpus = r.Rules.Cpus,
            pick = Wire.Name(r.Rules.Pick),
        },
        members = r.Members.Select(m => new
        {
            id = m.Id,
            handle = new { title = m.Player.HandleTitle, number = m.Player.HandleNumber },
            name = r.IsPublic ? null : m.Name,   // a typed name is only ever seen by the people you invited
            racer = m.Racer,
            ready = m.Ready,
            connected = m.Connected,
            spectating = m.Spectating,
            valuation = (long?)s.Valuation(m.Player.Mu, m.Player.Sigma),
            track = m.Track,
        }),
        race = r.Race is not { } race ? null : new
        {
            n = race.N,
            trackId = race.TrackId,
            seed = race.Seed,
            laps = (int?)null,
            startAt = race.StartAt,
            slots = race.Slots.Select(sl => new
            {
                slot = sl.Index,
                racer = sl.Racer,
                member = sl.Member,
                level = sl.Level is { } l ? Wire.Name(l) : null,
                owner = sl.Owner,
            }),
            finished = race.Finished.Select(f => new { slot = f.Slot, time = f.Time, rank = f.Rank }),
        },
        offer = r.Offer,
        cupState = r.Cup is not { } cup ? null : new { index = cup.Index, tracks = cup.Tracks, totals = cup.Totals },
        last = r.Last is not { } last ? null : new
        {
            trackId = last.TrackId,
            results = last.Results.Select(x => new
            {
                slot = x.Slot, racer = x.Racer, member = x.Member, rank = x.Rank, time = x.Time,
                estimated = x.Estimated, points = x.Points, before = x.Before, after = x.After,
            }),
        },
    };
}
