# Online play: architecture and wire protocol

This is the contract between the game client (`src/net/`) and the server (`server/`). Design background and research are in issue #340. If the two sides disagree, this file is right; change it first.

## The model in one paragraph

Every device runs the whole race locally, as it does offline. Each kart has exactly one **owner**: the device that simulates it for real. A device steps the karts it owns from real input (or from an AI driver) and broadcasts their state 30 times a second. Every other kart on that device is a **puppet** placed from the owner's broadcasts. Anything that happens *to* a kart (a hit, a pickup, a squash) is decided by that kart's owner and nobody else: what hits you on your screen hits you. The server never simulates. It owns rooms, who is in them, the shared clock, who owns which kart, the finishing order, and ratings, and it relays everything else without looking inside.

Why not lockstep: `Math.sin` and friends differ bit for bit between Node, Chrome, and Safari, so the same race diverges within a tenth of a second (measured, #340).

## Offline must not change

Every hook in the simulation is behind `race.net` (null offline). With `race.net == null` the simulation must behave exactly as before: `npm run test:race` passes unchanged.

## Transport

One WebSocket per device: `wss://<host>/ws`. The player is identified by the `bk_player` cookie (see HTTP below).

- **Text frames** are JSON objects with a `t` field. Reliable and ordered.
- **Binary frames** are kart snapshots. The server reads only the fixed header and relays the frame unchanged to every other device in the room.
- Size limits: text 4 KB, binary 256 bytes. The server drops the connection on a larger frame or on more than 400 frames a second.
- `PROTO = 1`. The client sends it in `hello`; a server that does not support it answers `{t:"old"}` and the client must reload itself to update.

### Binary snapshot

Little-endian.

| Offset | Type | Field |
|---|---|---|
| 0 | u8 | `1` (snapshot) |
| 1 | u8 | slot (0 to 7) |
| 2 | u32 | step: the sender's simulation step for this sample |
| 6 | f32 | raceDistance in meters (may be negative before the line) |
| 10 | … | kart state, owned by `src/net/codec.js`; opaque to the server |

The server rejects a snapshot whose slot the sender does not own. It keeps the latest `raceDistance` and `step` per slot (for classifying unfinished karts and for sanity checks).

One snapshot per owned kart every 2 simulation steps (30 Hz).

## Clock

`server.now` is milliseconds on the server's monotonic clock. The client estimates `offset = serverNow - localNow` from `ping`/`pong`, keeping the sample with the smallest round trip (8 pings on connect, then one every 5 s).

A race has `startAt` (server ms). Simulation step `n` happens at `startAt + n * 1000/60`. The race's own countdown (3.6 s) is part of the simulation, so step 0 is the start of the countdown. **Online, the client always steps until it has caught up with the shared clock** (no forgiving of lost time). If it is more than 2 s behind (the tab was hidden), it fast-forwards without rendering.

## HTTP

All under `/api`, JSON, same origin.

| Route | Does |
|---|---|
| `POST /api/session` | Creates the guest player if there is no valid cookie and sets `bk_player` (HttpOnly, Secure, SameSite=Lax, 400 days). Returns `{ id, handle: {title, number}, rating: {valuation, races} }`. |
| `POST /api/handle` `{title}` | Sets the handle's title index (0 to 199). The number is assigned by the server and never changes. |
| `GET /api/leaderboard?board=all\|week&limit=50` | `{ rows: [{rank, handle, valuation, current, races, me}], me: {rank, valuation} }`. On the week board `valuation` is the gain over the last 7 days; `current` is always the valuation itself (for the tier name). |
| `POST /api/handoff` `{code}` | Safari, opened from a room link, leaves the room code for the installed game. 204; 400 if it is not a room code; 404 if no such room is open (then say nothing about the installed game). Replaces any earlier code for this device and expires after HandoffMinutes. |
| `POST /api/handoff/claim` | The installed game, on start, asks for a code left by the same device. 200 `{code}` once, then 204; also 204 when nothing is waiting or the room has closed. |
| `DELETE /api/handoff` | Forgets this device's code (the player chose to race in Safari). 204. |
| `POST /api/app` | The installed game, on every launch and return to the foreground, says it is open. No body, no cookie needed. Records this device, and with a player cookie sets that player's `AppSeenAt` (written at most every 10 minutes). 204. |
| `GET /api/app` | The phone's browser asks whether the installed game has been opened by this player (cookie) or on this device within AppSeenDays. `{ app: true\|false }`. A room link then says to open the game rather than install it. |
| `GET /healthz` | `{ ok, sha, protocol, minProtocol, rooms, players }`. The game shows its Online button only when this answers and its own protocol is within `minProtocol..protocol`; a build older than `minProtocol` offers a reload instead. The server accepts the current protocol and the one before it, so a cached game survives a deploy. |

The handoff exists because on iPhone a link always opens in Safari, never in the Home Screen game, and the two keep separate cookies. So the handoff routes take no player cookie: "the same device" means the same network address (an IPv6 address by its /64) and the same hardware and OS version from the User-Agent (`iPhone 18_6`, `iPad 18_6`, `Android 14 Pixel 8`; anything else is a hash of the whole UA), which Safari and the installed game share. Codes wait in memory only and are lost on restart. `/api/app` uses the same device key; since iOS 17.2, adding the game to the Home Screen copies Safari's cookies into it, so the player cookie also ties the two, across networks and restarts.

A handle is `{title: int, number: int}`. The words live in the client (`src/content/handles.js`); the server stores and relays only the two numbers, so there is no free text to moderate.

## Text messages

Client to server is marked →, server to client ←.

### Connecting

- → `{t:"hello", proto, build}` first message.
- ← `{t:"welcome", you: playerId, now}` or `{t:"old"}`.
- → `{t:"ping", c: localMs}` ← `{t:"pong", c, now}`.
- A socket not welcomed within 10 s is closed and tried again (`Conn`, `OPEN_TIMEOUT`), with the usual back-off. The hub shows "Can’t reach the online server" when the way in (the session, then the socket) takes longer than 10 s a leg, and when a connection that dropped has not come back within 30 s.

### Server updates

- ← `{t:"bye", why:"update", in: seconds}` the server is shutting down for an update and will be back shortly. `in` is the longest it will keep this connection open (whole seconds, 0 when nothing is racing). Sent to every connected device when shutdown begins, and again to any device that connects, or asks to create, join, or find a room, while it lasts. `PROTO` is unchanged: a client that ignores `bye` just sees the socket close later and reconnects, as before.

Shutdown, in order:

1. The server stops making rooms and starting races. `create`, `join`, and `find` are answered with `bye`. Rooms in **lobby**, **track**, or **results** stay where they are; their timers no longer move them on.
2. Races in progress carry on: snapshots, events, and `finish` work as usual, and a race that ends normally goes to **results** (rated as usual in a public room).
3. When no race is left, or `ShutdownDrainSeconds` after shutdown began, every socket is closed (status 1001) and the server exits. A race still running at that point ends unrated: rooms live only in memory.
4. The restarted server has no rooms. A client that was told `bye` reconnects as usual, finds it has no seat (no `room` arrives after `welcome`), and goes to the hub saying the room closed for an update. A client mid-race when its socket closes after `bye` ends the race at once and does the same.

### Rooms

- → `{t:"create"}` makes a private room. → `{t:"join", code}` joins one. → `{t:"find"}` joins or creates a public room. → `{t:"leave"}`.
- ← `{t:"room", room}` the full room state, sent on join and after **every** change (rooms are small; no deltas).
- ← `{t:"err", code}` with `code` one of `no_room`, `full`, `bad`, `rate`.

Room codes are 4 letters from `BCDFGHJKLMNPQRSTVWXZ` (no vowels, so no words; no easily confused letters).

```
room = {
  code, public: bool, host: playerId,
  phase: "lobby" | "track" | "race" | "results",
  until: serverMs | null,          // when the current phase's timer runs out, if it has one
  rules: { mode: "single"|"cup", cup: id|null, cc: 50|100|150|200, level: "easy"|"normal"|"hard",
           cpus: bool, pick: "vote"|"host" },
  members: [{ id, handle, name: string|null, racer: id|null, ready: bool, connected: bool, spectating: bool,
              valuation: int|null, track: id|null }],
  race: null | { n, trackId, seed, laps, startAt,
                 slots: [{ slot, racer, member: playerId|null, level: str|null, owner: playerId }],
                 finished: [{ slot, time, rank }] },
  offer: [trackId, ...] | null,    // public rooms: the tracks on offer this vote
  cupState: null | { index, tracks: [id], totals: {racerId: points} },
  last: null | { trackId, results: [{ slot, racer, member, rank, time, estimated, points,
                 before: valuation|null, after: valuation|null }] }
}
```

### Lobby and picks

- → `{t:"name", name}` private rooms only: the name my friends see in place of my handle. The server strips control characters, collapses spaces, trims, and cuts it to 16 characters; empty clears it. It lives only in that room's memory. `members[].name` is always null in a public room, and the Rich List only ever shows handles: a typed name is seen only by people you invited.
- → `{t:"racer", id}` claims a racer. The server refuses one that another member holds (it just re-sends `room`).
- → `{t:"rules", rules}` host only, lobby phase, private rooms only.
- → `{t:"start"}` host only: lobby → track (or straight to race when the host picks and has picked).
- → `{t:"track", id}` my pick. `id` may be `"random"`. In a public room it must be one of `offer` or `"random"`.
- → `{t:"ready"}` in results: I am ready for the next race.

Phases:

- **lobby** (private rooms): people arrive and pick racers. The host presses start. Needs every connected member to have a racer.
- **track**: everyone picks. Ends when all connected members have picked or the timer runs out. The server chooses uniformly among the picks (or the host's pick when `pick:"host"`; in a cup, the cup's next track), fills empty slots with CPUs when `rules.cpus`, assigns owners, and sends `room` with `race` set and phase `race`. The client plays the roulette from `members[].track` to `race.trackId`.
- **race**: see below.
- **results**: `last` is set. Ends when every connected member is ready or the timer runs out, then back to **track** (or the cup's next race; after a cup's last race, to **lobby**).

Public rooms have no host powers. A new public room waits in **lobby** with `until` set (`PublicSoloWaitSeconds`; when a second person arrives it becomes `PublicWaitSeconds` from then, once; a full room goes at once), then moves to **track** by itself. Members pick racers at any time outside a race, and a member with no racer when a race starts gets a random free one.

A cup never enters **track**: `start` goes straight to its first race and results go straight to its next. In **results**, `race` is null and `last` holds the outcome.

### Race

- `race.startAt` is `RaceStartLeadSeconds` (6 s) after the `room` message that announces it, so clients can load the track. → `{t:"loaded"}` when ready; the server does not wait for it, a late client fast-forwards.
- Slot order is grid order. Humans start at the back, as offline.
- **Ownership.** A human's kart is owned by that human. CPU karts are owned by the host (in a public room, the member connected longest). When an owner stops sending (no frame for 2 s) or disconnects, the server gives its karts to the CPU owner and sends `room`. The new owner adopts each kart from its last puppet state and drives it with an AI driver. When the human returns, the server gives the kart back and the client adopts it from its puppet state. Clients learn ownership only from `race.slots[].owner`.
- → `{t:"ev", e}` a game event. ← `{t:"ev", e, from: playerId}` relayed to every other device in the room, in order. The server does not read `e`. Events are defined below.
- → `{t:"finish", slot, time}` from the kart's owner when it crosses the line. `time` is race seconds. ← the server adds it to `race.finished` in time order and sends `room`.
- The race ends when every slot has finished, or `finishGraceSeconds` after the first human finishes, or `raceMaxSeconds` after `startAt`. Unfinished karts are ranked after the finishers by latest `raceDistance`, marked `estimated`. A member who left or was disconnected at the end is ranked last among humans in a rated race.
- A device that joins mid-race gets the same `room`; it spectates (owns nothing) until the next race.

### Game events (`e`)

`e` is `{k: kind, ...}`. Karts are named by slot. Shots and hazards are named by `nid`: a string `"<slot>:<counter>"` minted by the device that creates them.

| `k` | Sent by | Fields | Receivers do |
|---|---|---|---|
| `box` | owner of the kart that broke it | `i` (index in `items.boxes`), `s` slot | mark the box broken, start that puppet's roulette visual |
| `coin` | owner of the kart that took it | `i`, `s` | hide the coin |
| `use` | user's owner | `s`, `id` (base item id) | visual and audio for the use; timers arrive in snapshots |
| `hazard` | dropper's owner | `nid`, `type`, `x,y,z`, `s` | add the hazard |
| `shot` | shooter's owner | `nid`, `type`, `s`, `x,y,z`, `vx,vy,vz`, `yaw`, `speed`, `target` (slot or -1), `phase` | add the shot and simulate it locally |
| `gone` | whoever resolved it | `nid`, `why` (`hit`, `block`, `cleared`) | remove the shot or hazard |
| `boom` | whoever triggered it | `nid` or null, `x,y,z`, `s` (owner slot), `w` (item id) | play the explosion; apply it to **owned** karts only |
| `hit` | victim's owner | `v` victim, `by` slot or -1, `w` item id or `star`/`squash`/`bailout`/`obstacle`, `kind` | feed lines, audio, stats. The victim's state arrives in snapshots. |
| `commit` | shot owner's owner | `nid`, `target`, `phase` (`hover`, `fly`) | force the Antitrust Suit's phase and target |
| `crash` | user's owner | `s` | apply Market Crash to owned karts; flash |
| `shock` | user's owner | `s`, `x,y,z` | apply PR Blitz to owned karts in range; clear local shots and hazards in range |
| `ink` | user's owner | `s`, `rank` | ink owned karts ahead of that rank |
| `steal` | thief's owner | `s`, `from`, `id`, `uses` | the victim's owner removes the item |
| `emote` | anyone | `s`, `i` | reserved; not in the first version |

Rules for every device:

1. Only test **owned** karts against boxes, coins, hazards, shots, explosions, obstacles, and other karts' stars and squashes. Puppets are never hurt locally.
2. In kart-to-kart bumps, move and bounce only owned karts, using the normal mass share.
3. Shots and hazards are simulated by everyone from their spawn event; whoever's owned kart is hit removes it and sends `gone` and `hit`. A shot whose owner's device has gone is still simulated and still expires on its own timer.
4. An event that names an unknown `nid` is ignored.
5. Random choices (item rolls, steal victims, dodge chances) are made by the owner of the kart they are for, with its local generator.

## Rating

Public races only. The server keeps `mu` and `sigma` per player (OpenSkill, Plackett-Luce; start 25 and 25/3). CPUs take part at a fixed rating per level and are never updated. The figure shown is the **valuation**, a dollar amount:

```
ordinal   = mu - 3 * sigma
valuation = round(ValuationBaseDollars * 2 ^ (ordinal / ValuationDoublingPoints))
```

The winner's valuation never falls and last place's never rises (when at least 3 karts were classified). `last.results[].before/after` carry each human's valuation around the race. Tier names for valuation ranges are client content (`src/content/valuation.js`).

## Settings (typed, editable in `/admin`)

| Setting | Default |
|---|---|
| MaxRooms | 200 |
| MaxMembersPerRoom | 8 |
| TrackPickSeconds | 20 |
| ResultsSeconds | 25 |
| PublicWaitSeconds (a second human has arrived) | 30 |
| PublicSoloWaitSeconds (alone) | 20 |
| PublicTrackOfferCount | 3 |
| PublicCc / PublicLevel | 150 / normal |
| FinishGraceSeconds | 30 |
| RaceMaxSeconds | 480 |
| OwnerSilenceSeconds | 2 |
| SeatHoldSeconds (a disconnected member keeps their place) | 120 |
| RoomIdleMinutes (empty room is removed) | 5 |
| HandoffMinutes (a room link opened in Safari waits for the installed game) | 10 |
| AppSeenDays (how long an opened installed game counts as installed) | 30 |
| ValuationBaseDollars / ValuationDoublingPoints | 1000000 / 2.5 |
| CpuMu easy / normal / hard, CpuSigma | 18 / 22 / 26, 1.5 |
| RaceStartLeadSeconds | 6 |
| ShutdownDrainSeconds (how long a shutdown waits for races to finish; at most 25, under systemd's `TimeoutStopSec=30`) | 25 |
| TrackMinRaceSeconds (per track; a rated finish faster than this is not rated) | none |
| Tracks, Cups, Racers (the ids the server may pick from) | the shipping lists |
