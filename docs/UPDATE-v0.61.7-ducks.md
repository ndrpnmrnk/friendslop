# Friendslop v0.61.7 - Park duck crash

## Cause
Park rideables of kind `duck` had a 3D mesh, radius and ride controller but **no mass or physical height** in `src/world/pushables.js`. Player bumps computed `1/(1+undefined)`, and impacts divided by `undefined`, propagating NaN into positions/velocities. This could freeze or corrupt the match around the pond, especially near parked ducks or thrown objects.

The park's original duck ramming loop also iterated each directed pair every frame, with no cooldown, and directly dismounted passengers before calling `knockDown`, which already dismounts players and relays hits to the owning client.

## Changes
- Define water-duck mass 1.35 and collision height 0.85, matching its approximately 0.85-radius model.
- Provide finite fallback mass, height and radius for any newly introduced pushable type, preventing NaN physics without crashing map generation.
- Introduce a pure `duckRamEvents` helper: each pair checked once per tick, valid incoming closing velocity >4.5, at most one ram per duck in a tick, 1.4s pair cooldown and no damage between two unattended boats.
- Keep original duck colors, water-constrained controls, sounds, collision impact and ability to knock opponents into the pond. `knockDown` alone handles a hit player's dismount and network ownership.
- Existing Cloudflare Worker and client protocol unchanged.

## Verification
The new `duck-boat.test.mjs` checks finite physics, normal bumps, pair cooldown, ramming with four boats and no double dismount. All online tests, stress tests and production build must pass. Real game smoke test: walk beside ducks, push them, throw objects near pond, ride 1-4 ducks and ram boats in a two-player room. Watch FPS/NaN and F8 diagnostics.

Publish **main / GitHub Pages only**. Do not change `release` or manually deploy Cloudflare. Commits are prefixed `[CF-Pages-Skip]`; Cloudflare dashboard branch builds must still be configured independently.
