const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function bootClient() {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)/g)].map(match => match[1]);
  class Element {
    constructor(id) {
      this.id = id; this.innerHTML = ''; this.textContent = ''; this.value = '';
      this.style = {}; this.dataset = {}; this.children = []; this.files = [];
      this.classList = { add(){}, remove(){}, contains(){ return false; }, toggle(){} };
    }
    addEventListener(){} removeEventListener(){} appendChild(child){ this.children.push(child); return child; }
    remove(){} click(){} querySelector(){ return new Element('child'); }
    querySelectorAll(){ return []; } closest(){ return this; } setAttribute(){}
    getAttribute(){ return null; } getBoundingClientRect(){ return {width:0,height:0}; } focus(){} reset(){}
  }
  const elements = new Map(ids.map(id => [id, new Element(id)]));
  const document = {
    getElementById: id => elements.get(id) || null,
    createElement: tag => new Element(tag),
    querySelector: () => new Element('query'),
    querySelectorAll: () => [],
    body: new Element('body'), head: new Element('head'),
    documentElement: new Element('root'), addEventListener(){}
  };
  const data = new Map();
  const localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
  const window = { addEventListener(){}, location:{ origin:'http://localhost', search:'' } };
  const context = {
    document, localStorage, window, console, Blob,
    URL:{ createObjectURL(){ return ''; }, revokeObjectURL(){} },
    FileReader:function(){}, Math, Date, JSON, Number, String, Array, Object,
    Map, Set, RegExp, Promise, Intl, alert(){}, confirm(){ return true; },
    prompt(){ return null; }, setTimeout, clearTimeout, setInterval:()=>0, clearInterval:()=>{},
    crypto:{ randomUUID:()=> '12345678-1234-1234-1234-123456789abc' }
  };
  window.document = document; window.localStorage = localStorage;
  vm.createContext(context);
  for (const file of ['config.js','event-bus.js','game-state.js','save-manager.js','default-state.js']) {
    vm.runInContext(fs.readFileSync(path.join(root,'public/js/core',file),'utf8'), context, {filename:file});
  }
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/inventory.js'),'utf8'), context, {filename:'inventory.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/economy.js'),'utf8'), context, {filename:'economy.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/combat.js'),'utf8'), context, {filename:'combat.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/quests.js'),'utf8'), context, {filename:'quests.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/npc-dialogue.js'),'utf8'), context, {filename:'npc-dialogue.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/map-navigation.js'),'utf8'), context, {filename:'map-navigation.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/map-data.js'),'utf8'), context, {filename:'map-data.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/map-renderer.js'),'utf8'), context, {filename:'map-renderer.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/map-motion.js'),'utf8'), context, {filename:'map-motion.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/systems/encyclopedia.js'),'utf8'), context, {filename:'encyclopedia.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/content.js'),'utf8'), context, {filename:'content.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/stories.js'),'utf8'), context, {filename:'stories.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/survival.js'),'utf8'), context, {filename:'survival.js'});
  window.ZoneSurvival = context.ZoneSurvival;
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/game.js'),'utf8'), context, {filename:'game.js'});
  return { context, elements };
}


test('4.33.17 technician PDA repair system supports faction technicians and durable item conditions', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8') +
    fs.readFileSync(path.join(root, 'public/js/core/default-state.js'), 'utf8');
  assert.match(game, /function openRepairWorkshop\(npcId\)/);
  assert.match(game, /function repairGearItem\(npcId,itemId\)/);
  assert.match(game, /function repairAllGear\(npcId\)/);
  assert.match(game, /name:"Кардан",role:"техник",loc:"zaton"/);
  assert.match(game, /name:"Азот",role:"техник",loc:"jupiter"/);
  assert.match(game, /armor\.condition=Math\.max\(0,Number\(armor\.condition\?\?100\)-Math\.max\(1,Math\.ceil\(damage\/12\)\)\)/);
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  assert.match(css, /repair-overlay/);
  assert.match(css, /repair-pda-grid/);
  assert.match(game, /factionTechBases/);
  assert.match(game, /function selectRepairItem\(npcId,itemId\)/);
  assert.match(game, /ПОЧИНИТЬ ВЫБРАННЫЙ ПРЕДМЕТ/);
  assert.match(game, /Этот техник служит группировке/);
  for (const faction of ['Одиночки','Долг','Свобода','Бандиты','Военные','Учёные','Наёмники','Монолит','Чистое небо','Ренегаты']) assert.ok(game.includes(`'${faction}'`), `missing faction technician: ${faction}`);
});

test('browser client bootstraps without temporal-dead-zone errors', () => {
  assert.doesNotThrow(() => bootClient());
});

test('all main browser-game views can be opened after bootstrap', () => {
  const { context } = bootClient();
  for (const id of ['world','encyclopedia','stories','people','squads','quests','inventory','armory','trade','factions','living','archive','war','diplomacy','achievements','journal','craft','profile','multiplayer','settings']) {
    assert.doesNotThrow(() => context.view(id), `view ${id}`);
  }
});


test('REAL STALKER LIFE keeps world time tied to the real clock and removes fast-forward controls', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8') +
    fs.readFileSync(path.join(root, 'public/js/core/default-state.js'), 'utf8');
  assert.match(html, /Реальное время/);
  assert.doesNotMatch(html, /Продвинуть время/);
  assert.doesNotMatch(game, /g\.hour\+\+|g\.hour\s*\+=|function advance\(/);
  assert.match(game, /function realClock\(/);
});

test('encyclopedia view renders and the new navigation target is present', () => {
  const { context, elements } = bootClient();
  assert.doesNotThrow(() => context.view('encyclopedia'));
  assert.match(elements.get('encyclopediaList').innerHTML, /ПМм|Кордон|Плоть/);
});


test('4.8 catalogue and point-of-interest expansion covers every sector', () => {
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8') +
    fs.readFileSync(path.join(root, 'public/js/core/default-state.js'), 'utf8');
  const weapons = game.match(/const weaponCatalogue=\[([\s\S]*?)\n\];/);
  assert.ok(weapons);
  assert.equal((weapons[1].match(/\["[a-z0-9_]+"/g) || []).length, 67);
  const poi = game.match(/const extraPoi48=\{([\s\S]*?)\n\};/);
  assert.ok(poi);
  assert.equal((poi[1].match(/^\s*[a-z]+:\[\[/gm) || []).length, 16);
  assert.equal((poi[1].match(/\],\[/g) || []).length >= 32, true);
});


test('4.9 tactical map and mobile PDA navigation are present', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8') +
    fs.readFileSync(path.join(root, 'public/js/core/default-state.js'), 'utf8');
  assert.match(html, /mobile-dock/);
  assert.match(html, /map-toolbar/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(game, /function mapZoom\(/);
  assert.match(game, /function renderZoneMap\(/);
});

test('4.9 personal NPC stories persist progress and reward completion', () => {
  const { context } = bootClient();
  const state = {npcs:[{id:'sid',name:'Сидорович'}],loc:'cordon',money:100,rep:0,xp:0,relationships:{}};
  const started = context.window.ZoneStories.choose(state, 'sid_cache');
  assert.equal(started.ok, true);
  assert.equal(state.storyProgress.sid_cache, 1);
  state.loc = 'dump';
  const finished = context.window.ZoneStories.choose(state, 'sid_cache');
  assert.equal(finished.ok, true);
  assert.equal(state.storyProgress.sid_cache, 2);
  assert.equal(state.money, 280);
});


test('4.22 map supports supplied Zone image, overview/local modes and click-to-move orders without direct controls', () => {
  const { context, elements } = bootClient();
  const svg = elements.get('zoneMap').innerHTML;
  assert.match(svg, /zone-master-map\.jpg/);
  assert.match(svg, /map-region/);
  assert.match(svg, /ЧАЭС/);
  assert.match(svg, /Тёмная Лощина/);
  assert.match(svg, /Лиманск/);
  assert.match(svg, /Рыжий лес/);
  assert.match(elements.get('mapCoordinates').textContent, /ВСЯ ЗОНА/);
  assert.match(fs.readFileSync(path.join(root, 'public/index.html'), 'utf8'), /mapModeLocal/);
  assert.match(fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8'), /function mapPointer/);
  assert.match(fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8'), /player:move-order/);
  assert.match(fs.readFileSync(path.join(root, 'public/index.html'), 'utf8'), /mapOrderStatus/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'public/index.html'), 'utf8'), /map-move-pad|walkHold/);
  assert.match(fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8'), /pendingSectorExit/);
  assert.doesNotThrow(() => context.setMapMode('local'));
  assert.match(elements.get('zoneMap').innerHTML, /onpointerdown=\"mapPointer/);
});


test('4.10 inventory and trader redesign expose expanded artifacts and armor', () => {
  const { context, elements } = bootClient();
  assert.doesNotThrow(() => context.view('inventory'));
  assert.match(elements.get('items').innerHTML, /Аптечка|Бинт/);
  assert.doesNotThrow(() => context.view('trade'));
  assert.match(elements.get('shop').innerHTML, /Медуза/);
  assert.match(elements.get('shop').innerHTML, /Экзоскелет/);
  assert.match(elements.get('sellList').innerHTML, /Продать 1/);
  assert.doesNotThrow(() => context.setTradeCategory('gear'));
  assert.match(elements.get('shop').innerHTML, /Каменный цветок/);
  assert.doesNotMatch(elements.get('shop').innerHTML, /Аптечка/);
});

test('4.10 market catalogue is shared with the online server and supports armor stats', () => {
  const shared = fs.readFileSync(path.join(root,'src/shared/game-data.js'),'utf8');
  const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
  assert.match(shared, /artifact_goldfish/);
  assert.match(shared, /armor_exo/);
  assert.match(shared, /defense:11/);
  assert.match(server, /market:sell/);
  assert.match(server, /input\?\.qty/);
});


test('4.10 armor can be bought, equipped and sold from the inventory flow', () => {
  const { context, elements } = bootClient();
  const goods = context.tradeGoods();
  const armorIndex = goods.findIndex(item => item[1] === 'armor_leather');
  assert.ok(armorIndex >= 0);
  context.buy(armorIndex);
  context.view('inventory');
  assert.match(elements.get('items').innerHTML, /Кожаная куртка с пластинами/);
  context.equipItem('armor_leather');
  assert.match(elements.get('equipment').innerHTML, /Кожаная куртка с пластинами/);
  assert.match(elements.get('gearStats').innerHTML, /Защита костюма/);
});

test('4.10 home screen atmosphere reports changing local light and weather state', () => {
  const { context, elements } = bootClient();
  assert.doesNotThrow(() => context.renderAtmosphere());
  assert.ok(['clear','fog','rain','overcast','emission'].includes(elements.get('homeHero').dataset.weather));
  assert.match(elements.get('atmosphereInfo').innerHTML, /ЯСНО|ТУМАН|ДОЖДЬ|ПАСМУРНО|РАДИАЦИОННЫЙ ФОН/);
  assert.match(elements.get('atmosphereInfo').innerHTML, /НОЧЬ|РАССВЕТ|ДЕНЬ|СУМЕРКИ/);
});


test('4.11 player dossier renders portrait and expanded expedition statistics', () => {
  const { context, elements } = bootClient();
  assert.doesNotThrow(() => context.view('profile'));
  assert.match(elements.get('playerPortrait').innerHTML, /stalker-\d{2}\.webp/);
  assert.match(elements.get('profileCareerStats').innerHTML, /Победы в столкновениях/);
  assert.match(elements.get('profileRecord').innerHTML, /Позывной/);
});

test('4.13 NPC direct messages are removed; NPC contact uses dialogue and approaches', () => {
  const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client = fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
  const dialogue = fs.readFileSync(path.join(root,'src/systems/npc-dialogue.js'),'utf8');
  assert.doesNotMatch(html,/npcDmPanel|Личные сообщения \/ локальный канал/);
  assert.doesNotMatch(client,/function openNpcDM|function sendNpcMessage|npc:message:send/);
  assert.match(html,/npcApproachFeed/);
  assert.match(server,/npc:approach/);
  assert.match(dialogue,/stage/);
  assert.doesNotMatch(dialogue,/поправляет снаряжение и оглядывается/);
});

test('4.33.22 in-game menu returns to title screen and title settings are functional', () => {
  const { context, elements } = bootClient();
  context.openMainMenu();
  assert.ok(elements.get('titleScreen'));
  context.openTitleOptions();
  context.setGameOption('largeText', true);
  assert.equal(elements.get('settingLargeText').checked, true);
  assert.equal(elements.get('titleLargeText').checked, true);
  assert.equal(elements.get('titleOptionsPanel').hidden, false);
  context.closeTitleOptions();
  assert.equal(elements.get('titleOptionsPanel').hidden, true);
  context.menuGo('people');
});


test('4.11 generated portrait sheet is split into sixteen optimized local character assets', () => {
  const assets = path.join(root, 'public/assets/portraits');
  const portraits = fs.readdirSync(assets).filter(name => /^stalker-\d{2}\.webp$/.test(name));
  assert.equal(portraits.length, 16);
  assert.ok(portraits.every(name => fs.statSync(path.join(assets, name)).size > 1000));
});

test('4.12 player direct messages are location-gated, persisted and rate-limited on server', () => {
  const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
  const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  assert.match(server,/socket\.on\('dm:send'/);
  assert.match(server,/me\.location!==target\.location/);
  assert.match(server,/persistPrivateMessage\(m\)/);
  assert.match(server,/zone_private_messages/);
  assert.match(server,/rate\.count>8/);
  assert.match(html,/id="playerDmPanel"/);
});

test('4.12 NPC trade inspects gear, supports buy and sell, and verifies local presence server-side', () => {
  const { context, elements } = bootClient();
  assert.doesNotThrow(() => context.openNpcTrade('sid'));
  assert.match(elements.get('peopleList').children.at(-1).innerHTML,/Снаряжение сталкера/);
  assert.match(elements.get('peopleList').children.at(-1).innerHTML,/Полевой обмен/);
  const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
  assert.match(server,/socket\.on\('npc:trade:buy'/);
  assert.match(server,/socket\.on\('npc:trade:sell'/);
  assert.match(server,/npc\.location!==p\.location/);
});

test('4.33.36 NPC dialogue restores authored topics when server dialogue is absent or incomplete', () => {
  const { context, elements } = bootClient();
  context.npcInInteractionRange = () => true;
  assert.doesNotThrow(() => context.startTalk('sid'));
  const choices = elements.get('dialogueChoices').innerHTML;
  assert.match(choices,/Кто ты\?/);
  assert.match(choices,/Что нового\?/);
  assert.match(choices,/Есть работа\?/);
  assert.match(choices,/Торговать с этим NPC|Торговать/);
});

test('4.33.36 dialogue trade action opens the selected NPC trade panel instead of sector default trader', () => {
  const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client = fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.match(html,/openActiveNpcTrade\(\)/);
  assert.match(client,/function openActiveNpcTrade\(\)/);
  assert.match(client,/openNpcTrade\(id\)/);
  assert.match(client,/Полевой обмен — \${escapeHtml\(n.name\)}/);
  assert.match(client,/npcStock\[x\[1\]\]\?\?\(x\[2\]==='Оружие'/);
});

test('4.12 encyclopedia includes expanded anomaly field dossiers and longer reference entries', () => {
  const { context, elements } = bootClient();
  context.renderEncyclopedia();
  assert.match(elements.get('encyclopediaList').innerHTML,/Жарка/);
  assert.match(elements.get('encyclopediaList').innerHTML,/Пси-поле/);
  assert.match(elements.get('encyclopediaList').innerHTML,/транспортировк|Полевые рекомендации|полевых условиях/i);
  const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  assert.match(html,/value="anomalies"/);
});


test('4.13 player squads, NPC approach events and staged dialogue are server-backed', () => {
  const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
  const ai = fs.readFileSync(path.join(root,'src/systems/npc-ai.js'),'utf8');
  const interactions = fs.readFileSync(path.join(root,'src/systems/npc-interactions.js'),'utf8');
  const dialogue = fs.readFileSync(path.join(root,'src/systems/npc-dialogue.js'),'utf8');
  assert.match(server,/socket\.on\('squad:create'/);
  assert.match(server,/socket\.on\('squad:invite'/);
  assert.match(server,/socket\.on\('squad:respond'/);
  assert.match(server,/socket\.on\('squad:leave'/);
  assert.match(server,/npc:approach/);
  assert.match(interactions,/npc\.memory\.push/);
  assert.match(dialogue,/stage/);
  assert.doesNotMatch(dialogue,/action==='message'/);
});


test('4.13 faction insignias and male stalker portrait assets are complete', () => {
  const factionDir = path.join(root,'public/assets/factions');
  const icons = fs.readdirSync(factionDir).filter(x=>x.endsWith('.svg'));
  assert.equal(icons.length,9);
  const portraits = fs.readdirSync(path.join(root,'public/assets/portraits')).filter(x=>x.endsWith('.webp'));
  assert.equal(portraits.length,16);
  const game = fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.match(game,/function factionIconMarkup/);
  assert.match(game,/portrait-faction.*factionIconMarkup/);
});

test('4.13 no voice feature or NPC messaging UI is exposed', () => {
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.doesNotMatch(html,/voice-channel|Голосовой канал/);
  assert.doesNotMatch(html,/npcDmPanel|Личные сообщения \/ локальный канал/);
  assert.doesNotMatch(client,/npc:message:send|function openNpcDM/);
  assert.match(html,/playerDmPanel/);
});

test('4.13 player friend requests are handled by the server and friend UI exists', () => {
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.match(server,/socket\.on\('friend:request'/);
  assert.match(server,/socket\.on\('friend:respond'/);
  assert.match(client,/function friendRequest/);
  assert.match(html,/id="playerFriendsPanel"/);
});


test('4.14 squads synchronize leader travel, field roles, journal and NPC escort', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public/js/game.js'), 'utf8');
  assert.match(server, /publishSquadMove\(squad,oldLocation,p\.location,p\.name\)/);
  assert.match(server, /socket\.on\('squad:role'/);
  assert.match(server, /socket\.on\('squad:escort'/);
  assert.match(server, /escort\.location=to/);
  assert.match(server, /emit\('squad:encounter'/); // server emits this event to both groups
  assert.match(server, /squadJournal\(q,'encounter'/);
  assert.match(client, /function squadRole\(/);
  assert.match(client, /function squadEscort\(/);
  assert.match(client, /squad:travelled/);
  assert.match(client, /squad:encounter/);
  assert.match(client, /Журнал отряда/);
});

test('4.22 tactical map uses the developer-supplied labeled map, point markers and click-to-move routing', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'public/js/systems/map-renderer.js'), 'utf8');
  const mapSource = client + renderer;
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  assert.match(client, /function playerDotMarkup\(/);
  assert.match(client, /marker-enemy/);
  assert.match(client, /marker-neutral/);
  assert.match(client, /marker-friendly/);
  assert.match(client, /marker-cache/);
  assert.match(client, /const WORLD_OBSTACLES=/);
  assert.match(client, /function blockedAt\(/);
  assert.match(client, /function startWalking\(/);
  assert.match(client, /function cancelMoveOrder\(/);
  assert.match(client, /function mapSquadPoint\(/);
  assert.match(client, /player:movement/);
  assert.match(client, /function mapPointer\(/);
  assert.match(client, /player:move-order/);
  assert.match(mapSource, /onpointerdown="mapPointer/);
  assert.doesNotMatch(html, /onpointerdown="walkHold/);
  assert.match(css, /\.marker-enemy/);
  assert.match(css, /\.marker-friendly/);
  assert.ok(fs.existsSync(path.join(root, 'public/assets/zone-master-map.jpg')));
  assert.match(client, /function npcHeading\(/);
  assert.match(client, /npc-route-line/);
});


test('4.18 NPCs receive distinct stable positions across the developer map and markers are compact', () => {
  const { context } = bootClient();
  const a = context.npcMapPosition({id:'map-test-a', loc:'cordon'});
  const b = context.npcMapPosition({id:'map-test-b', loc:'cordon'});
  const north = context.npcMapPosition({id:'map-test-c', loc:'chaes'});
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(a, north);
  assert.match(context.mapPoint(10, 20, 'marker-neutral', 'Сталкер'), /r="3\.2"/);
  assert.match(context.mapPoint(10, 20, 'marker-neutral', 'Сталкер'), /marker-direction/);
});

test('4.18 inventory reference layout exposes backpack, mannequin, quick slots and item inspection', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(html, /class="stalker-inventory"/);
  assert.match(html, /class="backpack-grid"/);
  assert.match(html, /class="gear-mannequin"/);
  assert.match(html, /class="quick-gear"/);
  assert.match(client, /function inspectInventoryItem\(/);
  assert.match(client, /function npcMapPosition\(/);
  assert.doesNotMatch(client, /setInterval\(driftNpcMapPositions,6500\)/);
  assert.match(client, /zoneMapHasRendered/);
  assert.match(html, /inventoryRank/);
  assert.match(html, /inventoryFaction/);
});


test('4.24 NPC conversations use a full-screen modal with a close control and escape handling', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8') +
    fs.readFileSync(path.join(root, 'public/js/core/default-state.js'), 'utf8');
  assert.match(html, /id="npcDialogueOverlay"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(css, /\.npc-dialogue-overlay\.open\{display:flex\}/);
  assert.match(css, /height:min\(900px,94dvh\)/);
  assert.match(game, /function showNpcDialogue\(/);
  assert.match(game, /function closeTalk\(/);
  assert.match(game, /e\.key==="Escape"/);
});

test('4.24 squads have a dedicated navigation view and are removed from the multiplayer page', () => {
  const { context, elements } = bootClient();
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.doesNotThrow(() => context.view('squads'));
  assert.match(elements.get('squadOverview').innerHTML, /пока не состоишь в отряде/i);
  assert.ok(elements.has('playerSquadPanel'));
  assert.match(html, /data-v="squads"/);
  const multiplayer = html.slice(html.indexOf('id="multiplayer"'), html.indexOf('id="settings"'));
  assert.doesNotMatch(multiplayer, /playerSquadPanel/);
  assert.match(html, /id="localNpcSquads"/);
});

test('4.25 field PDA keeps long-page filters and map controls reachable', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  assert.match(html, /id="quests"[\s\S]*?id="questList"/);
  assert.match(html, /id="inventory"[\s\S]*?id="invSearch"/);
  assert.match(html, /id="trade"[\s\S]*?class="trade-tabs"/);
  assert.match(html, /class="mobile-dock"/);
  assert.match(css, /#quests \.tabs[\s\S]*?position:sticky/);
  assert.match(css, /#trade \.trade-tabs[\s\S]*?position:sticky/);
  assert.match(css, /#world \.map-toolbar[\s\S]*?position:sticky/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?main>\.right\{display:none\}/);
});

test('4.33 build labels are consistent', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '4.61.26');
  assert.match(html, /ZONE ONLINE 4\.61\.26/);
  assert.match(html, /ZONE ONLINE · VER\. 4\.61\.26/);
});

test('4.32 fieldwork, detector search, journal and map ecology layers are wired into the client', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(html, /Начать осмотр/);
  assert.match(html, /Личный блокнот сталкера/);
  assert.match(client, /function startAreaSurvey/);
  assert.match(client, /function searchArtifacts/);
  assert.match(client, /marker-mutant/);
  assert.match(client, /marker-anomaly/);
  assert.match(client, /relationshipCooldowns/);
});

test('4.27 connection diagnostics support a separate server URL and health endpoint', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const network = fs.readFileSync(path.join(root, 'public/js/core/network.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(html, /zone-online-multiplayer\.onrender\.com/);
  assert.match(client, /queryMatch=.*server=/);
  assert.match(client, /\/health/);
  assert.match(network, /transports: Object\.freeze\(\[\"polling\", \"websocket\"\]\)/);
  assert.match(network, /tryAllTransports: true/);
  assert.match(client, /https:\/\/zone-online-multiplayer\.onrender\.com/);
  assert.match(client, /connect_error/);
  assert.match(server, /app\.get\('\/health'/);
  assert.match(server, /version:require\('\.\/package\.json'\)\.version/);
  assert.match(server, /Access-Control-Allow-Origin/);
});


test('4.33.32 bounds Render health wait before Socket.IO and falls back after a bounded probe', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const network = fs.readFileSync(path.join(root, 'public/js/core/network.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(client, /async function waitForMultiplayerHealth\(/);
  assert.match(client, /await waitForMultiplayerHealth\(targetUrl,connectAttempt,1800\)/);
  assert.match(client, /health preflight limit reached; trying Socket\.IO anyway/);
  assert.doesNotMatch(client, /localStorage\.removeItem\('zoneServerUrl'\);[\s\S]{0,180}Using the server that hosts this game/);
  assert.match(network, /reconnectionAttempts: Infinity/);
  assert.match(network, /reconnectionDelayMax: 2500/);
  assert.match(network, /timeout: 4500/);
  assert.match(server, /transports: \['websocket','polling'\]/);
});

test('4.27 trader panel uses local portrait assets for the active trader', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(html, /id="traderPortrait"/);
  assert.match(client, /portrait\.src=g\.loc/);
});

test('4.27 login acknowledgement timeout accounts for Render cold starts', () => {
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8') +
    fs.readFileSync(path.join(root, 'public/js/core/default-state.js'), 'utf8');
  assert.match(game, /zoneSocket\.timeout\(15000\)\.emit\('player:hello'/);
  assert.match(fs.readFileSync(path.join(root, 'public/js/core/network.js'), 'utf8'), /timeout: 4500,[\s\S]*reconnection: true/);
  assert.match(game, /Сервер подтвердил вход, но не прислал профиль мира/);
});

test('4.31 guest server acknowledges before the large world snapshot', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const handler = server.indexOf("socket.on('player:hello', async (payload, ack)=>{");
  const ack = server.indexOf("ack({ok:true,accepted:true,persistent:dbReady,sessionToken})", handler);
  const firstAwait = server.indexOf('await loadPlayer(requestedId)', handler);
  const ready = server.indexOf("socket.emit('player:ready'", handler);
  assert.ok(firstAwait > handler && ready > firstAwait, 'profile snapshot follows profile loading');
  assert.ok(ack > firstAwait && ack < ready, 'guest acknowledgement is sent before large ready payload');
  assert.match(server, /player:hello completed for/);
  assert.match(server, /query_timeout:8000, statement_timeout:8000/);
});


test('4.29 trade view is full-screen, split into player and trader inventories, and refreshes after server trades', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(html, /class="trade-fullscreen"/);
  assert.match(html, /id="tradePlayerWeight"/);
  assert.match(html, /id="tradeWeapon"/);
  assert.match(html, /id="tradeArmor"/);
  assert.match(css, /#trade\.view\.active\{position:fixed;inset:0/);
  assert.match(client, /if\(id==="trade"\)\{renderTrade\(\);renderPlayerTrade\(\);\}/);
  assert.match(client, /market:result',[\s\S]*?renderTrade\(\)/);
  assert.match(client, /npc:trade:result',[\s\S]*?renderTrade\(\)/);
});


test('4.29.1 NPC dialogue matches the two-sided Call of Pripyat-inspired layout', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(html, /class="cop-dialogue-window"/);
  assert.match(html, /id="dialoguePortraitLeft"/);
  assert.match(html, /id="dialogueChoices"/);
  assert.match(css, /\.cop-dialogue-top/);
  assert.match(css, /grid-template-rows:112px minmax\(180px,1fr\) 205px/);
  assert.match(client, /function renderCopDialogue/);
});

test('4.29.1 trade basket supports drag/drop and an atomic online market deal', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(html, /id="tradeBuyBasket"/);
  assert.match(html, /ondrop="tradeDrop\(event,'buy'\)"/);
  assert.match(client, /function tradeDragStart/);
  assert.match(client, /function commitTradeBasket/);
  assert.match(client, /market:deal/);
  assert.match(server, /socket\.on\('market:deal'/);
  assert.match(server, /Недостаточно рублей для сделки/);
  assert.match(server, /Недостаточно предметов для продажи/);
});


test('4.30 enables dialogue NPC trade with independent NPC wallets and bounded stock', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(client, /dialogue-trade-action/);
  assert.match(server, /npcEconomyFor/);
  assert.match(server, /npc\.dialogue/);
  assert.match(server, /NPC_RICH_TRADERS/);
  assert.match(server, /account\.balance-payout/);
  assert.match(server, /The NPC's independent balance is intentionally not debited/);
  assert.match(server, /account\.stock\[itemId\]=available-goods\.qty/);
});


test('4.31 NPC rumors work offline and faction specialists expose service actions', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.doesNotMatch(client, /Для взаимодействия с живым NPC нужно подключение к серверу/);
  assert.match(client, /Offline fallback keeps NPC rumor interaction playable/);
  assert.match(client, /function npcSpecialistAction\(/);
  assert.match(client, /Медицинская помощь/);
  assert.match(client, /Ремонт снаряжения/);
});

test('4.31 removes account registration and login and uses guest multiplayer', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.doesNotMatch(server, /api\/auth\/(register|login)/);
  assert.doesNotMatch(html, /accountOverlay|accountTrigger|Создать аккаунт/);
  assert.match(client, /guest:true/);
  assert.match(client, /zoneAccountToken/);
});




test('4.33.4 migrates legacy browser-saved NPCs after loading content and keeps story NPCs',()=>{
  const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.match(client,/const STORY_NPC_IDS=new Set\(\['sid','wolf','fanatic'/);
  assert.match(client,/function migrateLocalNpcCallsigns\(\)/);
  assert.match(client,/migrateLocalNpcCallsigns\(\);\s*if\(!g\.foodKitGranted\)/);
  assert.match(client,/function syncNpcRosterToClient\(\)\{\s*migrateLocalNpcCallsigns\(\);/);
  assert.match(client,/g=data\.state;migrateWorld\(\);/);
});

test('4.33 survival and expedition features are wired into the game and server',()=>{
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  const data=fs.readFileSync(path.join(root,'src/shared/game-data.js'),'utf8');
  assert.match(html,/survival\.js\?v=4\.61\.26/);
  assert.match(html,/Подготовить рюкзак/);
  assert.match(html,/Охота на мутантов/);
  assert.match(client,/function tickSurvival\(/);
  assert.match(client,/function prepareExpedition\(/);
  assert.match(client,/function huntMutants\(/);
  assert.match(server,/socket\.on\('survival:hunt'/);
  assert.match(server,/addEcoEvent\(world,success\?'mutant_hunt':'mutant_attack'/);
  assert.match(data,/mutant_trophy/);
});


test('4.33.32 uses polling-first desktop connection with WebSocket upgrade and prevents duplicate reconnects', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const network = fs.readFileSync(path.join(root, 'public/js/core/network.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(network, /transports: Object\.freeze\(\[\"polling\", \"websocket\"\]\)/);
  assert.match(network, /tryAllTransports: true/);
  assert.match(client, /https:\/\/zone-online-multiplayer\.onrender\.com/);
  assert.match(network, /randomizationFactor: 0\.25/);
  assert.match(server, /transports: \['websocket','polling'\]/);
  assert.match(server, /transportMode:'websocket-first-with-polling-fallback'/);
  assert.match(client, /keeping existing Socket\.IO connection/);
  assert.match(client, /ZoneNetwork\.canReuse\(zoneSocket,zoneSocketTarget,targetUrl\)/);
  assert.match(client, /await waitForMultiplayerHealth[\s\S]{0,120}zonePlayerReady=false/);
  assert.match(server, /Publish the new owner before closing an older tab\/session/);
  assert.match(server, /oldSocket\.disconnect\(true\)/);
});


test('4.33.9 pins Render to Node.js 22 LTS and enables transport fallback', () => {
  const nodeVersion = fs.readFileSync(path.join(root, '.node-version'), 'utf8').trim();
  const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(nodeVersion, '22.16.0');
  assert.match(render, /key: NODE_VERSION\s+value: 22\.16\.0/);
  assert.equal(pkg.engines.node, '>=22 <27');
  assert.match(fs.readFileSync(path.join(root, 'server.js'), 'utf8'), /transports: \[\'websocket\',\'polling\'\]/);
});


test('4.33.9 persists the last player state on disconnect and flushes state during Render shutdown', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /disconnect player persistence/);
  assert.match(server, /process\.on\('SIGTERM',\(\)=>gracefulShutdown\('SIGTERM'\)\)/);
  assert.match(server, /await Promise\.all\(\[\.\.\.online\.values\(\)\]/);
  assert.match(server, /await persistWorld\(\)/);
});

test('hunger and thirst display helper rounds percentages to whole numbers',()=>{const {context}=bootClient();assert.equal(context.needPercent(58.034012666666655),58);assert.equal(context.needPercent(99.8),100);assert.equal(context.needPercent(-3),0);assert.equal(context.needPercent(120),100);});

test('4.33.32 self marker matches compact player size and opens sorted nearby-player actions', () => {
  const { context, elements } = bootClient();
  const card = context.document.createElement('div');
  elements.set('mapEntityCard', card);
  const selfMarker = context.playerDotMarkup({x:100,y:100});
  assert.match(selfMarker, /scale\(\.42\)/);
  assert.match(selfMarker, /class="marker-dot" r="3\.2"/);
  vm.runInContext(`
    g.loc='cordon'; g.worldPosition={x:100,y:100}; g.mapCoordinateVersion=2;
    zonePlayerId='self';
    onlinePlayers=[
      {id:'far',name:'Дальний',faction:'Одиночки',location:'cordon',x:120,y:100},
      {id:'near',name:'Ближний',faction:'Свобода',location:'cordon',x:103,y:104}
    ];
    showNearbyPlayersCard();
  `, context);
  assert.ok(card.innerHTML.indexOf('Ближний') < card.innerHTML.indexOf('Дальний'));
  vm.runInContext("showMapPlayerCard('near')", context);
  assert.match(card.innerHTML, /Поговорить/);
  assert.match(card.innerHTML, /Торговать/);
  assert.match(card.innerHTML, /Пригласить в отряд/);
  assert.match(card.innerHTML, /Добавить в друзья/);
});
