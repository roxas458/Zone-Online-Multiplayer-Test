'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ai = require('../src/systems/npc-ai');
const territory = require('../src/systems/npc-ai-territory');
const projection = require('../src/systems/npc-ai-world-state');
const tick = require('../src/systems/npc-ai-world-tick');
const root = path.resolve(__dirname, '..');

test('4.61.31 public npc-ai entry remains a stable facade over focused subsystems', () => {
  assert.equal(typeof ai.tickNpcWorld, 'function');
  assert.equal(ai.tickNpcWorld, tick.tickNpcWorld);
  assert.equal(typeof ai.createNpcRoster, 'function');
  const facade = fs.readFileSync(path.join(root, 'src/systems/npc-ai.js'), 'utf8');
  assert.ok(facade.length < 1500, 'public facade should not contain world-tick implementation');
  assert.match(facade, /npc-ai-world-tick/);
});

test('4.61.31 squad, life-routine and destination constraints are independently testable', () => {
  const npc = { id: 'n1', squadId: 's1', lifeRoutine: { type: 'camp' }, destinationPoint: { x: 1, y: 2 } };
  const world = { npcSquads: [{ id: 's1', status: 'travelling' }] };
  assert.equal(territory.shouldHoldNpcForSquad(npc, world), true);
  assert.equal(territory.shouldHoldNpcForLifeRoutine(npc), true);
  assert.equal(territory.shouldHoldNpcForDestination(npc), true);
  world.npcSquads[0].status = 'idle';
  assert.equal(territory.shouldHoldNpcForSquad(npc, world), false);
});

test('4.61.31 territory safety sends an unassigned NPC back to a friendly sector', () => {
  const npc = { id: 'n2', faction: 'Alpha', location: 'hostile', alive: true };
  const events = [];
  let moved = null;
  const handled = territory.enforceNpcTerritorySafety(npc, {
    owners: { home: 'Alpha', hostile: 'Bravo' },
    world: {}, now: 5000, events,
    canEnterTerritory: () => false,
    nearestFriendlyLocation: () => 'home',
    moveNpc: (_npc, to) => { moved = to; },
    scheduleNext: () => {}, recordAction: () => {}, random: () => 0
  });
  assert.equal(handled, true);
  assert.equal(moved, 'home');
  assert.equal(npc.action, 'retreat');
  assert.equal(npc.duty, 'return_to_faction');
});

test('4.61.31 world projection owns NPC positions, faction base summaries and bounded event history', () => {
  const world = {
    npcState: {
      a: { id: 'a', alive: true, location: 'home', faction: 'Alpha', guardPost: true, squadId: 's1' },
      b: { id: 'b', alive: true, location: 'home', faction: 'Alpha', behavior: 'campfire', squadId: 's1' },
      c: { id: 'c', alive: false, location: 'home', faction: 'Alpha' }
    },
    npcEvents: Array.from({ length: 60 }, (_, i) => ({ i }))
  };
  projection.finalizeNpcWorldState(world, { home: 'Alpha' }, [{ type: 'new' }]);
  assert.deepEqual(world.npcPositions, { a: 'home', b: 'home' });
  assert.deepEqual(world.factionBases, [{ location: 'home', faction: 'Alpha', total: 2, guards: 1, campfire: 1, patrols: 0, squads: 1 }]);
  assert.equal(world.npcEvents.length, 60);
  assert.deepEqual(world.npcEvents.at(-1), { type: 'new' });
});

test('4.61.31 NPC world tick still finalizes positions and records emitted events', () => {
  const world = {
    npcState: {
      idle: { id: 'idle', name: 'Idle', faction: 'Alpha', role: 'сталкер', location: 'cordon', alive: true, action: 'camp', nextDecisionAt: 9999999999999, needs: { hunger: 0, thirst: 0, fatigue: 0, stress: 0 }, lastNeedsAt: 1000 }
    },
    territoryOwners: { cordon: 'Alpha' },
    npcSquads: []
  };
  const events = tick.tickNpcWorld(world, [], () => 0, 1000);
  assert.ok(Array.isArray(events));
  assert.equal(world.npcPositions.idle, 'cordon');
  assert.equal(world.factionBases[0].total, 1);
});
