'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {tickEcosystem,initEcosystem}=require('../src/systems/ecosystem');
function sequenceRandom(){let i=0;const values=[.9,.9,.1,0,0,0];return ()=>values[i++]??.9;}
function fixture({health=100,supplies=20,secondHealth=100}={}){
 const now=Date.UTC(2026,0,1,12);
 const a={id:'enc_a',name:'Разведчик',faction:'Одиночки',role:'разведчик',location:'cordon',alive:true,health,supplies,action:'travel',needs:{stress:0}};
 const b={id:'enc_b',name:'Охотник',faction:'Одиночки',role:'охотник',location:'cordon',alive:true,health:secondHealth,supplies,action:'travel',needs:{stress:0}};
 const squad={id:'enc_squad',name:'Проверка',faction:'Одиночки',members:[a.id,b.id],location:'cordon',status:'travelling',route:['cordon','agro','dump'],routeIndex:0,nextMoveAt:now+60000};
 const world={npcState:{[a.id]:a,[b.id]:b},npcPositions:{[a.id]:'cordon',[b.id]:'cordon'},npcSquads:[squad],ecosystem:{mutantPacks:[{id:'test_pack',species:'псевдособака',location:'cordon',count:4,aggression:80,health:100}],anomalies:[],bases:{},markets:{},clans:{},events:[],revision:1}};
 return {world,a,b,squad,pack:world.ecosystem.mutantPacks[0],now};
}
test('mutant pack engages an expedition squad and both sides take bounded damage',()=>{
 const {world,a,b,pack,now}=fixture();
 const events=tickEcosystem(world,sequenceRandom(),now);
 assert.ok(events.some(e=>e.type==='mutant_squad_encounter'));
 assert.ok(a.health<100||b.health<100);
 assert.ok(pack.health<100);
 assert.ok(a.health>=0&&b.health>=0&&pack.health>=0);
});
test('squad member uses supplies to help an injured companion during an encounter',()=>{
 const {world,a,b,now}=fixture({health:20,supplies:30});
 const events=tickEcosystem(world,sequenceRandom(),now);
 assert.ok(events.some(e=>e.type==='mutant_squad_rescue'));
 assert.ok(a.health>15);
 assert.ok(b.supplies<30);
});
test('critically injured expedition squad retreats along its already travelled route',()=>{
 const {world,a,b,squad,now}=fixture({health:12,supplies:0,secondHealth:100});
 a.supplies=0;b.supplies=0;squad.routeIndex=1;squad.location='agro';a.location='agro';b.location='agro';
 world.ecosystem.mutantPacks[0].location='agro';
 const events=tickEcosystem(world,sequenceRandom(),now);
 assert.ok(events.some(e=>e.type==='mutant_squad_encounter'));
 assert.ok(events.some(e=>e.type==='mutant_squad_retreat'));
 assert.equal(squad.status,'returning');
 assert.equal(squad.retreating,true);
 assert.deepEqual(squad.route,['agro','cordon']);
 assert.equal(a.action,'retreat');
});
