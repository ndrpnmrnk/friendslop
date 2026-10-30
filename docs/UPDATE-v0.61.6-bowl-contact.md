# Friendslop v0.61.6 - Skate bowl wall contact and airtime

## User-reported regression
A normal walking avatar could stand on the bowl's near-vertical coping. Skateboards and scooters received an unrealistically strong upward step while climbing, and reached the top with the ground system still attached. There was almost no real airborne trajectory.

## Causes found
1. The common character ground solver treated the entire analytic bowl height field as walkable, even where the surface normal is almost horizontal.
2. The skateboard wall controller applied slope gravity, then the common pushable ground branch applied a **second** sloping acceleration.
3. The pushable ground branch always assigned `y=gy` while grounded and set `vy` from the full wall height difference, creating a free upward impulse.
4. Previous airborne transitions could be reset immediately because `air` was ignored when the board's y was below the next platform's height.
5. Lip launch previously lifted boards which had not actually reached the coping.

## Changes
- Players can walk on shallow parts of the bowl, but cannot climb a near-vertical rim by ordinary movement. Steep positions slide inward toward the basin. Jump/mantle while airborne retains normal control, and all other districts retain existing ground physics.
- Skate/scooter wheels must follow the continuous bowl within a bounded vertical contact step. Excessive outward movement is restrained; the surface never teleports a board upward through the wall.
- Remove duplicate sloped-ground acceleration within the bowl. Curving speed may *reduce* downhill pull but never magically generate uphill acceleration.
- True lip launch only if the board has reached the actual rim with sufficient upward/outward momentum and height. It preserves a bounded vertical takeoff velocity.
- Airborne pushables integrate gravity until falling back through the surface. There is no immediate ground snap while rising. The same surface normal drives board and rider banking.
- No new network packets, physics update rate, Cloudflare Worker deployment or new assets.

## QA
New pure numerical tests cover wall-walking exclusion, sliding, contact step bounds, lack of uphill acceleration, airborne jump and actual lip proximity. Existing 81+ online and 2/4/6/8-player regression tests and the Vite production build must pass before merge.

**Manual validation still required:** slow-walk from bowl floor up the edge, slide back, jump/mantle from rim, high-speed skate + scooter lap/launch/landing with two participants, and F8 diagnostics if rider and board separate.

Deployment: `main` + GitHub Pages for testing only. Every commit is prefixed `[CF-Pages-Skip]`; do not touch `release`, Cloudflare build configuration or Worker.
