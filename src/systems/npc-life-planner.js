'use strict';

const { SECTOR_COORDS } = require('./proximity');
const { TRADER_ROLES, clamp } = require('./npc-life-constants');
const { seeded } = require('./npc-life-utils');

function pointFor(npc, kind, now) {
  const center = SECTOR_COORDS[npc.location] || SECTOR_COORDS.cordon;
  const seed = seeded(npc.id, `${kind}:${Math.floor(now / 60000)}`);
  const angle = (seed % 100000) / 100000 * Math.PI * 2;
  const radius = kind === 'campfire' ? 18 : kind === 'trader' ? 54 : kind === 'scavenge' ? 105 : kind === 'social' ? 30 : 70;
  return { x: clamp(center[0] + Math.cos(angle) * radius, 5, 995), y: clamp(center[1] + Math.sin(angle) * radius, 5, 1995) };
}

// Selects and assigns the next civilian activity without advancing active routines.
function planNpcLifeRoutine(npc, bySector, now, random = Math.random) {
  if (npc.destinationPoint || now < (Number(npc.nextLifeAt) || 0) || random() > .012) return null;

  const role = String(npc.role || '').toLowerCase();
  const needs = npc.needs || {};
  let activity = 'camp';
  if (Number(needs.fatigue) > 65 || Number(needs.stress) > 80) activity = 'rest';
  else if (TRADER_ROLES.some(item => role.includes(item)) || random() < .18) activity = 'trade';
  else if (random() < .32) activity = 'scavenge';
  else if (random() < .62) activity = 'social';

  let target = pointFor(npc, activity === 'trade' ? 'trader' : activity === 'scavenge' ? 'scavenge' : activity === 'rest' ? 'campfire' : activity === 'social' ? 'social' : 'campfire', now);
  if (activity === 'trade') {
    const traders = (bySector.get(npc.location) || []).filter(other => {
      const traderRole = String(other.role || '').toLowerCase();
      return other !== npc && other.alive !== false && TRADER_ROLES.some(item => traderRole.includes(item)) && Number.isFinite(Number(other.x)) && Number.isFinite(Number(other.y));
    });
    if (traders.length) {
      traders.sort((a, b) => Math.hypot(a.x - npc.x, a.y - npc.y) - Math.hypot(b.x - npc.x, b.y - npc.y));
      target = { x: Number(traders[0].x), y: Number(traders[0].y) };
    }
  }

  npc.lifeRoutine = { activity, phase: 'outbound', target, home: { x: Number(npc.x) || target.x, y: Number(npc.y) || target.y }, startedAt: now, sector: npc.location };
  npc.destinationPoint = { ...target };
  npc.action = 'travel';
  npc.behavior = activity === 'scavenge' ? 'artifact_search_route' : activity === 'trade' ? 'going_to_trader' : activity === 'rest' ? 'going_to_rest' : 'going_to_campfire';
  npc.duty = 'civilian_routine';
  npc.guardPost = false;
  npc.nextLifeAt = now + 5 * 60 * 1000 + Math.floor(random() * 7 * 60 * 1000);

  return {
    type: 'npc_life_departure', npcId: npc.id, location: npc.location, activity,
    text: `${npc.name} отправился ${activity === 'trade' ? 'к торговцу' : activity === 'scavenge' ? 'искать артефакты' : activity === 'rest' ? 'отдохнуть' : 'к месту стоянки'} в секторе ${npc.location}.`,
    at: now
  };
}

module.exports = { planNpcLifeRoutine, pointFor };
