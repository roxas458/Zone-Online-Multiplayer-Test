'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nav = require('../public/js/systems/map-navigation');
const root = path.resolve(__dirname, '..');

test('4.61.10 map module retains all 17 sector coordinates and the legacy fallback center', () => {
  assert.equal(Object.keys(nav.sectorCoords).length, 17);
  assert.deepEqual(nav.sectorCenter('cordon'), [463,1753]);
  assert.deepEqual(nav.sectorCenter('unknown-sector'), [500,1000]);
  assert.equal(nav.mapRegions.length, 17);
  assert.equal(nav.sectorLinks.length, 16);
});

test('4.61.10 local route search preserves safe, balanced and fast route modes', () => {
  const safe = nav.findLocalRoute('cordon','chaes','safe');
  const balanced = nav.findLocalRoute('cordon','chaes','balanced');
  const fast = nav.findLocalRoute('cordon','chaes','fast');
  assert.ok(Array.isArray(safe) && safe[0] === 'cordon' && safe.at(-1) === 'chaes');
  assert.ok(Array.isArray(balanced) && balanced[0] === 'cordon' && balanced.at(-1) === 'chaes');
  assert.ok(Array.isArray(fast) && fast[0] === 'cordon' && fast.at(-1) === 'chaes');
  assert.deepEqual(nav.findLocalRoute('cordon','cordon','safe'), ['cordon']);
  assert.equal(nav.findLocalRoute('cordon','not-a-sector','safe'), null);
  assert.equal(nav.findLocalRoute('cordon','chaes','safe').length >= 2, true);
});

test('4.61.10 player position migration and expedition interpolation preserve the old coordinate rules', () => {
  const state = {loc:'cordon'};
  assert.deepEqual(nav.resolvePlayerPosition(state, 1000), {x:463,y:1777});
  assert.equal(state.mapCoordinateVersion, 2);
  state.expedition = {status:'travelling',path:['cordon','dump'],index:0,startedAt:1000,nextHopAt:26000};
  const halfway = nav.resolvePlayerPosition(state, 13500);
  assert.ok(Math.abs(halfway.x - (463 + (466-463)*.5)) < 1e-9);
  assert.ok(Math.abs(halfway.y - (1753+24 + (1470-1753)*.5)) < 1e-9);
  state.expedition.nextHopAt = 500;
  const capped = nav.resolvePlayerPosition(state, 2000);
  assert.ok(Math.abs(capped.x - (463 + (466-463)*.98)) < 1e-9);
});

test('4.61.10 map viewport calculations retain local, zone and fullscreen bounds', () => {
  assert.deepEqual(nav.computeViewport({mode:'local',zoom:1,player:{x:463,y:1777}}), {x:228,y:1530,w:470,h:470});
  const zone = nav.computeViewport({mode:'zone',zoom:2,player:{x:463,y:1777}});
  assert.deepEqual(zone, {x:213,y:1000,w:500,h:1000});
  const full = nav.computeViewport({mode:'zone',zoom:1,center:{x:500,y:1000},fullscreen:true,aspectRatio:16/9});
  assert.equal(full.w, 1000);
  assert.equal(full.h, 562.5);
  assert.ok(full.y >= 0 && full.y + full.h <= 2000);
});

test('4.61.10 map click helpers preserve nearest-sector selection and local movement bounds', () => {
  assert.deepEqual(nav.nearestSector(463,1753), {id:'cordon',distance:0});
  assert.deepEqual(nav.clampLocalTarget(1000,1000,'cordon'), {x:708,y:1508});
  assert.deepEqual(nav.clampLocalTarget(-100,-100,'cordon'), {x:218,y:1508});
});

test('4.61.10 browser keeps legacy map entry points and loads navigation before game.js', () => {
  const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client = fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.ok(html.indexOf('/js/systems/map-navigation.js') < html.indexOf('/js/game.js'));
  assert.match(html,/map-navigation\.js\?v=4\.61\.17/);
  assert.match(client,/function localRoute\(from,to\)\{return zoneMapNavigation\.findLocalRoute/);
  assert.match(client,/function sectorCenter\(id\)\{return zoneMapNavigation\.sectorCenter/);
  assert.match(client,/function playerWorldPosition\(\)\{return zoneMapNavigation\.resolvePlayerPosition/);
  assert.match(client,/zoneMapNavigation\.computeViewport/);
  assert.match(client,/zoneMapNavigation\.clampLocalTarget/);
});
