# Friendslop v0.61.3 - Deep skate bowl, wall riding and walk-in rental

## Skatepark rebuild (only this district)
- Removed the old raised four-piece pseudo bowl. The skatepark slab is cut with an 18.7 x 18.7m hole; one radial 3D surface fills the opening and joins surrounding concrete at the outer square.
- Bowl bottom is 3.05m below the deck, with 3.8m flat radius and 4.15m continuously curved wall. Mesh normals and physical terrain use the same analytic quarter-circle surface. No overlapping center floor/decal to shimmer.
- Sealed the hollow rear of wedge obstacles and halfpipe supports. Existing rail locations and graffiti/target missions remain.
- The southeast rental is now an enterable shop: 2.15m open doorway, transparent front/side windows, brick supports, glass doors standing open, solid roof, counter, shelves, board racks and seating. Removed secondary SKATES/SCOOTERS sign and painted parking lines.
- Two scooters and three skateboards have deterministic, scattered positions. Some are outside the kiosk, others around the district. All use standard networked rideables.

## Physics
- Ground height matches bowl mesh only inside its exact district footprint, without disturbing other terrain and holes. People and boards share the recessed height.
- Skateboard and scooter accelerate downhill with radial gravity, have bounded banking on high-speed curves, roll back when slow, and visually lean with the player.
- Fast outward lip crossing can launch a small normal airtime kickflip/barspin using existing animation, landing, score caps and network state.
- No new Cloudflare Worker packets or server tick changes.

## QA
- New tests cover continuous surface, speed-gated takeoff, gravity banking, open rental, collision, mission geometry and deterministic spawns, plus pre-existing 2/4/6/8-player WebSocket stress and production build.
- A real WebGL check remains necessary to confirm visual material seams, walks through the door, bike/scooter banking and two-player trick animations.
