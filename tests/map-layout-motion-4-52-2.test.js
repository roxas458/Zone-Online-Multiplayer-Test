'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const {tickNpcMovement}=require('../src/systems/npc-ai');

test('4.53 NPC sector changes when coordinates cross the connected-sector boundary',()=>{
  const world={npcState:{stalker:{id:'stalker',alive:true,location:'cordon',x:463,y:1753,action:'travel',destinationPoint:{x:243,y:1528},travelTo:'agro'}}};
  const first=tickNpcMovement(world,1000,8);
  assert.equal(first.length,1);
  assert.equal(world.npcState.stalker.location,'cordon');
  let crossed=false;
  for(let i=2;i<80;i++){tickNpcMovement(world,1000+i*1000,8);if(world.npcState.stalker.location==='agro'){crossed=true;break;}}
  assert.equal(crossed,true);
  assert.equal(world.npcState.stalker.travelTo,'agro');
  assert.ok(world.npcState.stalker.y>1528);
});

test('4.52.2 idle NPCs receive short local patrols instead of remaining permanently stationary',()=>{
  const now=500000,world={npcState:{wanderer:{id:'wanderer',alive:true,location:'cordon',x:463,y:1753,action:'camp',role:'сталкер',nextRoamAt:now-1}}};
  const moved=tickNpcMovement(world,now,8);
  assert.equal(moved.length,1);
  assert.ok(world.npcState.wanderer.destinationPoint);
  assert.equal(world.npcState.wanderer.action,'travel');
  assert.notEqual(world.npcState.wanderer.x,463);
});

test('4.52.2 key objects use deterministic spread positions and are rendered on the Zone overview',()=>{
  const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.match(client,/function keyPointMapPosition\(/);
  assert.match(client,/zone-point-layout/);
  assert.match(client,/Math\.hypot\(p\.x-q\.x,p\.y-q\.y\)>=38/);
  assert.match(client,/zoneMapMode==='zone'\|\|point\.location===g\.loc/);
  assert.match(client,/const q=keyPointMapPosition\(point,i\)/);
});

test('4.52.2 header map button opens the fullscreen map and fullscreen canvas hides PDA side panels',()=>{
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'public/css/game.css'),'utf8');
  assert.match(html,/class="header-map-trigger"[^>]*onclick="openZoneMapFullscreen\(\)"/);
  assert.match(client,/function openZoneMapFullscreen\(\)/);
  assert.match(css,/#zoneMapFrame:fullscreen \.map-intel-shell[^}]*display:none/);
});

test('4.52.2 server streams compact NPC motion updates separately from strategic decisions',()=>{
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  const ai=fs.readFileSync(path.join(root,'src/systems/npc-ai.js'),'utf8');
  assert.match(server,/tickNpcMovement\(world,Date\.now\(\),2\.5\)/);
  assert.match(server,/world:npc-motion/);
  assert.match(ai,/function tickNpcMovement\(/);
  assert.match(server,/destinationPoint','travelTo/);
});
