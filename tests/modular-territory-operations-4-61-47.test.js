const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/territory-operations.js'), 'utf8'), { window });
  return window.ZoneTerritoryOperations;
}
test('territory operation rejects missing, already-owned and underfunded targets without side effects', () => {
  const api = load();
  assert.deepEqual(JSON.parse(JSON.stringify(api.evaluate(null, 'Одиночки', 1000))), { status: 'missing' });
  assert.deepEqual(JSON.parse(JSON.stringify(api.evaluate({ owner: 'Одиночки', control: 80 }, 'Одиночки', 1000))), { status: 'already-owned' });
  assert.deepEqual(JSON.parse(JSON.stringify(api.evaluate({ owner: 'Долг', control: 20 }, 'Одиночки', 349))), { status: 'insufficient-funds', cost: 350 });
});
test('territory operation preserves the 350-ruble cost and 25-point influence step', () => {
  const api = load();
  assert.deepEqual(JSON.parse(JSON.stringify(api.evaluate({ owner: 'Долг', control: 20 }, 'Одиночки', 350))), {
    status: 'progress', cost: 350, previousOwner: 'Долг', control: 45, reputationGain: 0
  });
});
test('territory operation captures at 100 and resets control to 55 with eight reputation', () => {
  const api = load();
  assert.deepEqual(JSON.parse(JSON.stringify(api.evaluate({ owner: 'Долг', control: 90 }, 'Одиночки', 900))), {
    status: 'captured', cost: 350, previousOwner: 'Долг', control: 55, reputationGain: 8
  });
});
test('browser loads territory operation policy before game.js and game delegates territory decisions', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('territory-operations.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.match(game, /ZoneTerritoryOperations\.evaluate\(l,g\.faction,g\.money\)/);
  assert.match(game, /function livingTerritory\(id\)/);
});
