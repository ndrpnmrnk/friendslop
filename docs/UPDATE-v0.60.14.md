# Friendslop v0.60.14 - Stable vehicle remount, faster cars and synced bicycle feet

## Changes

### Collision recovery and mounting
- Removed stale impact/ejection state from a previous ride when the player mounts again. A short 400ms post-mount grace period ensures the previous collision cannot immediately eject the next rider.
- If a bike, skateboard, scooter, kart, cart or other rideable is slightly embedded in static map collision after a crash, the **authoritative simulator** attempts a bounded, repeated horizontal push-out before mounting, then synchronizes the corrected position to its network peers. If correcting would shift the vehicle by more than 1.75m, boarding is rejected rather than teleporting across geometry.
- Reset leftover spin/skid/trick/stop state when boarding; no double pickup or special multiplayer messages required. Both host and guests use the original ownership protocol.
- The cart/barrow hop-in path receives the same stale-impact protection.
- Genuine new collisions can still cause falls; non-car physics is otherwise unchanged.

### Faster and more playful cars
- Kart: speed cap 21 -> 27, acceleration 16 -> 29, turn speed 2.7 -> 3.25.
- Red toy car (kidcar): speed cap 7.5 -> 17, acceleration 8 -> 24, steering 3.0 -> 3.65. The kart rider pose is now used for this seated vehicle.
- Both cars: W forward, S brake/reverse, A/D steer; hold **Space** above a minimum speed to drift. Release after 0.65s+ to earn an acceleration boost; a longer drift yields a stronger boost. Reduced lateral grip while drifting, faster grip recovery otherwise.
- Car collisions cause an animated skid/daze rather than repeated automatic forced dismounts; boards/bikes still eject on real high-speed hits.

### Bike pedal animation
- Model pedaling crank center is at (0,0.40,-0.08) with 0.24m crank arms. Previous left/right foot phase signs were reversed, and their positions lagged behind the crank due to smoothing.
- Both feet now snap to the **correct left/right model crank coordinates** each animation frame, using exactly the same crank angle as the pedal mesh. Hand and torso animation remain smooth.
- A remote rider's bicycle crank angle is explicitly aligned with the corresponding network animation phase, so the bicycle and character use identical sampled phase even with network interpolation.

### Automatic verification
- Tests cover re-mount crash grace, correct contact across 64 crank samples and both feet, collision recovery bounds, and synchronization of another player's bike pedals.
- The normal online regression suite (including previous 2/4/6/8-room tests) and production build run before GitHub Pages deployment.

## Manual acceptance tests (two clients)
1. Ride the bike at high speed into walls and props; after the fall, press E again. The bike should not immediately eject from an old collision. Repeat with scooter, board, kart, kidcar and coast carts. If a ride is deeply wedged, move it instead of forcing a teleport.
2. On the red kidcar and kart, hold W, steer with A/D, hold Space for a drift and release to trigger a short boost. Confirm normal steering returns and collisions do not chain-dismount.
3. Observe local and remote bike riders side-on: left/right feet should stay on each pedal throughout a crank revolution; observe during reverse pedaling and turning.
4. Repeat riding and remounting with a host and guest. Check F3 diagnostics for visual discrepancies and no increased outbound traffic.
5. Reload both browsers with Ctrl+F5.

These tests verify logic, not in-browser animation quality or eight-device WAN performance.
