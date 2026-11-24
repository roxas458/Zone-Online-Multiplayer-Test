'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { initEmission, tickEmission, emissionDamage, publicEmissionState } = require('../src/systems/emissions');

test('emission state initializes safely and preserves an existing saved cycle', () => {
  const world = {};
  const first = initEmission(world, 1000, () => 0);
  assert.equal(first.phase, 'calm');
  assert.equal(first.nextAt, 1000 + 20 * 60 * 1000);
  first.phase = 'warning'; first.cycle = 4; first.endsAt = 999999;
  assert.equal(initEmission(world, 2000).cycle, 4);
  assert.equal(world.emission.phase, 'warning');
});

test('emission progresses through warning, active, cooldown and calm on server time', () => {
  const world = { emission: { phase: 'calm', cycle: 0, startedAt: 0, endsAt: 0, nextAt: 1000, lastTransitionAt: 0 } };
  const warning = tickEmission(world, 1000, () => 0);
  assert.equal(warning.phase, 'warning');
  assert.equal(world.emission.cycle, 1);
  const active = tickEmission(world, 1000 + 3 * 60 * 1000, () => 0);
  assert.equal(active.phase, 'active');
  const cooldown = tickEmission(world, 1000 + 5 * 60 * 1000, () => 0);
  assert.equal(cooldown.phase, 'cooldown');
  const calm = tickEmission(world, 1000 + 13 * 60 * 1000, () => 0);
  assert.equal(calm.phase, 'calm');
  assert.equal(world.emission.nextAt, 1000 + 13 * 60 * 1000 + 20 * 60 * 1000);
});

test('emission damage respects shelter and bounded suit protection', () => {
  assert.deepEqual(emissionDamage(true, 0), { hp: 0, radiation: 0, stamina: 0 });
  assert.deepEqual(emissionDamage(false, 0), { hp: 12, radiation: 18, stamina: 8 });
  assert.deepEqual(emissionDamage(false, 1000), { hp: 2, radiation: 4, stamina: 8 });
});

test('public emission state exposes phase and cycle without mutable internals', () => {
  const world = { emission: { phase: 'active', cycle: 2, startedAt: 10, endsAt: 20, nextAt: 0 } };
  assert.deepEqual(publicEmissionState(world), { phase: 'active', cycle: 2, startedAt: 10, endsAt: 20, nextAt: 0, label: 'Выброс' });
});

test('legacy saves without an emission record receive a safe migration', () => {
  const world = { npcState: {}, npcPositions: {}, territoryOwners: {}, territoryControl: {}, ecosystem: {} };
  initEmission(world, 5000, () => 0.5);
  assert.equal(world.emission.phase, 'calm');
  assert.ok(world.emission.nextAt > 5000);
});


test('server and client share one emission cycle and online clients do not roll local emissions', () => {
  const fs = require('node:fs');
  const server = fs.readFileSync(require.resolve('../server'), 'utf8');
  const client = fs.readFileSync(require.resolve('../public/js/game.js'), 'utf8');
  assert.match(server, /io\.emit\('world:emission'/);
  assert.match(server, /player:survival:update/);
  assert.match(server, /s\.state\.emission = \{ \.\.\.authoritativeEmission/);
  assert.match(client, /zoneSocket\.on\('world:emission'/);
  assert.match(client, /!zoneSocket\?\.connected/);
});
