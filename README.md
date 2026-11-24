## 4.61.26 — Browser encyclopedia and armory modularization

- Extracted encyclopedia entry composition, search, article rendering, selection state, and category expansion into `public/js/systems/encyclopedia.js`.
- Moved the armory reference catalogue and rendering into the same focused browser module.
- Kept legacy global entry points as thin compatibility wrappers in `public/js/game.js`.
- Added `docs/CLIENT_ARCHITECTURE.md` with the current module boundaries and staged extraction plan.
- Reduced `public/js/game.js` from 428,380 bytes to 410,250 bytes (18,130 bytes, about 4.2%) in this release.
- Added isolated module tests and browser boot integration coverage.

## 4.61.26 — Client encyclopedia modularization

- Moved encyclopedia entry composition, selection state, search rendering and mode switching from `public/js/game.js` into `public/js/systems/encyclopedia.js`.
- The module receives game state, content catalogs and DOM helpers through an explicit factory contract; the legacy global function names remain as compatibility wrappers.
- Added focused tests for dynamic entry composition, search rendering and armory-mode delegation.
- `public/js/game.js` reduced by approximately 13 KB in this step.

### 4.61.25 — NPC AI domain separation and combat subsystem split

- Split the former NPC conflict bundle into `npc-ai-faction-battles.js`, `npc-ai-convoys.js`, and `npc-ai-local-skirmishes.js`; `npc-ai-conflicts.js` now coordinates these systems while preserving simulation order.
- Extracted short-range proximity combat into `npc-ai-proximity-combat.js`; `npc-ai-movement.js` remains responsible for movement and roaming while preserving its compatibility export.
- Extracted ordinary NPC activity selection (sleep/rest, camp, squad duties, guard, and patrol) into `npc-ai-behaviors.js`; `npc-ai-decisions.js` now coordinates scheduling, mission orders, and routine behavior.
- Preserved the public `npc-ai.js` API and existing server tick entry points. Added focused tests for the separated domain modules and retained the established simulation sequence. Added `docs/NPC_AI_ARCHITECTURE.md` with the module map and authoritative tick order.
- This completes another major server-side NPC AI separation stage; it does not claim that the browser `public/js/game.js` has been split.

### 4.61.25 — NPC memory and relationship history

- Added `src/systems/npc-ai-memory.js` for bounded personal memories, pairwise relationship scores, encounter counts, and timestamps.
- Social encounters, squad formation, and shared artifact rumours now update relationship history through one consistent API.
- NPCs who knew a fallen squadmate or friend remember the killer and develop a strong negative relationship toward them.
- Preserved the existing numeric `npc.relationships[id]` format while adding `relationshipHistory` metadata for richer future behavior.
- Added focused tests for memory limits, relationship clamping, interaction history, and witnessed ally deaths.
- `public/js/game.js` remains a separate modularization task.

# ZONE ONLINE 4.61.26

### 4.61.23 — NPC tactical behavior modularization

- Extracted tactical decision rules into `src/systems/npc-ai-tactics.js`: threat detection, cover/withdrawal response, reconnaissance reports, territory guard posts, and local/sector patrol target selection.
- Integrated threat response into the authoritative NPC world tick so NPCs can react to nearby hostile units before the proximity combat threshold; wounded NPCs withdraw toward friendly territory while healthier NPCs move away and seek cover.
- Kept ordinary needs, mission orders, medical/scavenging/escort activities, and the public NPC AI facade in their existing modules.
- Added focused tests for threat selection, retreat, cover movement, recon reporting, guard assignment, patrol targeting, and orchestration.
- `public/js/game.js` remains a separate modularization task.


### 4.61.22 — NPC mission-order handling extraction

- Extracted explicit NPC mission-order processing into `src/systems/npc-ai-missions.js`: target arrival, route-step selection, territory access checks, mission travel, cancellation/retreat, and decision scheduling.
- Kept `decideNpcAction()` as the behavioral decision entry point and delegated mission orders to the new focused module.
- Preserved mission completion duty, mission travel reason, retreat behavior, and the 5–9 minute decision reschedule window.
- Added direct tests for reachable missions, arrival completion, inaccessible targets, and delegation.
- This is a server-side AI refactor; it does not complete the separate `public/js/game.js` modularization.


### 4.61.21 — A-Life routine planning and execution split

- Extracted civilian routine target selection and scheduling into `src/systems/npc-life-planner.js`.
- Extracted active routine phases, arrivals, scavenging/trading/rest effects, and return-home handling into `src/systems/npc-life-routines.js`.
- Added `src/systems/npc-life-constants.js` for shared activity constants and bounded numeric helpers.
- Kept `tickNpcLife(world, now, random)` as a compatibility-preserving orchestrator; the public API, event aggregation, protected actions, social encounter integration, and world event history remain in place.
- Added direct tests for planner/executor isolation and end-to-end facade behavior.
- `public/js/game.js` remains a separate unfinished modularization task.

### 4.61.20 — NPC social simulation extraction

- Extracted social proximity encounters, relationship updates, artifact-rumour sharing, road encounters, and persistent friend-squad formation into `src/systems/npc-life-social.js`.
- Added `src/systems/npc-life-utils.js` for deterministic local-goal seeding and bounded NPC memory updates shared by life and social systems.
- Kept `tickNpcLife(world, now, random)` and its event aggregation behavior compatible; social events are appended to the same bounded `world.npcLifeEvents` history.
- Added direct tests for independent social simulation, relationships, squad formation, and delegation from the life-routine module.
- This is an incremental AI modularization step. `public/js/game.js` remains a large client entry point and is not yet fully split into modules.

### 4.61.19 — NPC AI world orchestration modularization, phase 3

- Split the NPC world tick into focused territory/squad constraints, world-state projection, and orchestration modules.
- Kept `src/systems/npc-ai.js` as a stable public facade for existing server callers.
- Added isolated tests for squad movement locks, life routines, territory retreats, faction-base summaries, bounded event history, and end-to-end NPC tick behavior.
- No intended gameplay-rule changes; the refactor preserves the existing authoritative tick flow.

### 4.61.18 — NPC AI lifecycle and roster modularization, phase 2
- Moved story NPC faction/role/name metadata and initial roster creation into `src/systems/npc-ai-roster.js`; `npc-ai.js` keeps compatibility exports.
- Moved shared decision scheduling, bounded action history, and travel-order creation into `src/systems/npc-ai-runtime.js`.
- Extracted per-NPC tick preparation into `src/systems/npc-ai-lifecycle.js`: equipment defaults, dialogue refresh cadence, stat normalization, needs updates, home/base initialization, activity pacing, and initial coordinates.
- Kept the world tick as the coordinator and preserved ordering: equipment defaults are applied before the alive check; dead NPCs do not receive dialogue/needs/lifecycle updates; active squad, life routine, mission, territory and decision checks remain in their original sequence.
- `public/js/game.js` is not yet fully modularized; it remains a large browser entry point and needs a separate staged extraction plan.


### 4.61.17 — NPC AI modularization, phase 1
- Extracted needs and sleep-cycle calculations into `npc-ai-needs.js`.
- Extracted the per-NPC behavioral decision policy into `npc-ai-decisions.js`; the helper reports whether the original AI tick should continue with its post-decision bookkeeping, preserving the previous scheduling flow.
- Extracted spatial movement and proximity combat into `npc-ai-movement.js`.
- Extracted shared faction hostility rules into `npc-ai-factions.js`.
- Extracted faction clashes, local skirmishes, battlefront resolution and convoy lifecycle into `npc-ai-conflicts.js`.
- Reduced `npc-ai.js` from 29,566 bytes in 4.61.15 to 9,304 bytes by moving these responsibilities into dedicated modules. This is a substantial first phase, not a claim that the full AI architecture is finished: roster initialization, world orchestration and some life/mission lifecycle handling remain to be separated.
- Includes the 4.61.16 keyed dynamic map entity reconciliation work.

### 4.61.15 — Keyed NPC marker reconciliation

- Split NPC and squad markers into their own SVG layer, separate from strategic points, mutants, anomalies, players, artifacts, and stashes.
- Added keyed reconciliation by `data-npc-id`: unchanged NPC marker DOM nodes are retained; only added, removed, or changed NPC markers are inserted, removed, or replaced.
- Squad overview markers use the squad leader NPC ID as their stable key; individual local-sector markers use each NPC ID.
- This avoids rebuilding the entire NPC marker layer when a single stalker changes position or state. Other map marker categories keep their existing layer patch behavior.
- No save format, server authority, Socket.IO event, NPC AI rule, movement rule, map coordinate, or route graph was changed.

### 4.61.14 — Incremental SVG map layer updates

- Added stable `data-map-layer` identities for the map background, sector regions, sector routes, selected routes, dynamic markers, and compass.
- Added `ZoneMapRenderer.patchSvg()`: it preserves the existing SVG root and unchanged layer DOM nodes, updates only layers whose markup changed, and keeps the SVG root alive so pointer capture and map interactions are not reset on every render.
- `renderZoneMap()` now patches the existing map instead of replacing the entire map container. The map entity card is preserved across map refreshes; the range legend is updated independently.
- Added regression tests for layer identity, layer order, patch integration, and script loading.
- No save format, server authority, Socket.IO event, NPC movement rule, map coordinate, or route graph was changed.

### 4.61.13 — Batched NPC marker motion

- Added `public/js/systems/map-motion.js` to coalesce multiple NPC marker transform updates into one animation frame and retain only the latest transform per NPC.
- This is a movement-update optimization; it does not replace the complete map renderer. The 4.61.14 release adds the next layer of incremental rendering.


### 4.61.12 — Local map convoy filtering

- Fixed map-data preparation so the local-sector map includes only moving or ambushed convoys belonging to the current sector. The Zone overview still includes active convoys across all sectors.
- This removes unrelated convoy markers from local views and avoids generating/rendering out-of-sector convoy markup.
- Added regression tests for local and Zone convoy scope, including preservation of the source arrays.
- No save schema, network event, server authority, map coordinates, or movement behavior changed.

## 4.61.3 — Modular gameplay systems: inventory and economy

This release continues the incremental client modularization from 4.61.2.

### Extracted modules

- `public/js/systems/inventory.js` — stack creation, stack counting, and item removal. The game retains ownership of the canonical state object and passes its existing inventory array into the module.
- `public/js/systems/economy.js` — affordability checks and shared buyback-price calculations. Currency mutations and online transactions remain in the existing game/server flows.

### Compatibility

- The existing `zoneExpandedSave` key and save structure are unchanged.
- Existing inventory item fields and stack behavior are preserved.
- The 65% offline buyback calculation is centralized without changing its rounding rule.
- Online market operations continue to use their existing Socket.IO events and server authority.
- Existing UI entry points (`addItem`, `count`, `take`, `sell`, and `buy`) remain as compatibility adapters.
- Existing content, NPC, faction, quest, map, and multiplayer features remain in the project.

### Validation

- `npm run check` — passed.
- `npm test` — 388/388 passed.
- ZIP integrity — checked after packaging.

This is an incremental migration, not the final removal of `game.js`. Combat, quests, survival, NPC behavior, map, and interface remain in their existing locations until each can be moved with focused compatibility tests.


## 4.61.4 — Modular combat calculations

- Extracted deterministic combat calculations into `public/js/systems/combat.js`: weapon power, encounter probability, XP-based enemy scaling, player attack damage, ally support damage, incoming damage mitigation, and medical-item healing values.
- The existing game functions remain as compatibility/UI orchestration. Combat UI, rewards, death flow, equipment wear, and save behavior remain in the game layer.
- Online NPC combat still sends actions to the server and applies server-returned state; this extraction does not move authority to the browser.
- Added focused regression tests for the extracted formulas and script loading order.


## 4.61.5 — Modular quest rules

- Extracted quest completion-condition evaluation into `public/js/systems/quests.js`.
- Browser/offline and server/online flows now use the same conditions for story flags, discovered story points, legacy starter quests, location deliveries, and item-type deliveries.
- Reward grants, quest state changes, item consumption, persistence, and online authority remain in their existing client/server handlers.
- Existing server-side consumption of required item-type deliveries remains intact.
- Added regression tests for quest condition parity and script load order.


## 4.61.6 — Modular survival and radiation rules

- Radiation exposure by sector, protection-window handling, and radiation-driven health/stamina penalties now live in the shared `public/js/survival.js` rules module.
- The browser client delegates radiation ticks to that module; existing hunger/thirst, emission, expedition, hunting, and shelter flows remain intact.
- Online survival mutations remain server-authoritative. This release does not change save keys or save structure.
- Added deterministic regression tests for exposure rates, protection, thresholds, and bounded player stats.


## 4.61.7 — Modular NPC dialogue

Moved authored signature dialogue and procedural dialogue generation into `public/js/systems/npc-dialogue.js`. The browser client keeps its existing `generatedNpcDialogue` and `applySignatureDialogue` call sites as compatibility aliases. NPC dialogue text, 15-minute refresh cadence, per-NPC seed inputs, and the existing dialogue UI/network flow are preserved. This is a client content/rules extraction only; server NPC simulation, relationship changes, quest rewards, and authoritative interactions remain in their existing systems.


## 4.61.8 — Modular NPC interactions

Moved the server-authoritative player-to-NPC interaction handler into `src/systems/npc-interactions.js`. It retains the existing alive/location/range/action validation, relationship deltas, interaction memory cap, dialogue response generation, and timestamps. `npc-ai.js` continues to re-export the same function for compatibility, so the Socket.IO server event and its authority boundary are unchanged. Added regression coverage for invalid actions, range checks, relationship bounds, memory retention, and supported actions.


### 4.61.10 — Map navigation module

Extracted sector coordinates, sector graph, local route search, player expedition interpolation, map viewport geometry and local movement target clamping into `public/js/systems/map-navigation.js`. Legacy browser entry points remain as compatibility wrappers; route graph, travel modes, coordinate values, movement limits and save fields are unchanged.

### 4.61.10 — Modular map rendering layers

Moved map-region SVG generation and the final SVG/layer composition into `public/js/systems/map-renderer.js`. The browser keeps its existing map interactions and data preparation, while the renderer now owns deterministic region markup and the ordered base, region, sector-route, selected-route, marker, and compass layers. Existing map asset path, SVG viewBox behavior, pointer/wheel handlers, marker content, card overlays, and map state remain unchanged. Added DOM-free regression tests for escaping, geometry, layer order, and browser integration.

### 4.61.11 — Modular map data preparation

Map entity filtering and grouping now live in `public/js/systems/map-data.js`. The module prepares the existing NPC/squad, strategic-point, battle, convoy, mutant, anomaly, online-player, cooperative-artifact, discovered-artifact, and stash collections for the current local or Zone overview. It is a pure preparation layer: it does not mutate world state, create rewards, move entities, or handle interactions. SVG rendering and click handlers remain in the existing map renderer and game UI.
