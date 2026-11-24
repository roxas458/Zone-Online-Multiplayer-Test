'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createMoveOrder,advanceMoveOrder}=require('../src/systems/player-orders');
const {resolveSectorAtPosition}=require('../src/systems/sector-position');
const {tickMutantMovement,initEcosystem}=require('../src/systems/ecosystem');
const {syncNpcGroups}=require('../src/systems/souls');
const {tickNpcProximityCombat}=require('../src/systems/npc-ai');
const root=path.resolve(__dirname,'..');

test('cancel control sends the expedition cancellation event, not only local movement cancellation',()=>{
 const js=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
 assert.match(js,/const cancellingExpedition=!!g\.expedition/);assert.match(js,/cancellingExpedition\?'player:expedition-cancel':'player:move-cancel'/);
 assert.match(fs.readFileSync(path.join(root,'server.js'),'utf8'),/socket\.on\('player:expedition-cancel'/);
});

test('cancelled expedition is invalidated by a monotonically increasing server token',()=>{
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(server,/p\.expeditionToken=\(Number\(p\.expeditionToken\)\|\|0\)\+1;p\.expedition=null/);
 assert.match(server,/p\.expedition\.id!==activeExpeditionId\|\|p\.expeditionToken!==activeExpeditionToken/);
});

test('player location changes automatically after crossing into an adjacent sector',()=>{
 assert.equal(resolveSectorAtPosition('dump',{x:466,y:1330}),'bar');
 const p={location:'dump',x:466,y:1470,moveOrder:null};
 const order=createMoveOrder(p,{x:466,y:1330},1000,5);assert.equal(order.ok,true);p.moveOrder=order.order;
 let result;for(let i=0;i<40&&p.moveOrder;i++)result=advanceMoveOrder(p,1);
 assert.equal(p.location,'bar');assert.ok(result.moved);
});

test('NPC squad members are reconciled to their canonical squad sector',()=>{
 const world={npcState:{a:{id:'a',alive:true,location:'army',x:500,y:1046},b:{id:'b',alive:true,location:'cordon',x:463,y:1753}},npcSquads:[{id:'s1',name:'Тест',faction:'Бандиты',location:'dark',members:['a','b']}]};
 syncNpcGroups(world);assert.equal(world.npcState.a.location,'dark');assert.equal(world.npcState.b.location,'dark');assert.equal(world.npcGroups[0].location,'dark');assert.notEqual(world.npcState.a.y,1046);
});

test('mutant packs receive coordinates and move smoothly within their sector',()=>{
 const world={ecosystem:{mutantPacks:[{id:'p1',species:'плоть',location:'dump',count:3,aggression:50,health:100}],anomalies:[],bases:{},markets:{},clans:{},events:[],revision:1}};
 initEcosystem(world);const before={x:world.ecosystem.mutantPacks[0].x,y:world.ecosystem.mutantPacks[0].y};
 const updates=tickMutantMovement(world,Date.now()+60000,4);const moved=updates.find(x=>x.id==='p1');assert.equal(updates.length,54);assert.ok(Number.isFinite(moved.x));assert.ok(Math.hypot(moved.x-before.x,moved.y-before.y)>0);
});

test('hostile NPCs inside detection radius automatically begin an engagement',()=>{
 const world={diplomacy:{},npcState:{a:{id:'a',name:'Боец А',faction:'Одиночки',location:'dump',x:100,y:100,health:100,alive:true},b:{id:'b',name:'Боец Б',faction:'Монолит',location:'dump',x:110,y:100,health:100,alive:true}}};
 const events=tickNpcProximityCombat(world,100000,()=>0.5);assert.equal(events.length,1);assert.equal(events[0].type,'npc_skirmish');assert.equal(world.npcState.a.action,'combat');
});

test('map client receives authoritative mutant coordinates and combat engagement notifications',()=>{
 const js=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
 assert.match(js,/zoneSocket\.on\('world:mutant-motion'/);assert.match(js,/zoneSocket\.on\('npc:combat-engaged'/);
});


test('server runs player-vs-hostile-NPC proximity combat on a short cadence',()=>{
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(server,/setInterval\(\(\)=>\{[\s\S]*?proximityCombatRunning/);
 assert.match(server,/isHostileFaction\(player\.faction,npc\.faction,world\.diplomacy\)/);
 assert.match(server,/inRange\(\{x:player\.x,y:player\.y\},position,COMBAT_RADIUS\)/);
 assert.match(server,/npc:combat-engaged/);
});
