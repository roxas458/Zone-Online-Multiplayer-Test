const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function loadEconomy() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/economy.js'), 'utf8'), { window });
  return window.ZoneEconomy;
}

function loadInventory() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/inventory.js'), 'utf8'), { window });
  return window.ZoneInventory;
}

test('inventory system loads before the game compatibility client', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(html.indexOf('/js/systems/inventory.js') < html.indexOf('/js/game.js'));
  assert.ok(html.indexOf('/js/systems/economy.js') < html.indexOf('/js/game.js'));
});

test('inventory add preserves existing stack behavior and creates new stacks', () => {
  const inv = loadInventory();
  const items = [{ id: 'med', name: 'Аптечка', qty: 2 }];
  const merged = inv.add(items, 'med', 'Аптечка', 'Медицина', 'Описание', 0.4, 120, 3);
  assert.equal(merged.qty, 5);
  inv.add(items, 'bandage', 'Бинт', 'Медицина', 'Описание', 0.1, 30, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(items.map(x => [x.id, x.qty]))), [['med', 5], ['bandage', 2]]);
});

test('inventory count and take handle missing, partial and exhausted stacks', () => {
  const inv = loadInventory();
  const items = [{ id: 'food', qty: 3 }];
  assert.equal(inv.count(items, 'food'), 3);
  assert.equal(inv.count(items, 'missing'), 0);
  assert.equal(inv.take(items, 'missing', 1), false);
  assert.equal(inv.take(items, 'food', 4), false);
  assert.equal(inv.take(items, 'food', 2), true);
  assert.equal(inv.count(items, 'food'), 1);
  assert.equal(inv.take(items, 'food', 1), true);
  assert.equal(items.length, 0);
});

test('inventory sale pricing preserves the 65 percent trader buyback rule', () => {
  const item = { id: 'rifle', value: 101 };
  const economy = loadEconomy();
  assert.equal(economy.saleUnitPrice(item), 65);
  assert.equal(economy.saleTotal(item, 3), 195);
  assert.equal(economy.saleUnitPrice(item, 0.5), 50);
});

test('game inventory and sale paths delegate to the extracted system', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(client, /ZoneInventory\.add\(g\.items/);
  assert.match(client, /ZoneInventory\.count\(g\.items/);
  assert.match(client, /ZoneInventory\.take\(g\.items/);
  assert.match(client, /ZoneEconomy\.saleTotal\(x,amount\)/);
  assert.match(client, /ZoneEconomy\.saleUnitPrice\(x\)/);
  assert.match(client, /ZoneEconomy\.canAfford\(g\.money,x\[3\]\)/);
});

test('economy affordability uses numeric balances and prices', () => {
  const economy = loadEconomy();
  assert.equal(economy.canAfford(100, 100), true);
  assert.equal(economy.canAfford('99', 100), false);
  assert.equal(economy.canAfford(150, '120'), true);
});
