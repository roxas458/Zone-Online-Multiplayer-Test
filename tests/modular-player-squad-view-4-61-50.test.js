const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/player-squad-view.js'), 'utf8'), { window });
  return window.ZonePlayerSquadView;
}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const context = {
  zonePlayerId: 'player-1',
  g: { faction: 'Одиночки', loc: 'cordon', npcs: [
    { id: 'npc-1', loc: 'cordon', alive: true, faction: 'Одиночки', name: 'Сидорович', role: 'торговец' },
    { id: 'npc-2', loc: 'cordon', alive: true, faction: 'Долг', relationship: 20, name: 'Боец Долга' },
    { id: 'npc-3', loc: 'bar', alive: true, faction: 'Одиночки', name: 'Не рядом' },
    { id: 'npc-4', loc: 'cordon', alive: false, faction: 'Одиночки', name: 'Погибший' }
  ] },
  escapeHtml,
  npcBy: id => id === 'npc-1' ? { name: 'Сидорович' } : null,
  locationName: id => id === 'cordon' ? 'Кордон' : id
};

test('empty squad panel preserves the create squad action', () => {
  const html = load().panelHtml({ squad: null }, context);
  assert.match(html, /Ты пока не состоишь в отряде/);
  assert.match(html, /squadAction\('create'\)/);
});

test('leader panel preserves roles, journal, escort and eligible nearby NPC candidates', () => {
  const html = load().panelHtml({ squad: {
    name: 'Волчья стая', leader: 'player-1', location: 'cordon', escortNpcId: 'npc-1',
    members: [
      { id: 'player-1', name: 'Игрок', faction: 'Одиночки', role: 'leader' },
      { id: 'player-2', name: 'Напарник', faction: 'Одиночки', role: 'medic' }
    ], journal: [{ at: 0, text: 'Отряд собран' }]
  } }, context);
  assert.match(html, /Отряд «Волчья стая»/);
  assert.match(html, /Ты командуешь/);
  assert.match(html, /squadRole\('player-2',this.value\)/);
  assert.match(html, /Сопровождает NPC: Сидорович/);
  assert.match(html, /<option value="npc-1">/);
  assert.match(html, /<option value="npc-2">/);
  assert.match(html, /squadEscort\(document\.getElementById\('squadEscortNpc'\)\.value\)/);
  assert.doesNotMatch(html, /npc-3|npc-4/);
  assert.match(html, /Отряд собран/);
  assert.match(html, /squadAction\('leave'\)/);
});

test('non-leader panel hides role changes and escort invitation controls', () => {
  const html = load().panelHtml({ squad: {
    name: 'Патруль', leader: 'another-player', location: 'cordon', members: [
      { id: 'another-player', name: 'Командир', faction: 'Долг', role: 'leader' },
      { id: 'player-1', name: 'Игрок', faction: 'Одиночки', role: 'rifleman' }
    ], journal: []
  } }, context);
  assert.match(html, /Следуй за командиром/);
  assert.doesNotMatch(html, /squadRole|squadEscortNpc|Пригласить NPC/);
});

test('squad panel escapes untrusted names and journal text', () => {
  const html = load().panelHtml({ squad: {
    name: '<script>', leader: 'player-1', location: 'cordon', members: [
      { id: 'player-1', name: '<img src=x>', faction: '<bad>', role: 'leader' }
    ], journal: [{ at: 0, text: '<script>alert(1)</script>' }]
  } }, context);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /&lt;bad&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x>/);
});

test('game keeps squad state adapter and loads the view module before game.js', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('player-squad-view.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.match(game, /function renderPlayerSquad\(data\)\{const el=\$\('playerSquadPanel'\);if\(!el\)return;activePlayerSquad=data\?\.squad\|\|null;el\.innerHTML=window\.ZonePlayerSquadView\.panelHtml\(data,\{g,zonePlayerId,escapeHtml,npcBy,locationName\}\);\}/);
  assert.match(game, /function squadAction\(action,targetId\)/);
  assert.match(game, /function squadRole\(memberId,role\)/);
  assert.match(game, /function squadEscort\(npcId\)/);
});
