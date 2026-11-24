'use strict';

const DEFAULT_RULES = Object.freeze({
  'player:hello': { limit: 5, windowMs: 60_000 },
  'player:save': { limit: 12, windowMs: 10_000 },
  'player:item:use': { limit: 8, windowMs: 10_000 },
  'player:quest:turnin': { limit: 3, windowMs: 10_000 },
  'player:contract:complete': { limit: 3, windowMs: 10_000 },
  'player:survival:camp': { limit: 2, windowMs: 60_000 },
  'world:chat:send': { limit: 6, windowMs: 10_000 },
  'world:poi:discover': { limit: 3, windowMs: 10_000 },
  'npc:combat:start': { limit: 4, windowMs: 10_000 },
  'npc:combat:kill': { limit: 2, windowMs: 10_000 },
  'coop:join': { limit: 4, windowMs: 10_000 },
  'coop:contribute': { limit: 3, windowMs: 10_000 },
  '*': { limit: 40, windowMs: 10_000 }
});

function createSocketRateLimiter(rules = DEFAULT_RULES, now = Date.now) {
  const buckets = new Map();
  function allow(socketId, eventName) {
    const rule = rules[eventName] || rules['*'];
    const key = `${socketId}:${eventName}`;
    const time = now();
    let bucket = buckets.get(key);
    if (!bucket || time - bucket.startedAt >= rule.windowMs) {
      bucket = { startedAt: time, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    return bucket.count <= rule.limit;
  }
  allow.clear = socketId => { for (const key of buckets.keys()) if (key.startsWith(`${socketId}:`)) buckets.delete(key); };
  return allow;
}

module.exports = { DEFAULT_RULES, createSocketRateLimiter };
