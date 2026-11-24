// Final authoritative world-state projection after NPC decisions and conflict simulation.
'use strict';

function syncNpcPositions(world) {
  world.npcPositions = Object.fromEntries(
    Object.values(world.npcState || {}).filter(npc => npc.alive).map(npc => [npc.id, npc.location])
  );
  return world.npcPositions;
}

function buildFactionBases(world, owners = world.territoryOwners || {}) {
  const npcs = Object.values(world.npcState || {});
  world.factionBases = Object.entries(owners).map(([location, faction]) => {
    const stationed = npcs.filter(npc => npc.alive && npc.location === location && npc.faction === faction);
    return {
      location,
      faction,
      total: stationed.length,
      guards: stationed.filter(npc => npc.guardPost || npc.duty === 'base_guard' || npc.duty === 'occupation_garrison').length,
      campfire: stationed.filter(npc => npc.behavior === 'campfire').length,
      patrols: stationed.filter(npc => npc.behavior === 'patrol').length,
      squads: [...new Set(stationed.map(npc => npc.squadId).filter(Boolean))].length
    };
  });
  return world.factionBases;
}

function appendNpcWorldEvents(world, events, limit = 60) {
  world.npcEvents ||= [];
  world.npcEvents.push(...events);
  world.npcEvents = world.npcEvents.slice(-limit);
  return world.npcEvents;
}

function finalizeNpcWorldState(world, owners, events) {
  syncNpcPositions(world);
  buildFactionBases(world, owners);
  appendNpcWorldEvents(world, events);
  return world;
}

module.exports = { syncNpcPositions, buildFactionBases, appendNpcWorldEvents, finalizeNpcWorldState };
