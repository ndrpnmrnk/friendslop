# Friendslop v0.60.17 - Adaptive room-wide network interest

## Problem
The fast pushable-motion channel previously used FIFO/round-robin ordering for changed items, even if a distant decorative barrel occupied a slot before the bicycle carrying a player. Also, the periodic world delta included every changed pushable position at 4-5Hz, reducing the benefit of fast-channel prioritization and increasing relay traffic in busy eight-player rooms.

## Design
Cloudflare Durable Object currently relays one host packet to all guests. Interest is therefore based on minimum distance to **any** human participant (not only the host). This does not personalize packets by receiver and does not add WebSocket messages or change the relay worker.

- **HIGH** (full existing send cadence): ridden/grabbed vehicles, football, held inventory, active mission-scope objects, and anything within 20 world units of a participant.
- **MEDIUM** (up to about 5.5 fast/regular updates per second): noncritical changed objects 20-48 units away from the nearest human player.
- **FAR** (up to about 1.7 changes/sec): distant, unoccupied, nonmission movable props. Positions remain pending, not discarded.
- Under WebSocket queue pressure above 8 KiB, medium and far intervals increase 1.5×, above 24 KiB increase 2×. The motion channel also reduces its budget from 8 KiB to 4/2 KiB; packet count remains unchanged. The host's existing backpressure policy remains in force.
- The existing fast motion 32-object/8KiB ceiling remains and critical states are unaffected. Changed far objects older than 1.2s get temporary promotion for fair recovery; unsent nearby objects are prioritized over fresh updates of already-seen ones.
- **No delayed game events**: item owner, pickup/drop/placement/collection, mission linkage, visibility, mounted/grabbed vehicle occupant, destruction and removal always flow in the next eligible world state. The whole mission state, score and host command paths are unaffected.
- Full world keyframes run at the previous 3s cadence; deferred updates are *not* entered in the committed delta baseline, so the next eligible transmission or full state will restore them.
- Host migration resets old scheduling history. Near-player data and high-priority events work through the old packet protocol and require no Worker deployment.

## How to test
Run `npm run test:online` and `npm run test:stress`. New tests include shared 8-viewer distances, critical priority overrides, near vs far cadence, 32-row/8KiB bounds, backpressure smaller payload, anti-starvation after a high-priority flood, delta deletion, lost update recovery and keyframe reconciliation.

### Manual release gate
1. Connect 8 *real* players at distant map positions. Move a barrel next to player 8: it should receive high priority even if the host is elsewhere.
2. Have all players ride carts and bikes and throw balls near each other. Monitor player/cargo alignment and jitter using F3/F8.
3. Simultaneously collect shared FISTs, carry mission crates, steal a balloon stair, drop deliveries and clean rubbish. No event should be deferred or mission silently completed.
4. Induce high 150-250ms RTT/jitter with a test proxy or distant peer, monitor WebSocket queue and verify the 3-second keyframe restores any out-of-sync far objects.
5. Switch host mid-round, reconnect a guest and test empty player or low-FPS fallback.
6. Compare traffic (bytes/s), p95 frame time, item discrepancy and jitter versus v0.60.16. Local Miniflare 8-WebSocket tests demonstrate relay correctness, **not** real 8-device WAN frame rate.

This prioritizes existing replication without changing simulation ownership or physics, and cannot guarantee the absence of all gameplay desyncs; careful live acceptance is still essential.
