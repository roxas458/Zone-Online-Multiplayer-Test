'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {FACTIONS,TERRITORY_START}=require('../src/shared/game-data');
const {initFactionWar,tickFactionWar,aggregateTerritories,routeBetween,FACTION_OBJECTIVES,COMMAND_HEADQUARTERS}=require('../src/systems/faction-war');
const {tickNpcWorld}=require('../src/systems/npc-ai');

test('every known sector receives ten stable strategic key points and faction objectives',()=>{
  const world={territoryOwners:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner])),territoryControl:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.control]))};
  initFactionWar(world,1000);
  assert.equal(Object.keys(world.keyPoints).length,Object.keys(TERRITORY_START).length*10);
  assert.equal(Object.keys(world.factionObjectives).length,FACTIONS.size);
  assert.equal(world.territoryControl.cordon,TERRITORY_START.cordon.control);
  for(const [location,sector] of Object.entries(TERRITORY_START)){
    const points=Object.values(world.keyPoints).filter(p=>p.location===location);
    assert.equal(points.length,10);
    assert.ok(points.every(p=>p.owner===sector.owner));
  }
});

test('sector ownership changes only when a faction controls a majority of its key points',()=>{
  const world={};initFactionWar(world,1000);
  const cordon=Object.values(world.keyPoints).filter(p=>p.location==='cordon');
  cordon.slice(0,5).forEach(p=>p.owner='Долг');aggregateTerritories(world);
  assert.equal(world.territoryOwners.cordon,'Одиночки','five of ten is not a majority');
  cordon[5].owner='Долг';aggregateTerritories(world);
  assert.equal(world.territoryOwners.cordon,'Долг');
  cordon[4].owner='Свобода';cordon[5].owner='Свобода';aggregateTerritories(world);
  assert.equal(world.territoryOwners.cordon,'Долг','a 4/4/2 split does not create a new majority');
});

test('faction strategy assigns a real squad a connected route to a strategic object',()=>{
  const world={territoryOwners:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner])),territoryControl:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.control])),diplomacy:{'Долг':{'Наёмники':-45}},npcState:{a:{id:'a',name:'Ветер',faction:'Долг',location:'bar',alive:true},b:{id:'b',name:'Крот',faction:'Долг',location:'bar',alive:true},c:{id:'c',name:'Рысь',faction:'Долг',location:'bar',alive:true}},npcSquads:[{id:'s1',name:'Северный дозор',faction:'Долг',location:'bar',members:['a','b','c'],status:'camped'}]};
  initFactionWar(world,1000);
  const events=tickFactionWar(world,1_000_000,()=>0);
  const squad=world.npcSquads[0];
  assert.ok(events.some(e=>e.type==='faction_squad_deployed'));
  assert.equal(squad.missionType,'faction_war');
  assert.ok(squad.route.length>=2);
  assert.equal(world.keyPoints[squad.targetPointId].contestedBySquadId,squad.id);
  assert.equal(squad.route[0],'bar');
  assert.equal(squad.route.at(-1),squad.targetLocation);
  for(let i=1;i<squad.route.length;i++)assert.ok(routeBetween(squad.route[i-1],squad.route[i],2));
});

test('war squad captures one key point without instantly taking the whole sector',()=>{
  const world={territoryOwners:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner])),territoryControl:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.control])),diplomacy:{'Долг':{'Наёмники':-45}},npcState:{a:{id:'a',name:'Ветер',faction:'Долг',location:'wild',alive:true},b:{id:'b',name:'Крот',faction:'Долг',location:'wild',alive:true},c:{id:'c',name:'Рысь',faction:'Долг',location:'wild',alive:true}},npcSquads:[{id:'s1',name:'Северный дозор',faction:'Долг',location:'wild',members:['a','b','c'],status:'holding_objective',missionType:'faction_war',targetPointId:'wild_1',targetLocation:'wild',route:['bar','wild'],routeIndex:1,nextCaptureAt:0}]};
  initFactionWar(world,1000);
  world.keyPoints.wild_1.owner='Наёмники';
  world.npcSquads[0].nextCaptureAt=0;
  let now=2_000_000;
  for(let i=0;i<8&&world.keyPoints.wild_1.owner!=='Долг';i++){tickFactionWar(world,now,()=>0.5);now+=60_000;}
  assert.equal(world.keyPoints.wild_1.owner,'Долг');
  assert.equal(world.territoryOwners.wild,'Наёмники');
  assert.ok(world.factionWarHistory.some(x=>x.pointId==='wild_1'));
});

test('legacy key point ownership and faction resource balances survive initialization',()=>{
  const world={keyPoints:{cordon_1:{id:'cordon_1',location:'cordon',name:'Старый объект',owner:'Свобода',control:41}},factionResources:{'Свобода':{supplies:777,materials:222,intel:33}}};
  initFactionWar(world,2000);
  assert.equal(world.keyPoints.cordon_1.owner,'Свобода');
  assert.equal(world.keyPoints.cordon_1.control,41);
  assert.equal(world.factionResources['Свобода'].supplies,777);
  assert.equal(world.keyPoints.cordon_2.owner,'Одиночки');
  assert.ok(FACTION_OBJECTIVES['Учёные'].priorities.includes('research'));
});


test('NPC AI does not override a strategic squad route or clear its key-point order',()=>{
  const world={territoryOwners:{bar:'Долг',wild:'Наёмники'},territoryOrders:{},npcSquads:[{id:'war_squad',faction:'Долг',location:'bar',members:['a','b'],status:'war_moving',missionType:'faction_war',targetPointId:'wild_1'}],npcState:{a:{id:'a',name:'Ветер',faction:'Долг',location:'bar',alive:true,health:100,morale:60,supplies:50,action:'travel',behavior:'faction_march',missionOrder:{type:'secure_key_point',target:'wild',pointId:'wild_1'},squadId:'war_squad',nextDecisionAt:0},b:{id:'b',name:'Крот',faction:'Долг',location:'bar',alive:true,health:100,morale:60,supplies:50,action:'travel',behavior:'faction_march',missionOrder:{type:'secure_key_point',target:'wild',pointId:'wild_1'},squadId:'war_squad',nextDecisionAt:0}}};
  tickNpcWorld(world,new Set(['bar','wild']),()=>0,1000);
  assert.equal(world.npcState.a.location,'bar');
  assert.equal(world.npcState.a.missionOrder.pointId,'wild_1');
  assert.equal(world.npcSquads[0].status,'war_moving');
});

test('war PDA and map expose the shared key-point and faction-objective state',()=>{
  const fs=require('node:fs');
  const html=fs.readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');
  const client=fs.readFileSync(require('node:path').join(__dirname,'../public/js/game.js'),'utf8');
  const server=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
  assert.match(html,/id="warKeyPoints"/);
  assert.match(html,/id="warCommandCouncil"/);
  assert.match(client,/function showMapKeyPoint\(/);
  assert.match(client,/marker-keypoint/);
  assert.match(server,/keyPoints:world\.keyPoints/);
  assert.match(server,/tickFactionWar\(world,now,Math\.random\)/);
  assert.match(server,/factionCommandRequests/);
  assert.match(server,/faction_command_decision/);
  assert.match(client,/warCommandCouncil/);
});


test('faction commanders evaluate the world and issue distinct squad orders',()=>{
  const world={npcState:{v:{id:'v',name:'Командир',faction:'Долг',location:'bar',alive:true},a:{id:'a',name:'Боец',faction:'Долг',location:'bar',alive:true},b:{id:'b',name:'Разведчик',faction:'Долг',location:'bar',alive:true}},npcSquads:[{id:'duty_squad',name:'Гарнизон',faction:'Долг',location:'bar',members:['v','a','b'],status:'camped'}],factionResources:{'Долг':{supplies:10,materials:60,intel:30,artifacts:0}}};
  initFactionWar(world,1000);
  const events=tickFactionWar(world,1000,()=>0.5);
  assert.equal(Object.keys(world.factionCommand).length,FACTIONS.size);
  assert.equal(world.factionCommand['Долг'].headquarters,COMMAND_HEADQUARTERS['Долг']);
  assert.equal(world.factionCommand['Долг'].directive,'supply');
  assert.equal(world.npcSquads[0].commandOrder.type,'supply');
  assert.ok(events.some(e=>e.type==='faction_command_decision'&&e.faction==='Долг'));
});

test('lost headquarters relocates command and player requests influence the next strategy',()=>{
  const lost={territoryOwners:{},territoryControl:{},npcState:{},npcSquads:[],factionResources:{'Долг':{supplies:100,materials:60,intel:100,artifacts:0}}};
  initFactionWar(lost,1000);
  for(const p of Object.values(lost.keyPoints).filter(p=>p.location==='bar'))p.owner='Свобода';
  lost.keyPoints.cordon_1.owner='Долг';
  tickFactionWar(lost,1000,()=>0.5);
  assert.equal(lost.factionCommand['Долг'].headquarters,'cordon');
  assert.equal(lost.factionCommand['Долг'].directive,'guard');
  const requestWorld={diplomacy:{'Долг':{'Наёмники':-45}},factionResources:{'Долг':{supplies:100,materials:60,intel:100,artifacts:0}},factionCommandRequests:{'Долг':[{pointId:'wild_1',playerName:'Сталкер',trust:80,at:1000,expiresAt:9999999}]}};
  initFactionWar(requestWorld,1000);
  requestWorld.factionCommand['Долг'].nextDecisionAt=0;
  tickFactionWar(requestWorld,2000,()=>0.5);
  assert.equal(requestWorld.factionCommand['Долг'].directive,'capture');
  assert.equal(requestWorld.factionCommand['Долг'].targetPointId,'wild_1');
  assert.match(requestWorld.factionCommand['Долг'].directiveText,/Сталкер/);
});

test('new object additions preserve old key-point ownership and create stable IDs',()=>{
  const world={keyPoints:{cordon_1:{id:'cordon_1',location:'cordon',name:'Legacy',type:'base',production:1,owner:'Свобода',control:41}}};
  initFactionWar(world,500);
  assert.equal(Object.keys(world.keyPoints).length,170);
  assert.equal(world.keyPoints.cordon_1.owner,'Свобода');
  assert.equal(world.keyPoints.cordon_1.control,41);
  assert.equal(world.keyPoints.cordon_10.id,'cordon_10');
  assert.equal(world.keyPoints.cordon_4.location,'cordon');
});

test('legacy whole-sector assault orders are retired during migration',()=>{
  const world={frontlineOrders:[{id:'legacy-front',status:'active',target:'dump'}],territoryOrders:{dump:{faction:'Долг',type:'attack',expiresAt:999999}},npcState:{a:{id:'a',missionOrder:{type:'attack',target:'dump'},action:'travel',behavior:'assault'}}};
  initFactionWar(world,5000);
  assert.equal(world.frontlineOrders[0].status,'superseded');
  assert.equal(world.territoryOrders.dump,undefined);
  assert.equal(world.npcState.a.missionOrder,null);
  assert.equal(world.npcState.a.behavior,'guard');
});


test('war squad completes a multi-sector route and captures an enemy objective without runtime errors',()=>{
  const world={territoryOwners:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner])),territoryControl:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.control])),diplomacy:{'Долг':{'Наёмники':-45}},npcState:{a:{id:'a',name:'Ветер',faction:'Долг',location:'bar',alive:true},b:{id:'b',name:'Крот',faction:'Долг',location:'bar',alive:true},c:{id:'c',name:'Рысь',faction:'Долг',location:'bar',alive:true}},npcSquads:[{id:'s1',name:'Северный дозор',faction:'Долг',location:'bar',members:['a','b','c'],status:'war_moving',missionType:'faction_war',targetPointId:'wild_1',targetLocation:'wild',route:['bar','wild'],routeIndex:0,nextMoveAt:1000}]};
  initFactionWar(world,500);
  world.keyPoints.wild_1.owner='Наёмники';
  const events=tickFactionWar(world,2000,()=>0.5);
  assert.equal(world.npcSquads[0].status,'holding_objective');
  assert.equal(world.npcState.a.location,'wild');
  assert.equal(world.npcPositions.a,'wild');
  assert.ok(events.some(e=>e.type==='faction_squad_route'));
  let now=3000;
  for(let i=0;i<12&&world.keyPoints.wild_1.owner!=='Долг';i++){tickFactionWar(world,now,()=>0.5);now+=60_000;}
  assert.equal(world.keyPoints.wild_1.owner,'Долг');
});

test('returning faction squads advance home and become available for later missions',()=>{
  const world={npcState:{a:{id:'a',name:'Ветер',faction:'Долг',location:'wild',alive:true},b:{id:'b',name:'Крот',faction:'Долг',location:'wild',alive:true}},npcSquads:[{id:'s1',name:'Северный дозор',faction:'Долг',location:'wild',members:['a','b'],status:'returning',route:['wild','bar'],routeIndex:0,nextMoveAt:1000,lastFactionMissionAt:0}]};
  initFactionWar(world,500);
  tickFactionWar(world,2000,()=>0.5);
  assert.equal(world.npcSquads[0].location,'bar');
  assert.equal(world.npcSquads[0].status,'camped');
  assert.deepEqual(world.npcSquads[0].route,[]);
  assert.equal(world.npcState.a.location,'bar');
  assert.equal(world.npcState.a.duty,'base_guard');
});


test('public world HTTP endpoints use the same filtered serializers as socket synchronization',()=>{
  const fs=require('node:fs');
  const server=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
  assert.match(server,/app\.get\('\/api\/world\/snapshot',[\s\S]*?world:publicWorldSnapshot\(\)/);
  assert.match(server,/app\.get\('\/api\/world\/events',[\s\S]*?publicWorldSync\(/);
  assert.doesNotMatch(server,/app\.get\('\/api\/world\/snapshot',[^\n]*world\s*\}\s*\)\s*\)/);
});


test('full faction war lifecycle deploys, marches, captures, returns, and releases the squad',()=>{
  const world={territoryOwners:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner])),territoryControl:Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.control])),diplomacy:{'Долг':{'Наёмники':-60}},npcState:{a:{id:'a',name:'Ветер',faction:'Долг',location:'bar',alive:true},b:{id:'b',name:'Крот',faction:'Долг',location:'bar',alive:true},c:{id:'c',name:'Рысь',faction:'Долг',location:'bar',alive:true}},npcSquads:[{id:'s1',name:'Северный дозор',faction:'Долг',location:'bar',members:['a','b','c'],status:'camped',lastFactionMissionAt:0}]};
  initFactionWar(world,1000);
  // Ensure the candidate objective is hostile and can be reached from the squad sector.
  world.keyPoints.wild_1.owner='Наёмники';
  let now=1_000_000;
  const deployed=tickFactionWar(world,now,()=>0);
  assert.ok(deployed.some(e=>e.type==='faction_squad_deployed'));
  const squad=world.npcSquads[0];
  const target=squad.targetPointId;
  assert.equal(squad.missionType,'faction_war');
  for(let i=0;i<80&&(world.keyPoints[target]?.owner!=='Долг'||squad.status!=='camped');i++){
    now=Math.max(now+60_000,Number(squad.nextMoveAt)||0);
    tickFactionWar(world,now,()=>0.5);
  }
  assert.equal(world.keyPoints[target].owner,'Долг','the assigned enemy object must change owner');
  assert.equal(squad.status,'camped','the squad must complete its return journey');
  assert.equal(squad.missionType,null);
  assert.equal(squad.location,'bar');
  assert.ok(squad.lastFactionMissionAt>0);
  assert.ok(world.factionWarHistory.some(entry=>entry.pointId===target&&entry.to==='Долг'));
});


test('Monolith expansion strategy keeps attacking loner positions even with low intelligence reserves',()=>{
  const world={npcState:{a:{id:'a',name:'Боец',faction:'Монолит',location:'radar',alive:true},b:{id:'b',name:'Разведчик',faction:'Монолит',location:'radar',alive:true}},npcSquads:[{id:'monolith_squad',name:'Северный дозор',faction:'Монолит',location:'radar',members:['a','b'],status:'camped'}],factionResources:{'Монолит':{supplies:100,materials:60,intel:0,artifacts:0}}};
  initFactionWar(world,1000);
  const target=world.keyPoints.chaes_1;
  target.owner='Одиночки';
  const events=tickFactionWar(world,1_000_000,()=>0.5);
  assert.equal(world.factionCommand['Монолит'].directive,'capture');
  assert.ok(events.some(e=>e.type==='faction_squad_deployed'&&e.faction==='Монолит'));
  assert.equal(world.npcSquads[0].missionType,'faction_war');
});

test('expansionist squad dispatch is no longer blocked by the old low random chance and seven-minute lockout',()=>{
  const world={npcState:{a:{id:'a',name:'Боец',faction:'Монолит',location:'radar',alive:true},b:{id:'b',name:'Разведчик',faction:'Монолит',location:'radar',alive:true}},npcSquads:[{id:'monolith_squad',name:'Северный дозор',faction:'Монолит',location:'radar',members:['a','b'],status:'camped',lastFactionMissionAt:1_000_000-4*60_000}]};
  initFactionWar(world,1_000_000);
  world.keyPoints.chaes_1.owner='Одиночки';
  const events=tickFactionWar(world,1_000_000,()=>0.5);
  assert.ok(events.some(e=>e.type==='faction_squad_deployed'));
});

test('well-defended objectives can still be captured in a reasonable time',()=>{
  const npcState={};
  for(let i=0;i<3;i++)npcState[`attacker${i}`]={id:`attacker${i}`,name:`Атакующий ${i}`,faction:'Долг',location:'wild',alive:true};
  for(let i=0;i<8;i++)npcState[`defender${i}`]={id:`defender${i}`,name:`Защитник ${i}`,faction:'Наёмники',location:'wild',alive:true,guardPost:true};
  const world={npcState,npcSquads:[{id:'s1',name:'Северный дозор',faction:'Долг',location:'wild',members:['attacker0','attacker1','attacker2'],status:'holding_objective',missionType:'faction_war',targetPointId:'wild_1',targetLocation:'wild',route:['bar','wild'],routeIndex:1,nextCaptureAt:0}]};
  initFactionWar(world,1000);
  world.keyPoints.wild_1.owner='Наёмники';
  let now=2000;
  for(let i=0;i<9&&world.keyPoints.wild_1.owner!=='Долг';i++){tickFactionWar(world,now,()=>0.5);now+=30_000;}
  assert.equal(world.keyPoints.wild_1.owner,'Долг');
});


test('NPC squads never attack a same-sector faction with neutral or friendly diplomacy',()=>{
  const world={diplomacy:{'Монолит':{'Одиночки':10}},npcState:{a:{id:'a',name:'Боец',faction:'Монолит',location:'radar',alive:true},b:{id:'b',name:'Разведчик',faction:'Монолит',location:'radar',alive:true}},npcSquads:[{id:'monolith_squad',name:'Дозор',faction:'Монолит',location:'radar',members:['a','b'],status:'camped'}]};
  initFactionWar(world,1000);
  for(const point of Object.values(world.keyPoints))point.owner='Монолит';
  world.keyPoints.radar_1.owner='Одиночки';
  const events=tickFactionWar(world,1_000_000,()=>0);
  assert.equal(world.npcSquads[0].missionType,undefined);
  assert.equal(world.keyPoints.radar_1.contestedBySquadId,null);
  assert.ok(!events.some(e=>e.type==='faction_squad_deployed'));
});
