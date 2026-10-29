# v0.60.9 - radio, lobby lights, eight-player pacing, FPS diagnosis

## What changed
- Removed the four tall emissive vertical columns from the slingshot launch staging zone in the hub. The flat floor indicator and launch mechanic remain.
- Boombox music plays locally as the same OGG on every participant's device; WebSocket only carries shared station/on/off/origin timestamps. On re-entering audible range or changing a station, the player seeks **once**, then uses gentle playbackRate correction (±1.5%), checking every 1.5 seconds. Severe drift (>4 s) can still trigger one rescue seek, no more than once per 15 s.
- Smoothed timestamp offset from room pings so ordinary RTT jitter does not repeatedly jump the shared radio phase.
- Boombox audio now preloads instead of waiting for metadata only. LED material updates only on actual toggles.
- Dynamic room send cadence: 20 Hz (1-3 players), 16 Hz (4-5), ~14 Hz (6-7), ~12 Hz (8); if socket queued bytes exceed 8/24 KiB, throttle to 10/8 Hz. World snapshots 5 Hz in small rooms, 4 Hz from 6 players; periodic keyframes unchanged. No separate movement/sound packets introduced.
- Reduced square-root calls for distant pushable pairs in the large map. F3 now displays frame interval, measured JS time and **non-JS budget** (GPU/VSync/browser scheduling combined); no fixed 60 FPS cap appears in the animation loop, which runs under requestAnimationFrame.
- Tests: radio drift/clock pacing, eight-player fan-out against the local Worker, existing online suite, production build.

## Limitations and validation
- Eight local WebSockets exercise routing and room capacity, not realistic geographical WAN latency or cloud plan quotas. Cloudflare Worker is unchanged.
- For real players, verify stable music without repeated jumps after toggling/tuning, near/far moves, network RTT spikes; test the host+7 peers, lobby ball and mission completion; compare F3 on hub vs match with graphics preset, draw calls, JS ms, non-JS ms, and FPS. Real 144 FPS cannot be promised for a loaded map or a 60 Hz display/VSync environment.
- If a different central light shaft remains, capture an F8 screenshot and position: this removes the explicit decorative launch staging beams but does not remove all actual illumination.

## Deployment
- GitHub Pages via main after passing GitHub Actions; release/Cloudflare Pages/Cloudflare Worker left unchanged.
