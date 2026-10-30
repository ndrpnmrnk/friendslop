# v0.61.4 - Physically recessed skatepark bowl

This change builds on the concurrently published v0.61.3 without overwriting its sliding glass rental doors, interior displays, scattered skateboards/scooters, sealed small ramps, missions or online improvements.

## Why this additional fix was needed
v0.61.3 rendered a raised 2.7m berm over the original ground plane. It was rideable but the bowl's center remained at the street's original height, instead of descending below it. This update creates a true 3.05m deep pit.

## Implementation
- Only the skatepark descriptor defines a 18.7 x 18.7m ground cut-out. The shared world builder already supports terrain holes and generates the slab pieces around the rectangle.
- Four perimeter ground strips replace the former overlapping full floor overlay.
- The bowl is ONE continuous radial mesh: 32 rings x 64 segments plus an outer ring ending at the square cut-out perimeter; all corners and walls are filled and no coincident floor planes remain.
- Height is analytic, from -3.05m at a 4.25m-radius flat bottom through circular smooth walls to 0m at the 8.05m radius rim. The same function is used by collision for players, wheel physics and rendering.
- Existing speed-sensitive gravity, rider roll, wheel wall contact, airtime, scoring and trick animation are preserved and updated for the new negative floor. Fast outward travel near the top uses a single cooldown-limited jump and standard 0.36s kickflip/barspin. Slow rides are pulled back toward the center rather than magnetized.
- Glass-front sliding doors, interior counter and shelves, scattered safe transport, ramps, target/graffiti missions, bot skating and original multiplayer replication from v0.61.3 are preserved.
- Cloudflare Worker and game packet protocol unchanged.

## QA
Automated tests check geometry depth, continuous slope, ground samples, side banking, high-speed leap gating, terrain hole/cutout, preserved rental functionality and the full online suite including 8-player relay load. Manual in-browser inspection remains required for rider clipping, scooter animation during wall-bank and landing, and terrain material seams. This is not a claim of perfect live eight-device sync.
