// NPC conflict coordinator. Domain rules live in battle, convoy, and local-skirmish modules.
'use strict';
const { resolveFactionClashes } = require('./npc-ai-faction-battles');
const { tickNpcConvoys } = require('./npc-ai-convoys');
const { resolveLocalSkirmishes } = require('./npc-ai-local-skirmishes');

function resolveNpcWorldConflicts(context) {
  const { world, now } = context;
  world.territoryOrders ||= {};
  world.battlefronts ||= [];
  world.convoys ||= [];
  for (const [sector, order] of Object.entries(world.territoryOrders)) {
    if (order.expiresAt && order.expiresAt <= now) delete world.territoryOrders[sector];
  }
  // Keep the original deterministic simulation order: battles, convoys, local skirmishes.
  resolveFactionClashes(context);
  tickNpcConvoys(context);
  resolveLocalSkirmishes(context);
}

module.exports = { resolveNpcWorldConflicts };
