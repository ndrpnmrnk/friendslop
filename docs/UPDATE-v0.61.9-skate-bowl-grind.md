# Friendslop v0.61.9 - Sharp bowl rim, fall-through guard and rail grind

- Keep the hard **visual** coping edge by using a dedicated visual height and separate rim/deck vertex normals. Collision continues using the smooth contact sampler (no blocking metal coping).
- When descending in the bowl, sample the actual bowl surface even if step-limited ground detection has lost contact. Catch crossing/penetration instead of allowing the board to fall below the textured floor. Upward jumps and real lip launches are unaffected.
- The original wedge prism is already fully closed. Remove overlapping decorative triangles and caps responsible for flicker and black barcode streaks. Keep ramp supports as one-way ground.
- Repair rail grinding: previously the actual velocity-projection code was accidentally commented out. A descending skate or scooter must catch the top of a rail with sufficient tangential speed, slide along its real segment, and exit cleanly at either end. Repeated impacts from below and stationary touches do not trigger a grind.
- Award a small existing, capped grind bonus **once on completed rail traversal** (minimum .28 s and 1.6 m) via W.onGrind, with existing 10-second per-rail cooldown. Do not add uncapped scoring, network messages or currency.
- Dampen the rider lean into/out of the rail, suppress kick-stepping/steering while grinding, clear incompatible flip poses, and rate-limit the existing short grind SFX to .30 s. Space jumps off naturally.
- Keep test deployment limited to `main` and GitHub Pages. Never modify `release`, the Worker or Cloudflare deployment settings.

Regression checks: pure rail state tests, hard visual rim/soft collision test, mesh construction, moving/landing logic and entire online test + Vite build. Browser QA with high-speed bowl laps, rail catches, sound, particle effects and multiplayer is still required.
