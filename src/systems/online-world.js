'use strict';

const MAX_EVENTS = 500;
const MAX_DELTA = 150;

function ensureOnlineWorld(world) {
  world.revision = Number.isSafeInteger(world.revision) && world.revision > 0 ? world.revision : 1;
  world.eventLog = Array.isArray(world.eventLog) ? world.eventLog.slice(-MAX_EVENTS) : [];
  world.worldClock = Number.isFinite(world.worldClock) ? world.worldClock : Date.now();
  world.onlineMetrics ||= { totalJoins: 0, totalMoves: 0, lastTickAt: 0 };
  return world;
}

function appendWorldEvent(world, type, payload = {}, now = Date.now()) {
  ensureOnlineWorld(world);
  const event = {
    id: `${world.revision + 1}-${now}`,
    revision: world.revision + 1,
    type: String(type).slice(0, 48),
    payload,
    at: now
  };
  world.revision = event.revision;
  world.worldClock = now;
  world.eventLog.push(event);
  if (world.eventLog.length > MAX_EVENTS) world.eventLog.splice(0, world.eventLog.length - MAX_EVENTS);
  return event;
}

function buildWorldSync(world, sinceRevision = 0) {
  ensureOnlineWorld(world);
  const current = world.revision;
  const since = Number.isSafeInteger(Number(sinceRevision)) ? Math.max(0, Number(sinceRevision)) : 0;
  const first = world.eventLog[0]?.revision ?? current;
  const canReplay = since >= first - 1 && since <= current && current - since <= MAX_DELTA;
  if (canReplay) {
    return { mode: 'delta', fromRevision: since, revision: current, events: world.eventLog.filter(e => e.revision > since) };
  }
  return { mode: 'snapshot', fromRevision: since, revision: current, snapshot: world };
}

function publicWorldStatus(world, onlineCount = 0) {
  ensureOnlineWorld(world);
  return {
    revision: world.revision,
    worldClock: world.worldClock,
    online: onlineCount,
    npcCount: Object.values(world.npcState || {}).filter(n => n && n.alive).length,
    activeWars: (world.warOperations || []).filter(op => op.status === 'active').length,
    sectors: Object.keys(world.territoryOwners || {}).length,
    lastTickAt: world.onlineMetrics.lastTickAt || 0
  };
}

module.exports = { MAX_EVENTS, ensureOnlineWorld, appendWorldEvent, buildWorldSync, publicWorldStatus };
