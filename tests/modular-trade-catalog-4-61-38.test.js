const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/trade-catalog.js'), 'utf8'), { window });
  return window.ZoneTradeCatalog;
}

test('trade catalogue exposes the complete six-field vendor rows', () => {
  const { goods } = load();
  assert.ok(goods.length >= 50);
  for (const row of goods) {
    assert.equal(row.length, 6);
    assert.ok(row[0] && row[1] && row[2] && row[5]);
    assert.ok(Number.isFinite(row[3]) && row[3] > 0);
    assert.ok(Number.isFinite(row[4]) && row[4] >= 0);
  }
});

test('trade catalogue item IDs are unique and key equipment remains available', () => {
  const goods = load().goods;
  const ids = goods.map(row => row[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['weapon_pm', 'weapon_aks74u', 'weapon_toz34', 'weapon_ak74', 'weapon_vintar', 'armor_exo', 'detector_svarog', 'artifact_compass']) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
});

test('catalogue and rows are immutable to protect shared shop data', () => {
  const catalog = load();
  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(Object.isFrozen(catalog.goods), true);
  assert.equal(Object.isFrozen(catalog.goods[0]), true);
});

test('game retains its tradeGoods compatibility adapter and loads catalogue before game.js', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('/js/systems/trade-catalog.js?v=4.61.52') < html.indexOf('/js/game.js?v=4.61.52'));
  assert.match(game, /function tradeGoods\(\)\{return window\.ZoneTradeCatalog\.goods;\}/);
  assert.doesNotMatch(game, /function tradeGoods\(\)\{return \[/);
});
