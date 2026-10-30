# Friendslop v0.61.8 - Smooth bowl and skatepark dressing

## User report (in-game screenshots)
A rider or walking player shakes against the bowl walls, cannot carry momentum over the rim, and appears to hit an invisible upper lip. The rental has poorly organized shelves and the halfpipe and floating signs need work.

## Physics changes
- Replace the old circular quarter-arc, whose slope shoots toward infinity at the rim, with a C2-continuous quintic transition. Both the 3.05m-deep floor and the top coping have **zero slope** at the joint, with a bounded intermediate slope of ~1.51 (about 56 degrees).
- Increase bowl radial rendering resolution from 32 to 64 rings; one shared analytic height/slope function drives mesh and collision, avoiding stair-stepped near-vertical fragments. Metal coping is thinner, flush to the playable surface and visual only.
- Eliminate the old artificial wheel-radial corrective clamp; it no longer pulls skates backward when they reach a high point. Bowl forces are just gravity projected onto the surface; no magnetic acceleration.
- Walking actors and rideables follow shallow continuous ground while grounded, avoiding one-frame ground/air oscillation. Steep portions prevent WALKING uphill but slide characters gradually inward rather than teleporting them.
- Skates/scooters have real lip-crossing takeoff when **actual outward speed** is high. No vertical teleport; subsequent airborne frames use independent gravity and land only while falling.
- Changes limited to skate/scooter bowl handling plus local walker ground contact; leave multiplayer packet schema, updates and other districts unchanged.

## Environment improvements
- Halfpipe subdivisions raised to 20, exposed underside covered and metal kickplates, edge hardware and two extra rails added.
- Three extra grind rail segments in free district space; three low metal-topped curb islands to slide across.
- Remove isolated/floating halfpipe and park signs; storefront name attached to the actual brick facade.
- Rental shop: remove strange giant side shelving. Add a real smaller counter with register, wall-mounted skate decks, helmet display, repair tools, low benches, center fluorescent-style lamp and existing lightweight shader light. Door, destructible windows and clear central walkway kept.

## Checks
New/updated automated tests measure C2 curvature, analytic ground contact, safe lip velocity, no radial snap, wall-walking behavior, rider transform and museum mesh construction. Run the complete online suite, stress tests and Vite build. **Actual browser verification is still required** for a fast bowl exit, jump/landing, helmet/door clearance and 2-player pose sync.

Only merge to `main`/GitHub Pages. Do not touch `release` or publish Cloudflare; all commit messages request `[CF-Pages-Skip]`. Whether a Cloudflare Git integration truly skips builds must be confirmed independently in its dashboard.
