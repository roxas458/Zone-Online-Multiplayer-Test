const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadRelations() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('public/js/systems/faction-relations.js', 'utf8'), context);
  return context.window.ZoneFactionRelations;
}

test('4.61.51 faction relation rules preserve Monolith hostility and explicit diplomacy values', () => {
  const relations = loadRelations();
  const factions = [{ name: 'Одиночки', relation: 20 }, { name: 'Долг', relation: -10 }];
  assert.equal(relations.relationValue('Монолит', 'Одиночки', {}, factions), -60);
  assert.equal(relations.relationValue('Одиночки', 'Монолит', {}, factions), -60);
  assert.equal(relations.relationValue('Одиночки', 'Долг', { Одиночки: { Долг: 37 } }, factions), 37);
});

test('4.61.51 faction relation fallback averages base relations and clamps to the legacy range', () => {
  const relations = loadRelations();
  assert.equal(relations.relationValue('Одиночки', 'Долг', {}, [
    { name: 'Одиночки', relation: 20 }, { name: 'Долг', relation: -10 }
  ]), 5);
  assert.equal(relations.relationValue('A', 'B', { A: { B: 900 } }, []), 60);
  assert.equal(relations.relationValue('A', 'B', { A: { B: -900 } }, []), -60);
});

test('4.61.51 browser loads faction relation rules before the game compatibility wrapper', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  const moduleAt = html.indexOf('/js/systems/faction-relations.js?v=4.61.51');
  const gameAt = html.indexOf('/js/game.js?v=4.61.51');
  assert.ok(moduleAt >= 0 && gameAt > moduleAt);
  const game = fs.readFileSync('public/js/game.js', 'utf8');
  assert.match(game, /function factionRelationValue\(a,b\)\{return window\.ZoneFactionRelations\.relationValue\(a,b,g\.diplomacy,g\.factions\);\}/);
});
