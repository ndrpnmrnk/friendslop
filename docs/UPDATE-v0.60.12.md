# v0.60.12 - Shared FIST pickups in online matches

## What was wrong
Before this update, every client independently called `resetCoins` and chose random spawn locations and crate drops. Each local `grabFist` immediately modified its own wallet, without informing other clients. Two players could collect different local copies of what appeared to be the same item.

## New network authority
- In online matches, the host alone generates the initial 9-22 scattered fists and any subsequent drops. Guests do not scatter, simulate, or locally create loot.
- The existing host world snapshot (4-5 Hz depending on room size) includes compact `coins` arrays with stable IDs, coordinates and flight state, capped at 96. Guests apply the same list and visually interpolate positions. Any missing coin disappears immediately; periodic snapshots recover lost updates and late state.
- The guest's click queues `coin-take` in the existing state packet. The host checks that the coin is still available and that the requesting player is nearby, not hidden/stunned, and in line of sight. Host accepts only the first eligible request.
- When a guest wins, host sends the approved reward via the existing host-only `effect` event channel (no Worker protocol or new message frequency). The receiver persists `(room, matchSeed, coinId)` alongside its personal wallet balance and sends an acknowledgement through the existing guest command channel. Host retries unacknowledged rewards at a bounded interval; retries cannot credit the same reward twice.
- Host's own pickups go through the same collision/eligibility check; offline pickups continue exactly as before.
- The shared world pickup is not a shared wallet: the collecting player gains one personal FIST, other players gain none.

## Tests
- Compact snapshot input validation, duplicate ID rejection and 96-coin limit.
- Host award queue: one winner, correct recipient acknowledgement, resend after unacknowledged delivery / socket backpressure.
- Persistent wallet: no double credit, grants from separate matches, rejection of invalid credits.
- Existing online motion, radio, 8-player Worker and build checks stay enabled.

## Manual multiplayer acceptance tests
1. Join a two-player match and compare FIST positions on the same map. Confirm all uncollected coins match.
2. Two players try to pick up the same FIST simultaneously. Exactly one player should receive +1, and the FIST should disappear for both.
3. Break a crate that drops FIST currency, compare resulting drops, and pick one up from the guest.
4. Reconnect a guest during a round, and confirm shared FIST positions, disappearance and personal wallet balance recover.
5. Repeat with 8 players and inspect F3 for socket queue/RTT and CPU. Unit tests cannot guarantee WAN jitter, browser audio timing or real GPU performance.

## Limits
The wallet is still browser-local (localStorage), inherited from the game design. This is consistent multiplayer game state and duplicate-credit protection; it is **not** server-side identity, anti-cheat security, or a cloud-backed permanent economy. A production currency economy should migrate to authenticated server transactions.
