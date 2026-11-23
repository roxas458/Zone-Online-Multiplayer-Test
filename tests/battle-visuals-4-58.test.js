const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const ai = fs.readFileSync(path.join(root, 'src/systems/npc-ai.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');

test('4.58 NPCs in combat are visibly marked with animated fire and muzzle flashes', () => {
  assert.match(game, /marker-in-combat/);
  assert.match(game, /combat-flame/);
  assert.match(game, /combat-muzzle-flash/);
  assert.match(css, /zoneFireFlicker/);
  assert.match(css, /zoneMuzzleFlash/);
});

test('4.58 active battlefronts are clickable map hotspots with battle details', () => {
  assert.match(game, /const activeBattles=/);
  assert.match(game, /showMapBattle\('\$\{esc\(battle\.id\)\}'\)/);
  assert.match(game, /function showMapBattle\(id\)/);
  assert.match(game, /battle\.participants/);
  assert.match(game, /БОЕВОЕ СТОЛКНОВЕНИЕ/);
});

test('4.58 battlefronts retain a bounded list of NPC participants for tactical reports', () => {
  assert.match(ai, /engagement\.participants \|\|= \[\]/);
  assert.match(ai, /engagement\.participants\.push\(participant\)/);
  assert.match(ai, /engagement\.participants=engagement\.participants\.slice\(-24\)/);
});

test('4.58 weapon catalogue contains 67 entries, including melee weapons', () => {
  const match = game.match(/const weaponCatalogue=\[([\s\S]*?)\n\];/);
  assert.ok(match, 'weapon catalogue exists');
  assert.equal((match[1].match(/\["[a-z0-9_]+"/g) || []).length, 67);
  assert.match(match[1], /\["knife","Нож сталкера"/);
});
