const test=require('node:test');
const assert=require('node:assert/strict');
const {INTERACTION_RADIUS,COMBAT_RADIUS,npcWorldPosition,inRange}=require('../src/systems/proximity');
const {createNpcRoster,interactWithNpc}=require('../src/systems/npc-ai');
test('NPC interaction uses map-space talk radius and rejects distant players',()=>{
 const npc=createNpcRoster({sid:'cordon'},100).sid, p=npcWorldPosition(npc);
 assert.equal(interactWithNpc(npc,{id:'p',location:'cordon',position:{x:p.x+INTERACTION_RADIUS+1,y:p.y}},'greet',200).ok,false);
 assert.equal(interactWithNpc(npc,{id:'p',location:'cordon',position:{x:p.x+5,y:p.y}},'greet',200).ok,true);
});
test('NPC interaction and combat radii are compact, with combat slightly wider',()=>{
 assert.equal(INTERACTION_RADIUS,8);
 assert.equal(COMBAT_RADIUS,18);
 assert.equal(require('../src/systems/proximity').NPC_SKIRMISH_RADIUS,48);
 assert.ok(COMBAT_RADIUS>INTERACTION_RADIUS);
 assert.equal(inRange({x:0,y:0},{x:COMBAT_RADIUS,y:0},COMBAT_RADIUS),true);
 assert.equal(inRange({x:0,y:0},{x:COMBAT_RADIUS+1,y:0},COMBAT_RADIUS),false);
});
const {tickNpcWorld}=require('../src/systems/npc-ai');
test('hostile NPCs in the same local radius enter a skirmish and take damage',()=>{
 const world={territoryOwners:{},npcState:{
  a:{id:'a',name:'Разведчик А',faction:'Монолит',location:'cordon',x:460,y:1750,alive:true,health:100,action:'guard',nextDecisionAt:Date.now()+60000},
  b:{id:'b',name:'Разведчик Б',faction:'Одиночки',location:'cordon',x:460,y:1750,alive:true,health:100,action:'guard',nextDecisionAt:Date.now()+60000}
 }};
 const events=tickNpcWorld(world,[],()=>0,Date.now());
 assert.ok(events.some(e=>e.type==='npc_skirmish'));
 assert.ok(world.npcState.a.health<100&&world.npcState.b.health<100);
});

test('NPCs receive authoritative map coordinates and make more frequent patrol decisions',()=>{
 const {tickNpcWorld}=require('../src/systems/npc-ai');
 const now=Date.now();
 const world={territoryOwners:{},npcState:{walker:{id:'walker',name:'Патрульный',faction:'Одиночки',location:'cordon',alive:true,health:100,action:'camp',nextDecisionAt:now-1000}}};
 tickNpcWorld(world,[],()=>0.99,now);
 const npc=world.npcState.walker;
 assert.ok(Number.isFinite(npc.x)&&Number.isFinite(npc.y));
 assert.ok(npc.destinationPoint||npc.action==='travel'||npc.action==='patrol');
 assert.ok(npc.nextDecisionAt<=now+4*60000);
});

test('mutant packs can attack nearby NPCs with bounded health damage',()=>{
 const {tickEcosystem}=require('../src/systems/ecosystem');
 const world={npcState:{victim:{id:'victim',name:'Патрульный',location:'cordon',alive:true,health:100}}};
 const eco=require('../src/systems/ecosystem').initEcosystem(world);
 eco.mutantPacks=[{id:'pack-test',species:'псевдособака',location:'cordon',count:4,aggression:70,health:100}];
 const events=tickEcosystem(world,()=>0,Date.now());
 assert.ok(events.some(e=>e.type==='mutant_npc_combat'));
 assert.ok(world.npcState.victim.health<100);
});
