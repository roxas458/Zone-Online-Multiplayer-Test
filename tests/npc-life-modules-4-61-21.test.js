'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tickNpcLife, ARTIFACTS } = require('../src/systems/npc-life');
const { planNpcLifeRoutine } = require('../src/systems/npc-life-planner');
const { advanceNpcLifeRoutine } = require('../src/systems/npc-life-routines');

const now = 1_830_000_000_000;
function npc(id, overrides = {}) {
  return { id, name: id, faction: 'Одиночки', role: 'сталкер', location: 'cordon', x: 500, y: 500,
    health: 100, supplies: 50, alive: true, action: 'camp', behavior: 'campfire', nextLifeAt: now + 60000,
    relationships: {}, ...overrides };
}

test('4.61.26 A-Life planner assigns a deterministic local target and civilian travel state', () => {
  const stalker = npc('planner', { nextLifeAt: 0 });
  const event = planNpcLifeRoutine(stalker, new Map([['cordon', [stalker]]]), now, () => 0.001);
  assert.equal(event.type, 'npc_life_departure');
  assert.equal(stalker.lifeRoutine.phase, 'outbound');
  assert.ok(stalker.destinationPoint);
  assert.equal(stalker.action, 'travel');
});

test('4.61.26 active routine executor handles arrival and starts activity timer', () => {
  const stalker = npc('arrival', { lifeRoutine: { activity: 'rest', phase: 'outbound', target: { x: 500, y: 500 }, home: { x: 480, y: 480 } }, destinationPoint: { x: 500, y: 500 }, action: 'travel' });
  const events = advanceNpcLifeRoutine(stalker, now, () => 0.5, new Map([['cordon', [stalker]]]));
  assert.equal(stalker.lifeRoutine.phase, 'doing');
  assert.equal(stalker.action, 'rest');
  assert.equal(events[0].type, 'npc_life_arrival');
});

test('4.61.26 existing tickNpcLife facade preserves routine completion and social integration', () => {
  const stalker = npc('facade', { nextLifeAt: 0 });
  const world = { npcState: { facade: stalker } };
  const events = tickNpcLife(world, now, () => 0.001);
  assert.ok(stalker.lifeRoutine);
  assert.ok(events.some(event => event.type === 'npc_life_departure'));
  assert.ok(Array.isArray(world.npcLifeEvents));
  assert.ok(ARTIFACTS.length >= 5);
});

test('4.61.26 npc-life entry is an orchestrator rather than containing planning and execution internals', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/systems/npc-life.js'), 'utf8');
  assert.match(source, /require\('\.\/npc-life-planner'\)/);
  assert.match(source, /require\('\.\/npc-life-routines'\)/);
  assert.doesNotMatch(source, /function pointFor\(/);
  assert.doesNotMatch(source, /routine\.phase === 'outbound'/);
  assert.doesNotMatch(source, /routine\.phase === 'doing'/);
});
