'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { reconcilePlayerPosition } = require('../src/server/player-authority');
const root = path.join(__dirname, '..');

test('4.47 normal profile saves cannot teleport a player or alter server coordinates', () => {
  const player = { location: 'cordon', x: 463, y: 1777 };
  const result = reconcilePlayerPosition(player, {
    loc: 'pripyat', money: 99999999,
    worldPosition: { x: 999, y: 1999 }
  });
  assert.equal(result.location, 'cordon');
  assert.equal(result.x, 463);
  assert.equal(result.y, 1777);
  assert.equal(result.state.loc, 'cordon');
  assert.deepEqual(result.state.worldPosition, { x: 463, y: 1777 });
  assert.equal(result.state.money, 99999999);
});

test('4.47 first character creation retains faction spawn and initializes its coordinates', () => {
  const result = reconcilePlayerPosition(
    { location: 'cordon', x: 10, y: 20 },
    { loc: 'radar', worldPosition: { x: 900, y: 1900 }, visitedLocations: [] },
    { firstCharacter: true, spawnLocation: 'bar', spawnPoint: [441, 1215] }
  );
  assert.equal(result.location, 'bar');
  assert.deepEqual([result.x, result.y], [441, 1215]);
  assert.equal(result.state.loc, 'bar');
  assert.deepEqual(result.state.worldPosition, { x: 441, y: 1215 });
  assert.equal(result.state.mapCoordinateVersion, 2);
});

test('4.47 squad followers are reconciled to the squad sector without trusting client coordinates', () => {
  const result = reconcilePlayerPosition(
    { location: 'cordon', x: 463, y: 1777 },
    { loc: 'radar', worldPosition: { x: 1, y: 1 } },
    { squadLocation: 'bar' }
  );
  assert.equal(result.location, 'bar');
  assert.deepEqual(result.state.worldPosition, { x: 463, y: 1777 });
});

test('4.47 server rejects client location changes and updates coordinates on confirmed sector arrival', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /reconcilePlayerPosition\(p,s\.state/);
  assert.match(server, /player:update:rejected/);
  assert.match(server, /input\?\.location!==p\.location/);
  assert.match(server, /const arrivalPoint=SECTOR_COORDS\[step\.location\]/);
  assert.match(server, /follower\.state\.worldPosition=\{x:p\.x,y:p\.y\}/);
  assert.doesNotMatch(server, /else p\.location=input\.location/);
});
