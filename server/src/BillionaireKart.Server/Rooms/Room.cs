using System.Text.Json;
using BillionaireKart.Server.Rating;
using BillionaireKart.Server.Settings;

namespace BillionaireKart.Server.Rooms;

/// <summary>
/// One room. Every method here runs with <see cref="Gate"/> held, so a room handles one message at a time.
/// Methods that change what members can see end by sending everyone the full room.
/// </summary>
public sealed class Room(string code, bool isPublic, RoomManager manager, long now)
{
    public readonly SemaphoreSlim Gate = new(1, 1);

    public string Code { get; } = code;
    public bool IsPublic { get; } = isPublic;
    public Guid? Host { get; private set; }
    public Phase Phase { get; private set; } = Phase.Lobby;
    public long? Until { get; private set; }
    public Rules Rules { get; } = new();
    public List<Member> Members { get; } = [];
    public RaceState? Race { get; private set; }
    public List<string>? Offer { get; private set; }
    public CupState? Cup { get; private set; }
    public LastResults? Last { get; private set; }
    public bool Closed { get; private set; }

    long _emptySince = now;
    int _raceCount;
    bool _secondArrived;

    KartSettings S => manager.Settings.Current;
    static Random Rng => Random.Shared;

    public Member? Find(Guid id) => Members.Find(m => m.Id == id);

    // ---------- membership ----------

    public void Setup(long now)
    {
        if (IsPublic)
        {
            var s = S;
            Rules.Mode = RaceMode.Single; Rules.Cup = null; Rules.Cc = s.PublicCc; Rules.Level = s.PublicLevel;
            Rules.Cpus = true; Rules.Pick = PickMode.Vote;
            Until = now + Ms(s.PublicSoloWaitSeconds);
        }
    }

    /// <summary>Adds a player, or re-binds their connection if they already have a seat. Returns an error code or null.</summary>
    public string? Join(PlayerInfo player, Connection? conn, long now)
    {
        if (Closed) return "no_room";
        var m = Find(player.Id);
        if (m != null)
        {
            m.Player = player;
            if (conn != null) Attach(m, conn, now);
            else Broadcast();
            return null;
        }
        if (Members.Count >= S.MaxMembersPerRoom) return "full";

        m = new Member
        {
            Player = player, JoinedAt = now, ConnectedSince = now, LastFrameAt = now, Conn = conn,
            DisconnectedAt = conn == null ? now : 0,
            Spectating = Phase == Phase.Race && Race != null && !Race.Slots.Any(sl => sl.Member == player.Id),
        };
        Members.Add(m);
        manager.MemberOf[player.Id] = this;
        Host ??= player.Id;

        if (IsPublic && Phase == Phase.Lobby && !_secondArrived && Members.Count >= 2)
        {
            _secondArrived = true;
            Until = now + Ms(S.PublicWaitSeconds);
        }
        // A full grid has nobody left to wait for.
        if (IsPublic && Phase == Phase.Lobby && Members.Count >= S.MaxMembersPerRoom) Until = now;
        ReassignOwners(now);
        Broadcast();
        return null;
    }

    public void Attach(Member m, Connection conn, long now)
    {
        var old = m.Conn;
        m.Conn = conn;
        m.Player = conn.Player;
        if (old == null) m.ConnectedSince = now;
        m.DisconnectedAt = 0;
        m.LastFrameAt = now;
        ReassignOwners(now);
        Broadcast();
    }

    /// <summary>A connection closed. The member keeps their seat for a while.</summary>
    public async Task DetachAsync(Connection conn, long now)
    {
        var m = Members.Find(x => x.Conn == conn);
        if (m == null) return;
        m.Conn = null;
        m.Away = false;   // a dropped device shows as reconnecting, not away
        m.DisconnectedAt = now;
        if (Host == m.Id && IsPublic) Host = PickHost();
        ReassignOwners(now);
        Broadcast();
        await CheckPhaseDoneAsync(now);
    }

    public async Task LeaveAsync(Guid id, long now)
    {
        var m = Find(id);
        if (m == null) return;
        Members.Remove(m);
        manager.MemberOf.TryRemove(new KeyValuePair<Guid, Room>(id, this));
        if (Members.Count == 0) _emptySince = now;
        if (Host == id) Host = PickHost();
        ReassignOwners(now);
        Broadcast();
        await CheckPhaseDoneAsync(now);
    }

    /// <summary>The member connected the longest, preferring connected ones.</summary>
    Guid? PickHost() =>
        Members.OrderBy(m => m.Connected ? 0 : 1).ThenBy(m => m.ConnectedSince).ThenBy(m => m.JoinedAt).FirstOrDefault()?.Id;

    public void UpdateHandle(Guid id, int title)
    {
        var m = Find(id);
        if (m == null) return;
        m.Player.HandleTitle = title;
        Broadcast();
    }

    public void Kick(Guid id) => Find(id)?.Conn?.Close(System.Net.WebSockets.WebSocketCloseStatus.PolicyViolation, "banned");

    // ---------- lobby and picks ----------

    public void SetRacer(Guid id, string? racer)
    {
        var m = Find(id);
        if (m == null) return;
        if (racer == null || !S.Racers.Contains(racer)) { Err(m, "bad"); return; }
        if (Phase == Phase.Race && Race != null && Race.Slots.Any(sl => sl.Member == id)) { SendRoom(m); return; }
        if (Members.Any(x => x != m && x.Racer == racer)) { SendRoom(m); return; }
        m.Racer = racer;
        Broadcast();
    }

    /// <summary>A typed name for this private room (docs/online-protocol.md). Public rooms refuse it.</summary>
    public void SetName(Guid id, JsonElement name)
    {
        var m = Find(id);
        if (m == null) return;
        if (IsPublic || name.ValueKind != JsonValueKind.String) { Err(m, "bad"); return; }
        m.Name = CleanName(name.GetString());
        Broadcast();
    }

    public const int NameMaxLength = 16;

    /// <summary>Printable text only, runs of whitespace collapsed, trimmed, and at most 16 text elements (an emoji is never cut in half). Empty means no name.</summary>
    public static string? CleanName(string? raw)
    {
        if (raw == null) return null;
        var sb = new System.Text.StringBuilder(raw.Length);
        bool space = false;
        foreach (var rune in raw.EnumerateRunes())
        {
            if (System.Text.Rune.IsWhiteSpace(rune)) { space = sb.Length > 0; continue; }
            var cat = System.Text.Rune.GetUnicodeCategory(rune);
            bool printable = cat switch
            {
                System.Globalization.UnicodeCategory.Control or System.Globalization.UnicodeCategory.Surrogate or
                System.Globalization.UnicodeCategory.PrivateUse or System.Globalization.UnicodeCategory.OtherNotAssigned or
                System.Globalization.UnicodeCategory.LineSeparator or System.Globalization.UnicodeCategory.ParagraphSeparator => false,
                // format characters are invisible (and can reorder text), except the joiner that holds emoji sequences together
                System.Globalization.UnicodeCategory.Format => rune.Value == 0x200D,
                _ => true,
            };
            if (!printable) continue;
            if (space) { sb.Append(' '); space = false; }
            sb.Append(rune.ToString());
        }
        var text = sb.ToString();
        var e = System.Globalization.StringInfo.GetTextElementEnumerator(text);
        var outText = new System.Text.StringBuilder();
        for (int n = 0; n < NameMaxLength && e.MoveNext(); n++) outText.Append(e.GetTextElement());
        var result = outText.ToString().Trim();
        return result.Length == 0 ? null : result;
    }

    public void SetRules(Guid id, JsonElement rules)
    {
        var m = Find(id);
        if (m == null) return;
        if (IsPublic || Host != id || Phase != Phase.Lobby || rules.ValueKind != JsonValueKind.Object) { Err(m, "bad"); return; }

        var mode = Rules.Mode; var cup = Rules.Cup; var cc = Rules.Cc; var level = Rules.Level; var cpus = Rules.Cpus; var pick = Rules.Pick;
        bool ok = true;
        foreach (var p in rules.EnumerateObject())
        {
            switch (p.Name)
            {
                case "mode": ok &= p.Value.ValueKind == JsonValueKind.String && Wire.TryMode(p.Value.GetString(), out mode); break;
                case "cup": cup = p.Value.ValueKind == JsonValueKind.String ? p.Value.GetString() : null; ok &= p.Value.ValueKind is JsonValueKind.String or JsonValueKind.Null; break;
                case "cc": ok &= p.Value.TryGetInt32(out cc) && Wire.CcChoices.Contains(cc); break;
                case "level": ok &= p.Value.ValueKind == JsonValueKind.String && Wire.TryLevel(p.Value.GetString(), out level); break;
                case "cpus": ok &= p.Value.ValueKind is JsonValueKind.True or JsonValueKind.False; if (ok) cpus = p.Value.GetBoolean(); break;
                case "pick": ok &= p.Value.ValueKind == JsonValueKind.String && Wire.TryPick(p.Value.GetString(), out pick); break;
            }
            if (!ok) break;
        }
        if (mode == RaceMode.Cup && (cup == null || !S.Cups.ContainsKey(cup))) ok = false;
        if (!ok) { Err(m, "bad"); return; }

        Rules.Mode = mode; Rules.Cup = mode == RaceMode.Cup ? cup : null; Rules.Cc = cc; Rules.Level = level; Rules.Cpus = cpus; Rules.Pick = pick;
        Cup = null;
        Broadcast();
    }

    public void Start(Guid id, long now)
    {
        var m = Find(id);
        if (m == null) return;
        if (IsPublic || Host != id || Phase != Phase.Lobby) { Err(m, "bad"); return; }
        if (manager.Draining) return;   // the device has been told "bye"
        if (Members.Any(x => x.Connected && x.Racer == null)) { Err(m, "bad"); return; }

        Last = null;
        switch (Rules.Mode)
        {
            case RaceMode.Cup:
                if (Rules.Cup == null || !S.Cups.TryGetValue(Rules.Cup, out var tracks)) { Err(m, "bad"); return; }
                Cup = new CupState { Index = 0, Tracks = tracks.ToList() };
                StartRace(Cup.Tracks[0], now);
                break;
            case RaceMode.Single:
                Cup = null;
                var hostPick = m.Track;
                if (Rules.Pick == PickMode.Host && hostPick != null) StartRace(Resolve(hostPick), now);
                else StartTrackPhase(now);
                break;
            default:
                throw new InvalidOperationException();
        }
    }

    public async Task PickTrackAsync(Guid id, string? trackId, long now)
    {
        var m = Find(id);
        if (m == null) return;
        bool hostPrePick = !IsPublic && Phase == Phase.Lobby && Rules.Pick == PickMode.Host && Host == id;
        if (Phase != Phase.Track && !hostPrePick) { Err(m, "bad"); return; }
        bool valid = trackId == "random" || (trackId != null && (IsPublic ? Offer?.Contains(trackId) == true : S.Tracks.Contains(trackId)));
        if (!valid) { Err(m, "bad"); return; }
        m.Track = trackId;
        Broadcast();
        await CheckPhaseDoneAsync(now);
    }

    public async Task ReadyAsync(Guid id, long now)
    {
        var m = Find(id);
        if (m == null) return;
        if (Phase != Phase.Results) { Err(m, "bad"); return; }
        m.Ready = true;
        Broadcast();
        await CheckPhaseDoneAsync(now);
    }

    void StartTrackPhase(long now)
    {
        Phase = Phase.Track;
        Until = now + Ms(S.TrackPickSeconds);
        Race = null;
        foreach (var m in Members) { m.Track = null; m.Ready = false; }
        Offer = IsPublic ? S.Tracks.OrderBy(_ => Rng.Next()).Take(Math.Max(1, S.PublicTrackOfferCount)).ToList() : null;
        Broadcast();
    }

    /// <summary>Turns a pick into a real track id.</summary>
    string Resolve(string pick)
    {
        if (pick != "random") return pick;
        var pool = IsPublic && Offer is { Count: > 0 } ? Offer : S.Tracks;
        return pool[Rng.Next(pool.Count)];
    }

    void ChooseTrackAndStart(long now)
    {
        string pick;
        if (!IsPublic && Rules.Pick == PickMode.Host)
            pick = Find(Host ?? Guid.Empty)?.Track ?? "random";
        else
        {
            var picks = Members.Where(m => m.Track != null).Select(m => m.Track!).ToList();
            pick = picks.Count == 0 ? "random" : picks[Rng.Next(picks.Count)];
        }
        StartRace(Resolve(pick), now);
    }

    // ---------- race ----------

    void StartRace(string trackId, long now)
    {
        var s = S;
        var humans = Members.Where(m => m.Connected).OrderBy(_ => Rng.Next()).ToList();
        foreach (var m in Members) { m.Spectating = !m.Connected; m.Ready = false; m.Away = false; }

        // Anyone without a racer gets a random free one.
        foreach (var m in humans.Where(m => m.Racer == null))
        {
            var free = s.Racers.Where(r => Members.All(x => x.Racer != r)).ToList();
            if (free.Count > 0) m.Racer = free[Rng.Next(free.Count)];
        }
        humans = humans.Where(m => m.Racer != null).Take(8).ToList();

        int slotCount = Rules.Cpus ? 8 : humans.Count;
        int cpuCount = Math.Max(0, slotCount - humans.Count);
        var taken = humans.Select(h => h.Racer!).ToHashSet();
        var cpuRacers = new List<string>();
        if (Cup != null) cpuRacers.AddRange(Cup.CpuRacers.Where(r => !taken.Contains(r)).Take(cpuCount));
        var free2 = s.Racers.Where(r => !taken.Contains(r) && !cpuRacers.Contains(r)).OrderBy(_ => Rng.Next()).ToList();
        cpuRacers.AddRange(free2.Take(cpuCount - cpuRacers.Count));
        if (Cup != null) { Cup.CpuRacers.Clear(); Cup.CpuRacers.AddRange(cpuRacers); }

        var race = new RaceState
        {
            N = ++_raceCount, TrackId = trackId, Seed = Rng.Next(1, int.MaxValue),
            StartAt = now + Ms(s.RaceStartLeadSeconds),
        };
        var first = humans.FirstOrDefault()?.Id ?? Host ?? Guid.Empty;
        foreach (var r in cpuRacers)
            race.Slots.Add(new Slot { Index = race.Slots.Count, Racer = r, Level = Rules.Level, Owner = first });
        foreach (var h in humans)
            race.Slots.Add(new Slot { Index = race.Slots.Count, Racer = h.Racer!, Member = h.Id, Owner = h.Id });

        Race = race;
        Phase = Phase.Race;
        Until = race.StartAt + Ms(s.RaceMaxSeconds);
        Offer = null;
        foreach (var m in Members) m.LastFrameAt = now;
        ReassignOwners(now);
        Broadcast();
    }

    bool Silent(Member m, long now) =>
        Phase == Phase.Race && Race != null && now - Math.Max(m.LastFrameAt, Race.StartAt) > Ms(S.OwnerSilenceSeconds);

    bool CanOwn(Member? m, long now) => m != null && m.Connected && !Silent(m, now);

    /// <summary>Who drives the CPU karts: the host in a private room, otherwise (or if the host cannot) the member connected longest.</summary>
    Guid? CpuOwner(long now)
    {
        if (!IsPublic && Host is Guid h && CanOwn(Find(h), now) && !Find(h)!.Spectating) return h;
        return Members.Where(m => CanOwn(m, now) && !m.Spectating).OrderBy(m => m.ConnectedSince).ThenBy(m => m.JoinedAt)
            .FirstOrDefault()?.Id;
    }

    /// <summary>Gives every kart to the right device. Returns true when anything moved.</summary>
    bool ReassignOwners(long now)
    {
        if (Phase != Phase.Race || Race == null) return false;
        var cpuOwner = CpuOwner(now);
        bool changed = false;
        foreach (var slot in Race.Slots)
        {
            Guid? want = slot.Member is Guid mid && CanOwn(Find(mid), now) ? mid : cpuOwner;
            if (want is Guid w && w != slot.Owner) { slot.Owner = w; changed = true; }
        }
        return changed;
    }

    /// <summary>Any frame from a member counts as a sign of life. A member coming back from silence gets their kart back.</summary>
    public void Touch(Guid id, long now)
    {
        var m = Find(id);
        if (m == null) return;
        bool wasSilent = Silent(m, now);
        m.LastFrameAt = now;
        if (wasSilent && ReassignOwners(now)) Broadcast();
    }

    /// <summary>A racer opened or closed their pause menu. Only someone with a kart in the race can be away.</summary>
    public void SetAway(Guid id, bool on)
    {
        var m = Find(id);
        if (m == null) return;
        on &= Phase == Phase.Race && Race != null && Race.Slots.Any(sl => sl.Member == id);
        if (m.Away == on) return;
        m.Away = on;
        Broadcast();
    }

    public void RelayEvent(Guid id, JsonElement e)
    {
        var m = Find(id);
        if (m == null || Phase != Phase.Race) return;
        var json = $$"""{"t":"ev","e":{{e.GetRawText()}},"from":"{{id}}"}""";
        foreach (var x in Members)
            if (x != m) x.Conn?.SendText(json);
    }

    /// <summary>Relays a kart snapshot from its owner. Returns false when it was rejected.</summary>
    public bool RelaySnapshot(Guid id, ReadOnlySpan<byte> frame)
    {
        if (Phase != Phase.Race || Race == null || frame.Length < 10 || frame[0] != 1) return false;
        int slotIndex = frame[1];
        if (slotIndex >= Race.Slots.Count) return false;
        var slot = Race.Slots[slotIndex];
        if (slot.Owner != id) return false;
        slot.Step = BitConverter.ToUInt32(frame[2..6]);
        slot.Distance = BitConverter.ToSingle(frame[6..10]);
        slot.HasSnapshot = true;
        var copy = frame.ToArray();
        foreach (var x in Members)
            if (x.Id != id) x.Conn?.SendBinary(copy);
        return true;
    }

    public async Task FinishAsync(Guid id, int slotIndex, double time, long now)
    {
        var m = Find(id);
        if (m == null) return;
        if (Phase != Phase.Race || Race == null || slotIndex < 0 || slotIndex >= Race.Slots.Count) { Err(m, "bad"); return; }
        var slot = Race.Slots[slotIndex];
        double elapsed = (now - Race.StartAt) / 1000.0;
        if (slot.Owner != id || Race.Finished.Any(f => f.Slot == slotIndex) || !double.IsFinite(time) || time < 0 || time > elapsed + 2)
        {
            Err(m, "bad");
            return;
        }
        Race.Finished.Add(new FinishEntry(slotIndex, time));
        Race.Finished.Sort((a, b) => a.Time != b.Time ? a.Time.CompareTo(b.Time) : a.Slot.CompareTo(b.Slot));
        for (int i = 0; i < Race.Finished.Count; i++) Race.Finished[i].Rank = i + 1;
        if (slot.Member != null && Race.FirstHumanFinishAt == null)
        {
            Race.FirstHumanFinishAt = now;
            Until = Math.Min(Until ?? long.MaxValue, now + Ms(S.FinishGraceSeconds));
        }
        Broadcast();
        await CheckPhaseDoneAsync(now);
    }

    async Task EndRaceAsync(long now)
    {
        var race = Race!;
        var s = S;
        var finishedSlots = race.Finished.Select(f => f.Slot).ToHashSet();
        var order = race.Finished.Select(f => race.Slots[f.Slot]).ToList();
        order.AddRange(race.Slots.Where(sl => !finishedSlots.Contains(sl.Index))
            .OrderByDescending(sl => sl.HasSnapshot ? sl.Distance : float.NegativeInfinity).ThenBy(sl => sl.Index));

        bool Absent(Slot sl) => sl.Member is Guid mid && Find(mid) is not { Connected: true };
        bool rated = IsPublic && order.Count >= 2;
        if (rated)
        {
            // A member who left or dropped (and had not finished) is last among humans.
            var gone = order.Where(sl => Absent(sl) && !finishedSlots.Contains(sl.Index)).ToList();
            if (gone.Count > 0)
            {
                order.RemoveAll(gone.Contains);
                int lastHuman = order.FindLastIndex(sl => sl.Member != null);
                order.InsertRange(lastHuman + 1, gone);
            }
        }

        double? TimeOf(Slot sl) => race.Finished.Find(f => f.Slot == sl.Index)?.Time;
        s.TrackMinRaceSeconds.TryGetValue(race.TrackId, out var minSeconds);

        Dictionary<Guid, RatingChange> changes = [];
        if (rated)
        {
            var entries = order.Select(sl => new RatedEntry(sl.Index, sl.Racer, sl.Member, sl.Member == null ? sl.Level : null,
                TimeOf(sl), !finishedSlots.Contains(sl.Index), Absent(sl),
                Voided: minSeconds > 0 && TimeOf(sl) is double t && t < minSeconds)).ToList();
            try
            {
                var startedAt = DateTimeOffset.UtcNow - TimeSpan.FromMilliseconds(Math.Max(0, now - race.StartAt));
                changes = await manager.Rating.RateAndStoreAsync(Code, race.TrackId, Rules.Cc, Rules.Level, startedAt, entries);
            }
            catch (Exception e)
            {
                manager.Log.LogError(e, "Could not rate race {N} in room {Room}", race.N, Code);
            }
            foreach (var (pid, c) in changes)
                if (Find(pid) is Member mm) { mm.Player.Mu = c.Mu; mm.Player.Sigma = c.Sigma; }
        }

        var rows = new List<ResultRow>();
        for (int i = 0; i < order.Count; i++)
        {
            var sl = order[i];
            int points = i < Wire.CupPoints.Length ? Wire.CupPoints[i] : 0;
            changes.TryGetValue(sl.Member ?? Guid.Empty, out var ch);
            rows.Add(new ResultRow(sl.Index, sl.Racer, sl.Member, i + 1, TimeOf(sl), !finishedSlots.Contains(sl.Index), points,
                ch?.Before, ch?.After));
            if (Cup != null)
            {
                Cup.Totals[sl.Racer] = Cup.Totals.GetValueOrDefault(sl.Racer) + points;
                if (!Cup.Places.TryGetValue(sl.Racer, out var places)) Cup.Places[sl.Racer] = places = new int[Cup.Tracks.Count];
                if (Cup.Index < places.Length) places[Cup.Index] = i + 1;
            }
        }

        Last = new LastResults(race.TrackId, rows);
        Race = null;
        Phase = Phase.Results;
        Until = now + Ms(s.ResultsSeconds);
        foreach (var m in Members) { m.Ready = false; m.Spectating = false; m.Away = false; }
        Broadcast();
    }

    /// <summary>A friends' race without CPUs that had company and now has one person (or nobody) left to race.</summary>
    bool EveryoneElseLeft() =>
        !IsPublic && !Rules.Cpus && Last is { } last && last.Results.Count(x => x.Member != null) >= 2
        && Members.Count(m => m.Connected) < 2;

    void AfterResults(long now)
    {
        // Nobody to race: the room goes back to its lobby rather than starting a race of one (a cup ends where it stands).
        if (EveryoneElseLeft())
        {
            if (Cup != null) Cup.Ended = Cup.Index + 1 < Cup.Tracks.Count;
            Phase = Phase.Lobby;
            Until = null;
            Broadcast();
            return;
        }
        if (Rules.Mode == RaceMode.Cup && Cup != null && !IsPublic)
        {
            if (Cup.Index + 1 < Cup.Tracks.Count)
            {
                Cup.Index++;
                StartRace(Cup.Tracks[Cup.Index], now);
            }
            else
            {
                Phase = Phase.Lobby;
                Until = null;
                Broadcast();
            }
            return;
        }
        StartTrackPhase(now);
    }

    // ---------- timers ----------

    /// <summary>Moves on when the current phase is done, by its rule or by its timer.</summary>
    async Task CheckPhaseDoneAsync(long now)
    {
        if (Closed) return;
        // Shutting down: a race in progress may still end, but nothing new begins.
        if (manager.Draining && Phase != Phase.Race) return;
        bool anyone = Members.Any(m => m.Connected);
        bool due = Until is long u && now >= u;
        switch (Phase)
        {
            case Phase.Lobby:
                if (IsPublic && anyone && due) StartTrackPhase(now);
                break;
            case Phase.Track:
            {
                if (!anyone) break;
                bool done = !IsPublic && Rules.Pick == PickMode.Host
                    ? Find(Host ?? Guid.Empty)?.Track != null
                    : Members.Where(m => m.Connected).All(m => m.Track != null);
                if (done || due) ChooseTrackAndStart(now);
                break;
            }
            case Phase.Race:
            {
                var race = Race!;
                bool allIn = race.Finished.Count >= race.Slots.Count;
                bool grace = race.FirstHumanFinishAt is long f && now >= f + Ms(S.FinishGraceSeconds);
                bool max = now >= race.StartAt + Ms(S.RaceMaxSeconds);
                if (allIn || grace || max) await EndRaceAsync(now);
                break;
            }
            case Phase.Results:
            {
                if (!anyone) break;
                bool allReady = Members.Where(m => m.Connected).All(m => m.Ready);
                if (allReady || due) AfterResults(now);
                break;
            }
            default:
                throw new InvalidOperationException();
        }
    }

    /// <summary>Called a few times a second by the ticker.</summary>
    public async Task TickAsync(long now)
    {
        if (Closed) return;
        var s = S;
        foreach (var m in Members.Where(m => !m.Connected && now - m.DisconnectedAt > Ms(s.SeatHoldSeconds)).ToList())
            await LeaveAsync(m.Id, now);

        if (Members.Count == 0)
        {
            if (now - _emptySince > Ms(s.RoomIdleMinutes * 60)) Close();
            return;
        }
        if (ReassignOwners(now)) Broadcast();
        await CheckPhaseDoneAsync(now);
    }

    void Close()
    {
        Closed = true;
        manager.Rooms.TryRemove(new KeyValuePair<string, Room>(Code, this));
    }

    // ---------- sending ----------

    static long Ms(double seconds) => (long)Math.Round(seconds * 1000);

    void Err(Member m, string code) => m.Conn?.SendText($$"""{"t":"err","code":"{{code}}"}""");

    public void SendRoom(Member m) => m.Conn?.SendText(RoomJson());

    public void Broadcast()
    {
        var json = RoomJson();
        foreach (var m in Members) m.Conn?.SendText(json);
    }

    string RoomJson() => JsonSerializer.Serialize(new { t = "room", room = View() }, RoomView.Json);

    public object View() => RoomView.Build(this, S);
}
