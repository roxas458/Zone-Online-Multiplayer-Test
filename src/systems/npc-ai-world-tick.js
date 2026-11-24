// Server-authoritative NPC world tick: lifecycle, constraints, decisions, conflicts, projection.
'use strict';
const { TERRITORY_ADJACENCY, homeForFaction, nearestFriendlyLocation, canEnterTerritory } = require('./territories');
const { updateNpcNeeds } = require('./npc-ai-needs');
const { resolveNpcWorldConflicts } = require('./npc-ai-conflicts');
const { decideNpcAction } = require('./npc-ai-decisions');
const { npcWorldPosition } = require('./proximity');
const { isHostileFaction } = require('./npc-ai-factions');
const { prepareNpcForTick } = require('./npc-ai-lifecycle');
const { choose, scheduleNext, recordAction, moveNpc } = require('./npc-ai-runtime');
const {
  shouldHoldNpcForSquad,
  shouldHoldNpcForLifeRoutine,
  shouldHoldNpcForDestination,
  enforceNpcTerritorySafety
} = require('./npc-ai-territory');
const { finalizeNpcWorldState } = require('./npc-ai-world-state');
const { reactToNpcThreat } = require('./npc-ai-tactics');

function tickNpcWorld(world, locations, random = Math.random, now = Date.now()) {
  world.npcState ||= {};
  world.npcPositions ||= {};
  const events = [];
  const owners = world.territoryOwners || {};

  for (const npc of Object.values(world.npcState)) {
    if (!prepareNpcForTick(npc, { world, owners, events, now, updateNpcNeeds, homeForFaction, npcWorldPosition })) continue;

    // Active squad orders, life routines and local destinations own movement until they finish.
    if (shouldHoldNpcForSquad(npc, world)) {
      world.npcPositions[npc.id] = npc.location;
      continue;
    }
    if (shouldHoldNpcForLifeRoutine(npc)) {
      world.npcPositions[npc.id] = npc.location;
      continue;
    }
    if (npc.missionOrder) npc.lifeRoutine = null;
    if (reactToNpcThreat(npc, { world, owners, now, events, random, isHostileFaction, nearestFriendlyLocation, moveNpc, scheduleNext, recordAction })) {
      world.npcPositions[npc.id] = npc.location;
      continue;
    }

    if (shouldHoldNpcForDestination(npc)) {
      world.npcPositions[npc.id] = npc.location;
      continue;
    }

    if (enforceNpcTerritorySafety(npc, {
      owners, world, now, events, canEnterTerritory, nearestFriendlyLocation,
      moveNpc, scheduleNext, recordAction, random
    })) {
      world.npcPositions[npc.id] = npc.location;
      continue;
    }

    if (decideNpcAction(npc, {
      world, owners, events, now, random,
      territoryAdjacency: TERRITORY_ADJACENCY,
      canEnterTerritory, moveNpc, scheduleNext, recordAction, choose
    })) {
      npc.destination = null;
      world.npcPositions[npc.id] = npc.location;
    }
  }

  resolveNpcWorldConflicts({ world, owners, events, now, random, isHostileFaction });
  finalizeNpcWorldState(world, owners, events);
  return events;
}

module.exports = { tickNpcWorld };
