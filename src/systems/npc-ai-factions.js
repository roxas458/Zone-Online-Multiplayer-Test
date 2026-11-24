// Shared faction hostility policy for NPC movement and combat systems.
'use strict';
const { createFactionDiplomacy, FACTIONS } = require('../shared/game-data');
const DEFAULT_DIPLOMACY = createFactionDiplomacy([...FACTIONS]);
function isHostileFaction(a,b,diplomacy={}) {
  if (!a || !b || a === b) return false;
  if (a === 'Монолит' || b === 'Монолит') return true;
  const canonical = Number(DEFAULT_DIPLOMACY[a]?.[b]);
  const current = diplomacy?.[a]?.[b];
  return Number.isFinite(Number(current)) ? Number(current) <= -25 : canonical <= -25;
}
module.exports = { isHostileFaction };
