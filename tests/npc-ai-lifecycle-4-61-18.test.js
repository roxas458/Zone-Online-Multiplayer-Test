'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const roster=require('../src/systems/npc-ai-roster');
const runtime=require('../src/systems/npc-ai-runtime');
const lifecycle=require('../src/systems/npc-ai-lifecycle');
const ai=require('../src/systems/npc-ai');
const source=fs.readFileSync(path.join(root,'src/systems/npc-ai.js'),'utf8');
const tickSource=fs.readFileSync(path.join(root,'src/systems/npc-ai-world-tick.js'),'utf8');

test('4.61.31 story NPC metadata and roster creation are owned by npc-ai-roster',()=>{
  const entry=roster.createNpcRoster({sid:'cordon',wolf:'dump'},123).sid;
  assert.equal(entry.name,'Сидорович');
  assert.equal(entry.faction,'Одиночки');
  assert.equal(entry.role,'торговец');
  assert.equal(entry.nextDecisionAt,300123);
  assert.equal(ai.createNpcRoster({sid:'cordon'},123).sid.name,'Сидорович');
  assert.doesNotMatch(source,/const NPC_DISPLAY\s*=|function createNpcRoster\(/);
});

test('4.61.31 NPC scheduling, action history and travel order helpers are isolated',()=>{
  assert.equal(typeof runtime.choose,'function');
  const npc={id:'helper',name:'Helper',location:'cordon',history:[]};
  runtime.scheduleNext(npc,1000,()=>0,2,2);
  runtime.recordAction(npc,2000);
  assert.equal(npc.nextDecisionAt,121000);
  assert.equal(npc.history.length,1);
  assert.equal(runtime.moveNpc(npc,'dump',3000,[],'patrol'),true);
  assert.equal(npc.travelTo,'dump');
  assert.equal(npc.action,'travel');
});

test('4.61.31 lifecycle preparation preserves equipment defaults, dialogue cadence and dead NPC handling',()=>{
  const events=[];
  const npc={id:'lifecycle',name:'Lifecycle',role:'учёный',faction:'Учёные',location:'cordon',alive:true,health:140,morale:-5,supplies:120,needs:{hunger:0,thirst:0,fatigue:0,stress:0},lastNeedsAt:1000,dialogueCycle:-1};
  const args={world:{zoneEvents:[]},owners:{},events,now:1000,updateNpcNeeds(){},homeForFaction:()=> 'cordon',npcWorldPosition:()=>({x:10,y:20})};
  assert.equal(lifecycle.prepareNpcForTick(npc,args),true);
  assert.equal(npc.equipment.suit,'Научный комбинезон');
  assert.equal(npc.health,100);
  assert.equal(npc.morale,0);
  assert.equal(npc.supplies,100);
  assert.deepEqual([npc.x,npc.y],[10,20]);
  assert.ok(npc.dialogue);
  assert.equal(events.length,0);
  const dead={id:'dead',role:'сталкер',alive:false};
  assert.equal(lifecycle.prepareNpcForTick(dead,args),false);
  assert.ok(dead.equipment,'equipment defaults are applied before the alive check, as before');
  assert.equal(dead.dialogue,undefined);
});

test('4.61.31 NPC AI coordinator delegates roster, runtime and lifecycle responsibilities',()=>{
  assert.match(source,/require\('\.\/npc-ai-roster'\)/);
  assert.match(tickSource,/require\('\.\/npc-ai-runtime'\)/);
  assert.match(tickSource,/require\('\.\/npc-ai-lifecycle'\)/);
  assert.match(tickSource,/prepareNpcForTick\(npc,/);
  assert.doesNotMatch(source,/function moveNpc\(|function scheduleNext\(|function recordAction\(/);
});
