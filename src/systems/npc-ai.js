// Public NPC AI facade. Domain logic lives in focused modules; keep this API stable for callers.
'use strict';
const { NPC_FACTIONS, ROLES, createNpcRoster } = require('./npc-ai-roster');
const { tickNpcWorld } = require('./npc-ai-world-tick');
const { tickNpcMovement, tickNpcProximityCombat } = require('./npc-ai-movement');
const { interactWithNpc } = require('./npc-interactions');
const { isHostileFaction } = require('./npc-ai-factions');
const { updateNpcNeeds, npcSleepWindow } = require('./npc-ai-needs');

module.exports = {
  NPC_FACTIONS,
  ROLES,
  createNpcRoster,
  tickNpcWorld,
  tickNpcMovement,
  tickNpcProximityCombat,
  interactWithNpc,
  isHostileFaction,
  updateNpcNeeds,
  npcSleepWindow
};
