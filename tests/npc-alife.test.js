'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createNpcRoster,tickNpcWorld,updateNpcNeeds,npcSleepWindow}=require('../src/systems/npc-ai');

test('NPC needs are initialized safely and increase gradually over elapsed world time',()=>{
  const npc={id:'alife_test',action:'patrol',supplies:50,morale:60};
  updateNpcNeeds(npc,1000);
  assert.deepEqual(npc.needs,{hunger:0,thirst:0,fatigue:0,stress:0});
  updateNpcNeeds(npc,61000);
  assert.ok(npc.needs.hunger>0&&npc.needs.thirst>npc.needs.hunger);
  assert.ok(npc.needs.fatigue>0);
  assert.equal(npc.lastNeedsAt,61000);
});

test('NPCs use carried supplies to satisfy hunger and thirst without exceeding bounds',()=>{
  const npc={id:'supply_test',action:'guard',supplies:20,morale:70,needs:{hunger:70,thirst:72,fatigue:0,stress:0},lastNeedsAt:1000};
  updateNpcNeeds(npc,61000);
  assert.ok(npc.needs.hunger<40);
  assert.ok(npc.needs.thirst<30);
  assert.equal(npc.supplies,18);
  for(const value of Object.values(npc.needs))assert.ok(value>=0&&value<=100);
});

test('NPCs without supplies lose morale slowly when basic needs become critical',()=>{
  const npc={id:'hungry_test',action:'guard',supplies:0,morale:70,needs:{hunger:70,thirst:70,fatigue:0,stress:0},lastNeedsAt:1000};
  updateNpcNeeds(npc,301000);
  assert.ok(npc.morale<70);
});

test('night rest is deterministic per NPC and fatigue creates a persistent rest duty',()=>{
  const now=Date.UTC(2026,0,1,23,0,0);
  const a={id:'night_guard',location:'cordon',homeLocation:'cordon',baseLocation:'cordon',faction:'Одиночки',alive:true,health:100,morale:60,supplies:40,needs:{hunger:0,thirst:0,fatigue:50,stress:0},lastNeedsAt:now-60000,sleepStartHour:22,sleepEndHour:6,lastActionAt:now-60000,nextDecisionAt:now-1,action:'guard',behavior:'guard'};
  const world={npcState:{a},npcPositions:{},territoryOwners:{}};
  const events=tickNpcWorld(world,new Set(['cordon']),()=>0.99,now);
  assert.equal(a.action,'rest');
  assert.equal(a.duty,'recover');
  assert.ok(a.nextDecisionAt>now+7*60000);
  assert.ok(a.needs.fatigue<50);
  assert.ok(Array.isArray(events));
  const copy={id:'night_guard'};
  assert.equal(npcSleepWindow(copy,now),npcSleepWindow({id:'night_guard'},now));
});

test('legacy NPC roster receives default needs without changing its location or identity',()=>{
  const roster=createNpcRoster({sid:'cordon'},100);
  assert.equal(roster.sid.name,'Сидорович');
  assert.deepEqual(roster.sid.needs,{hunger:0,thirst:0,fatigue:0,stress:0});
  assert.equal(roster.sid.lastNeedsAt,100);
});
