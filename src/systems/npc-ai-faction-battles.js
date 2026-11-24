// Persistent faction engagements and battlefront reporting.
'use strict';
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const { recordNpcAllyDeath, recordNpcInteraction } = require('./npc-ai-memory');

function resolveFactionClashes({ world, events, now, random, isHostileFaction }) {

  // Hostile units sharing a sector can enter a persistent battlefront.
  const byLocation = new Map();
  for (const npc of Object.values(world.npcState || {})) {
    if (!npc.alive) continue;
    const group = byLocation.get(npc.location) || [];
    group.push(npc);
    byLocation.set(npc.location, group);
  }
  const hostility = (a, b) => isHostileFaction(a, b, world.diplomacy);
  for (const [location, group] of byLocation) {
    const sides = [...new Set(group.map(n => n.faction))].filter(f => group.some(n => hostility(f, n.faction)));
    if (sides.length < 2 || random() > 0.42) continue;
    const a = group.find(n => n.faction === sides[0]);
    const b = group.find(n => hostility(sides[0], n.faction));
    if (!a || !b) continue;
    const battle = world.battlefronts.find(x => x.location === location && x.status === 'active');
    const engagement = battle || { id:`battle_${location}_${now}`, location, attacker:a.faction, defender:b.faction, status:'active', startedAt:now, rounds:0, losses:0, participants:[] };
    engagement.participants ||= [];
    for (const participant of [a.id, b.id]) if (participant && !engagement.participants.includes(participant)) engagement.participants.push(participant);
    engagement.participants = engagement.participants.slice(-24);
    engagement.rounds++;
    engagement.lastAt = now;
    const damageA = 4 + Math.floor(random() * 13);
    const damageB = 4 + Math.floor(random() * 13);
    b.health = clamp(b.health - damageA, 0, 100);
    a.health = clamp(a.health - damageB, 0, 100);
    a.action = b.action = 'combat';
    a.behavior = b.behavior = 'combat';
    a.mood = b.mood = 'в бою';
    for (const [victim, killer] of [[a, b], [b, a]]) {
      if (victim.health <= 0 && victim.alive) {
        victim.alive = false; victim.action = 'dead';
        victim.deathCause = `погиб в бою с группировкой «${killer.faction}»`;
        victim.diedAt = now;
        victim.combatDeaths = (Number(victim.combatDeaths) || 0) + 1;
        killer.combatKills = (Number(killer.combatKills) || 0) + 1;
        killer.lastCombatKillAt = now; killer.lastVictim = victim.name;
        engagement.losses++;
        recordNpcAllyDeath(world, victim, killer, now);
        recordNpcInteraction(victim, killer, 'attacked', { location, at:now, delta:-30 });
      }
    }
    engagement.participantSnapshots ||= [];
    for (const unit of [a, b]) {
      const snapshot = { id:unit.id, name:unit.name, faction:unit.faction, role:unit.role, health:unit.health, alive:unit.alive, action:unit.action, behavior:unit.behavior, updatedAt:now };
      const index = engagement.participantSnapshots.findIndex(x => x.id === unit.id);
      if (index >= 0) engagement.participantSnapshots[index] = snapshot;
      else engagement.participantSnapshots.push(snapshot);
    }
    engagement.participantSnapshots = engagement.participantSnapshots.slice(-24);
    if (!battle) world.battlefronts.unshift(engagement);
    const attackAlive = group.filter(n => n.alive && n.faction === engagement.attacker).length;
    const defenseAlive = group.filter(n => n.alive && n.faction === engagement.defender).length;
    if (engagement.rounds >= 4 || attackAlive === 0 || defenseAlive === 0) {
      engagement.status = 'resolved'; engagement.endedAt = now;
      const winner = attackAlive === defenseAlive
        ? (attackAlive > 0 ? (random() < 0.5 ? engagement.attacker : engagement.defender) : null)
        : (attackAlive > defenseAlive ? engagement.attacker : engagement.defender);
      engagement.winner = winner;
      if (winner) {
        // Sector ownership remains controlled by faction-war.js key-point logic.
        for (const survivor of group.filter(n => n.alive && n.faction === winner)) {
          survivor.lastClashWinner = winner;
          survivor.morale = clamp((Number(survivor.morale) || 50) + 3, 0, 100);
        }
        events.push({ type:'faction_clash_resolved', location, winner, text:`Столкновение в секторе ${location} завершилось в пользу группировки «${winner}». Контроль ключевых объектов пока не изменился.`, at:now });
      }
    }
    events.push({ type:'npc_skirmish', location, participants:[a.id, b.id], attacker:engagement.attacker, defender:engagement.defender, text:`Перестрелка: ${engagement.attacker} и ${engagement.defender} ведут бой в секторе ${location}.`, at:now });
  }
  world.battlefronts = world.battlefronts.slice(0, 40);
}

module.exports = { resolveFactionClashes };
