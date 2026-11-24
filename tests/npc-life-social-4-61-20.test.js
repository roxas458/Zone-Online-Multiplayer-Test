const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tickNpcSocialEncounters } = require('../src/systems/npc-life-social');
const { tickNpcLife } = require('../src/systems/npc-life');

const now = 1_820_000_000_000;
function npc(id, overrides = {}) {
  return { id, name: id, faction: 'Одиночки', location: 'cordon', x: 500, y: 500,
    alive: true, action: 'camp', generated: false, relationships: {}, memory: [],
    lastSocialAt: 0, ...overrides };
}

test('social simulation is callable independently and records mutual encounters', () => {
  const a = npc('social-a');
  const b = npc('social-b', { x: 510, y: 510 });
  const world = { npcState: { a, b } };
  const events = tickNpcSocialEncounters(world, new Map([['cordon', [a, b]]]), now, () => 0);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'npc_social_encounter');
  assert.equal(a.relationships[b.id], 1);
  assert.equal(b.relationships[a.id], 1);
  assert.ok(a.memory.some(item => item.type === 'npc_conversation' && item.npcId === b.id));
});

test('social subsystem preserves squad formation and bounded personal memories', () => {
  const a = npc('friend-a', { generated: true, friends: ['friend-b'] });
  const b = npc('friend-b', { generated: true, friends: ['friend-a'], x: 510, y: 510 });
  const world = { npcState: { a, b }, npcSquads: [] };
  const events = tickNpcSocialEncounters(world, new Map([['cordon', [a, b]]]), now, () => 0);
  assert.equal(world.npcSquads.length, 1);
  assert.equal(a.squadId, b.squadId);
  assert.ok(events.some(event => event.type === 'npc_squad_formed'));
  assert.ok(a.memory.length <= 40 && b.memory.length <= 40);
});

test('social simulation is delegated from life routines instead of embedded in npc-life.js', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/systems/npc-life.js'), 'utf8');
  assert.match(source, /require\('\.\/npc-life-social'\)/);
  assert.match(source, /tickNpcSocialEncounters\(world, bySector, now, random\)/);
  assert.doesNotMatch(source, /Social encounters use a small spatial grid/);
});

test('life routine behavior remains available through the existing public API', () => {
  const a = npc('routine-a', { nextLifeAt: 0 });
  const events = tickNpcLife({ npcState: { a } }, now, () => 0.001);
  assert.ok(a.lifeRoutine);
  assert.ok(events.some(event => event.type === 'npc_life_departure'));
});
