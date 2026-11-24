// Bounded personal memories and persistent pairwise NPC relationship history.
'use strict';
const { changeRelationship } = require('./relationships');

const MEMORY_LIMIT = 40;
const RELATIONSHIP_EVENTS = Object.freeze({
  npc_conversation: { delta: 1, label: 'разговор' },
  road_encounter: { delta: 0, label: 'встреча на дороге' },
  rumor_shared: { delta: 2, label: 'доверенный слух' },
  squad_formed: { delta: 4, label: 'создание отряда' },
  helped: { delta: 12, label: 'помощь' },
  rescued: { delta: 18, label: 'спасение' },
  betrayed: { delta: -35, label: 'предательство' },
  attacked: { delta: -22, label: 'нападение' },
  ally_killed: { delta: -45, label: 'гибель союзника' }
});

function rememberNpcEvent(npc, event) {
  if (!npc || !event || typeof event !== 'object') return null;
  npc.memory ||= [];
  const entry = { ...event, at: Number(event.at) || Date.now() };
  npc.memory.push(entry);
  if (npc.memory.length > MEMORY_LIMIT) npc.memory.splice(0, npc.memory.length - MEMORY_LIMIT);
  return entry;
}

function adjustNpcRelationship(npc, otherId, delta, eventType, now = Date.now()) {
  if (!npc || !otherId || npc.id === otherId) return 0;
  npc.relationships ||= {};
  const score = changeRelationship(npc.relationships[otherId], Number(delta) || 0);
  npc.relationships[otherId] = score;
  npc.relationshipHistory ||= {};
  const previous = npc.relationshipHistory[otherId] || {};
  npc.relationshipHistory[otherId] = {
    encounters: Math.min(9999, (Number(previous.encounters) || 0) + 1),
    lastEvent: eventType || 'interaction',
    lastAt: now,
    score
  };
  return score;
}

function recordNpcInteraction(a, b, eventType, context = {}) {
  if (!a || !b || a === b || !a.id || !b.id) return false;
  const rule = RELATIONSHIP_EVENTS[eventType] || { delta: 0, label: eventType || 'взаимодействие' };
  const delta = Number.isFinite(context.delta) ? context.delta : rule.delta;
  const now = Number(context.at) || Date.now();
  const location = context.location || a.location || b.location || null;
  const scoreA = adjustNpcRelationship(a, b.id, delta, eventType, now);
  const scoreB = adjustNpcRelationship(b, a.id, delta, eventType, now);
  rememberNpcEvent(a, { type: eventType, npcId: b.id, name: b.name, location, at: now, relationshipDelta: delta, relationship: scoreA });
  rememberNpcEvent(b, { type: eventType, npcId: a.id, name: a.name, location, at: now, relationshipDelta: delta, relationship: scoreB });
  return true;
}

function recordNpcAllyDeath(world, victim, killer, now = Date.now()) {
  if (!world || !victim || !killer) return 0;
  let witnesses = 0;
  for (const witness of Object.values(world.npcState || {})) {
    if (!witness || witness === victim || witness === killer || witness.alive === false) continue;
    const knowsVictim = (witness.friends || []).includes(victim.id) || (witness.squadId && witness.squadId === victim.squadId) || getNpcRelationship(witness, victim.id) >= 20;
    if (!knowsVictim) continue;
    adjustNpcRelationship(witness, killer.id, RELATIONSHIP_EVENTS.ally_killed.delta, 'ally_killed', now);
    rememberNpcEvent(witness, { type: 'ally_killed', npcId: killer.id, name: killer.name, victimId: victim.id, victimName: victim.name, location: victim.location, at: now, relationship: getNpcRelationship(witness, killer.id) });
    witnesses++;
  }
  return witnesses;
}

function getNpcRelationship(npc, otherId) {
  return Number(npc?.relationships?.[otherId]) || 0;
}

module.exports = { MEMORY_LIMIT, RELATIONSHIP_EVENTS, rememberNpcEvent, adjustNpcRelationship, recordNpcInteraction, recordNpcAllyDeath, getNpcRelationship };
