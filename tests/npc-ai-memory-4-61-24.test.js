'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { rememberNpcEvent, recordNpcInteraction, recordNpcAllyDeath, getNpcRelationship, MEMORY_LIMIT } = require('../src/systems/npc-ai-memory');

function npc(id, overrides = {}) { return { id, name: id, faction: 'Одиночки', location: 'cordon', alive: true, relationships: {}, memory: [], ...overrides }; }

test('NPC interactions update mutual relationship scores and durable encounter metadata', () => {
  const a = npc('memory-a'), b = npc('memory-b');
  assert.equal(recordNpcInteraction(a, b, 'helped', { at: 100, location: 'bar' }), true);
  assert.equal(getNpcRelationship(a, b.id), 12);
  assert.equal(getNpcRelationship(b, a.id), 12);
  assert.deepEqual(a.relationshipHistory[b.id], { encounters: 1, lastEvent: 'helped', lastAt: 100, score: 12 });
  assert.equal(a.memory[0].npcId, b.id);
  assert.equal(b.memory[0].npcId, a.id);
});

test('repeated interactions clamp scores while retaining encounter counts', () => {
  const a = npc('repeat-a'), b = npc('repeat-b');
  for (let i = 0; i < 20; i++) recordNpcInteraction(a, b, 'rescued', { at: i + 1 });
  assert.equal(getNpcRelationship(a, b.id), 100);
  assert.equal(a.relationshipHistory[b.id].encounters, 20);
});

test('personal memory remains bounded and keeps the newest events', () => {
  const a = npc('bounded');
  for (let i = 0; i < MEMORY_LIMIT + 7; i++) rememberNpcEvent(a, { type: 'test', index: i, at: i + 1 });
  assert.equal(a.memory.length, MEMORY_LIMIT);
  assert.equal(a.memory[0].index, 7);
  assert.equal(a.memory.at(-1).index, MEMORY_LIMIT + 6);
});

test('NPCs remember the killer of a known ally and become hostile toward them', () => {
  const victim = npc('victim', { squadId: 'squad-1' });
  const killer = npc('killer', { faction: 'Бандиты' });
  const witness = npc('witness', { squadId: 'squad-1' });
  const world = { npcState: { victim, killer, witness } };
  assert.equal(recordNpcAllyDeath(world, victim, killer, 500), 1);
  assert.equal(getNpcRelationship(witness, killer.id), -45);
  assert.ok(witness.memory.some(item => item.type === 'ally_killed' && item.victimId === victim.id));
});

test('invalid or self interactions do not mutate relationship state', () => {
  const a = npc('self');
  assert.equal(recordNpcInteraction(a, a, 'helped'), false);
  assert.deepEqual(a.relationships, {});
});
