'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const conflicts = require('../src/systems/npc-ai-conflicts');
const battles = require('../src/systems/npc-ai-faction-battles');
const convoys = require('../src/systems/npc-ai-convoys');
const localSkirmishes = require('../src/systems/npc-ai-local-skirmishes');
const proximityCombat = require('../src/systems/npc-ai-proximity-combat');
const movement = require('../src/systems/npc-ai-movement');
const behaviors = require('../src/systems/npc-ai-behaviors');
const decisions = require('../src/systems/npc-ai-decisions');
const ai = require('../src/systems/npc-ai');

function unit(id, faction, overrides = {}) {
  return { id, name:id, faction, role:'сталкер', location:'cordon', x:500, y:500, alive:true, health:100, morale:50, supplies:50, needs:{ fatigue:0, hunger:0, thirst:0, stress:0 }, action:'patrol', behavior:'patrol', ...overrides };
}

const hostile = (a, b) => a !== b;

test('4.61.31 conflict coordinator delegates to battle, convoy, and local skirmish domains in order', () => {
  const world = { npcState:{}, territoryOrders:{ expired:{ expiresAt:10 }, active:{ expiresAt:500 } }, territoryOwners:{}, battlefronts:[], convoys:[] };
  const events=[];
  conflicts.resolveNpcWorldConflicts({ world, owners:world.territoryOwners, events, now:100, random:()=>0, isHostileFaction:hostile });
  assert.equal(world.territoryOrders.expired, undefined);
  assert.ok(world.territoryOrders.active);
  assert.match(fs.readFileSync(path.join(root,'src/systems/npc-ai-conflicts.js'),'utf8'), /resolveFactionClashes\(context\)[\s\S]*tickNpcConvoys\(context\)[\s\S]*resolveLocalSkirmishes\(context\)/);
});

test('4.61.31 faction battle module preserves bounded battle participants and snapshots', () => {
  const a=unit('battle-a','Alpha'), b=unit('battle-b','Bravo');
  const world={npcState:{a,b},battlefronts:[],diplomacy:{}};
  const events=[];
  battles.resolveFactionClashes({world,events,now:1000,random:()=>0,isHostileFaction:hostile});
  assert.equal(world.battlefronts.length,1);
  assert.deepEqual(world.battlefronts[0].participants,['battle-a','battle-b']);
  assert.equal(world.battlefronts[0].participantSnapshots.length,2);
  assert.ok(events.some(event=>event.type==='npc_skirmish'));
});

test('4.61.31 convoy module owns creation, route progress, and event generation', () => {
  const world={npcState:{},convoys:[]};
  const events=[];
  convoys.tickNpcConvoys({world,owners:{},events,now:2000,random:()=>0,isHostileFaction:hostile});
  assert.equal(world.convoys.length,1);
  assert.equal(world.convoys[0].index,1);
  assert.equal(world.convoys[0].location,world.convoys[0].route[1]);
  assert.ok(events.some(event=>event.type==='convoy_started'));
});

test('4.61.31 local skirmish module resolves nearby hostile encounters independently', () => {
  const a=unit('local-a','Alpha'), b=unit('local-b','Bravo');
  const world={npcState:{a,b},diplomacy:{}};
  const events=[];
  localSkirmishes.resolveLocalSkirmishes({world,events,now:3000,random:()=>0,isHostileFaction:hostile});
  assert.ok(events.some(event=>event.type==='npc_skirmish' && event.npcIds.includes('local-a')));
  assert.equal(a.action,'combat');
  assert.equal(b.action,'combat');
});

test('4.61.31 proximity combat is independently importable and movement keeps compatibility export', () => {
  const a=unit('prox-a','Одиночки'), b=unit('prox-b','Бандиты');
  const events=proximityCombat.tickNpcProximityCombat({npcState:{a,b},diplomacy:{}},20000,()=>0);
  assert.equal(events.length,1);
  assert.equal(typeof movement.tickNpcProximityCombat,'function');
  assert.equal(movement.tickNpcProximityCombat,proximityCombat.tickNpcProximityCombat);
  assert.equal(ai.tickNpcProximityCombat,proximityCombat.tickNpcProximityCombat);
});

test('4.61.31 ordinary activity policy is separated from decision scheduling', () => {
  const npc=unit('behavior','Одиночки',{squadType:'сбор припасов'});
  const events=[];
  behaviors.chooseNpcRoutineBehavior(npc,{world:{},owners:{},events,now:5000,random:()=>0,territoryAdjacency:{},canEnterTerritory:()=>true,moveNpc(){},scheduleNext(){},recordAction(){},choose:()=>null},0.1);
  assert.equal(npc.action,'scavenge');
  assert.ok(events.some(event=>event.type==='npc_scavenging'));
  assert.equal(typeof decisions.decideNpcAction,'function');
});

test('4.61.31 package syntax checks include every extracted NPC AI domain', () => {
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  for(const file of ['npc-ai-faction-battles.js','npc-ai-convoys.js','npc-ai-local-skirmishes.js','npc-ai-proximity-combat.js','npc-ai-behaviors.js']) assert.ok(pkg.scripts.check.includes(file),`${file} missing from npm run check`);
});

test('4.61.31 public NPC AI facade remains a small compatibility entry point', () => {
  const source=fs.readFileSync(path.join(root,'src/systems/npc-ai.js'),'utf8');
  assert.ok(source.length < 1500, 'facade should not accumulate domain logic');
  assert.match(source, /npc-ai-world-tick/);
  assert.match(source, /npc-ai-roster/);
  assert.match(fs.readFileSync(path.join(root,'docs/NPC_AI_ARCHITECTURE.md'),'utf8'), /World simulation pipeline/);
});
