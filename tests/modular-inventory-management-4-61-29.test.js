const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function loadInventory() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/inventory.js'), 'utf8'), { window });
  return window.ZoneInventory;
}

test('inventory management module is loaded before the game client', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(html.indexOf('/js/systems/inventory.js') < html.indexOf('/js/game.js'));
});

test('inventory filters and sorts without mutating the source list', () => {
  const inv = loadInventory();
  const items = [
    { id: 'b', name: 'Бинт', type: 'Медицина', value: 40, weight: 0.2, qty: 2 },
    { id: 'r', name: 'Ружьё', type: 'Оружие', value: 500, weight: 3, qty: 1 },
    { id: 'm', name: 'Аптечка', type: 'Медицина', value: 100, weight: 0.5, qty: 1 }
  ];
  assert.deepEqual(Array.from(inv.filterAndSort(items, { filter: 'Медицина', sort: 'value' }).map(x => x.id)), ['m', 'b']);
  assert.deepEqual(Array.from(inv.filterAndSort(items, { query: 'руж', sort: 'weight' }).map(x => x.id)), ['r']);
  assert.deepEqual(items.map(x => x.id), ['b', 'r', 'm']);
});

test('equipment rules map item types, validate slots and prevent primary/sidearm duplication', () => {
  const inv = loadInventory();
  const equipment = { weapon: '', sidearm: 'ПМ', suit: '' };
  const rifle = { name: 'АК-74', type: 'Оружие', qty: 1 };
  assert.equal(inv.slotForItem(rifle), 'weapon');
  assert.equal(inv.equip(equipment, rifle, 'weapon'), true);
  assert.equal(equipment.weapon, 'АК-74');
  assert.equal(equipment.sidearm, 'ПМ');
  assert.equal(inv.equip(equipment, rifle, 'suit'), false);
  assert.equal(inv.equip(equipment, { name: 'ПМ', type: 'Оружие' }, 'sidearm'), true);
  assert.equal(equipment.weapon, 'АК-74');
  assert.deepEqual(Array.from(inv.itemsForSlot([rifle, { name: 'ПМ', type: 'Оружие', qty: 1 }], 'weapon', equipment).map(x => x.name)), ['АК-74']);
});

test('equipment can be removed only from known slots', () => {
  const inv = loadInventory();
  const equipment = { helmet: 'Шлем', arbitrary: 'keep' };
  assert.equal(inv.unequip(equipment, 'helmet'), true);
  assert.equal(equipment.helmet, '');
  assert.equal(inv.unequip(equipment, 'arbitrary'), false);
  assert.equal(equipment.arbitrary, 'keep');
});

test('inventory summary calculates stack weight, quantity, backpack capacity and load percentage', () => {
  const inv = loadInventory();
  const items = [
    { name: 'Рюкзак', type: 'Рюкзак', capacity: 65, weight: 1, qty: 1 },
    { name: 'Патроны', type: 'Боеприпасы', weight: 0.5, qty: 4 }
  ];
  const summary = inv.summarize(items, { backpack: 'Рюкзак' });
  assert.equal(summary.weight, 3);
  assert.equal(summary.quantity, 5);
  assert.equal(summary.capacity, 65);
  assert.equal(summary.loadPercent, 3 / 65 * 100);
});

test('game delegates inventory sorting, load calculation and equipment mutations to the system', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const view = fs.readFileSync(path.join(__dirname, '../public/js/systems/inventory-view.js'), 'utf8');
  assert.match(view, /ZoneInventory\.filterAndSort\(g\.items/);
  assert.match(view, /ZoneInventory\.summarize\(g\.items/);
  assert.match(client, /ZoneInventory\.equip\(g\.equipment/);
  assert.match(client, /ZoneInventory\.unequip\(g\.equipment/);
  assert.match(client, /ZoneInventory\.itemsForSlot\(g\.items/);
});
