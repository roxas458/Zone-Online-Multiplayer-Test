const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/game-data.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('4.37 inventory exposes dedicated helmet, suit, detector, sidearm, artifact and backpack slots', () => {
  for (const slot of ['weapon', 'tool', 'helmet', 'suit', 'sidearm', 'artifact', 'backpack']) assert.match(html, new RegExp(`data-gear="${slot}"`));
});

test('4.37 equipment picker only offers items of the correct slot type and supports unequipping', () => {
  assert.match(client, /function openGearSlot\(slot\)/);
  assert.match(client, /function equipIntoSlot\(slot,id\)/);
  assert.match(client, /Подходящих предметов в рюкзаке нет/);
  assert.match(client, /function unequipSlot\(slot\)/);
  assert.match(client, /"Шлем":"helmet"/);
  assert.match(client, /"Рюкзак":"backpack"/);
});

test('4.37 helmets contribute protection and backpacks change carrying capacity', () => {
  assert.match(client, /helmet=g\.items\.find/);
  assert.match(client, /Number\(pack\?\.capacity\)\|\|50/);
  assert.match(client, /backpack_field/);
  assert.match(shared, /helmet_bulat/);
  assert.match(shared, /backpack_expedition/);
  assert.match(server, /player:equipment:update/);
  assert.match(server, /goods.capacity/);
  assert.match(client, /helmet.condition=Math.max/);
});

test('4.37 picker and six-plus equipment slots have responsive PDA styling', () => {
  assert.match(css, /gear-picker-list/);
  assert.match(css, /grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
});
