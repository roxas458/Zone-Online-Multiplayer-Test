const test = require('node:test');
const assert = require('node:assert/strict');
const { LOCATIONS, FACTIONS, NPC_HOME, COOP_TEMPLATES, TRADE_ITEM_IDS, SHOP, TERRITORY_START, createFactionDiplomacy } = require('../src/shared/game-data');
const { clean, validId, createSafeState } = require('../src/server/validation');
const { initSharedWorld, initDiplomacy } = require('../src/server/world');

test('input helpers sanitize text and validate player IDs', () => {
  assert.equal(clean('< stalker >\n', 20), 'stalker');
  assert.equal(validId('12345678-1234-1234'), true);
  assert.equal(validId('bad id'), false);
});

test('safeState clamps values and validates faction/location', () => {
  const safeState = createSafeState(FACTIONS, LOCATIONS);
  const result = safeState({ name: 'Tester', faction: 'Unknown', loc: 'unknown', hp: 999, money: -5 });
  assert.equal(result.faction, 'Одиночки');
  assert.equal(result.loc, 'cordon');
  assert.equal(result.hp, 100);
  assert.equal(result.money, 0);
  assert.equal(result.state.money, 0);
  assert.equal(result.state.hp, 100);
});

test('safeState sanitizes canonical values inside the persisted state and preserves zero HP', () => {
  const safeState = createSafeState(FACTIONS, LOCATIONS);
  const result = safeState({
    name: '<Взломщик>', faction: 'Неизвестная', loc: 'nowhere',
    money: 9e12, hp: 0, xp: Infinity, rep: -9e9, characterCreated: true,
    inventory: [{ id: 'medkit', qty: 1 }]
  });
  assert.equal(result.name, 'Взломщик');
  assert.equal(result.state.name, 'Взломщик');
  assert.equal(result.state.faction, 'Одиночки');
  assert.equal(result.state.loc, 'cordon');
  assert.equal(result.state.money, 99999999);
  assert.equal(result.state.hp, 0);
  assert.equal(result.state.xp, 0);
  assert.equal(result.state.rep, -1000);
  assert.equal(result.state.characterCreated, true);
  assert.deepEqual(result.state.inventory, [{ id: 'medkit', qty: 1 }]);
});

test('safeState handles null, arrays and malformed numeric values safely', () => {
  const safeState = createSafeState(FACTIONS, LOCATIONS);
  assert.equal(safeState(null).state.hp, 100);
  assert.equal(safeState([]).state.name, 'Сталкер');
  assert.equal(safeState({ money: 'NaN', hp: '-5', xp: '1e99' }).state.money, 0);
  assert.equal(safeState({ money: 'NaN', hp: '-5', xp: '1e99' }).state.hp, 0);
  assert.equal(safeState({ money: 'NaN', hp: '-5', xp: '1e99' }).state.xp, 1e7);
});

test('canon faction diplomacy is symmetric and gives Monolith hostility toward every faction', () => {
  const relations = createFactionDiplomacy([...FACTIONS]);
  for (const a of FACTIONS) for (const b of FACTIONS) if (a !== b) {
    assert.equal(relations[a][b], relations[b][a], `${a} / ${b} must be symmetric`);
    if (b !== 'Монолит') assert.equal(relations['Монолит'][b], -60);
  }
  for (const enemy of ['Долг','Бандиты','Военные','Наёмники','Монолит','Ренегаты']) assert.ok(relations['Свобода'][enemy] <= -25);
  assert.ok(relations['Учёные']['Одиночки'] >= 0);
});

test('old world diplomacy migrates once to canon defaults and preserves later changes', () => {
  const world = { diplomacy: {'Одиночки': {'Долг': 55}}, revision: 1 };
  initDiplomacy(world, FACTIONS);
  assert.equal(world.diplomacy['Свобода']['Монолит'], -60);
  assert.equal(world.diplomacy['Свобода']['Наёмники'], -45);
  assert.equal(world.diplomacy['Одиночки']['Долг'], 10);
  world.diplomacy['Одиночки']['Долг'] = 22;
  initDiplomacy(world, FACTIONS);
  assert.equal(world.diplomacy['Одиночки']['Долг'], 22);
});

test('world bootstrap creates NPC positions, quests and diplomacy', () => {
  const world = { diplomacy: {}, revision: 1 };
  initSharedWorld(world, NPC_HOME, LOCATIONS, COOP_TEMPLATES);
  initDiplomacy(world, FACTIONS);
  assert.ok(Object.keys(world.npcPositions).length >= Object.keys(NPC_HOME).length);
  assert.equal(world.coOpQuests.length, COOP_TEMPLATES.length);
  assert.ok(world.diplomacy['Одиночки']['Долг'] !== undefined);
  assert.equal(world.territoryOwners.dump, 'Бандиты');
  assert.equal(world.warOperations.length, 0);
  assert.equal(world.emission.phase, 'calm');
  assert.ok(world.emission.nextAt > 0);
  assert.equal(Object.values(world.npcState).filter(n => n.generated).length, 340);
});

test('expanded world includes Great Swamps and server-side food items', () => {
  assert.equal(LOCATIONS.has('swamps'), true);
  assert.equal(NPC_HOME.lebedev, 'swamps');
  for (const id of ['canned','sausage','condensed','water','tea','ration']) {
    assert.equal(TRADE_ITEM_IDS.has(id), true);
    assert.ok(SHOP[id]);
  }
});

const { changeRelationship, relationshipLabel } = require('../src/systems/relationships');
const { rankForXp } = require('../src/systems/ranks');
const { addInfluence, resolveControl } = require('../src/systems/territories');
const { canComplete } = require('../src/systems/contracts');

test('Living Zone relationship and rank systems have bounded progression', () => {
  assert.equal(changeRelationship(98, 10), 100);
  assert.equal(relationshipLabel(-50), 'Враждебность');
  assert.equal(rankForXp(500).name, 'Старший боец');
});

test('territory influence transfers control only at full influence', () => {
  assert.equal(addInfluence(85, 25), 100);
  assert.deepEqual(resolveControl('Бандиты', 'Одиночки', 100), { owner: 'Одиночки', control: 55 });
});

test('contract requires acceptance, location and required items', () => {
  const c = { accepted: true, done: false, location: 'cordon', item: 'scrap', qty: 2 };
  assert.equal(canComplete(c, { location: 'cordon', items: [{ id: 'scrap', qty: 2 }] }), true);
  assert.equal(canComplete(c, { location: 'dump', items: [{ id: 'scrap', qty: 2 }] }), false);
});

const { createOperation, deploymentPower, addDeployment, resolveOperation, WAR_CONFIG } = require('../src/systems/war');

test('WAR SYSTEM creates operations, validates deployments and resolves territory capture', () => {
  const op = createOperation({ id: 'op-1', location: 'dump', attacker: 'Одиночки', defender: 'Бандиты', createdBy: 'p1', territoryControl: 40, now: 100 });
  assert.equal(op.status, 'active');
  assert.equal(op.defenseScore, 40);
  const power = deploymentPower({ xp: 500, rep: 20, action: 'attack' });
  assert.equal(addDeployment(op, { id: 'p1', name: 'Север', faction: 'Одиночки' }, 'attack', power, 110).ok, true);
  assert.equal(addDeployment(op, { id: 'p1', name: 'Север', faction: 'Одиночки' }, 'attack', power, 120).ok, false);
  assert.equal(addDeployment(op, { id: 'p2', name: 'Клык', faction: 'Одиночки' }, 'attack', 80, 130).ok, true);
  const result = resolveOperation(op);
  assert.equal(result.ok, true);
  assert.equal(result.winner, 'Одиночки');
  assert.equal(result.captured, true);
  assert.equal(op.status, 'resolved');
  assert.equal(WAR_CONFIG.operationCost, 350);
});

test('WAR SYSTEM rejects premature resolution and unauthorized side deployments', () => {
  const op = createOperation({ id: 'op-2', location: 'bar', attacker: 'Свобода', defender: 'Долг', createdBy: 'p1' });
  assert.equal(resolveOperation(op).ok, false);
  assert.equal(addDeployment(op, { id: 'p2', name: 'Игрок', faction: 'Бандиты' }, 'defend', 20).ok, false);
});


const { createNpcRoster, tickNpcWorld, interactWithNpc, isHostileFaction } = require('../src/systems/npc-ai');
test('NPC AI bootstraps independent NPC profiles with roles and factions', () => {
  const roster = createNpcRoster(NPC_HOME, 100);
  assert.equal(roster.sid.faction, 'Одиночки');
  assert.equal(roster.voronin.role, 'командир');
  assert.equal(roster.lebedev.location, 'swamps');
  assert.equal(roster.sid.alive, true);
});
test('NPC AI advances schedules, records history and publishes shared positions', () => {
  const world = { npcPositions: { alpha:'cordon', beta:'dump' } };
  world.npcState = createNpcRoster({ alpha:'cordon', beta:'dump' }, 100);
  world.npcState.alpha.nextDecisionAt = -1; world.npcState.beta.nextDecisionAt = -1;
  const events = tickNpcWorld(world, new Set(['cordon','dump','bar']), () => 0, 200);
  assert.equal(world.npcState.alpha.lastActionAt, 200);
  assert.ok(world.npcState.alpha.history.length >= 1);
  assert.ok(world.npcPositions.alpha);
  assert.ok(Array.isArray(world.npcEvents));
  assert.ok(Array.isArray(events));
});


test('4.20 generated NPCs are stationed only on their faction territory', () => {
  const world = { npcState:{}, npcPositions:{}, territoryOwners:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner])) };
  ensureRandomNpcs(world,340);
  const generated=Object.values(world.npcState).filter(n=>n.generated);
  assert.equal(generated.length,340);
  assert.ok(generated.every(n=>world.territoryOwners[n.location]===n.faction));
  assert.ok(generated.some(n=>n.faction==='Чистое небо'&&n.location==='swamps'));
  assert.ok(!generated.some(n=>n.faction==='Чистое небо'&&n.location==='cordon'));
});

test('4.31 every faction has a medic and technician and generated stalker nicknames are unique', () => {
  const world = { npcState:{}, npcPositions:{}, territoryOwners:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner])) };
  ensureRandomNpcs(world,340);
  const generated=Object.values(world.npcState).filter(n=>n.generated);
  const nicknames=generated.map(n=>String(n.name).trim());
  assert.equal(new Set(nicknames).size,generated.length);
  assert.ok(generated.every(n=>/^[А-ЯЁа-яё]+ [А-ЯЁа-яё0-9]+$/.test(n.name)), 'every generated stalker has a two-part callsign');
  for(const faction of FACTIONS){
    const specialists=generated.filter(n=>n.faction===faction&&n.supportSpecialist).map(n=>n.role);
    assert.ok(specialists.includes('медик'),`${faction} has a medic`);
    assert.ok(specialists.includes('техник'),`${faction} has a technician`);
  }
});

test('4.20 NPCs stay at their post between decisions instead of teleport-wandering', () => {
  const world={npcPositions:{guard:'cordon'},territoryOwners:{cordon:'Одиночки'},npcState:{guard:{id:'guard',name:'Постовой',faction:'Одиночки',location:'cordon',homeLocation:'cordon',baseLocation:'cordon',alive:true,health:100,morale:70,supplies:70,action:'guard',behavior:'guard',duty:'base_guard',guardPost:true,nextDecisionAt:900000,lastActionAt:0}}};
  tickNpcWorld(world,new Set(['cordon','dump']),()=>0.99,60000);
  assert.equal(world.npcState.guard.location,'cordon');
  assert.equal(world.npcState.guard.action,'guard');
  assert.equal(world.npcState.guard.duty,'base_guard');
});


test('4.51 local NPC AI no longer launches conflicting sector-wide assaults', () => {
  const { TERRITORY_ADJACENCY } = require('../src/systems/territories');
  assert.ok(TERRITORY_ADJACENCY.bar.includes('dump'));
  const world={territoryOwners:{bar:'Долг',dump:'Бандиты'},territoryControl:{bar:70,dump:60},npcPositions:{},npcState:{}};
  for(let i=0;i<6;i++){const id=`duty_${i}`;world.npcState[id]={id,name:`Долговец ${i}`,faction:'Долг',location:'bar',homeLocation:'bar',baseLocation:'bar',alive:true,health:100,morale:70,supplies:70,action:'guard',behavior:'guard',duty:'base_guard',guardPost:true,nextDecisionAt:9999999,squadId:'duty_squad'};world.npcPositions[id]='bar';}
  const events=tickNpcWorld(world,new Set(['bar','dump']),()=>0,1000);
  assert.ok(!events.some(e=>e.type==='faction_assault'));
  assert.equal(world.npcState.duty_0.missionOrder,undefined);
  assert.equal(world.territoryOwners.dump,'Бандиты');
});

test('NPC faction hostility matrix distinguishes enemy and neutral factions', () => {
  assert.equal(isHostileFaction('Долг','Свобода',{}), true);
  assert.equal(isHostileFaction('Одиночки','Учёные',{}), false);
  assert.equal(isHostileFaction('Свобода','Свобода',{}), false);
});

test('NPC warfare creates server-side battles and convoy events between hostile factions', () => {
  const { tickNpcWorld } = require('../src/systems/npc-ai');
  const world = { npcPositions: { duty:'cordon', freedom:'cordon' }, npcState: {
    duty:{id:'duty',name:'Долговец',faction:'Долг',location:'cordon',alive:true,health:100,morale:60,supplies:60},
    freedom:{id:'freedom',name:'Свободовец',faction:'Свобода',location:'cordon',alive:true,health:100,morale:60,supplies:60}
  }, npcEvents:[], zoneEvents:[] };
  const events = tickNpcWorld(world, ['cordon','dump'], () => 0.1, 1000000);
  assert.ok(events.some(e => e.type === 'npc_skirmish'));
  assert.equal(world.battlefronts.length, 1);
  assert.ok(world.battlefronts[0].rounds >= 1);
  assert.ok(world.convoys.length >= 1);
});

test('anti-radiation consumable is available in the shared server market', () => {
  assert.equal(TRADE_ITEM_IDS.has('anti_rad'), true);
  assert.equal(SHOP.anti_rad.name, 'Антирад');
});

test('NPC interaction requires same location and builds personal trust', () => {
  const npc = createNpcRoster({ sid:'cordon' }, 100).sid;
  assert.equal(interactWithNpc(npc,{id:'p1',location:'dump'},'greet').ok,false);
  const { npcWorldPosition } = require('../src/systems/proximity');
  const pos = npcWorldPosition(npc);
  const result = interactWithNpc(npc,{id:'p1',location:'cordon',position:pos},'help',200);
  assert.equal(result.ok,true);
  assert.equal(result.relationship,5);
  assert.match(result.reply,/помощь/);
});

const { ensureOnlineWorld, appendWorldEvent, buildWorldSync, publicWorldStatus, MAX_EVENTS } = require('../src/systems/online-world');
test('ONLINE WORLD assigns monotonic revisions and replays missed events after reconnect', () => {
  const world = { revision: 1, eventLog: [] };
  ensureOnlineWorld(world);
  const first = appendWorldEvent(world, 'player_joined', { name: 'Север' }, 100);
  const second = appendWorldEvent(world, 'player_moved', { to: 'dump' }, 200);
  assert.equal(second.revision, first.revision + 1);
  const sync = buildWorldSync(world, first.revision);
  assert.equal(sync.mode, 'delta');
  assert.deepEqual(sync.events.map(x => x.type), ['player_moved']);
  assert.equal(sync.revision, second.revision);
});
test('ONLINE WORLD falls back to a snapshot when the event cursor is stale', () => {
  const world = { revision: 1, eventLog: [] };
  ensureOnlineWorld(world);
  for (let i = 0; i < MAX_EVENTS + 5; i++) appendWorldEvent(world, 'world_tick', { tick: i }, 1000 + i);
  assert.equal(world.eventLog.length, MAX_EVENTS);
  const sync = buildWorldSync(world, 0);
  assert.equal(sync.mode, 'snapshot');
  assert.equal(sync.snapshot, world);
});
test('ONLINE WORLD exposes compact operational status', () => {
  const world = { revision: 7, npcState: { a: { alive: true }, b: { alive: false } }, warOperations: [{ status: 'active' }], territoryOwners: { cordon: 'Одиночки' } };
  const status = publicWorldStatus(world, 3);
  assert.equal(status.online, 3);
  assert.equal(status.npcCount, 1);
  assert.equal(status.activeWars, 1);
  assert.equal(status.sectors, 1);
});

const { ensureRandomNpcs } = require('../src/systems/npc-roster');
const { buildDialogue } = require('../src/systems/npc-dialogue');
const { initEcosystem, tickEcosystem, upgradeBase, createClan, joinClan } = require('../src/systems/ecosystem');
test('ECOSYSTEM creates a persistent roster of generated stalkers with Zone callsigns', () => {
  const world = { npcState: {}, npcPositions: {} };
  ensureRandomNpcs(world, 60);
  const generated = Object.values(world.npcState).filter(n => n.generated);
  assert.equal(generated.length, 60);
  assert.ok(generated.some(n => /Глюк|Дворецкий|Скелет|Болт|Кабан|Беркут/.test(n.name)));
  assert.ok(generated.some(n => n.name === 'Васян Глюк' || n.name === 'Лёша Дворецкий' || n.name === 'Максим Скелет'));
  const firstName = generated[0].name;
  ensureRandomNpcs(world, 60);
  assert.equal(world.npcState.wanderer_001.name, firstName);
});
test('NPC dialogue is long-form and changes with the 15-minute dialogue cycle', () => {
  const npc = { id:'wanderer_001',name:'Вадим Спагетти',role:'сталкер',faction:'Одиночки',location:'cordon',mood:'весёлый',history:[],dialogueVersion:0 };
  const first = buildDialogue(npc, {locationName:'Кордон'}, 1000);
  npc.dialogueVersion = 1;
  const second = buildDialogue(npc, {locationName:'Кордон'}, 1000);
  assert.ok(first.greeting.length > 100);
  assert.ok(first.topics.every(t => t[1].length > 100));
  assert.notEqual(first.topics[0][1], second.topics[0][1]);
});
test('ECOSYSTEM simulates mutant packs, faction bases, markets and clan membership', () => {
  const world = { territoryOwners:{cordon:'Одиночки'} };
  const eco = initEcosystem(world);
  assert.ok(eco.mutantPacks.length > 0);
  assert.equal(upgradeBase(world,'cordon','Одиночки').ok,true);
  const created = createClan(world,{id:'p1',name:'Сталкер',faction:'Одиночки'},'Весёлый Болт');
  assert.equal(created.ok,true);
  assert.equal(joinClan(world,{id:'p2',name:'Вадим',faction:'Одиночки'},created.clan.id).ok,true);
  const events = tickEcosystem(world,()=>0.2,2000);
  assert.ok(Array.isArray(events));
  assert.ok(eco.markets.cordon.priceIndex > 0);
});


const { initSouls, tickSouls } = require('../src/systems/souls');
const { interactDialogue } = require('../src/systems/npc-dialogue');
test('SOULS OF THE ZONE adds persistent biographies, friendships and squads', () => {
  const world = { npcState: {}, npcPositions: {} };
  ensureRandomNpcs(world, 60);
  initSouls(world, () => 0.2);
  const generated = Object.values(world.npcState).filter(n => n.generated);
  assert.equal(generated.length, 60);
  assert.ok(generated.every(n => typeof n.biography === 'string' && n.biography.length > 30));
  assert.ok(generated.some(n => n.friends.length > 0));
  assert.ok(world.npcSquads.length > 0);
});
test('SOULS OF THE ZONE replaces a dead stalker once and preserves a memorial', () => {
  const world = { npcState: {}, npcPositions: {} };
  ensureRandomNpcs(world, 3);
  const dead = world.npcState.wanderer_001;
  dead.alive = false; dead.deathCause = 'испытание'; dead.diedAt = 100;
  initSouls(world, () => 0.3);
  const events = tickSouls(world, new Set(['cordon','dump','bar']), () => 0.3, 1000);
  assert.equal(events.length, 0);
  tickSouls(world, new Set(['cordon','dump','bar']), () => 0.3, 181001);
  assert.equal(world.npcMemorial.length, 1);
  assert.equal(world.npcMemorial[0].name, dead.name);
  assert.equal(Object.values(world.npcState).filter(n => n.generated && n.alive).length, 60);
  const memorialCount = world.npcMemorial.length;
  tickSouls(world, new Set(['cordon','dump','bar']), () => 0.3, 400000);
  assert.equal(world.npcMemorial.length, memorialCount);
});
test('server state validator is wired to the game faction and location sets', () => {
  const serverSource = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(serverSource, /const safeState = createSafeState\(FACTIONS, LOCATIONS\)/);
  assert.match(serverSource, /socket\.on\('player:hello', async \(payload, ack\)/);
});
test('dialogue topic selection returns the chosen current server-side topic', () => {
  const npc = { id:'npc', name:'Вадим Спагетти', role:'сталкер', faction:'Одиночки', location:'cordon', relationships:{}, dialogueHistory:[] };
  const d = buildDialogue(npc, {locationName:'Кордон'}, 900000);
  const result = interactDialogue(npc, {id:'player'}, 'topic', {topicIndex:1,locationName:'Кордон'}, 900000);
  assert.equal(result.reply.includes(d.topics[1][1]), true);
});

test('4.31 guest-only mode removes account registration and login routes', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'server.js'), 'utf8');
  assert.doesNotMatch(source, /api\/auth\/(register|login)/);
  assert.match(source, /guest profiles use signed sessions/);
});
test('4.21 new characters spawn at their faction home and faction chat is location-scoped', () => {
  const server = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'server.js'), 'utf8');
  const client = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public', 'js', 'game.js'), 'utf8');
  for (const [faction,location] of Object.entries({'Чистое небо':'swamps','Одиночки':'cordon','Долг':'bar','Свобода':'army','Бандиты':'dump','Военные':'agro','Учёные':'yantar','Наёмники':'limansk','Монолит':'radar'})) {
    assert.ok(server.includes(`'${faction}':'${location}'`));
    assert.ok(client.includes(`'${faction}':'${location}'`));
  }
  assert.match(server, /io\.to\(`location:\$\{p\.location\}`\)\.emit\('world:chat'/);
  assert.match(server, /socket\.join\(`location:\$\{p\.location\}`\)/);
  assert.match(client, /Локальный канал КПК/);
});


test('API status reports the actual package version instead of the original 4.33.0 label', () => {
  const serverSource = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(serverSource, /service:`ZONE ONLINE \$\{require\('\.\/package\.json'\)\.version\} SURVIVAL & EXPEDITIONS`/);
  assert.doesNotMatch(serverSource, /service:'ZONE ONLINE 4\.33\.0 SURVIVAL & EXPEDITIONS'/);
});
