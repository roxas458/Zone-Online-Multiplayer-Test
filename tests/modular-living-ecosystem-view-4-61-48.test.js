const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/living-ecosystem-view.js'), 'utf8'), { window });
  return window.ZoneLivingEcosystemView;
}

test('living ecosystem view selects only mutant packs and anomalies in the current sector', () => {
  const result = load().prepare({
    mutantPacks: [{ location: 'cordon', count: 3 }, { location: 'dump', count: 9 }],
    anomalies: [{ location: 'cordon' }, { location: 'cordon' }, { location: 'yantar' }]
  }, 'cordon', 'Одиночки');
  assert.equal(result.packs.length, 1);
  assert.equal(result.mutantCount, 3);
  assert.equal(result.anomalyCount, 2);
});

test('living ecosystem view selects bases and clans belonging to the current faction only', () => {
  const result = load().prepare({
    bases: { a: { faction: 'Одиночки' }, b: { faction: 'Долг' } },
    clans: { c: { faction: 'Одиночки' }, d: { faction: 'Долг' } }
  }, 'cordon', 'Одиночки');
  assert.deepEqual(JSON.parse(JSON.stringify(result.bases)), [{ faction: 'Одиночки' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.clans)), [{ faction: 'Одиночки' }]);
});

test('living ecosystem view safely handles a missing ecosystem without mutating input', () => {
  const result = load().prepare(null, 'cordon', 'Одиночки');
  assert.equal(result.packs.length, 0);
  assert.equal(result.bases.length, 0);
  assert.equal(result.clans.length, 0);
  assert.equal(result.mutantCount, 0);
  assert.equal(result.anomalyCount, 0);
});

test('browser loads ecosystem view before game and camp rendering delegates data preparation', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('living-ecosystem-view.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.match(game, /ZoneLivingEcosystemView\.prepare\(eco,g\.loc,g\.faction\)/);
  assert.match(game, /mutantCount/);
});
