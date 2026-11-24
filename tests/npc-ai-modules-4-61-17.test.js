'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const needs = require('../src/systems/npc-ai-needs');
const conflicts = require('../src/systems/npc-ai-conflicts');
const movement = require('../src/systems/npc-ai-movement');
const factions = require('../src/systems/npc-ai-factions');
const decisions = require('../src/systems/npc-ai-decisions');
const aiSource = fs.readFileSync(path.join(root, 'src/systems/npc-ai.js'), 'utf8');
const tickSource = fs.readFileSync(path.join(root, 'src/systems/npc-ai-world-tick.js'), 'utf8');

test('4.61.17 NPC needs and sleep-cycle rules live in a dedicated module', () => {
  assert.equal(typeof needs.updateNpcNeeds, 'function');
  assert.equal(typeof needs.npcSleepWindow, 'function');
  const npc = { id:'needs-test', needs:{hunger:0,thirst:0,fatigue:0,stress:0}, lastNeedsAt:1_000, action:'camp', supplies:0, morale:50 };
  needs.updateNpcNeeds(npc, 61_000);
  needs.npcSleepWindow(npc, 61_000);
  assert.equal(npc.needs.hunger, 0.035);
  assert.equal(npc.needs.thirst, 0.055);
  assert.ok(npc.sleepStartHour >= 21 && npc.sleepStartHour <= 24);
  assert.ok(npc.sleepEndHour >= 5 && npc.sleepEndHour <= 7);
});

test('4.61.17 faction combat and convoy lifecycle are isolated from the main NPC AI tick', () => {
  assert.equal(typeof conflicts.resolveNpcWorldConflicts, 'function');
  assert.match(tickSource, /require\('\.\/npc-ai-conflicts'\)/);
  assert.match(tickSource, /resolveNpcWorldConflicts\(\{ world, owners, events, now, random, isHostileFaction \}\)/);
  assert.doesNotMatch(tickSource, /world\.convoys\.push/);
  assert.doesNotMatch(tickSource, /const byLocation = new Map\(\)/);
});

test('4.61.17 extracted conflict subsystem preserves hostile clash and convoy events', () => {
  const world = {
    npcState: {
      a:{id:'a',name:'A',faction:'Alpha',location:'cordon',alive:true,health:100,morale:50},
      b:{id:'b',name:'B',faction:'Bravo',location:'cordon',alive:true,health:100,morale:50}
    },
    territoryOwners:{cordon:'Alpha'}, diplomacy:{}, battlefronts:[], convoys:[]
  };
  const events=[];
  conflicts.resolveNpcWorldConflicts({world,owners:world.territoryOwners,events,now:100_000,random:()=>0,isHostileFaction:(a,b)=>a!==b});
  assert.equal(world.battlefronts.length,1);
  assert.equal(world.battlefronts[0].status,'active');
  assert.ok(events.some(event=>event.type==='npc_skirmish'));
  assert.ok(events.some(event=>event.type==='convoy_started'));
  assert.equal(world.convoys.length,1);
});

test('4.61.17 decision policy preserves scheduled-skip control flow', () => {
  const npc={id:'scheduled',action:'camp',nextDecisionAt:2_000};
  const handled=decisions.decideNpcAction(npc,{world:{},owners:{},events:[],now:1_000,random:()=>0,territoryAdjacency:{},canEnterTerritory:()=>true,moveNpc(){},scheduleNext(){},recordAction(){},choose(){}});
  assert.equal(handled,false,'a not-yet-due NPC must remain on the original continue path');
});

test('4.61.17 movement, faction policy and per-NPC decisions are separate modules', () => {
  assert.equal(typeof movement.tickNpcMovement, 'function');
  assert.equal(typeof movement.tickNpcProximityCombat, 'function');
  assert.equal(typeof factions.isHostileFaction, 'function');
  assert.equal(typeof decisions.decideNpcAction, 'function');
  assert.ok(aiSource.includes("require('./npc-ai-movement')"));
  assert.ok(aiSource.includes("require('./npc-ai-factions')"));
  assert.ok(tickSource.includes("require('./npc-ai-decisions')"));
});

test('4.61.17 server syntax checks include all extracted AI modules', () => {
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.check,/npc-ai-needs\.js/);
  assert.match(pkg.scripts.check,/npc-ai-conflicts\.js/);
  assert.match(pkg.scripts.check,/npc-ai-decisions\.js/);
  assert.match(pkg.scripts.check,/npc-ai-movement\.js/);
  assert.match(pkg.scripts.check,/npc-ai-factions\.js/);
});
