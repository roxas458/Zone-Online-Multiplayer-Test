// Territory and squad constraints applied before an NPC receives a new local decision.
'use strict';

const ACTIVE_SQUAD_STATUSES = new Set(['travelling','scavenging','returning','war_moving','holding_objective']);

function getActiveNpcSquad(npc, world) {
  return (world.npcSquads || []).find(squad => squad.id === npc.squadId && ACTIVE_SQUAD_STATUSES.has(squad.status)) || null;
}

function shouldHoldNpcForSquad(npc, world) {
  return !!getActiveNpcSquad(npc, world);
}

function shouldHoldNpcForLifeRoutine(npc) {
  return !!(npc.lifeRoutine && !npc.missionOrder);
}

function shouldHoldNpcForDestination(npc) {
  return !!npc.destinationPoint;
}

function enforceNpcTerritorySafety(npc, { owners, world, now, events, canEnterTerritory, nearestFriendlyLocation, moveNpc, scheduleNext, recordAction, random }) {
  const hasOrder = !!npc.missionOrder;
  const occupied = !!npc.occupationGarrison && owners[npc.location] === npc.faction;
  if (!Object.keys(owners).length || occupied || hasOrder || canEnterTerritory(npc.faction, npc.location, owners, world.territoryOrders || {})) return false;
  const safe = nearestFriendlyLocation(npc.location, npc.faction, owners);
  if (safe === npc.location) return false;
  moveNpc(npc, safe, now, events, 'retreat');
  npc.action = 'retreat';
  npc.behavior = 'retreat';
  npc.duty = 'return_to_faction';
  scheduleNext(npc, now, random, 8, 14);
  recordAction(npc, now);
  return true;
}

module.exports = {
  ACTIVE_SQUAD_STATUSES,
  getActiveNpcSquad,
  shouldHoldNpcForSquad,
  shouldHoldNpcForLifeRoutine,
  shouldHoldNpcForDestination,
  enforceNpcTerritorySafety
};
