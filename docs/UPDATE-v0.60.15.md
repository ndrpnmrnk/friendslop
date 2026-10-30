# Friendslop v0.60.15 - Remove hub floating light columns and turn the basketball hoop

## Root cause
The unusual translucent hovering shafts were not physical columns. They were large additive cylinder meshes from `LAMP_CONE` in `src/world/props.js`. In `src/world/scene-lighting.js`, the game makes up to five cones of the nearest lamps visible every 0.15 seconds. The old v0.60.10 patch disabled one cone by coordinate, but seven other hub lamps still generated and activated them, making the glow appear in different locations when the camera moved.

## Fix
All eight hub lamp constructors in `src/ui/hub-world.js` now pass `false` for the existing `showVolumetricCone` argument. This prevents creating the additive geometry in the hub entirely; periodic light updates correctly skip null cones. Lamp posts, glowing bulbs, floor illumination, breakable lights and physical collisions are unchanged. Other world locations retain the old lighting effects.

The basketball hoop in the hub at (-17.5,20.5) is rotated from +90° to -90° (around Y). Since its front is model-local -Z, the rim now faces world +X toward the path and playground rather than the western building. Rim position, backboard position and collisions all derive from the rotated parent, so they remain consistent for scoring and object physics.

## Verification
- Automated source-contract tests assert hub lamps all disable the volume mesh, lighting updates ignore the missing cone, and the hoop faces positive X with collision transforms derived from the parent rotation.
- Existing multiplayer tests (including eight-client stress) and production build must pass before merge.
- In the browser, use Ctrl+F5 and walk the full court and playground near the trampolines with different camera angles. Confirm no soft vertical floating light shafts are left; check intact actual lighting and shoot basketballs into the now correctly oriented hoop.
- Cloudflare Worker unchanged.
