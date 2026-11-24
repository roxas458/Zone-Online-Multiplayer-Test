'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {tickNpcRescue}=require('../src/systems/npc-rescue');
function world(){
 const npcs={
  patient:{id:'patient',name:'Раненый',faction:'Одиночки',role:'сталкер',generated:true,alive:true,health:18,morale:20,supplies:1,location:'dump',squadId:null},
  a:{id:'a',name:'Первый',faction:'Одиночки',generated:true,alive:true,health:90,morale:50,supplies:20,location:'cordon'},
  b:{id:'b',name:'Второй',faction:'Одиночки',generated:true,alive:true,health:85,morale:50,supplies:20,location:'cordon'}
 };
 return {npcState:npcs,npcPositions:{},npcEvents:[],npcSquads:[{id:'s1',name:'Последний рубеж',faction:'Одиночки',leaderId:'a',members:['a','b'],location:'cordon',status:'camped',route:[],routeIndex:0}]};
}
test('critically wounded isolated stalker triggers a real route-based rescue dispatch',()=>{
 const w=world(),events=tickNpcRescue(w,21000000,()=>0.5),s=w.npcSquads[0],op=w.rescueOperations[0];
 assert.equal(events[0].type,'npc_rescue_dispatched');assert.equal(op.status,'active');assert.equal(op.phase,'outbound');
 assert.equal(s.status,'travelling');assert.equal(s.route[0],'cordon');assert.equal(s.route.at(-1),'dump');assert.equal(s.rescueOperationId,op.id);
 assert.equal(w.npcState.patient.location,'dump');assert.equal(w.npcState.patient.action,'await_rescue');
});
test('rescue team stabilizes the survivor, escorts them home and records completion',()=>{
 const w=world();tickNpcRescue(w,21000000,()=>0.5);const s=w.npcSquads[0],op=w.rescueOperations[0],patient=w.npcState.patient;
 s.location='dump';s.routeIndex=s.route.length-1;s.status='scavenging';
 const pickup=tickNpcRescue(w,2100000,()=>0.5);
 assert.equal(pickup[0].type,'npc_rescue_pickup');assert.equal(op.phase,'returning');assert.ok(s.members.includes('patient'));assert.equal(patient.health,30);assert.equal(s.status,'returning');assert.equal(s.route[0],'dump');assert.equal(s.route.at(-1),'cordon');
 s.location='cordon';patient.location='cordon';s.status='camped';
 const done=tickNpcRescue(w,2200000,()=>0.5);
 assert.equal(done[0].type,'npc_rescue_completed');assert.equal(op.status,'completed');assert.equal(patient.location,'cordon');assert.equal(patient.mood,'благодарен');assert.equal(patient.health,38);assert.ok(w.npcState.a.morale>50);assert.equal(s.rescueOperationId,null);
});
test('rescue dispatch avoids rival factions and squads without enough fit members',()=>{
 const w=world();w.npcSquads[0].faction='Долг';assert.equal(tickNpcRescue(w,21000000).length,0);
 w.npcSquads[0].faction='Одиночки';w.npcState.b.health=20;assert.equal(tickNpcRescue(w,2000001).length,0);
});
test('server broadcasts rescue operations and client renders their progress',()=>{
 const root=path.join(__dirname,'..'),server=fs.readFileSync(path.join(root,'server.js'),'utf8'),client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
 assert.match(server,/tickNpcRescue\(world,now,Math\.random\)/);assert.match(server,/rescueOperations:\(world\.rescueOperations\|\|\[\]\)/);
 assert.match(client,/serverWorld\.rescueOperations=data\?\.rescueOperations/);assert.match(client,/Операции спасения/);
});
