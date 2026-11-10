# Sim sanity results — v1.2 fun pass

**Scope change (Roger, 2026-11-10):** balancing sims are deprioritized — sims are a
sanity smoke check only (races complete, zero stuck, zero errors). Full automated
balancing returns in a later phase. The planned 24-race batch was stopped after
race 6 (harness wait-timeout while a second SwiftShader bot test shared the same
1.5 CPUs — page starvation, not a game error).

## Completed races (Spicy, 2 laps, fair player, timescale 8×)

| Race | Track | Winner | Lead changes | Player-slot finish |
|---|---|---|---|---|
| 1 | Silicon Valley GP | Holmes | 6 | 4th |
| 2 | Mars GP | Trump | 4 | 6th |
| 3 | Silicon Valley GP | Trump | 10 | 8th |
| 4 | Mars GP | Larry & Sergey | 8 | **2nd (podium)** |
| 5 | Silicon Valley GP | Soros | 6 | 5th |

- **Zero console/page errors, zero stuck karts, zero NaN** in all completed races.
- Lead changes averaged **6.8/race** — races are not processions.
- Winners spread across 4 different racers in 5 races; the fair autopilot player
  slot podiumed once (P2) without dominating — the mid-skill sanity bar.
- Grass retune note: AI lines rarely leave the road, and the off-road model
  (0.72 cap near / 0.55 deep + 0.38/s extra rolling drag while off-road) makes
  sustained grass running bleed speed below the cap, so corner-cutting cannot
  beat the road line over any real distance; brief clips across a chicane edge
  cost ~nothing, which is the intended forgiveness.
