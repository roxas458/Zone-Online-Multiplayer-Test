const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../public/js/systems/character-setup-data.js');

const root = path.resolve(__dirname, '..');

test('4.61.51 character setup data module exports faction lore, identity lists and backgrounds', () => {
  assert.equal(Object.keys(data.factionLore).length, 10);
  assert.ok(data.factionLore['Одиночки']);
  assert.ok(data.SETUP_FIRST_NAMES.length >= 20);
  assert.ok(data.SETUP_CALLSIGNS.length >= 50);
  assert.deepEqual(Object.keys(data.setupBackgrounds).sort(), ['courier', 'medic', 'researcher', 'technician', 'wanderer']);
});

test('4.61.51 starter catalogue preserves core equipment, supplies, budget and faction suits', () => {
  assert.equal(data.STARTER_BUDGET, 400);
  for (const id of ['weapon_pm', 'weapon_toz34', 'weapon_aks74u', 'armor_leather', 'detector_echo', 'backpack_standard', 'med', 'bandage', 'bread']) {
    assert.ok(data.STARTER_GEAR[id], `missing starter item ${id}`);
  }
  assert.equal(data.STARTER_GEAR.weapon_pm.slot, 'weapon');
  assert.equal(data.STARTER_GEAR.armor_leather.slot, 'suit');
  assert.equal(data.factionSuit['Долг'], 'armor_duty');
  assert.ok(data.STARTER_WEAPON_SERVER_IDS.has('ak101'));
});

test('4.61.51 client loads setup data before game.js and game consumes the shared data API', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const dataAt = html.indexOf('/js/systems/character-setup-data.js?v=4.61.51');
  const gameAt = html.indexOf('/js/game.js?v=4.61.51');
  assert.ok(dataAt >= 0 && gameAt > dataAt, 'setup data must load before game.js');
  assert.match(game, /window\.ZoneCharacterSetupData/);
  assert.doesNotMatch(game, /const\s+STARTER_GEAR\s*=/);
  assert.doesNotMatch(game, /const\s+factionLore\s*=/);
});

test('4.61.51 starter catalogue remains extensible for server weapon catalogue rows', () => {
  const id = '__test_dynamic_weapon__';
  data.STARTER_GEAR[id] = { id, name: 'Test weapon', slot: 'weapon', points: 1 };
  assert.equal(data.STARTER_GEAR[id].name, 'Test weapon');
  delete data.STARTER_GEAR[id];
});
