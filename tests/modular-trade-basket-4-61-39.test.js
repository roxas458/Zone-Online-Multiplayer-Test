const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/trade-basket.js'), 'utf8'), { window });
  return window.ZoneTradeBasket;
}

test('trade basket adds immutably and respects buy and inventory quantity caps', () => {
  const api = load(); const initial = api.create();
  const buy = api.add(initial, 'buy', '0', { max: 20 });
  assert.equal(initial.buy['0'], undefined);
  assert.equal(buy.buy['0'], 1);
  let capped = buy;
  for (let i = 0; i < 30; i++) capped = api.add(capped, 'buy', '0', { max: 20 });
  assert.equal(capped.buy['0'], 20);
  assert.equal(api.add(capped, 'sell', 'med', { max: 2 }).sell.med, 1);
  assert.equal(api.add(capped, 'sell', 'med', { max: 0 }).sell.med, undefined);
});

test('trade basket removal preserves the other side and totals match shared sale prices', () => {
  const api = load();
  const state = { buy: { 0: 2 }, sell: { med: 3 } };
  const goods = [['Медаптечка', 'med', 'Медицина', 100]];
  const items = [{ id: 'med', value: 50 }];
  const removed = api.remove(state, 'buy', '0');
  assert.deepEqual(JSON.parse(JSON.stringify(removed)), { buy: {}, sell: { med: 3 } });
  assert.deepEqual(JSON.parse(JSON.stringify(api.totals(state, goods, items, item => Math.floor(item.value * .65)))), { buy: 200, sell: 96, net: 104 });
});

test('trade basket converts valid entries to server market deal payloads', () => {
  const api = load();
  const goods = [['Медаптечка', 'med', 'Медицина', 100]];
  assert.deepEqual(JSON.parse(JSON.stringify(api.toDeal({ buy: { 0: 2, 9: 1 }, sell: { bandage: 3, invalid: 0 } }, goods))), {
    buy: [{ item: 'med', qty: 2 }], sell: [{ item: 'bandage', qty: 3 }]
  });
});

test('browser loads trade basket module before game adapter and delegates basket math', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('trade-basket.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.ok(game.includes('window.ZoneTradeBasket.create()'));
  assert.ok(game.includes('window.ZoneTradeBasket.toDeal(tradeBasket,tradeGoods())'));
});
