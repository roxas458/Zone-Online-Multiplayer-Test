const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const proximity = require('../src/systems/proximity');

test('NPC map uses authoritative server coordinates and does not treat null as coordinate zero', () => {
  assert.match(js, /function npcMapPosition[\s\S]*?n\.x!==null[\s\S]*?Number\(n\.x\)/);
  assert.match(js, /local\.route=Array\.isArray\(npc\.route\)/);
  const fallback = proximity.npcWorldPosition({ id: 'test-npc', location: 'cordon', x: null, y: null });
  assert.notDeepEqual(fallback, { x: 0, y: 0 });
  assert.deepEqual(proximity.npcWorldPosition({ id: 'test-npc', location: 'cordon', x: 123, y: 456 }), { x: 123, y: 456 });
});

test('local NPC map markers open an individual profile with dialogue and route actions', () => {
  assert.match(js, /function showMapNpc\(id\)/);
  assert.match(js, /onclick=\\?"showMapNpc\('/);
  assert.match(js, /function npcRoutePoints\(n\)/);
  assert.match(js, /npc-route-selected/);
  assert.match(js, /Поговорить/);
});

test('full-Zone overview clusters NPC squads while squad cards allow selecting individual members', () => {
  assert.match(js, /if\(zoneMapMode==='zone'\)[\s\S]*?mapSquadPoint/);
  assert.match(js, /class="map-entity-member" onclick="showMapNpc/);
});
