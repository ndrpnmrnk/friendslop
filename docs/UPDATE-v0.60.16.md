# Friendslop v0.60.16 - Multiplayer mission item ownership and handoffs

## Symptom and root causes
Mission items could be optimistically grabbed by their locally running worker without sending the host a pickup request if the worker owned the mission's world scope. The worker would then ignore a host correction for most local-scope items, even if another player had already picked them up. This allowed remote players to see different holders and could leave missions believing a placed box was still in place after being stolen.

The balloon stair mission's `onPickup` handler ran on the machine doing the physical pickup, but was not invoked when the worker received a replicated state change. The cleanup mission only incremented its progress from its local impact callback and did not reconcile items already delivered by someone else. Mail could automatically create a replacement envelope merely because one disappeared.

## Changes
1. **One authoritative holder:** every guest's physical item pickup, including items in its own mission scope, sends a `take` command through the existing match command packet. Host checks reachability, current item state and whether the player has free hands, then chooses the actual holder. No new messages or tick rate.
2. **Scoped ownership does not override the host:** receiving an authoritative item state/owner change now reconciles even for the currently executing mission scope. A short local prediction is allowed, but is corrected after a rejected pickup; the host already triggers a full keyframe after a pickup command.
3. **Competing proposals:** mission-scope proposals cannot replace a confirmed holder with another holder or freely create a new held state for an existing object without a host-approved pickup. Objects created later by a mission stage can still be registered with deterministic scope identifiers.
4. **Shared mission progress:** newly observed remote pickup transitions invoke `onPickup`, so the balloon mission removes stolen steps even on the worker's device. Cleanup counts confirmed `taken` rubbish from world state and adds the corresponding display pieces, regardless of who brought the rubbish to the bin. An unaccountably vanished mail envelope does not silently create a new one or continue the mission.
5. **Lifecycle:** all mission-spawned item objects automatically inherit a mission tag based on the mission scope, so cleanup and removal no longer rely on each specific mini-game remembering to tag every item manually.

## Coverage
- The full 44+ mission definition catalog has a regression smoke check.
- The 13 identified missions using shared physical inventory are included in structural coverage: **targets, cleanup, delivery, pizza, salad, bulb, firebin, steal, generator, balloon, mail, detector, cart**.
- Unit tests cover conflicting ownership and permission decisions, prompt reconciliation, and replicated pickup transitions.
- A real local Worker WebSocket transport test covers host+worker+helper: the helper's take command reaches only the host and the host's resulting new holder reaches both guests.
- Existing tests for 2/4/6/8 players, shared FIST rewards, motion and audio also run, followed by the production build.

## Manual acceptance checklist (not replaced by the above automated checks)
- **Cleanup:** worker and helper each deposit rubbish, confirm both see items disappear and the same progress until five are collected.
- **Balloon:** worker places two boxes; helper takes the lower one; the upper step must be invalidated for the worker as well. After recovering three steps the balloon can be removed; without them it cannot finish.
- **Targets, salad, bulb, generator, mail, delivery/pizza, cart and steal:** helper picks up, walks away, drops and throws an item while worker watches. Both clients should always show the same holder and availability, and mission progress should depend on real items.
- **All remaining panel/non-item missions:** smoke-test start/finish/abort and spectator visuals; not all can be exercised as a unit test without a browser, real physics and a full mission harness.
- Repeat with 8 players, late join/reconnect, player exit while carrying and temporary high RTT; capture F8 and F3 diagnostics if anything diverges.

## Release caveats
This is a client/room-host authoritative scheme, not server-side anti-cheat. It improves consistency but no headless/local test can establish that all 44+ missions work perfectly under actual 8-device WAN conditions. Visual and gameplay acceptance for each mission is still required before a public launch. Cloudflare Worker unchanged.
