const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {tickNpcMovement,tickNpcProximityCombat}=require('../src/systems/npc-ai');
const {tickNpcLife}=require('../src/systems/npc-life');
const serverSource=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const {SECTOR_COORDS}=require('../src/systems/proximity');
const now=1_810_000_000_000;
function npc(id,overrides={}){return {id,name:id,faction:'Одиночки',role:'сталкер',location:'cordon',x:500,y:500,health:100,alive:true,action:'travel',behavior:'patrol',destinationPoint:{x:600,y:500},...overrides};}
test('NPC movement uses the same 2.5 map-units-per-second speed as the player',()=>{
 const n=npc('slow');const world={npcState:{slow:n}};const updates=tickNpcMovement(world,now,2.5);
 assert.equal(n.x,502.5);assert.equal(updates.length,1);
});
test('NPC movement defaults to player speed when caller omits speed',()=>{
 const n=npc('default');tickNpcMovement({npcState:{default:n}},now);
 assert.equal(n.x,502.5);
});
test('nearby hostile NPCs still trigger a skirmish with spatial indexing',()=>{
 const a=npc('a',{faction:'Долг',x:500,y:500,destinationPoint:null,lastSkirmishAt:0});
 const b=npc('b',{faction:'Свобода',x:520,y:520,destinationPoint:null,lastSkirmishAt:0});
 const events=tickNpcProximityCombat({npcState:{a,b},diplomacy:{'Долг':{'Свобода':-60}}},now,()=>0);
 assert.equal(events.length,1);assert.equal(events[0].type,'npc_skirmish');
});
test('key strategic objects expose an explicit approach action and smaller markers',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/js/game.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../public/css/game.css'),'utf8');
 assert.match(js,/function approachKeyPoint\(id\)/);
 assert.match(js,/Подойти к объекту/);
 assert.match(js,/pendingKeyPointApproach/);
 assert.match(js,/marker-keypoint[\s\S]{0,500}r="6"/);
 assert.match(css,/\.marker-keypoint text\{[^}]*font-size:9px/);
});
test('NPC marker updates avoid per-frame animation and per-NPC DOM queries',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/js/game.js'),'utf8');
 const start=js.indexOf('function animateNpcMotion(payload)');
 const end=js.indexOf('function npcRoutePoints(n)',start);
 const body=js.slice(start,end);
 assert.match(body,/npcMarkerElements\.get/);
 assert.doesNotMatch(body,/requestAnimationFrame/);
 assert.doesNotMatch(body,/document\.querySelector\(/);
});
test('cancelled or replaced expeditions clear pending strategic-object travel intent',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/js/game.js'),'utf8');
 assert.match(js,/if\(data\?\.cancelled\)\{pendingKeyPointApproach=null/);
 assert.match(js,/function startExpedition\(\)\{if\(pendingKeyPointApproach&&!preservePendingKeyPointApproach\)pendingKeyPointApproach=null/);
});

test('nearby known NPCs can form a persistent small squad without teleporting',()=>{
 const a=npc('friend-a',{generated:true,action:'camp',friends:['friend-b'],nextLifeAt:now+60000,lastSocialAt:0});
 const b=npc('friend-b',{generated:true,action:'camp',friends:['friend-a'],nextLifeAt:now+60000,lastSocialAt:0,x:510,y:510});
 const world={npcState:{'friend-a':a,'friend-b':b},npcSquads:[]};
 const events=tickNpcLife(world,now,()=>0);
 assert.ok(a.squadId);assert.equal(a.squadId,b.squadId);assert.equal(world.npcSquads[0].members.length,2);
 assert.ok(events.some(e=>e.type==='npc_squad_formed'));
 assert.equal(world.npcSquads[0].location,'cordon');
});
test('NPCs share recent artifact rumours during a social encounter',()=>{
 const a=npc('rumour-a',{action:'camp',nextLifeAt:now+60000,lastSocialAt:0,memory:[{type:'artifact_found',name:'Медуза',location:'dump',at:now-1000}]});
 const b=npc('rumour-b',{action:'camp',nextLifeAt:now+60000,lastSocialAt:0,x:510,y:510});
 const events=tickNpcLife({npcState:{'rumour-a':a,'rumour-b':b}},now,()=>0);
 assert.ok(b.memory.some(m=>m.type==='rumor'&&m.name==='Медуза'));
 assert.ok(events.some(e=>e.type==='npc_rumor_shared'));
});
test('non-hostile NPCs from different factions can have road encounters',()=>{
 const a=npc('road-a',{faction:'Одиночки',action:'camp',nextLifeAt:now+60000,lastSocialAt:0});
 const b=npc('road-b',{faction:'Учёные',action:'camp',nextLifeAt:now+60000,lastSocialAt:0,x:510,y:510});
 const events=tickNpcLife({npcState:{'road-a':a,'road-b':b},diplomacy:{'Одиночки':{'Учёные':0}}},now,()=>0);
 assert.ok(events.some(e=>e.type==='npc_road_encounter'));
});
test('visiting stalkers can transfer carried goods into a trader stock',()=>{
 const visitor=npc('visitor',{x:540,y:530,nextLifeAt:now+60000,action:'trade',inventory:[{id:'artifact-test',name:'Медуза',type:'artifact'}],lifeRoutine:{activity:'trade',phase:'doing',target:{x:540,y:530},home:{x:500,y:500},until:now-1}});
 const trader=npc('trader',{role:'торговец',x:540,y:530,nextLifeAt:now+60000});
 const events=tickNpcLife({npcState:{visitor,trader}},now,()=>.9);
 assert.equal(visitor.inventory.length,0);assert.equal(trader.stock.items[0].name,'Медуза');
 assert.ok(events.some(e=>e.type==='npc_goods_delivered'));
});

test('delivered NPC goods are added to the trader economy stock used by NPC trade',()=>{
 assert.match(serverSource,/event\.type==='npc_goods_delivered'/);
 assert.match(serverSource,/Object\.entries\(SHOP\)\.find\(\(\[,goods\]\)=>goods\.name===item\.name\)/);
 assert.match(serverSource,/account\.stock\[itemId\]=Math\.min/);
 assert.match(serverSource,/recordNpcTrade\(account,\{type:'npc_delivery'/);
});


test('hostile NPCs block movement and enter combat instead of walking through each other',()=>{
 const a=npc('moving-a',{faction:'Долг',x:500,y:500,destinationPoint:{x:600,y:500},action:'travel'});
 const b=npc('blocking-b',{faction:'Свобода',x:510,y:500,destinationPoint:{x:400,y:500},action:'travel'});
 const beforeA=a.x,beforeB=b.x;
 tickNpcMovement({npcState:{a,b}},now,2.5);
 assert.equal(a.x,beforeA);assert.equal(b.x,beforeB);
 assert.equal(a.action,'combat');assert.equal(b.action,'combat');
 assert.equal(a.destinationPoint,null);assert.equal(b.destinationPoint,null);
});

test('player death is authoritative, persisted and stops further proximity damage',()=>{
 assert.match(serverSource,/player\.state\.dead\|\|Number\(player\.state\.hp\)<=0/);
 assert.match(serverSource,/player\.state\.hp<=0\)\{player\.state\.dead=true/);
 assert.match(serverSource,/io\.to\(player\.id\)\.emit\('player:death'/);
 assert.match(serverSource,/player:character-death/);
 const client=fs.readFileSync(path.join(__dirname,'../public/js/game.js'),'utf8');
 assert.match(client,/function playerDeath\(cause=/);
 assert.match(client,/g\.characterCreated=false/);
 assert.match(client,/openCharacterSetup\(\)/);
 assert.doesNotMatch(client,/if\(g\.hp<=0\)\{g\.hp=15/);
});

test('player proximity combat uses a spatial index instead of scanning every NPC for every player',()=>{
 const start=serverSource.indexOf('const combatCell=Math.max(1,COMBAT_RADIUS)');
 const end=serverSource.indexOf("},1500).unref();",start);
 const body=serverSource.slice(start,end);
 assert.match(body,/hostilesByCell/);
 assert.match(body,/hostilesByCell\.get/);
 assert.match(body,/for\(const player of online\.values\(\)\)/);
});


test('imported save data is size-limited and strips executable markup and prototype keys',()=>{
 const client=fs.readFileSync(path.join(__dirname,'../public/js/game.js'),'utf8');
 assert.match(client,/f\.size>5\*1024\*1024/);
 assert.match(client,/function sanitizeImportedValue/);
 assert.match(client,/__proto__.*prototype.*constructor/);
 assert.match(client,/replace\(\/\[<>/);
});
