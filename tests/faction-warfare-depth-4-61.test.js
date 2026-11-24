'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {initFactionWar,tickFactionWar,activePact,isProtectedByPact,applyCaptureConsequences,updateGarrisons}=require('../src/systems/faction-war');

test('strategic objects initialize a persistent garrison and defensive fortification state',()=>{
  const world={factionResources:{'Долг':{supplies:100,materials:100,morale:70}}};
  initFactionWar(world,1000);
  const base=world.keyPoints.bar_2;
  assert.ok(base.garrisonState);
  assert.equal(base.garrisonState.fortification,2);
  assert.equal(base.garrison,base.garrisonState.troops);
  assert.equal(base.supplyStatus,'supplied');
});

test('reinforcements move from a friendly reserve to a threatened connected sector',()=>{
  const world={territoryOwners:{bar:'Долг',wild:'Долг'},territoryControl:{},factionResources:{'Долг':{supplies:100,materials:50,intel:20,morale:70}},npcState:{},npcSquads:[]};
  initFactionWar(world,1000);
  const source=world.keyPoints.bar_2,target=world.keyPoints.wild_1;
  source.garrisonState.troops=7;source.garrison=7;
  target.captureProgress=30;target.garrisonState.troops=0;target.garrison=0;
  world.factionReinforcementAt=0;
  const events=[];updateGarrisons(world,200000,events,()=>0.5);
  assert.ok(target.garrison>0);
  assert.ok(source.garrison<7);
  assert.ok(events.some(e=>e.type==='faction_reinforcements'&&e.from==='bar'&&e.to==='wild'));
});

test('losing a supply depot cuts the defeated faction supply reserve and triggers HQ response',()=>{
  const world={};initFactionWar(world,1000);
  world.factionResources['Бандиты'].supplies=100;
  world.factionResources['Долг'].supplies=100;
  const point=world.keyPoints.dump_8;
  point.owner='Долг';point.type='supply';point.production=3;
  const events=[];
  applyCaptureConsequences(world,point,'Бандиты','Долг',2000,events);
  assert.equal(world.factionResources['Бандиты'].supplies,64);
  assert.equal(world.factionResources['Бандиты'].morale,58);
  assert.ok(events.some(e=>e.type==='faction_supply_disrupted'));
  assert.ok(events.some(e=>e.type==='faction_headquarters_reaction'));
  assert.ok(world.factionRecovery['Бандиты'][point.id]);
});

test('active truce and alliance prevent NPC squads from selecting each other as capture targets',()=>{
  const world={factionPacts:[{a:'Долг',b:'Наёмники',type:'truce',status:'active',expiresAt:5000}]};
  assert.ok(activePact(world,'Долг','Наёмники',1000));
  assert.equal(isProtectedByPact(world,'Долг','Наёмники',1000),true);
  assert.equal(isProtectedByPact(world,'Долг','Наёмники',6000),false);
  world.factionPacts[0].type='alliance';
  assert.equal(activePact(world,'Наёмники','Долг',1000).type,'alliance');
});

test('recovery orders prioritize recently lost strategic objects',()=>{
  const world={territoryOwners:{bar:'Долг',wild:'Наёмники'},territoryControl:{},npcState:{a:{id:'a',name:'Боец',faction:'Долг',location:'bar',alive:true},b:{id:'b',name:'Разведчик',faction:'Долг',location:'bar',alive:true}},npcSquads:[{id:'s',name:'Резерв',faction:'Долг',location:'bar',members:['a','b'],status:'camped'}],factionRecovery:{'Долг':{wild_1:{pointId:'wild_1',location:'wild',name:'Дикий блокпост',lostAt:1000,recoverBefore:9999999}}},diplomacy:{'Долг':{'Наёмники':-60}}};
  initFactionWar(world,1000);
  world.factionCommand['Долг'].nextDecisionAt=0;
  tickFactionWar(world,2000,()=>0.5);
  assert.equal(world.factionCommand['Долг'].directive,'recovery');
  assert.equal(world.factionCommand['Долг'].targetPointId,'wild_1');
});


test('NPC war dispatch respects a truce even when diplomacy is hostile',()=>{
  const world={territoryOwners:{bar:'Долг',wild:'Наёмники'},territoryControl:{},diplomacy:{'Долг':{'Наёмники':-80}},factionPacts:[{a:'Долг',b:'Наёмники',type:'truce',status:'active',createdAt:1000,expiresAt:99999999}],npcState:{a:{id:'a',name:'Боец',faction:'Долг',location:'bar',alive:true},b:{id:'b',name:'Разведчик',faction:'Долг',location:'bar',alive:true}},npcSquads:[{id:'s',name:'Дозор',faction:'Долг',location:'bar',members:['a','b'],status:'camped'}]};
  initFactionWar(world,1000);
  for(const point of Object.values(world.keyPoints))point.owner='Наёмники';
  const events=tickFactionWar(world,1_000_000,()=>0);
  assert.ok(!world.npcSquads[0].missionType);
  assert.equal(events.some(e=>e.type==='faction_squad_deployed'),false);
});

test('garrison strength is distributed across objects instead of duplicated for every point in a sector',()=>{
  const npcState={};
  for(let i=0;i<20;i++)npcState[`guard${i}`]={id:`guard${i}`,faction:'Долг',location:'bar',alive:true,guardPost:true};
  const world={territoryOwners:{bar:'Долг'},territoryControl:{},npcState,npcSquads:[]};
  initFactionWar(world,1000);
  const events=[];updateGarrisons(world,2000,events,()=>0.5);
  const barPoints=Object.values(world.keyPoints).filter(p=>p.location==='bar'&&p.owner==='Долг');
  assert.ok(barPoints.every(p=>p.garrison<=2));
  assert.ok(barPoints.reduce((sum,p)=>sum+p.garrison,0)<=20);
});

test('server publishes pacts and recovery records alongside strategic object state',()=>{
  const fs=require('node:fs');
  const server=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
  assert.match(server,/factionPacts:world\.factionPacts\|\|\[\]/);
  assert.match(server,/factionRecovery:world\.factionRecovery/);
  assert.match(server,/faction_reinforcements/);
  assert.match(server,/faction_supply_disrupted/);
});
