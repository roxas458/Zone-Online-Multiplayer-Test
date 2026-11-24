'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {tickNpcAftermath,lootCorpse}=require('../src/systems/npc-aftermath');
function baseWorld(){return {npcState:{dead:{id:'dead',name:'Проводник',faction:'Одиночки',role:'разведчик',generated:true,alive:false,health:0,location:'cordon',diedAt:1000,deathCause:'погиб в бою',x:463,y:1753,friends:['friend']},friend:{id:'friend',name:'Напарник',faction:'Одиночки',generated:true,alive:true,health:70,location:'cordon',supplies:10,action:'camp',needs:{stress:2}}},npcSquads:[{id:'s1',members:['dead','friend']}]};}
test('death creates a timed corpse, faction notice and companion memory',()=>{const w=baseWorld();const events=tickNpcAftermath(w,2000);assert.equal(w.npcCorpses.length,1);assert.equal(w.npcCorpses[0].npcId,'dead');assert.equal(w.factionNotices.length,1);assert.equal(w.npcState.friend.memory[0].type,'companion_lost');assert.equal(w.npcState.friend.needs.stress,22);assert.ok(events.some(e=>e.type==='npc_casualty_report'));assert.equal(tickNpcAftermath(w,3000).length,0);assert.equal(w.npcCorpses.length,1);});
test('injured NPC recovers at a safe camp while spending supplies',()=>{const w=baseWorld();const n=w.npcState.friend;n.health=62;n.supplies=8;n.lastRecoveryAt=0;const events=tickNpcAftermath(w,600000);assert.equal(n.health,67);assert.equal(n.supplies,6);assert.ok(events.some(e=>e.type==='npc_injury_recovery'));});
test('corpse loot requires the same sector and close range, then transfers items once',()=>{const w=baseWorld();tickNpcAftermath(w,2000);const corpse=w.npcCorpses[0];const far={id:'p',location:'cordon',x:900,y:1900,state:{money:0,items:[]}};assert.equal(lootCorpse(w,far,corpse.id,3000).ok,false);const wrong={...far,location:'dump',x:463,y:1753};assert.equal(lootCorpse(w,wrong,corpse.id,3000).ok,false);const player={id:'p',location:'cordon',x:463,y:1753,state:{money:0,items:[]}};const result=lootCorpse(w,player,corpse.id,3000);assert.equal(result.ok,true);assert.ok(result.money>0);assert.ok(player.state.money>0);assert.ok(player.state.items.length>=0);assert.equal(w.npcCorpses.length,0);assert.equal(lootCorpse(w,player,corpse.id,4000).ok,false);});
test('expired corpses are removed and cannot be looted',()=>{const w=baseWorld();tickNpcAftermath(w,2000);const id=w.npcCorpses[0].id;tickNpcAftermath(w,3000+46*60*1000);assert.equal(w.npcCorpses.length,0);assert.equal(lootCorpse(w,{id:'p',location:'cordon',x:463,y:1753,state:{}},id,3000+46*60*1000).ok,false);});
test('server exposes corpse loot with authoritative location/range checks and client has a recovery panel',()=>{
 const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
 assert.match(server,/socket\.on\('npc:corpse:loot'/);assert.match(server,/lootCorpse\(world,p,String\(input\?\.corpseId/);assert.match(html,/id="corpseRecoveryList"/);assert.match(client,/function lootNpcCorpse\(/);assert.match(client,/npc:corpse:loot:result/);
});

test('a squad medic treats a seriously injured companion at a safe camp',()=>{
 const w=baseWorld();const patient=w.npcState.friend;patient.health=40;patient.supplies=8;patient.action='camp';
 const medic={id:'medic',name:'Медик',alive:true,generated:true,health:90,supplies:8,location:'cordon',action:'camp'};w.npcState.medic=medic;w.npcSquads[0].members.push('medic');
 const events=tickNpcAftermath(w,600000);
 assert.equal(patient.health,52);assert.equal(patient.supplies,4);assert.equal(medic.supplies,2);
 assert.ok(events.some(e=>e.type==='npc_field_treatment'&&e.medicId==='medic'));
});

test('critically injured active squad reverses its travelled route for medical evacuation',()=>{
 const w=baseWorld();const patient=w.npcState.friend;patient.health=15;patient.action='travel';
 const squad=w.npcSquads[0];squad.status='travelling';squad.location='dump';squad.route=['cordon','dump','darkhollow'];squad.routeIndex=1;
 const events=tickNpcAftermath(w,900000);
 assert.equal(squad.status,'returning');assert.deepEqual(squad.route,['dump','cordon']);assert.equal(squad.routeIndex,0);
 assert.equal(squad.medicalEvacuation.patientId,'friend');assert.ok(events.some(e=>e.type==='npc_medical_evacuation'));
});
