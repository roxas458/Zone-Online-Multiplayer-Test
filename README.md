# ZONE ONLINE 4.61.4

## 4.61.4 — Modular gameplay systems: inventory and economy

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
