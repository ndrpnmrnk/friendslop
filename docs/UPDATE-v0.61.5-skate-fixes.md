# v0.61.5 - Skatepark physics, lighting and rental glass

This is a **test-only** change for main and GitHub Pages. It does not touch the Worker, release, Cloudflare deployment hooks or production configuration. Read docs/DEPLOYMENT_POLICY.md.

## Fixes
- Remove the 12 orange coping markers from the skate bowl.
- Disable construction of additive volumetric light columns for **all** normal district lamps, preserving shader lighting, the visible lamp heads and light pools.
- Calculate skateboard and scooter pitch and roll from the **same analytic bowl surface normal**. Rider transforms use the identical values; the near-vertical lip has bounded lean, and insufficient speed leads to downhill acceleration instead of a stationary wall attachment.
- Detect high-speed **lip crossing** between two positions, not only a tiny radial ring at the start of a frame. Preserve upward velocity and enter airborne state before normal collision/grounding. Standard gravity and original trick/landing logic apply; no magic snapping after takeoff.
- Remove the repeated horizontal front entrance strips/awning. Create real breakable storefront windows and two individually destructible sliding-glass leaves. The panels use the existing host-managed breakables; dynamic door meshes stay out of static-instancing, move their own solid bounds and unlock the central passage when open.

## Verification
Automated tests cover light cone absence, retained hub and hoop, rental pane state, animated doors, geometry/physics, networking and 2/4/6/8 local relay. In-browser QA is still required for steep wall posture, collision/landing feel, breaking a window with a thrown object and seeing its break state on a second client.

**Cloudflare release policy:** this PR must only be merged to main. Do not push release or run Wrangler. The Cloudflare dashboard's branch/preview configuration was not changed by this repository update, so real Cloudflare build isolation still needs to be verified independently.
