'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mapData = require('../public/js/systems/map-data');
const root = path.resolve(__dirname, '..');

test('4.61.15 map data preserves local/zone scope and living NPC squad grouping', () => {
  const data = mapData.prepareMapData({ mode:'local', location:'cordon', npcs:[
    {id:'a',location:'cordon',squadId:'s1'}, {id:'b',location:'cordon',squadId:'s1'},
    {id:'c',location:'bar'}, {id:'d',location:'cordon',alive:false}
  ]});
  assert.deepEqual(data.livingNpcs.map(x=>x.id), ['a','b']);
  assert.equal(data.squadBuckets.get('s1').length, 2);
});

test('4.61.15 map data prepares all existing world marker categories without mutating source', () => {
  const input = {
    mode:'local', location:'cordon', playerId:'self',
    keyPoints:{a:{id:'a',location:'cordon'},b:{id:'b',location:'bar'}},
    battlefronts:[{id:'fight',status:'active',location:'cordon'},{id:'old',status:'ended',location:'cordon'}],
    convoys:[{id:'move',status:'moving',location:'cordon'},{id:'done',status:'arrived'}],
    mutantPacks:[{id:'m1',location:'cordon'},{id:'m2',location:'bar'}],
    anomalies:[{id:'a1',location:'cordon'},{id:'a2',location:'bar'}],
    onlinePlayers:[{id:'self',location:'cordon'},{id:'other',location:'cordon'},{id:'away',location:'bar'}],
    artifactExpeditions:[{id:'e1',status:'searching',location:'cordon'},{id:'e2',status:'ready',location:'bar'}],
    artifactSites:[{id:'site',location:'cordon',discovered:true,collected:false},{id:'hidden',location:'cordon',discovered:false}],
    stashes:[{id:'stash',location:'cordon',discovered:true,looted:false},{id:'looted',location:'cordon',discovered:true,looted:true}]
  };
  const data = mapData.prepareMapData(input);
  assert.deepEqual(data.strategicPoints.map(x=>x.id), ['a']);
  assert.deepEqual(data.activeBattles.map(x=>x.id), ['fight']);
  assert.deepEqual(data.convoys.map(x=>x.id), ['move']);
  assert.equal(input.convoys.length, 2, 'map preparation must not mutate the source convoy list');
  assert.deepEqual(data.mutantPacks.map(x=>x.id), ['m1']);
  assert.deepEqual(data.anomalies.map(x=>x.id), ['a1']);
  assert.deepEqual(data.onlinePlayers.map(x=>x.id), ['other']);
  assert.deepEqual(data.sharedArtifactSites.map(x=>x.id), ['e1']);
  assert.deepEqual(data.artifactSites.map(x=>x.id), ['site']);
  assert.deepEqual(data.caches.map(x=>x.id), ['stash']);
  assert.equal(input.onlinePlayers.length, 3);
});

test('4.61.15 local map excludes moving and ambushed convoys from other sectors', () => {
  const data = mapData.prepareMapData({ mode:'local', location:'cordon', convoys:[
    {id:'local-moving',status:'moving',location:'cordon'},
    {id:'local-ambushed',status:'ambushed',location:'cordon'},
    {id:'remote-moving',status:'moving',location:'bar'},
    {id:'remote-ambushed',status:'ambushed',location:'bar'},
    {id:'arrived-local',status:'arrived',location:'cordon'}
  ]});
  assert.deepEqual(data.convoys.map(x=>x.id), ['local-moving','local-ambushed']);
});

test('4.61.15 Zone overview keeps moving convoys from every sector', () => {
  const data = mapData.prepareMapData({ mode:'zone', convoys:[
    {id:'cordon',status:'moving',location:'cordon'},
    {id:'bar',status:'ambushed',location:'bar'},
    {id:'arrived',status:'arrived',location:'bar'}
  ]});
  assert.deepEqual(data.convoys.map(x=>x.id), ['cordon','bar']);
});

test('4.61.15 browser loads map data before map rendering and delegates preparation from renderZoneMap', () => {
  const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client = fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.ok(html.indexOf('/js/systems/map-data.js') < html.indexOf('/js/game.js'));
  assert.match(client, /const zoneMapData=window\.ZoneMapData/);
  assert.match(client, /zoneMapData\.prepareMapData\(/);
  assert.match(html, /map-data\.js\?v=4\.61\.26/);
});
