# Browser client architecture

## Compatibility entry point

`public/js/game.js` remains a classic-script compatibility entry point because the existing UI and inline handlers rely on globally callable legacy functions. It owns application startup, current player/game state, cross-screen orchestration, and compatibility wrappers while subsystems are extracted incrementally.

## Extracted browser modules

- `core/*` — configuration, event bus, state/save access, defaults, and network setup.
- `systems/inventory.js` — inventory calculations and mutations shared by UI flows.
- `systems/economy.js` — price and affordability rules.
- `systems/combat.js` — deterministic combat calculations.
- `systems/quests.js` — quest condition checks.
- `systems/npc-dialogue.js` — dialogue generation and authored dialogue helpers.
- `systems/map-navigation.js` — route graph, sector geometry, viewport math, and position resolution.
- `systems/map-data.js` — map data preparation.
- `systems/map-renderer.js` — SVG/map layer composition.
- `systems/map-motion.js` — batched map marker motion updates.
- `systems/encyclopedia.js` — encyclopedia entry composition, search/rendering, selection state, and armory reference catalogue/rendering.
- `survival.js` — survival/radiation calculations.

## Module contract

`systems/encyclopedia.js` exposes `ZoneEncyclopedia.createEncyclopediaSystem(...)`. It receives the current game state and content catalogs through getter functions, plus the DOM lookup and formatting helpers it needs. The module owns its local selection/expanded-group state. `game.js` retains small global wrappers (`encyclopediaBase`, `renderEncyclopedia`, `renderArmory`, etc.) so existing inline UI handlers and callers continue to work.

## Next extraction order

1. Separate map interaction/controller state from the large UI entry point, preserving the existing map renderer/navigation modules.
2. Extract character creation and starter-loadout flow behind a dedicated module contract.
3. Extract inventory/equipment UI rendering and interactions, keeping inventory data rules in `systems/inventory.js`.
4. Extract combat encounter UI orchestration, keeping calculations in `systems/combat.js`.
5. Continue with NPC/contact UI, faction screens, and multiplayer presentation.

Do not convert the whole client to ES modules in one step: the legacy HTML uses inline event handlers and classic script globals. Each extraction should preserve a compatibility facade until all callers are migrated and verified.
