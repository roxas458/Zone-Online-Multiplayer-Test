# ZONE ONLINE — STORY UPDATE: ПЛУТ / ЗАТОН

## Story campaign updates
- Replaced the protagonist identity everywhere in the story campaign with **Плут**. His legal name and age are unknown; no surname or secondary callsign is shown.
- Replaced the former female medic with **Доктор «Шрам»**, a male former military medic at the loner camp.
- Renamed the bandit toll collector **Шакал** and updated his description and dialogue.
- Expanded the Zaton story roster with eight named loners and bandits: Сова, Барин, Макар «Ржавый», Юла, Горшок, Лесник and Оскар (plus the renamed specialist roles).
- Added time-of-day-aware route variations for NPCs and occasional nearby NPC activity reports in the PDA log. This is a local story-mode simulation layer; it does not alter the multiplayer faction-war world.
- Kept the story save isolated under `zoneStorySave`.

Validation: `npm test` and `npm run check`.

---

# ZONE ONLINE 4.60.0

## Story mode prototype — Zaton
- Added a separate Story Mode entry from the title menu. It does not replace or modify the existing faction-war campaign.
- Added the supplied Zaton map as a story-only map asset, with clickable locations, points of interest, NPC markers and a player marker.
- Added an original pre-Call of Pripyat story opening, an initial objective, six named loner/bandit NPCs, basic dialogue, inspection and approach interactions.
- Story progress is stored independently under `zoneStorySave`; the existing `zoneExpandedSave` remains untouched.
- This is the first playable narrative/map prototype. Full movement simulation, combat, inventory, quest chains and deeper A-Life behavior remain future work.


## 4.60.0 — Sector Intelligence, Tactical Battle Reports & Balanced Starter Budget
- Aligned the starter supply budget with the setup UI at 400 points; over-budget item selections are rejected and faction starter kits remain within budget.
- Clicking a sector on the full Zone map now opens an intelligence card with faction control, NPC and online-player counts, key points, anomalies, mutant groups, active battles and artifact signals. Travel requires an explicit route action.
- NPC battle hotspots now show combatant names, factions, roles, health bars and casualty status, backed by persistent participant snapshots.
- Added eight anomaly fields, including deterministic migration for existing local saves and persistent server worlds.
- Added regression tests for budget consistency, sector intelligence, combat rosters, anomaly migration and duplicate function declarations.

# ZONE ONLINE 4.58.1

## 4.58.1 — Starter Arsenal, Faction Quests & Tactical Combat Markers

- Expanded character-creation weapon choices from three firearms to 35 supported entries, using the canonical server inventory IDs and starter-point costs.
- Raised the starter supply budget to 650 points and connected the selected weapon's power to combat calculations.
- Added separate starter and campaign quests for all ten factions; quest lists, acceptance and turn-in are now restricted to the player's faction.
- Added location and item-delivery requirements for faction contracts, including delivery of any artifact for the Scientists.
- Replaced the cartoon fire and muzzle-flash NPC combat marker with a restrained crossed-swords insignia and muted pulse.
- Re-seed faction quest catalogs when confirming a newly created character so new games and post-death characters receive the correct faction missions.
- Added regression coverage for faction isolation, starter weapons and the new combat marker.

## 4.58.0 — Visible NPC Battles & Tactical Battle Reports

- NPCs currently fighting now display animated fire, muzzle flashes and a combat pulse on the local and Zone maps.
- Active battlefronts have clickable map hotspots showing the sector, factions, rounds, losses and known participants with their current health/alive status.
- Battlefronts retain a bounded participant list so tactical reports can identify the NPCs involved without unbounded world-state growth.
- The armory catalogue contains 67 entries, including melee weapons.


## 4.58.0 — Faction War Activity & Capture Balance

- Повышена частота стратегических вылазок экспансионистских группировок: шанс отправки отряда 58%, период повторной готовности сокращён до 4 минут.
- Монолит и Свобода теперь ставят доступные вражеские объекты выше обычной разведки и снабжения, если штаб не занят срочной обороной или запросом игрока.
- Увеличена скорость захвата укреплённых объектов: влияние гарнизона ограничено, прогресс обновляется каждые 30 секунд.
- Расширен поиск маршрутов до 5 переходов и добавлен резервный источник стартовой дипломатии.
- Добавлены регрессионные тесты на наступление Монолита, частоту отправки отрядов и захват укреплённых объектов.
- Fixed missing sector-coordinate import that crashed strategic faction squad movement.
- Added initialization for the public NPC position index before squad movement updates.
- Implemented return-route advancement so completed squads return to camp and can be redeployed.
- Routed public world snapshot and event HTTP endpoints through the public-data filters.
- Added integration tests for outbound faction movement, objective capture, return travel, and redeployment readiness.


## 4.57.0 — Performance, Combat & Character Death

- Player-vs-NPC proximity combat now builds one sector-aware spatial index per tick and checks only nearby cells, avoiding a full NPC scan for every connected player.
- NPC movement now detects nearby hostile stalkers before advancing movement orders. Hostile contacts stop both sides so the existing combat simulation can resolve the encounter instead of allowing NPCs to pass through each other.
- Player death is now a real character lifecycle transition. The server records death, sets health to zero, clears movement/expedition orders and permits a fresh character creation. A new character receives fresh starting health, supplies and progression.
- Desktop map rendering disables expensive SVG drop shadows and marker pulse animations on fine-pointer devices while preserving all markers and interactions.
- Imported save files are limited to 5 MB, bounded in nesting/collection size, and sanitized to strip markup/control characters and prototype-pollution keys before use.
- Added regression coverage for hostile movement blocking, character death/recreation, spatially indexed player combat and imported-save sanitization.

Validation: `npm test` — 332 tests passed. `npm run check` — passed. All production JavaScript files also passed `node --check`.

# ZONE ONLINE 4.56.0

## 4.56.0 — Living A-Life Routines

This release adds a server-authoritative individual NPC life layer on top of the existing faction, squad, mutant and proximity systems.

### New behavior
- NPCs periodically choose local routines: visit a campfire, visit a trader, rest, socialize or search for artifacts.
- NPCs physically walk to their routine destination using the existing one-second movement simulation and smooth client motion broadcasts.
- Artifact searches can produce a small, persistent NPC inventory find and a memory entry.
- Same-faction NPCs that meet nearby can socialize, improve their mutual relationship slightly and remember the encounter.
- Routine state is kept on the NPC record and therefore persists with the shared world save.
- Combat, mission orders, retreat, rescue and strategic squad travel take priority; A-Life routines do not interrupt them.

### Timing
- A-Life decision and routine progression: every 15 seconds.
- NPC movement: every 1 second.
- Strategic faction and squad planning remains on its existing slower schedule.

### Run
```bash
npm install
npm test
npm run check
npm start
```

The automated test suite covers routine assignment, artifact-search completion, social memories and protection of combat/mission states. Live browser and multiplayer server validation still requires running the project with its dependencies and configured database.

## 4.56.0 — Smooth A-Life & Object Approach

- NPC and mutant movement now use the same 2.5 map-units-per-second speed as player movement.
- NPC social encounters and hostile NPC skirmishes use sector-local spatial grids rather than comparing every possible pair.
- NPC motion rendering no longer runs a per-frame animation loop with repeated DOM queries. The client indexes visible markers when the map is rendered and uses short SVG transform transitions for incoming authoritative position updates.
- Mutant markers keep their reduced icon scale while moving; key-object, mutant and anomaly markers are smaller and less visually intrusive.
- Strategic key-object cards now offer an explicit approach action. For a different sector, the player travels there first and then automatically receives a local movement order to the selected object. Cancelling or replacing the expedition clears that pending destination.
- Added regression tests for movement speed, spatially indexed encounters, object approach, marker sizing and cancelled object-travel intent.

Validation: 319 automated tests pass; `npm run check` passes; every JavaScript file passes `node --check`. A local synthetic benchmark with 3,000 NPCs measured approximately 3.7 ms for the movement tick, 3.3 ms for the A-Life social tick and 14.9 ms for the proximity-combat pass on the build environment. These figures are environment-specific and are not a substitute for browser/server profiling on the deployment host.
- Nearby known generated NPCs can form a persistent two-person squad only when they are already physically together; no member is teleported into the group.
- Non-hostile cross-faction NPCs can have short road encounters and remember them; hostile relations and known rivalries are excluded.
- NPCs can pass recent artifact discoveries as rumors during conversations.
- Goods carried by visiting NPCs are delivered to trader stock. The server maps delivered goods into the existing NPC economy stock, so the items become available through the existing NPC trade flow rather than sitting in an unused side field.


## 4.60.0 — Confirmed movement, connected sector travel & faction spawn choice

- Clicking a free point on the local map now asks for confirmation before issuing a movement order.
- Clicking a sector on the world map opens its information card; the travel action asks for confirmation and previews the intermediate sectors.
- Inter-sector travel uses the same weighted route graph as the server. Each hop must follow a real gate; Cordon → Bar resolves through Dump rather than teleporting.
- Direct map approaches to NPCs and points of interest ask before moving.
- New-character setup offers start sectors controlled by the selected faction (including the faction headquarters). The server validates the selected spawn and falls back to the faction home if the requested sector is not allowed.
- Added tests for route adjacency, Cordon → Dump → Bar, faction spawn validation and movement confirmations.

## Story campaign update — Zaton living-world prototype

The isolated Zaton story mode now supports click-to-move travel across the supplied map, animated player movement, a stop control, NPC patrol position updates, time-based ambient world events, and proximity-gated conversations/object inspections. Story progress remains stored under the dedicated `zoneStorySave` key and does not write faction-war save data.

Verification: `node --test` — 365 tests passed, 0 failed. The story-mode JavaScript also passes `node --check`.


## Story campaign update — Zaton Living World 1.2

- Added the original playable protagonist Egor “Klin” Volkov, a 29-year-old former geologist searching for his missing partner.
- Expanded the named Zaton story cast to 17 NPCs across the loner and bandit groups, including a trader, field medic, guide, radio operator, patrols, guards and newcomers.
- NPCs interpolate between their patrol route points; the PDA roster displays their names, roles and affiliations.
- Added a protagonist dossier panel and character portrait using the project's bundled portrait assets.
- Kept the campaign save isolated under `zoneStorySave`; the faction-war campaign remains untouched.
- Validation: `npm test` — 368 tests passed.


## 4.63.0 — Zaton A-Life encounters and persistent NPC casualties

- Replaced purely time-derived NPC marker positions with individual persistent world agents. Each named NPC now has saved coordinates, a patrol waypoint, health, alive/dead state, activity status and a squad assignment.
- Added autonomous movement along each NPC's local route, with slower movement for wounded characters and a faster night watch pace for guards.
- Added hostile loner/bandit encounters. NPCs exchange simulated damage, can be wounded or killed, and casualties remain marked on the map and in the PDA roster.
- Added local ally support in firefights and basic medical recovery by Doctor “Shрам” for nearby wounded loners.
- NPC condition, location, squad and casualties persist in the separate `zoneStorySave`; the faction-war save remains untouched.
- Added dedicated tests for persistent A-Life state, autonomous combat and casualties.
- Validation: `npm test` — 371 tests passed, 0 failed; `node --check public/js/story-mode.js` passed.

Note: this is a local browser-side story simulation prototype. Combat is abstracted and probabilistic; there is not yet weapon-specific ballistics, visible corpse sprites, mutant AI, pathfinding around terrain or server-authoritative multiplayer simulation.
