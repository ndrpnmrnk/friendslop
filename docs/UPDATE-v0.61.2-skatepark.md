# Friendslop v0.61.2 - Single-district skatepark rebuild

## Approved 44 x 44 m plan
Central large rideable bowl built with four curved quarter pipes and a flat skating center. Northwest halfpipe with two facing curved ramps. Northeast and southwest: two real grind rails per zone. Southeast: decorative brick rental kiosk with two skateboards and two scooters, parked outdoors in separate clear spaces. Existing concrete, brick, roof and painted metal textures; graffiti wall, benches, mesh fences, lights, bin, signs, seasonal decoration.

The old football field, grass, goals, scoreboard, bleachers, ball spawn and pitch state are fully removed from skatepark. Football elsewhere is unchanged.

## Gameplay
Existing ride physics handles E mounting, W/S acceleration and braking, A/D steering, Space tricks, grinding and crash/remount. Riding a valid bowl or halfpipe line at speed triggers the existing capped trick score hook no more than once per 9 seconds, not a new unrestricted score system. The north graffiti wall supports stencil graffiti; clear southern/eastern mission-floor zones support target shooting.

Player spawn is in the south-center lane. Four rideables are outside kiosk walls and spaced apart. The cat home is moved away from the southwest rails. Idle host-controlled bots may occasionally take an unoccupied rental and ride a safe route; active missions and player-owned boards take priority.

## Network/performance
Uses existing pushable network ownership and replication, same sound and scoring, no additional message frequency or Worker changes. Geometry builds as static normal district meshes and colliders, the cooldown loop uses an in-memory WeakMap of local actors.

## QA
Automated tests check 44m geometry and clearance, collision ramp source, rails, absence of football, score caps, bot integration, existing online rooms for 2/4/6/8 players and production build.

**Manual WebGL acceptance still needed:** view bowl from every direction, ride all four curved sides and both halfpipe slopes, grind rails, test E mounting and remount after crashes, perform graffiti and target missions, observe rental boards and bot riding with host and guest. A source test cannot prove visual geometry, FPS or live WAN multiplayer behavior. If a ramp snags a wheel, use F8 and a screenshot to identify the exact collision.
