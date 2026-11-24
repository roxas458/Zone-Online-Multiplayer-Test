const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const survival = require('../public/js/survival');
const root = path.resolve(__dirname, '..');

test('radiation exposure rules are part of the shared survival module and wired to the browser client', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('/js/survival.js') < html.indexOf('/js/game.js'));
  assert.match(client, /ZoneSurvival\.radiationTick\(g,g\.loc/);
  assert.match(client, /ZoneSurvival\.radiationLevel\(g\.radiation\)/);
});

test('radiation tick preserves sector exposure rates and protection windows', () => {
  const player = { radiation: 10, hp: 100, stamina: 100, radiationProtectionUntil: 0 };
  const result = survival.radiationTick(player, 'chaes', 1000, 1, 1);
  assert.equal(result.exposure, 1.8);
  assert.ok(Math.abs(player.radiation - 11.8) < 1e-9);
  player.radiationProtectionUntil = 5000;
  const protectedResult = survival.radiationTick(player, 'chaes', 2000, 0, 0);
  assert.equal(protectedResult.protected, true);
  assert.equal(protectedResult.exposure, 0);
  assert.ok(Math.abs(player.radiation - 11.8) < 1e-9);
});

test('high radiation applies bounded health and stamina penalties without killing the player', () => {
  const player = { radiation: 69, hp: 1, stamina: 1, radiationProtectionUntil: 0 };
  const result = survival.radiationTick(player, 'chaes', 1000, 0, 0);
  assert.equal(result.healthDamage, 1);
  assert.equal(result.staminaDamage, 2);
  assert.equal(player.hp, 1);
  assert.equal(player.stamina, 0);
  assert.equal(player.radiation, 70.8);
});

test('safe sectors do not add radiation and levels remain clamped', () => {
  const player = { radiation: 100, hp: 100, stamina: 100 };
  const result = survival.radiationTick(player, 'cordon', 1000, 0, 0);
  assert.equal(result.exposure, 0);
  assert.equal(survival.radiationLevel(150), 100);
  assert.equal(survival.radiationLevel(-10), 0);
});
