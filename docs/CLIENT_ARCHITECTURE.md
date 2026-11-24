# Browser client architecture

## Compatibility entry point

`public/js/game.js` remains a classic-script compatibility entry point because the existing UI and inline handlers rely on globally callable legacy functions. It owns application startup, current player/game state, cross-screen orchestration, and compatibility wrappers while subsystems are extracted incrementally.

## Extracted browser modules

- `core/*` — configuration, event bus, state/save access, defaults, and network setup.
- `systems/inventory.js` — inventory stack operations, filtering/sorting, weight and backpack-capacity summaries, equipment slot compatibility, equip/unequip rules, and candidate selection.
- `systems/economy.js` — price and affordability rules.
- `systems/combat.js` — deterministic combat calculations.
- `systems/quests.js` — quest condition checks.
- `systems/npc-dialogue.js` — dialogue generation and authored dialogue helpers.
- `systems/map-navigation.js` — route graph, sector geometry, viewport math, and position resolution.
- `systems/map-data.js` — map data preparation.
- `systems/map-renderer.js` — SVG/map layer composition.
- `systems/map-motion.js` — batched map marker motion updates.
- `systems/encyclopedia.js` — encyclopedia entry composition, search/rendering, selection state, and armory reference catalogue/rendering.
- `systems/character-loadout.js` — starter equipment selection rules, supply limits, point-budget accounting, validation, and reset behavior.
- `systems/character-setup-data.js` — faction descriptions, names/callsigns, background definitions, and starter equipment catalogue.
- `systems/character-setup-profile.js` — portrait catalogue, portrait-picker UI state/rendering through an injected DOM adapter, background validation, identity checks, and faction spawn-point eligibility/resolution.
- `systems/character-creation.js` — final character creation validation and state application, including faction spawn validation, profile initialization, starter inventory/equipment construction, background bonuses, and registration history.
- `survival.js` — survival/radiation calculations.

## Module contract

`systems/inventory.js` exposes `ZoneInventory`. The game delegates stack add/count/take, inventory filtering and sorting, backpack load summaries, equipment slot mapping, slot candidate filtering, and equip/unequip validation to this domain module. It receives plain item/equipment objects and does not access the DOM, persistence, or network. `game.js` retains rendering, alerts, save calls, and equipment synchronization as compatibility/UI responsibilities.

`systems/encyclopedia.js` exposes `ZoneEncyclopedia.createEncyclopediaSystem(...)`. It receives the current game state and content catalogs through getter functions, plus the DOM lookup and formatting helpers it needs. The module owns its local selection/expanded-group state. `game.js` retains small global wrappers (`encyclopediaBase`, `renderEncyclopedia`, `renderArmory`, etc.) so existing inline UI handlers and callers continue to work.

`systems/character-loadout.js` exposes `ZoneCharacterLoadout.createCharacterLoadoutSystem(...)`. It receives getter/setter adapters for the current setup loadout, the starter gear catalogue, and the point budget. It owns selection validation, supply quantity rules, budget rollback, and reset behavior. DOM rendering and inline callback names remain in `game.js` as a compatibility layer.

## Next extraction order

1. Extract inventory/equipment UI rendering and interactions, keeping domain rules in `systems/inventory.js`.
2. Extract combat encounter UI orchestration, keeping calculations in `systems/combat.js`.
3. Continue with NPC/contact UI, faction screens, and multiplayer presentation.

Do not convert the whole client to ES modules in one step: the legacy HTML uses inline event handlers and classic script globals. Each extraction should preserve a compatibility facade until all callers are migrated and verified.

`systems/character-creation.js` exposes `ZoneCharacterCreation.apply(...)`. It validates the callsign, real name, selected faction, starter budget, and faction-owned spawn point before mutating the player state. It then applies the portrait/profile, initializes survival stats, constructs real starter inventory and equipment from the selected catalogue, applies background bonuses, and records the registration event. It has no DOM, persistence, or network dependency; `game.js` keeps the form normalization, migration call, validation messages, screen close, save, and multiplayer synchronization.
- `systems/inventory-view.js` — backpack grid, equipment summary, load indicators, item glyphs, and detailed item inspection presentation.
- `systems/combat-view.js` — combat log presentation and combat overlay rendering for enemy/player health and equipped weapon details.

`systems/combat-view.js` exposes `ZoneCombatView`. The existing `combatLog` and `renderCombat` functions in `game.js` remain compatibility wrappers. The view receives the current battle/player state, DOM lookup, escaping helper, and weapon accessors; it does not own battle state or mutate player inventory. `systems/combat.js` continues to own deterministic damage/power calculations, while turn resolution, rewards, death handling, and online NPC combat authority remain outside the view module.
