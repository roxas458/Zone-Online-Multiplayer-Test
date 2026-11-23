const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const js = fs.readFileSync('public/js/story-mode.js', 'utf8');
const css = fs.readFileSync('public/css/game.css', 'utf8');

test('story campaign has independent save and does not write faction-war state', () => {
  assert.match(js, /const SAVE_KEY='zoneStorySave'/);
  assert.doesNotMatch(js, /localStorage\.(?:setItem|removeItem)\([^)]*(?:war|faction)/i);
});

test('story map supports click-to-move and a stop control', () => {
  assert.match(js, /map\.addEventListener\('click'/);
  assert.match(js, /moveTo\(\{x:Math\.max/);
  assert.match(js, /function cancelMove\(\)/);
  assert.match(js, /ZoneStoryMode\.cancelMove/);
});

test('player movement is animated and persisted instead of teleporting', () => {
  assert.match(js, /function startMovement\(\)/);
  assert.match(js, /state\.player\.x\+=dx\/len/);
  assert.match(js, /state\.player\.y\+=dy\/len/);
  assert.match(js, /destination:state\.destination/);
});

test('NPCs have independently refreshed patrol positions and ambient world events', () => {
  assert.match(js, /function npcPosition\(n\)/);
  assert.match(js, /worldTick=setInterval\(\(\)=>\{simulateWorld\(\);updateNpcLayer\(\);\},1800\)/);
  assert.match(js, /function ambientEvent\(hour\)/);
  assert.match(js, /Одиночки|бандитов|туман/);
});

test('talking and inspecting require the player to be close to the target', () => {
  assert.match(js, /dist\(state\.player,p\)>=5/);
  assert.match(js, /dist\(state\.player,s\)>=5/);
});

test('story movement controls have visible styling', () => {
  assert.match(css, /\.story-movement-bar/);
  assert.match(css, /\.story-destination/);
});


test('story campaign defines its own protagonist with a portrait and personal motivation', () => {
  assert.match(js, /name:'Плут',age:null/);
  assert.match(js, /Настоящее имя неизвестно/);
  assert.match(js, /пропавшего напарника/);
  assert.match(js, /story-hero-card/);
});

test('Zaton story campaign has an expanded named loner and bandit cast with distinct roles', () => {
  for (const name of ['Сыч','Доктор «Шрам»','Фома «Крот»','Рыжий','Глухарь','Пахом','Тихий','Борода','Шакал','Митя «Пластырь»','Зорька','Сова','Барин','Макар «Ржавый»','Юла','Горшок','Лесник','Оскар']) assert.ok(js.includes(name), `missing NPC ${name}`);
  assert.match(js, /Торговец/);
  assert.match(js, /Полевой медик/);
  assert.match(js, /Проводник/);
  assert.match(js, /Одиночки/);
  assert.match(js, /Бандиты/);
});

test('NPC patrols interpolate between route points and the story roster is visible in the PDA sidebar', () => {
  assert.match(js, /function moveNpc\(n,a\)/);
  assert.match(js, /state\.npcStates/);
  assert.match(js, /ИЗВЕСТНЫЕ В ОКРУГЕ · \$\{npcs\.filter\(n=>npcState\(n\)\.alive\)\.length\} ЖИВЫХ/);
  assert.match(css, /\.story-hero-card/);
});


test('4.62 story hero identity is only Plut and old medic/bandit names are gone', () => {
  assert.match(js, /name:'Плут',age:null/);
  assert.match(js, /Настоящее имя неизвестно/);
  assert.match(js, /Доктор «Шрам»/);
  assert.match(js, /Бывший военный фельдшер/);
  assert.match(js, /name:'Шакал'/);
  assert.doesNotMatch(js, /Егор Волков|Клин|Лера «Шина»|Клык/);
  const ids = [...js.matchAll(/\{id:'([^']+)'/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'story NPC and site IDs must be unique');
});

test('4.62 Zaton NPCs use time-of-day route variations and nearby activity reports', () => {
  assert.match(js, /const phase=hour<6\?'night':hour<12\?'morning':hour<19\?'day':'evening'/);
  assert.match(js, /function updateNpcLayer\(\)/);
  assert.match(js, /dist\(state\.player,npcPosition\(n\)\)<7/);
  assert.match(js, /Сова|Барин|Макар «Ржавый»|Юла|Горшок|Лесник|Оскар/);
});


test('4.63 story A-Life persists NPC health, casualties, autonomous movement and faction combat', () => {
  assert.match(js, /function simulateWorld\(\)/);
  assert.match(js, /function resolveCombat\(\)/);
  assert.match(js, /a\.health=Math\.max\(0,a\.health-damageA\)/);
  assert.match(js, /a\.alive=false;a\.status='погиб'/);
  assert.match(js, /npcStates:state\.npcStates/);
  assert.match(js, /story-npc fallen/);
  assert.match(js, /Погиб сталкер/);
});
