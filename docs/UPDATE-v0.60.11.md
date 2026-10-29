# Friendslop v0.60.11 - frame-fault diagnostics, seated player visuals, radio continuity

## What changed
- Remote riders in the hub and match are drawn at the exact displayed position of their bicycle, scooter, cart, or other mounted ride, with the vehicle's own yaw. Avoids the previous mismatch between a delayed actor interpolation buffer and a newer visually interpolated object. Vehicles retain their existing network ownership, physical positions and update cadence.
- Invalid or removed ride objects are detached safely before `updatePlayer` dereferences `ride.pose`. Receiving removal of a pushable also clears its rider/grabber pointers, preventing stale references from later frames.
- Radio: small phase drift is corrected using a gently adjusted playback speed (up to 3%); when the browser has paused the audio after buffering, it realigns before resuming, rather than jumping while audible. Media elements left behind by a prior world are now disposed. No continuous audio streaming through the multiplayer server, and no new WebSocket messages.
- The frame fault log now records the last completed profiler section, whether the player was riding or holding something, and online/host state. F8 shows the persisted fault and up to three stack lines, including after reload. The generic “Сбой кадра” notification now points to F8 for evidence.

## Tests and limitations
- Automated tests cover mount visual anchoring, ignored stale/removed vehicles, immutable simulated vehicle positions, radio/clock handling, prior physics/world packets and 8-client room relay; production build must pass on the pull request.
- The exact reason for an earlier one-off frame failure cannot be determined from the generic toast alone; it is stored in the affected browser's localStorage, not sent to the server. If another frame fails, press F8 and send the error details. Guarding missing ride references addresses one plausible interaction failure, but does not prove it was the cause.
- Visually verify two clients concurrently on a bicycle / scooter / cart, including turning, boarding, dismounting, loss and reconnection. Verify the host and a guest hear the same radio station and that long playback and pause/resume do not produce audible jumps.
- The Cloudflare Worker is unchanged; the patch is frontend-only.
