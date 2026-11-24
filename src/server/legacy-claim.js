'use strict';
const crypto = require('crypto');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function legacyProfileFingerprint(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return '';
  const proof = {
    name: String(state.name || ''), faction: String(state.faction || ''),
    money: Number(state.money) || 0, xp: Number(state.xp) || 0,
    items: Array.isArray(state.items) ? state.items : [],
    quests: Array.isArray(state.quests) ? state.quests : [],
    careerStats: state.careerStats && typeof state.careerStats === 'object' ? state.careerStats : {}
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable(proof))).digest('hex');
}

function verifyLegacyProfileClaim(savedState, suppliedState) {
  const expected = legacyProfileFingerprint(savedState);
  const supplied = legacyProfileFingerprint(suppliedState);
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(supplied, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { legacyProfileFingerprint, verifyLegacyProfileClaim };
