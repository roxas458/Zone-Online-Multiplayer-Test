'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const interaction = require('../public/js/systems/map-interaction');
const navigation = require('../public/js/systems/map-navigation');

global.ZoneMapNavigation = navigation;

test('4.61.52 map drag begins only for primary pointer and tracks threshold', () => {
  const start = interaction.beginPointerDrag({ button: 0, pointerId: 3, clientX: 10, clientY: 20 }, { x: 0, y: 0, w: 100, h: 200 });
  assert.ok(start);
  assert.equal(interaction.beginPointerDrag({ button: 2 }, {}), null);
  const moved = interaction.movePointerDrag(start, { pointerId: 3, clientX: 20, clientY: 30 }, { width: 100, height: 200 });
  assert.equal(moved.state.moved, true);
  assert.deepEqual(moved.center, { x: 40, y: 90 });
  assert.equal(interaction.finishPointerDrag(moved.state, { pointerId: 3 }).moved, true);
});

test('4.61.52 map drag ignores unrelated pointers and preserves click gestures', () => {
  const state = interaction.beginPointerDrag({ pointerId: 1, clientX: 5, clientY: 5 }, { x: 0, y: 0, w: 100, h: 100 });
  assert.equal(interaction.movePointerDrag(state, { pointerId: 2, clientX: 80, clientY: 80 }, { width: 100, height: 100 }).matched, false);
  assert.deepEqual(interaction.finishPointerDrag(state, { pointerId: 1 }), { matched: true, moved: false });
});

test('4.61.52 map click resolves sector selection and clamps local movement targets', () => {
  const sector = interaction.resolveMapClick({ x: 503, y: 104, mode: 'zone', currentLocation: 'cordon', playerPosition: { x: 500, y: 1000 } });
  assert.equal(sector.type, 'sector');
  assert.equal(sector.sectorId, 'chaes');
  const move = interaction.resolveMapClick({ x: 999, y: 1999, mode: 'local', currentLocation: 'cordon', playerPosition: { x: 463, y: 1777 } });
  assert.equal(move.type, 'move');
  assert.ok(Math.abs(move.target.x - 463) <= 245);
  assert.ok(Math.abs(move.target.y - 1753) <= 245);
});

test('4.61.52 map click detects a click at the current position', () => {
  const result = interaction.resolveMapClick({ x: 463, y: 1777, mode: 'local', currentLocation: 'cordon', playerPosition: { x: 463, y: 1777 } });
  assert.equal(result.type, 'same-position');
});

test('4.61.52 expedition planning validates route, leadership and stamina without side effects', () => {
  assert.equal(interaction.planExpedition({ from: 'cordon', to: 'cordon' }).reason, 'already-there');
  assert.equal(interaction.planExpedition({ from: 'cordon', to: 'unknown-sector', stamina: 100 }).reason, 'no-route');
  assert.equal(interaction.planExpedition({ from: 'cordon', to: 'dump', stamina: 100, squadActive: true, isSquadLeader: false }).reason, 'not-squad-leader');
  const low = interaction.planExpedition({ from: 'cordon', to: 'dump', stamina: 0 });
  assert.equal(low.reason, 'insufficient-stamina');
  assert.deepEqual(low.path, ['cordon', 'dump']);
  const valid = interaction.planExpedition({ from: 'cordon', to: 'dump', stamina: 20, mode: 'safe' });
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.path, ['cordon', 'dump']);
});

test('4.61.52 browser loads map interaction before game and delegates map decisions', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(__dirname, '../public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('/js/systems/map-interaction.js') < html.indexOf('/js/game.js'));
  assert.match(game, /zoneMapInteraction\.beginPointerDrag/);
  assert.match(game, /zoneMapInteraction\.resolveMapClick/);
  assert.match(game, /zoneMapInteraction\.planExpedition/);
});
