const test=require('node:test');
const assert=require('node:assert/strict');
const {tickNpcLife,ARTIFACTS}=require('../src/systems/npc-life');
const now=1_800_000_000_000;
function npc(id,overrides={}){return {id,name:id,faction:'Одиночки',role:'сталкер',location:'cordon',x:500,y:500,health:100,supplies:50,alive:true,action:'camp',behavior:'campfire',nextLifeAt:now+60000,relationships:{},...overrides};}
test('A-Life assigns a local camp/trader/scavenge routine without changing sector',()=>{
 const n=npc('a',{nextLifeAt:0});const world={npcState:{a:n}};let seq=[.001,.9,.1];
 const events=tickNpcLife(world,now,()=>seq.shift()??.9);
 assert.equal(n.location,'cordon');assert.equal(n.lifeRoutine.activity,'scavenge');assert.equal(n.lifeRoutine.phase,'outbound');assert.ok(n.destinationPoint);assert.ok(events.some(e=>e.type==='npc_life_departure'));
});
test('NPC completes an artifact search and starts returning to its camp',()=>{
 const n=npc('b',{nextLifeAt:0});const world={npcState:{b:n}};let seq=[.001,.9,.1];tickNpcLife(world,now,()=>seq.shift()??.9);
 n.x=n.destinationPoint.x;n.y=n.destinationPoint.y;n.destinationPoint=null;
 tickNpcLife(world,now+15000,()=>.1);assert.equal(n.lifeRoutine.phase,'doing');
 tickNpcLife(world,now+70000,()=>.1);assert.equal(n.lifeRoutine.phase,'returning');assert.ok(n.destinationPoint);assert.ok(ARTIFACTS.length>=5);
});
test('nearby same-faction NPCs remember a social encounter',()=>{
 const a=npc('c',{x:500,y:500,lastSocialAt:0}),b=npc('d',{x:510,y:510,lastSocialAt:0});
 const world={npcState:{c:a,d:b}};const events=tickNpcLife(world,now,()=>0);
 assert.ok(a.memory.some(m=>m.type==='npc_conversation'&&m.npcId==='d'));
 assert.ok(b.memory.some(m=>m.type==='npc_conversation'&&m.npcId==='c'));
 assert.ok(events.some(e=>e.type==='npc_social_encounter'));
});
test('A-Life does not interrupt combat or mission travel',()=>{
 const a=npc('e',{action:'combat',nextLifeAt:0}),b=npc('f',{action:'travel',missionOrder:{target:'bar'},nextLifeAt:0});
 const world={npcState:{e:a,f:b}};tickNpcLife(world,now,()=>0);
 assert.equal(a.lifeRoutine,undefined);assert.equal(b.lifeRoutine,undefined);assert.equal(a.action,'combat');assert.equal(b.action,'travel');
});
test('NPC trade routine heads toward an actual trader in the same sector',()=>{
 const visitor=npc('visitor',{nextLifeAt:0,x:500,y:500}),trader=npc('trader',{role:'торговец',x:540,y:530,nextLifeAt:now+60000});
 const world={npcState:{visitor,trader}};let seq=[.001,.1];tickNpcLife(world,now,()=>seq.shift()??.9);
 assert.equal(visitor.lifeRoutine.activity,'trade');assert.deepEqual(visitor.lifeRoutine.target,{x:540,y:530});
});
