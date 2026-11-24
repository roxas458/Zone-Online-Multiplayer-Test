const test = require('node:test');
const assert = require('node:assert/strict');
const { initEcosystem, TARGET_MUTANT_PACKS } = require('../src/systems/ecosystem');
const fs = require('node:fs');
const path = require('node:path');
const client = fs.readFileSync(path.join(__dirname, '../public/js/game.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/css/game.css'), 'utf8');

test('map ecology expands existing worlds to 54 persistent mutant packs', () => {
  const world = { ecosystem: { mutantPacks: Array.from({length:18},(_,i)=>({id:`pack_${i+1}`,location:'cordon',count:2})), anomalies:[], bases:{}, markets:{}, clans:{}, events:[] } };
  const eco = initEcosystem(world);
  assert.equal(TARGET_MUTANT_PACKS, 54);
  assert.equal(eco.mutantPacks.length, 54);
  assert.equal(new Set(eco.mutantPacks.map(p=>p.id)).size, 54);
});

test('new world starts with expanded mutant population', () => {
  const eco = initEcosystem({});
  assert.equal(eco.mutantPacks.length, 54);
});

test('map NPC squads and mutant packs open detailed clickable cards', () => {
  assert.match(client, /showMapSquad/);
  assert.match(client, /showMapMutants/);
  assert.match(client, /mapEntityMembers|map-entity-members/);
  assert.match(client, /ОТРЯД ·/);
  assert.match(client, /ОБНАРУЖЕНЫ МУТАНТЫ/);
});

test('map marker palette distinguishes allies, neutrals, enemies, players and mutants', () => {
  for (const color of ['marker-friendly','marker-neutral','marker-enemy','marker-player','marker-mutant']) {
    assert.ok(client.includes(color) || css.includes(color), `missing ${color}`);
  }
  assert.match(css, /\.zone-map \.marker-mutant\{color:#ed5148\}/);
});
