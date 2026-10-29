# v0.60.10 - Remove unintended vertical light beam in the hub

## Fixed
- The unwanted translucent upright light shaft next to the **right side of the arena center circle** (near hub coordinates x=4.5, z=6) is no longer created.
- The nearby lamppost, lamp bulb, physical collision, illumination and ground glow are unchanged.
- Other hub lamps and all map lamps still build their volumetric light cones as before.
- No changes to soccer ball physics, scene scale, network cadence or audio.

## Technical note
The hub calls `Builder.lamp(x,z,rotation,showVolumetricCone)` with `false` for one selected arena lamp. The lamp constructor skips only the optional `LAMP_CONE` mesh and leaves `cone=null`; `createLocalLighting` already safely skips lamps without cones. This avoids hiding a mesh temporarily and having the update loop make it visible again.

## QA
Check both hub/menu and multiplayer hub from a view facing the mode-selection goals. The vertical shaft in the screenshot should be absent while the other lights and the arena still work. Automated CI executes the multiplayer tests and production build; an in-browser visual verification is still recommended.
