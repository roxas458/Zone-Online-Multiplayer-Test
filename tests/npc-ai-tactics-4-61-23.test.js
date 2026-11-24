'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tactics = require('../src/systems/npc-ai-tactics');
const root = path.resolve(__dirname, '..');

function tacticalContext(overrides = {}) {
  const calls = { scheduled: [], recorded: [], moved: [] };
  return {
    calls,
    context: {
      world: { npcState: {} }, owners: { cordon: 'Одиночки' }, events: [], now: 100_000,
      random: () => 0, isHostileFaction: (a, b) => a !== b,
      nearestFriendlyLocation: () => 'cordon',
      moveNpc: (...args) => calls.moved.push(args),
      scheduleNext: (...args) => calls.scheduled.push(args),
      recordAction: (...args) => calls.recorded.push(args),
      ...overrides
    }
  };
}

test('4.61.52 tactical threat search selects the nearest hostile in the same sector', () => {
  const npc = { id: 'scout', faction: 'Одиночки', location: 'cordon', x: 100, y: 100 };
  const near = { id: 'near', faction: 'Бандиты', location: 'cordon', x: 210, y: 100 };
  const far = { id: 'far', faction: 'Бандиты', location: 'cordon', x: 250, y: 100 };
  const otherSector = { id: 'elsewhere', faction: 'Бандиты', location: 'bar', x: 105, y: 100 };
  const result = tactics.findNearbyThreat(npc, { npcState: { near, far, otherSector } }, (a, b) => a !== b);
  assert.equal(result.npc.id, 'near');
  assert.equal(result.distance, 110);
});

test('4.61.52 wounded NPC withdraws to a friendly sector after detecting a threat', () => {
  const npc = { id: 'wounded', name: 'Раненый', faction: 'Одиночки', location: 'bar', x: 400, y: 400, health: 20 };
  const enemy = { id: 'enemy', faction: 'Бандиты', location: 'bar', x: 500, y: 400, health: 100 };
  const { context, calls } = tacticalContext({ world: { npcState: { wounded: npc, enemy } }, nearestFriendlyLocation: () => 'cordon' });
  assert.equal(tactics.reactToNpcThreat(npc, context), true);
  assert.equal(npc.action, 'retreat');
  assert.equal(npc.behavior, 'threat_retreat');
  assert.equal(calls.moved[0][1], 'cordon');
  assert.equal(context.events[0].type, 'npc_threat_detected');
});

test('4.61.52 healthy NPC takes cover away from the nearest hostile', () => {
  const npc = { id: 'guard', name: 'Боец', faction: 'Долг', location: 'bar', x: 400, y: 400, health: 90 };
  const enemy = { id: 'enemy', faction: 'Бандиты', location: 'bar', x: 500, y: 400, health: 100 };
  const { context, calls } = tacticalContext({ world: { npcState: { guard: npc, enemy } } });
  assert.equal(tactics.reactToNpcThreat(npc, context), true);
  assert.equal(npc.action, 'seek_cover');
  assert.ok(npc.destinationPoint.x < npc.x);
  assert.equal(calls.moved.length, 0);
  assert.equal(calls.scheduled.length, 1);
});

test('4.61.52 reconnaissance decision records a report and guard policy assigns territory duty', () => {
  const scout = { id: 'scout', name: 'Разведчик', location: 'cordon', squadType: 'разведка' };
  const { context } = tacticalContext();
  assert.equal(tactics.applyNpcTacticalDecision(scout, context, 0.1, 'special'), true);
  assert.equal(scout.behavior, 'recon');
  assert.equal(scout.duty, 'forward_recon');
  assert.equal(context.events[0].type, 'npc_recon_report');

  const guard = { id: 'guard', location: 'cordon', faction: 'Одиночки' };
  assert.equal(tactics.applyNpcTacticalDecision(guard, context, 0.3, 'guard'), true);
  assert.equal(guard.guardPost, true);
  assert.equal(guard.duty, 'territory_guard');
  assert.equal(guard.guardSector, 'cordon');
});

test('4.61.52 sector patrol creates a local destination or an authorized sector move', () => {
  const npc = { id: 'patroller', faction: 'Одиночки', location: 'cordon' };
  const { context, calls } = tacticalContext({
    territoryAdjacency: { cordon: ['agro'] },
    choose: list => list[0],
    random: () => 0
  });
  const result = tactics.startNpcSectorPatrol(npc, {
    ...context, territoryAdjacency: context.territoryAdjacency || { cordon: ['agro'] },
    choose: list => list[0], canEnterTerritory: () => false,
    moveNpc: (...args) => calls.moved.push(args)
  });
  assert.equal(result, 'local');
  assert.ok(npc.destinationPoint);
  assert.equal(npc.duty, 'sector_patrol');
});

test('4.61.52 world tick delegates threat response and package checks include tactical policy', () => {
  const tick = fs.readFileSync(path.join(root, 'src/systems/npc-ai-world-tick.js'), 'utf8');
  const decisions = fs.readFileSync(path.join(root, 'src/systems/npc-ai-behaviors.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(tick, /require\('\.\/npc-ai-tactics'\)/);
  assert.match(tick, /reactToNpcThreat\(/);
  assert.match(decisions, /applyNpcTacticalDecision\(/);
  assert.match(decisions, /startNpcSectorPatrol\(/);
  assert.match(pkg.scripts.check, /npc-ai-tactics\.js/);
});
