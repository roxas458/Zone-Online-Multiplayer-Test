'use strict';

// Stable public entry point: orchestration only. Planning, active routine
// execution and social simulation live in focused modules.
const { tickNpcSocialEncounters } = require('./npc-life-social');
const { advanceNpcLifeRoutine } = require('./npc-life-routines');
const { planNpcLifeRoutine } = require('./npc-life-planner');
const { ARTIFACTS, PROTECTED_ACTIONS } = require('./npc-life-constants');

function tickNpcLife(world, now = Date.now(), random = Math.random) {
  const npcs = Object.values(world.npcState || {}).filter(npc => npc && npc.alive !== false);
  const events = [];
  const bySector = new Map();

  for (const npc of npcs) {
    const sector = bySector.get(npc.location) || [];
    sector.push(npc);
    bySector.set(npc.location, sector);
  }

  for (const npc of npcs) {
    if ((PROTECTED_ACTIONS.has(npc.action) && !(npc.action === 'travel' && npc.lifeRoutine)) || npc.missionOrder || npc.occupationGarrison) continue;
    npc.lifeRoutine ||= null;

    if (npc.lifeRoutine) {
      events.push(...advanceNpcLifeRoutine(npc, now, random, bySector));
      continue;
    }

    const departure = planNpcLifeRoutine(npc, bySector, now, random);
    if (departure) events.push(departure);
  }

  events.push(...tickNpcSocialEncounters(world, bySector, now, random));
  world.npcLifeEvents ||= [];
  world.npcLifeEvents.push(...events);
  world.npcLifeEvents = world.npcLifeEvents.slice(-80);
  return events;
}

module.exports = { tickNpcLife, ARTIFACTS };
