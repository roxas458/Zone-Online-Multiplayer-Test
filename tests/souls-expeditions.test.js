'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {tickSouls}=require('../src/systems/souls');

test('NPC squad raids use connected sector routes instead of teleporting members',()=>{
  const now=Date.UTC(2026,0,1,12);
  const a={id:'raid_a',name:'Первый',faction:'Одиночки',location:'cordon',alive:true,generated:true,supplies:20,health:100,morale:60,squadId:'raid_squad'};
  const b={id:'raid_b',name:'Второй',faction:'Одиночки',location:'cordon',alive:true,generated:true,supplies:20,health:100,morale:60,squadId:'raid_squad'};
  const squad={id:'raid_squad',name:'Проверка маршрута',faction:'Одиночки',leaderId:a.id,members:[a.id,b.id],location:'cordon',status:'camped',createdAt:now-3600000,lastRaidAt:now-3600000};
  const world={npcState:{[a.id]:a,[b.id]:b},npcPositions:{},npcSquads:[squad],npcMemorial:[],npcEvents:[]};
  const start=tickSouls(world,new Set(['cordon','agro','dump','bar']),()=>0.01,now);
  assert.equal(squad.status,'travelling');
  assert.equal(a.location,'cordon');
  assert.equal(b.location,'cordon');
  assert.ok(squad.route.length>=2);
  assert.equal(squad.route[0],'cordon');
  assert.ok(start.some(e=>e.type==='npc_squad_raid'));
  const step=tickSouls(world,new Set(['cordon','agro','dump','bar']),()=>0.01,now+2*60000);
  assert.equal(a.location,squad.route[1]);
  assert.equal(b.location,squad.route[1]);
  assert.ok(step.some(e=>e.type==='npc_squad_travel'));
});

test('NPC squad scavenging adds bounded supplies and then starts a return journey',()=>{
  const now=Date.UTC(2026,0,1,12);
  const a={id:'scavenge_a',name:'Первый',faction:'Одиночки',location:'agro',alive:true,generated:true,supplies:98,health:100,morale:60,squadId:'scavenge_squad'};
  const b={id:'scavenge_b',name:'Второй',faction:'Одиночки',location:'agro',alive:true,generated:true,supplies:10,health:100,morale:60,squadId:'scavenge_squad'};
  const squad={id:'scavenge_squad',name:'Искатели',faction:'Одиночки',leaderId:a.id,members:[a.id,b.id],location:'agro',status:'scavenging',route:['cordon','agro'],routeIndex:1,scavengeUntil:now-1,createdAt:now};
  const world={npcState:{[a.id]:a,[b.id]:b},npcPositions:{},npcSquads:[squad],npcMemorial:[],npcEvents:[]};
  const events=tickSouls(world,new Set(['cordon','agro','dump']),()=>0.01,now);
  assert.equal(squad.status,'returning');
  assert.equal(squad.location,'agro');
  assert.equal(a.supplies,100);
  assert.ok(b.supplies>10);
  assert.ok(events.some(e=>e.type==='npc_squad_scavenge'));
});
