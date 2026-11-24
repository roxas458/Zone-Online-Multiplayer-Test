const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/js/systems/inventory-view.js'), 'utf8');

function loadView() {
  const window = {
    ZoneInventory: {
      filterAndSort(items, { filter = 'all', query = '', sort = 'name' } = {}) {
        return items.filter(x => (filter === 'all' || x.type === filter) && x.name.toLowerCase().includes(query.toLowerCase()))
          .slice().sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'ru') : 0);
      },
      summarize(items, equipment) {
        const weight = items.reduce((sum, item) => sum + item.weight * item.qty, 0);
        const quantity = items.reduce((sum, item) => sum + item.qty, 0);
        const capacity = 50;
        return { weight, quantity, capacity, loadPercent: weight / capacity * 100 };
      }
    },
    ZoneEconomy: { saleUnitPrice: item => Math.floor(item.value * 0.5) }
  };
  const appended = [];
  const document = {
    createElement: () => ({ className: '', innerHTML: '', addEventListener() {} }),
    body: { append: node => appended.push(node) }
  };
  vm.runInNewContext(source, { window, document, console });
  return { view: window.ZoneInventoryView, window, document, appended };
}

function makeDom() {
  const ids = ['invSearch','invFilter','invSort','items','weight','itemCount','inventoryMoney','inventoryOwner','gearCallsign','inventoryRank','inventoryFaction','gearWeapon','gearTool','gearSuit','gearHelmet','gearBackpack','gearSidearm','gearArtifact','gearLoadMeter','gearWeight','gearStats','equipment'];
  const elements = Object.fromEntries(ids.map(id => [id, { value: '', textContent: '', innerHTML: '', style: {} }]));
  return id => elements[id] || null;
}

const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

test('4.61.52 inventory view renders filtered item grid, load summary and equipped stats', () => {
  const { view } = loadView();
  const $ = makeDom();
  const state = {
    items: [
      { id: 'pm', name: 'Пистолет ПМ', type: 'Оружие', qty: 1, weight: 0.9, value: 850, damage: 18, condition: 90 },
      { id: 'med', name: 'Аптечка', type: 'Медицина', qty: 2, weight: 0.4, value: 180 }
    ],
    equipment: { weapon: 'Пистолет ПМ', suit: '', helmet: '', tool: '', backpack: 'Стандартный рюкзак', sidearm: '', artifact: '' },
    money: 1250, faction: 'Одиночки', xp: 50
  };
  view.renderInventory({ g: state, $, playerDisplayName: () => 'Тестовый сталкер', rankForXpClient: () => 'Опытный сталкер', escapeHtml: esc });
  assert.match($('items').innerHTML, /Пистолет ПМ/);
  assert.match($('items').innerHTML, /is-equipped/);
  assert.match($('items').innerHTML, /Аптечка/);
  assert.equal($('itemCount').textContent, 3);
  assert.equal($('inventoryMoney').textContent, '1 250 RU');
  assert.match($('gearStats').innerHTML, /Урон оружия/);
  assert.equal($('gearWeapon').textContent, 'Пистолет ПМ');
});

test('4.61.52 inventory view opens a safe detailed item inspection panel', () => {
  const { view, document, appended } = loadView();
  const state = { items: [{ id: 'med', name: 'Аптечка', type: 'Медицина', qty: 2, weight: 0.4, value: 180, desc: 'Полевое лечение' }], equipment: {} };
  view.inspectInventoryItem({ g: state, escapeHtml: esc, document }, 'med');
  assert.equal(appended.length, 1);
  assert.equal(appended[0].className, 'inventory-inspect');
  assert.match(appended[0].innerHTML, /Аптечка/);
  assert.match(appended[0].innerHTML, /Применить/);
  assert.match(appended[0].innerHTML, /Продать · 90 ₽/);
  assert.equal(view.inspectInventoryItem({ g: state, escapeHtml: esc, document }, 'missing'), undefined);
  assert.equal(appended.length, 1);
});

test('4.61.52 inventory UI module is loaded before game.js and game keeps compatibility wrappers', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const moduleAt = html.indexOf('/js/systems/inventory-view.js?v=4.61.52');
  const gameAt = html.indexOf('/js/game.js?v=4.61.52');
  assert.ok(moduleAt >= 0 && gameAt > moduleAt);
  assert.match(game, /function renderInventory\(\)\{return window\.ZoneInventoryView\.renderInventory\(inventoryViewContext\(\)\);\}/);
  assert.match(game, /function inspectInventoryItem\(id\)\{return window\.ZoneInventoryView\.inspectInventoryItem\(inventoryViewContext\(\),id\);\}/);
  assert.ok(!game.includes('function renderInventory(){\n const query='));
});
