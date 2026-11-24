'use strict';

const { ARTIFACTS, TRADER_ROLES, clamp } = require('./npc-life-constants');
const { addMemory } = require('./npc-life-utils');

// Advances an already assigned A-Life routine. This module owns its phases,
// arrival actions, activity effects and return-to-home transition.
function advanceNpcLifeRoutine(npc, now, random, bySector) {
  const events = [];
  const routine = npc.lifeRoutine;
  if (!routine) return events;

  const dx = Number(routine.target?.x) - Number(npc.x);
  const dy = Number(routine.target?.y) - Number(npc.y);
  const distance = Math.hypot(dx, dy);

  if (npc.destinationPoint && distance <= 10) {
    npc.destinationPoint = null;
    npc.action = routine.activity === 'rest' ? 'rest' : routine.activity === 'trade' ? 'trade' : routine.activity === 'scavenge' ? 'scavenge' : 'camp';
  }

  if (!npc.destinationPoint && distance <= 14) {
    if (routine.phase === 'outbound') {
      routine.phase = 'doing';
      routine.arrivedAt = now;
      routine.until = now + (routine.activity === 'scavenge' ? 45000 : routine.activity === 'trade' ? 30000 : 60000);
      npc.action = routine.activity === 'rest' ? 'rest' : routine.activity === 'trade' ? 'trade' : routine.activity === 'scavenge' ? 'scavenge' : 'camp';
      npc.behavior = routine.activity === 'rest' ? 'rest' : routine.activity === 'trade' ? 'trading' : routine.activity === 'scavenge' ? 'artifact_search' : 'campfire';
      events.push({
        type: 'npc_life_arrival', npcId: npc.id, location: npc.location, activity: routine.activity,
        text: `${npc.name} прибыл${npc.gender === 'female' ? 'а' : ''} ${routine.activity === 'trade' ? 'к торговцу' : routine.activity === 'scavenge' ? 'на поиски артефактов' : routine.activity === 'rest' ? 'на отдых' : 'к костру'} в секторе ${npc.location}.`,
        at: now
      });
    } else if (routine.phase === 'doing' && now >= routine.until) {
      if (routine.activity === 'scavenge' && random() < .22) {
        const artifact = ARTIFACTS[Math.floor(random() * ARTIFACTS.length)];
        npc.inventory ||= [];
        npc.inventory.push({ id: `npc_artifact_${npc.id}_${now}`, name: artifact, type: 'artifact', value: 120 + Math.floor(random() * 380), foundAt: now, location: npc.location });
        addMemory(npc, { type: 'artifact_found', name: artifact, location: npc.location, at: now });
        events.push({ type: 'npc_artifact_found', npcId: npc.id, location: npc.location, text: `${npc.name} обнаружил артефакт «${artifact}» в секторе ${npc.location}.`, at: now });
      }

      if (routine.activity === 'trade') {
        npc.supplies = clamp((npc.supplies || 0) + 5, 0, 100);
        npc.lastTradeAt = now;
        const traders = (bySector.get(npc.location) || []).filter(other => other !== npc && TRADER_ROLES.some(role => String(other.role || '').toLowerCase().includes(role)) && Math.hypot((Number(other.x) || 0) - (Number(routine.target?.x) || 0), (Number(other.y) || 0) - (Number(routine.target?.y) || 0)) < 18);
        const trader = traders[0];
        if (trader) {
          trader.stock ||= { items: [], supplies: 0 };
          const goods = (npc.inventory || []).findIndex(item => ['artifact', 'Материал', 'material', 'trade_good'].includes(String(item.type || '')));
          if (goods >= 0) {
            const [item] = npc.inventory.splice(goods, 1);
            trader.stock.items.push({ ...item, receivedFrom: npc.id, receivedAt: now });
            trader.stock.items = trader.stock.items.slice(-80);
            events.push({ type: 'npc_goods_delivered', npcIds: [npc.id, trader.id], location: npc.location, text: `${npc.name} передал торговцу ${trader.name} товар «${item.name}».`, at: now });
          }
          trader.stock.supplies = clamp((trader.stock.supplies || 0) + 2, 0, 10000);
        }
      }

      if (routine.activity === 'rest') {
        npc.needs ||= {};
        npc.needs.fatigue = clamp((npc.needs.fatigue || 0) - 18, 0, 100);
        npc.health = clamp((npc.health || 100) + 2, 0, 100);
      }

      routine.phase = 'returning';
      routine.target = { ...(routine.home || { x: npc.x, y: npc.y }) };
      npc.destinationPoint = { ...routine.target };
      npc.action = 'travel';
      npc.behavior = 'returning_to_camp';
    }
  }

  if (routine.phase === 'returning' && !npc.destinationPoint && distance <= 14) {
    npc.lifeRoutine = null;
    npc.action = 'camp';
    npc.behavior = 'campfire';
    npc.duty = 'rest_at_base';
    npc.nextDecisionAt = now + 30000;
    addMemory(npc, { type: 'routine_completed', activity: routine.activity, location: npc.location, at: now });
  }

  return events;
}

module.exports = { advanceNpcLifeRoutine };
