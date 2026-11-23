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
  assert.match(js, /worldTick=setInterval\(updateNpcLayer,1800\)/);
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
  assert.match(js, /name:'Егор Волков',callsign:'Клин'/);
  assert.match(js, /Бывший геолог/);
  assert.match(js, /пропавшего напарника/);
  assert.match(js, /story-hero-card/);
});

test('Zaton story campaign has an expanded named loner and bandit cast with distinct roles', () => {
  for (const name of ['Сыч','Лера «Шина»','Фома «Крот»','Рыжий','Глухарь','Пахом','Тихий','Борода','Клык','Митя «Пластырь»','Зорька']) assert.ok(js.includes(name), `missing NPC ${name}`);
  assert.match(js, /Торговец/);
  assert.match(js, /Полевой медик/);
  assert.match(js, /Проводник/);
  assert.match(js, /Одиночки/);
  assert.match(js, /Бандиты/);
});

test('NPC patrols interpolate between route points and the story roster is visible in the PDA sidebar', () => {
  assert.match(js, /const blend=\(state\.time%3\)\/3/);
  assert.match(js, /ИЗВЕСТНЫЕ В ОКРУГЕ · \$\{npcs\.length\} ЧЕЛОВЕК/);
  assert.match(css, /\.story-hero-card/);
});
