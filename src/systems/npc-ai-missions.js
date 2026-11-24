// Server-authoritative handling of explicit NPC mission orders.
'use strict';

function processNpcMissionOrder(npc, {
  world,
  owners,
  events,
  now,
  random,
  territoryAdjacency,
  canEnterTerritory,
  moveNpc,
  scheduleNext,
  recordAction
}) {
  if (!npc || !npc.missionOrder) return false;

  const target = npc.missionOrder.target;
  if (npc.location === target) {
    npc.action = 'guard';
    npc.behavior = 'mission';
    npc.duty = npc.missionOrder.type || 'mission';
    npc.missionOrder = null;
  } else {
    const next = (territoryAdjacency[npc.location] || []).find(id =>
      id === target ||
      ((territoryAdjacency[id] || []).includes(target) &&
        canEnterTerritory(npc.faction, id, owners, world.territoryOrders || {}))
    );

    if (next && canEnterTerritory(npc.faction, next, owners, world.territoryOrders || {})) {
      moveNpc(npc, next, now, events, 'mission');
    } else {
      npc.missionOrder = null;
      npc.action = 'retreat';
      npc.behavior = 'retreat';
    }
  }

  scheduleNext(npc, now, random, 5, 9);
  recordAction(npc, now);
  return true;
}

module.exports = { processNpcMissionOrder };
