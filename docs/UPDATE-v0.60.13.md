# Friendslop v0.60.13 - Online observability and eight-player load tests

## Goal
Catch network and render regressions early, without introducing extra room traffic or risking the authoritative physics synchronization.

## Runtime diagnostics (enabled by default in multiplayer)
- **F3**: RTT median/p95; RTT jitter p95; outgoing WebSocket queue now/p95; client-skipped state packets; observed state sequence gaps/repeats; frame p95 and total frames above 50/120ms; visual movement discrepancy p95; decode/apply duration p95; time since last state/world snapshot.
- **F8**: All active metrics and up to four recent *confirmed* incidents in the bug report. Incident descriptions are persisted in the local browser only (bounded 12). `window.__fs.onlineDiagnostics()` exposes a JSON snapshot for local developer use.
- Peer sequence gaps are identified accurately as **missing packet numbers**, not as network transport loss. WebSocket/TCP is ordered, and the client deliberately skips queued state frames during backpressure.
- World-position discrepancy is measured from previous displayed mesh positions to authoritative incoming object positions, not a promise of absolute WAN synchronization error.
- Alert thresholds are diagnostic hints (RTT p95 >250ms, jitter p95 >90ms, WebSocket queue p95 >24KiB, frame p95 >55ms, missing host updates >1.4s, missing world snapshots >1.8s, physics discrepancy p95 >1.2m). Alert requires three consecutive evaluations (~3 seconds). Alerts have a bounded ring and are private to the local client.
- Rolling sample buffers use fixed caps, avoid network sends and external telemetry, do not log personal profiles/chat/voice, and only persist incident categories and timestamps. Background tabs are excluded from frame/outage warnings.
- Automatic diagnostics do not change authoritative ownership, game logic, or game send frequency.

## Stress tests
- `npm run test:online` includes actual Miniflare Durable Object multiplayer relay scenarios with **2, 4, 6 and 8 simultaneously connected WebSocket clients**, sending representative 20/16/14/12Hz state packets, moving object entries and periodic world snapshots.
- Validates that each host state reaches all guests, guest updates reach the host, guests do not receive each other's private state, and the local WebSocket send buffer stays bounded.
- Reports per-case actual send/receive counts, local relay p95, outbound bytes, peak buffered bytes, duration and effective send rate.
- `npm run test:stress` runs just the four load scenarios. CI also exercises existing world, radio, currency, vehicle and network tests before GitHub Pages deploy.
- These tests cannot measure real cloud quotas, multi-continent RTT, 8 GPUs, WebRTC voice quality or actual audio playback. Those need a geographically distributed 8-person playtest.

## Release acceptance for 8 users
1. Each user connects on v0.60.13, starts F3 and plays for at least 10 minutes. Both host and guests inspect RTT p95, jitter, host update age and send queue.
2. Simultaneously move the football, bike, carts, crates; ensure no characters lag behind seats, no duplicate rewards, and no high object discrepancy p95.
3. Attempt competing FIST pickups and a station/mission during peak activity. Verify one winner and visible remote players.
4. Leave/rejoin a guest, pause host, hide/show a tab; check recovery, keyframe restoration and absence of false incident storms.
5. Switch Low / Medium / High graphics; compare p95 frame time. Note that a 60Hz/VSync display or GPU load is not caused by the WebSocket message frequency.
6. If any game-frame failure occurs, press F8 and attach the report; it now includes recent network incident history. Metrics do not automatically upload anywhere.

## Next steps if problems persist
Use measured queues and object discrepancy to prioritize hysteretic interest management and batched priority scheduling. Consider explicit transport-independent time stamps and interpolation-delay tuning based on observed jitter, with real 8-client WAN testing before enabling these features globally.
