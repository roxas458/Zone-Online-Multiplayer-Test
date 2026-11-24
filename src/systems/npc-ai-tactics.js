// Tactical NPC policy: reconnaissance, sector patrols, guard posts and threat response.
'use strict';
const { npcWorldPosition, SECTOR_COORDS } = require('./proximity');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function findNearbyThreat(npc, world, isHostileFaction, maxDistance = 180) {
  const here = npcWorldPosition(npc);
  let nearest = null;
  let nearestDistance = maxDistance;
  for (const other of Object.values(world.npcState || {})) {
    if (!other || other === npc || other.alive === false || other.location !== npc.location) continue;
    if (!isHostileFaction(npc.faction, other.faction, world.diplomacy)) continue;
    const there = npcWorldPosition(other);
    const distance = Math.hypot(here.x - there.x, here.y - there.y);
    if (distance < nearestDistance) {
      nearest = other;
      nearestDistance = distance;
    }
  }
  return nearest ? { npc: nearest, distance: nearestDistance } : null;
}

function reactToNpcThreat(npc, context) {
  const { world, now, events, random, isHostileFaction, nearestFriendlyLocation, owners, moveNpc, scheduleNext, recordAction } = context;
  if (!npc || npc.alive === false || npc.action === 'combat') return false;
  const threat = findNearbyThreat(npc, world, isHostileFaction);
  if (!threat || threat.distance <= 52 || now - (Number(npc.lastThreatResponseAt) || 0) < 90_000) return false;

  npc.lastThreatResponseAt = now;
  npc.lastThreatTargetId = threat.npc.id;
  npc.mood = 'обнаружил угрозу';
  npc.guardPost = false;

  if (Number(npc.health) <= 35) {
    const safe = nearestFriendlyLocation(npc.location, npc.faction, owners);
    if (safe && safe !== npc.location) {
      moveNpc(npc, safe, now, events, 'retreat');
      npc.action = 'retreat';
      npc.behavior = 'threat_retreat';
      npc.duty = 'withdraw_from_threat';
    } else {
      const here = npcWorldPosition(npc);
      const there = npcWorldPosition(threat.npc);
      let dx = here.x - there.x;
      let dy = here.y - there.y;
      const length = Math.hypot(dx, dy) || 1;
      const distance = 48 + Math.floor(random() * 24);
      npc.destinationPoint = {
        x: clamp(here.x + dx / length * distance, 4, 996),
        y: clamp(here.y + dy / length * distance, 4, 1996)
      };
      npc.action = 'seek_cover';
      npc.behavior = 'threat_response';
      npc.duty = 'take_cover';
    }
  } else {
    const here = npcWorldPosition(npc);
    const there = npcWorldPosition(threat.npc);
    let dx = here.x - there.x;
    let dy = here.y - there.y;
    const length = Math.hypot(dx, dy) || 1;
    const distance = 48 + Math.floor(random() * 24);
    npc.destinationPoint = {
      x: clamp(here.x + dx / length * distance, 4, 996),
      y: clamp(here.y + dy / length * distance, 4, 1996)
    };
    npc.action = 'seek_cover';
    npc.behavior = 'threat_response';
    npc.duty = 'take_cover';
  }
  events.push({
    type: 'npc_threat_detected', npcId: npc.id, threatNpcId: threat.npc.id,
    location: npc.location,
    text: `${npc.name} обнаружил угрозу рядом с сектором ${npc.location} и меняет позицию.`, at: now
  });
  scheduleNext(npc, now, random, 1, 3);
  recordAction(npc, now);
  return true;
}

function applyNpcTacticalDecision(npc, context, roll, stage = 'special') {
  const { events, now } = context;
  if (stage === 'special' && npc.squadType === 'разведка' && roll < 0.38) {
    npc.action = 'patrol'; npc.behavior = 'recon'; npc.duty = 'forward_recon';
    npc.guardPost = false; npc.mood = 'насторожен';
    npc.reconLastSector = npc.location;
    npc.reconLastAt = now;
    events.push({ type: 'npc_recon_report', npcId: npc.id, location: npc.location,
      text: `${npc.name} ведёт разведку маршрутов в секторе ${npc.location} и отмечает подозрительную активность.`, at: now });
    return true;
  }
  if (stage === 'guard' && roll >= 0.24 && roll < 0.48) {
    npc.action = 'guard'; npc.behavior = 'guard';
    npc.duty = context.owners[npc.location] === npc.faction ? 'territory_guard' : 'base_guard';
    npc.guardPost = true; npc.guardSector = npc.location; npc.guardSince = now;
    npc.mood = 'насторожен';
    return true;
  }
  return false;
}

function startNpcSectorPatrol(npc, context) {
  const { territoryAdjacency, owners, world, canEnterTerritory, choose, random, moveNpc, events, now } = context;
  const friendly = (territoryAdjacency[npc.location] || []).filter(id =>
    owners[id] === npc.faction || canEnterTerritory(npc.faction, id, owners, world.territoryOrders || {}));
  const next = choose(friendly, random);
  npc.action = 'patrol'; npc.behavior = 'patrol'; npc.duty = 'sector_patrol'; npc.guardPost = false;
  if (next && random() < 0.28) {
    moveNpc(npc, next, now, events, 'patrol');
    npc.homeLocation = npc.homeLocation || npc.baseLocation;
    return 'sector';
  }
  const center = SECTOR_COORDS[npc.location] || SECTOR_COORDS.cordon;
  const angle = random() * Math.PI * 2;
  const radius = 18 + random() * 78;
  npc.destinationPoint = {
    x: clamp(center[0] + Math.cos(angle) * radius, 4, 996),
    y: clamp(center[1] + Math.sin(angle) * radius, 4, 1996)
  };
  return 'local';
}

module.exports = { findNearbyThreat, reactToNpcThreat, applyNpcTacticalDecision, startNpcSectorPatrol };
