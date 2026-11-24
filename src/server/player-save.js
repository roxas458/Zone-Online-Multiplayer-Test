'use strict';

// Fields that must only change through validated server-side game actions.
// The client may still save presentation, preferences and other non-economic
// state, but a generic player:save packet cannot mint progression or inventory.
const SERVER_AUTHORITY_FIELDS = Object.freeze([
  'money', 'items', 'hp', 'xp', 'rep', 'quests', 'contracts', 'careerStats', 'faction', 'characterCreated', 'visitedLocations',
  'equipment', 'weaponSlots', 'armor', 'artifacts', 'skills', 'rank',
  'reputation', 'stash', 'stashItems', 'tradeHistory', 'level', 'perks', 'achievements', 'guestSessionVersion',
  'hunger', 'thirst', 'stamina', 'radiation', 'radiationProtectionUntil', 'survivalServerAt', 'serverShelterUntil'
]);

function mergeClientSaveState(currentState, incomingState, options = {}) {
  const current = currentState && typeof currentState === 'object' && !Array.isArray(currentState) ? currentState : {};
  const incoming = incomingState && typeof incomingState === 'object' && !Array.isArray(incomingState) ? incomingState : {};
  const merged = { ...incoming };
  if (!currentState || Object.keys(current).length === 0) return merged;
  for (const key of SERVER_AUTHORITY_FIELDS) {
    // A server-authorized fresh character (initial creation or after death)
    // starts a genuinely new life, so its selected starter state replaces the
    // previous character's protected economy and progression fields.
    if (options.allowCharacterCreation === true) continue;
    if (Object.prototype.hasOwnProperty.call(current, key)) merged[key] = current[key];
    else delete merged[key];
  }
  return merged;
}

module.exports = { SERVER_AUTHORITY_FIELDS, mergeClientSaveState };
