# ZONE ONLINE — NPC AI architecture

The server-side NPC simulation is split into domain modules. The public entry points remain stable; orchestration modules coordinate domains but do not own their detailed rules.

## Public entry points

- `src/systems/npc-ai.js` — compatibility facade exported to the server. It exposes roster creation, world ticking, movement, proximity combat, NPC interaction, faction hostility, and needs helpers.
- `src/systems/npc-life.js` — A-Life routine coordinator. It plans/advances everyday routines and dispatches social encounters.

## World simulation pipeline

`npc-ai-world-tick.js` coordinates one authoritative NPC decision tick in this order:

1. `npc-ai-lifecycle.js` prepares an NPC for the tick (equipment defaults, dialogue refresh cadence, normalized stats, needs, home/base defaults, and world coordinates).
2. `npc-ai-territory.js` enforces active squad, life-routine, destination, and territory constraints.
3. `npc-ai-tactics.js` handles nearby threats and tactical reactions.
4. `npc-ai-decisions.js` coordinates mission orders and scheduled routine decisions.
5. `npc-ai-conflicts.js` coordinates strategic clashes, convoys, and local skirmishes.
6. `npc-ai-world-state.js` projects positions, faction-base summaries, and bounded world event history.

## Domain modules

| Module | Responsibility |
|---|---|
| `npc-ai-roster.js` | Authored NPC identity, faction/role metadata, initial roster creation |
| `npc-ai-runtime.js` | Deterministic selection, decision scheduling, bounded action history, travel orders |
| `npc-ai-needs.js` | Hunger, thirst, fatigue, stress, sleep windows |
| `npc-ai-lifecycle.js` | Per-tick initialization and lifecycle preparation |
| `npc-ai-decisions.js` | Decision timing, mission-vs-routine arbitration, decision orchestration |
| `npc-ai-behaviors.js` | Rest, camp, squad duties, guard, and ordinary patrol activity policy |
| `npc-ai-missions.js` | Explicit NPC mission orders, route steps, arrival, cancellation |
| `npc-ai-tactics.js` | Threat detection, cover/retreat, reconnaissance, guard posts, patrol target selection |
| `npc-ai-territory.js` | Squad locks, active routine/destination locks, territory safety |
| `npc-ai-factions.js` | Shared faction hostility policy |
| `npc-ai-movement.js` | World-coordinate movement and deterministic local roaming |
| `npc-ai-proximity-combat.js` | Short-range combat tick; re-exported from movement for compatibility |
| `npc-ai-conflicts.js` | Conflict-domain coordinator and expiring territory orders |
| `npc-ai-faction-battles.js` | Persistent faction engagements, battlefronts, participant snapshots, clash outcomes |
| `npc-ai-local-skirmishes.js` | Local map-space skirmishes and their combat consequences |
| `npc-ai-convoys.js` | Supply convoy creation, route progress, ambushes, expiry |
| `npc-ai-memory.js` | Bounded personal memory and pairwise relationship history |
| `npc-ai-world-state.js` | Authoritative position and faction-base projections; bounded event history |
| `npc-life-planner.js` | Everyday routine target selection and departure planning |
| `npc-life-routines.js` | Routine arrival, activity effects, and return-home lifecycle |
| `npc-life-social.js` | Proximity conversations, rumours, social squad formation |
| `npc-life-constants.js` / `npc-life-utils.js` | Shared A-Life constants and small utilities |

NPC support systems remain separate by design: `npc-dialogue.js` handles dialogue generation, `npc-interactions.js` handles player/NPC interactions, `npc-rescue.js` handles rescue workflows, and `npc-aftermath.js` handles casualties, corpses, medical recovery, and post-combat events.

## Compatibility and validation

- Server callers continue importing from `npc-ai.js` and `npc-life.js`.
- The conflict simulation order remains faction battles → convoys → local skirmishes to preserve deterministic random-call ordering.
- Movement continues to expose `tickNpcProximityCombat` as a compatibility export, while the implementation lives in its own module.
- Every extracted domain module is included in `npm run check`; focused behavior and delegation tests are in `tests/npc-ai-domain-split-4-61-25.test.js`.

This document describes the server-side NPC AI. It does not imply that the separate browser client file `public/js/game.js` has been fully modularized.
