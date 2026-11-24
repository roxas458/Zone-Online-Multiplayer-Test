# ZONE ONLINE 4.61.10

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
