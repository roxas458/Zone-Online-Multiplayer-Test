const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/fieldwork.js'), 'utf8'), { window });
  return window.ZoneFieldwork;
}

test('fieldwork discovers at most the requested number of unknown points and marks them', () => {
  const api = load();
  const points = [{ name: 'A', discovered: false }, { name: 'B', discovered: false }, { name: 'C', discovered: true }];
  const names = api.discoverPoints(points, 2, () => 0);
  assert.deepEqual(Array.from(names), ['A', 'B']);
  assert.equal(points[0].discovered, true);
  assert.equal(points[1].discovered, true);
  assert.equal(points[2].discovered, true);
});

test('artifact scan chance preserves base formula, condition bonus and maximum cap', () => {
  const api = load();
  assert.ok(Math.abs(api.artifactDiscoveryChance({ anomalyCount: 0, tier: 1, condition: 60 }) - 0.31) < 1e-10);
  assert.ok(Math.abs(api.artifactDiscoveryChance({ anomalyCount: 1, tier: 2, condition: 80 }) - 0.54) < 1e-10);
  assert.equal(api.artifactDiscoveryChance({ anomalyCount: 100, tier: 3, condition: 100 }), 0.82);
});

test('artifact eligibility follows detector rarity tiers', () => {
  const api = load();
  const defs = [{ id: 'common', rarity: 'обычный' }, { id: 'rare', rarity: 'редкий' }, { id: 'very', rarity: 'очень редкий' }];
  assert.deepEqual(Array.from(api.eligibleArtifacts(defs, 1), x => x.id), ['common']);
  assert.deepEqual(Array.from(api.eligibleArtifacts(defs, 2), x => x.id), ['common', 'rare']);
  assert.deepEqual(Array.from(api.eligibleArtifacts(defs, 3), x => x.id), ['common', 'rare', 'very']);
});

test('browser loads fieldwork rules before game adapter and delegates both calculations', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('fieldwork.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.ok(game.includes('window.ZoneFieldwork.discoverPoints(unknown,2,Math.random)'));
  assert.ok(game.includes('window.ZoneFieldwork.artifactDiscoveryChance'));
  assert.ok(game.includes('window.ZoneFieldwork.eligibleArtifacts'));
});
