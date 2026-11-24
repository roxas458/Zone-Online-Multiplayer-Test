// Per-NPC decision scheduler and high-level policy coordinator.
'use strict';
const { processNpcMissionOrder } = require('./npc-ai-missions');
const { chooseNpcRoutineBehavior } = require('./npc-ai-behaviors');

function decideNpcAction(npc, context) {
  const { world, owners, events, now, random, territoryAdjacency, canEnterTerritory, moveNpc, scheduleNext, recordAction, choose } = context;
  if (now < npc.nextDecisionAt && npc.action !== 'combat') return false;
  if (npc.action === 'combat') {
    npc.action = 'guard'; npc.behavior = 'guard'; npc.mood = 'насторожен';
    scheduleNext(npc, now, random, 1, 3); recordAction(npc, now); return false;
  }
  if (!processNpcMissionOrder(npc, { world, owners, events, now, random, territoryAdjacency, canEnterTerritory, moveNpc, scheduleNext, recordAction })) {
    const roll = random();
    chooseNpcRoutineBehavior(npc, { ...context, choose }, roll);
    const atHome = npc.location === npc.homeLocation || npc.location === npc.baseLocation;
    if (atHome && npc.action === 'camp' && random() < 0.12) events.push({ type:'npc_camp_event', npcId:npc.id, location:npc.location, text:`${npc.name} отдыхает у костра на базе «${npc.faction}».`, at:now });
    scheduleNext(npc, now, random, npc.action === 'rest' ? 8 : 1, npc.action === 'rest' ? 14 : 4);
    recordAction(npc, now);
  }
  return true;
}
module.exports = { decideNpcAction };
