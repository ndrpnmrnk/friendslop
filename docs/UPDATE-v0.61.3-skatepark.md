# Friendslop v0.61.3 - Skatepark follow-up: deep bowl and accessible rental

## Implemented
- Removed the solid rental kiosk. A larger 8.6 x 7 m walk-in building has separate brick side/back walls, transparent storefront, ~2.35 m unobstructed opening, automatic locally animated sliding glass doors, interior counter, shelves, board racks, warm trim and roof. No physics barrier is placed through the entrance. The extra small "СКЕЙТЫ · САМОКАТЫ" sign and parking stripes are removed.
- Replaced the discontinuous, flat four-quarter-pipe "bowl" with a **single continuous radial height-field mesh**. The center is flat and the lip rises 2.7 m above the floor with a curved wall and a gradual outside approach. A solid torus coping wraps the lip. Render positions and collision sample the same pure `bowlHeight` function, avoiding z-fighting circles and heightmap mismatches.
- Height field is installed only in the skatepark (not in global physics elsewhere). The default ground plane remains the low center; the skatepark lip is raised around it for a genuine depth difference without modifying the game's global terrain plane.
- Board/scooter riders receive radial gravity-versus-speed forces along the bowl wall, lean from the wall slope and heading, and can launch into the existing jump/trick/landing system on a fast outward crossing of the lip. Slow riders roll back down; coasting boards and every other vehicle type use previous physics. The host's existing pushable motion channel replicates position and orientation; no new Worker packets.
- Tiny wedge ramps now have explicit triangular side covers and a closed rear wall instead of visually hollow backs.
- Five *real rideable* skates/scooters spawn at deliberately spaced outdoor positions with no parking markings, several near the rental and others across the skatepark.
- Existing missions, graffiti, rails, halfpipe, bot routes and score hooks remain available.

## What must be verified in the browser
1. Walk in and out of the rental from the south; door panels open before contact. Check the counter, shelves and no collision blocking the entrance.
2. Ride both scooter and skateboard from the center bowl up its wall, carve tangentially at speed, coast to roll back down, and leave the lip rapidly to launch. Watch character lean, trick animation and gravity-driven landing.
3. Look for seams, z-fighting or inverted normals across the continuous bowl mesh. Inspect the coping around all 360 degrees.
4. Ride past the backs of both small wedge ramps. No hole should be visible.
5. Pick up every board from all five locations, including with a friend. Verify host/guest bike/board state, actual position and reset after a crash.
6. Recheck the graffiti, target and general missions. Run F3 and F8 diagnostics for any glitch.

## Automated checks
New pure surface/physics tests plus existing skate layout/source-contract tests; full 2/4/6/8-player WebSocket stress, missions and production build. The automated suite cannot replace a real WebGL + physics playtest. Only one district, its isolated height-field hook and board riding effect are changed.

No Cloudflare Worker deployment required.
