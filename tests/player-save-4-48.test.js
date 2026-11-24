'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mergeClientSaveState, SERVER_AUTHORITY_FIELDS } = require('../src/server/player-save');
const root = path.join(__dirname, '..');

test('4.49 generic client saves cannot mint money, items, health, XP or progression', () => {
  const current = { money: 120, items: [{ id: 'med', qty: 2 }], hp: 74, xp: 80, rep: 3, quests: [{ id: 'q1', done: false }], careerStats: { kills: 1 }, name: 'Сталкер', settings: { sound: 50 } };
  const incoming = { money: 99999999, items: [{ id: 'artifact', qty: 999 }], hp: 100, xp: 9999999, rep: 1000, quests: [{ id: 'q1', done: true }], careerStats: { kills: 999 }, name: 'Новое имя', settings: { sound: 20 } };
  const result = mergeClientSaveState(current, incoming);
  for (const key of ['money', 'items', 'hp', 'xp', 'rep', 'quests', 'careerStats']) assert.deepEqual(result[key], current[key]);
  assert.equal(result.name, 'Новое имя');
  assert.deepEqual(result.settings, { sound: 20 });
});

test('4.49 client cannot reset character identity, faction or discovery progress through generic save', () => {
  const current = { characterCreated: true, faction: 'Долг', visitedLocations: ['cordon', 'bar'] };
  const result = mergeClientSaveState(current, { characterCreated: false, faction: 'Монолит', visitedLocations: [], name: 'Сталкер' });
  assert.equal(result.characterCreated, true);
  assert.equal(result.faction, 'Долг');
  assert.deepEqual(result.visitedLocations, ['cordon', 'bar']);
});

test('4.49 fresh character creation after death replaces the previous character state', () => {
  const result = mergeClientSaveState({ characterCreated: false, faction: 'Одиночки', money: 0, hp: 0, items: [{ id: 'old', qty: 1 }], xp: 900 }, { characterCreated: true, faction: 'Долг', money: 1450, hp: 100, xp: 0, items: [{ id: 'pm', qty: 1 }] }, { allowCharacterCreation: true });
  assert.equal(result.characterCreated, true);
  assert.equal(result.faction, 'Долг');
  assert.equal(result.money, 1450);
  assert.equal(result.hp, 100);
  assert.equal(result.xp, 0);
  assert.deepEqual(result.items, [{ id: 'pm', qty: 1 }]);
});

test('4.49 new profile can retain initial state when no server profile exists', () => {
  const incoming = { money: 500, items: [{ id: 'bread', qty: 2 }], hp: 100, xp: 0 };
  assert.deepEqual(mergeClientSaveState(null, incoming), incoming);
});

test('4.49 save authority and durable trade receipts are wired into server and client', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(server, /mergeClientSaveState\(p\.state,clientState\.state,\{allowCharacterCreation\}\)/);
  assert.match(server, /player:save:ack/);
  assert.match(server, /CREATE TABLE IF NOT EXISTS zone_trade_receipts/);
  assert.match(server, /INSERT INTO zone_trade_receipts\(offer_id,from_id,to_id,item_id,qty,price\)/);
  assert.match(client, /zoneSocket\.on\('player:save:ack'/);
  assert.ok(SERVER_AUTHORITY_FIELDS.includes('money'));
  assert.ok(SERVER_AUTHORITY_FIELDS.includes('items'));
  assert.ok(SERVER_AUTHORITY_FIELDS.includes('guestSessionVersion'));
});
