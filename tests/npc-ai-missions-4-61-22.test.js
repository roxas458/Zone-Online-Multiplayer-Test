'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { processNpcMissionOrder } = require('../src/systems/npc-ai-missions');
const root = path.resolve(__dirname, '..');

test('4.61.31 mission order moves toward a reachable target and records the order cycle', () => {
  const npc = { id: 'mission-a', faction: 'Долг', location: 'bar', missionOrder: { type: 'secure', target: 'wild' } };
  const calls = [];
  const handled = processNpcMissionOrder(npc, {
    world: { territoryOrders: {} }, owners: {}, events: [], now: 10_000, random: () => 0,
    territoryAdjacency: { bar: ['dump'], dump: ['wild'] }, canEnterTerritory: () => true,
    moveNpc: (...args) => calls.push(args),
    scheduleNext: (...args) => calls.push(['schedule', ...args]),
    recordAction: (...args) => calls.push(['record', ...args])
  });
  assert.equal(handled, true);
  assert.deepEqual(calls[0], [npc, 'dump', 10_000, [], 'mission']);
  assert.equal(calls[1][0], 'schedule');
  assert.equal(calls[1][4], 5);
  assert.equal(calls[1][5], 9);
  assert.equal(calls[2][0], 'record');
  assert.deepEqual(npc.missionOrder, { type: 'secure', target: 'wild' });
});

test('4.61.31 mission arrival completes the order and sets the requested duty', () => {
  const npc = { id: 'mission-b', location: 'wild', action: 'travel', missionOrder: { type: 'recon', target: 'wild' } };
  let scheduled = false;
  const handled = processNpcMissionOrder(npc, {
    world: {}, owners: {}, events: [], now: 20_000, random: () => 0,
    territoryAdjacency: {}, canEnterTerritory: () => true, moveNpc() {},
    scheduleNext: () => { scheduled = true; }, recordAction() {}
  });
  assert.equal(handled, true);
  assert.equal(npc.missionOrder, null);
  assert.equal(npc.action, 'guard');
  assert.equal(npc.behavior, 'mission');
  assert.equal(npc.duty, 'recon');
  assert.equal(scheduled, true);
});

test('4.61.31 inaccessible mission targets cancel the order and trigger retreat', () => {
  const npc = { id: 'mission-c', faction: 'Свобода', location: 'bar', missionOrder: { target: 'wild' } };
  const handled = processNpcMissionOrder(npc, {
    world: {}, owners: {}, events: [], now: 30_000, random: () => 0,
    territoryAdjacency: { bar: ['dump'] }, canEnterTerritory: () => false,
    moveNpc() { assert.fail('must not move into forbidden territory'); },
    scheduleNext() {}, recordAction() {}
  });
  assert.equal(handled, true);
  assert.equal(npc.missionOrder, null);
  assert.equal(npc.action, 'retreat');
  assert.equal(npc.behavior, 'retreat');
});

test('4.61.31 NPC decisions delegate mission handling and checks include the new module', () => {
  const decisions = fs.readFileSync(path.join(root, 'src/systems/npc-ai-decisions.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(decisions, /require\('\.\/npc-ai-missions'\)/);
  assert.match(decisions, /processNpcMissionOrder\(/);
  assert.match(pkg.scripts.check, /npc-ai-missions\.js/);
});
