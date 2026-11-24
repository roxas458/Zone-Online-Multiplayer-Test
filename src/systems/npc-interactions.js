// Server-authoritative player-to-NPC social interactions.
// This module owns validation, relationship changes, and interaction memory.
const { interactDialogue } = require('./npc-dialogue');
const { npcWorldPosition, inRange } = require('./proximity');
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));

function interactWithNpc(npc, player, action, now = Date.now(), context = {}) {
  if (!npc || !npc.alive) return { ok:false, reason:'Этот сталкер больше не может ответить.' };
  if (!player || player.location !== npc.location) return { ok:false, reason:'Нужно находиться в одном секторе со сталкером.' };
  const playerPosition = player.position || player;
  if (!inRange(playerPosition, npcWorldPosition(npc), 8)) {
    return { ok:false, reason:'Ты слишком далеко. Подойди ближе к сталкеру (радиус разговора — 52 м).' };
  }
  if (!['greet', 'ask', 'trade', 'help', 'topic'].includes(action)) {
    return { ok:false, reason:'Неизвестное действие.' };
  }

  npc.relationships ||= {};
  const current = Number(npc.relationships[player.id]) || 0;
  const delta = action === 'help' ? 5 : action === 'greet' ? 2 : action === 'trade' ? 1 : 0;
  npc.relationships[player.id] = clamp(current + delta, -100, 100);
  npc.memory ||= [];
  npc.memory.push({ type:'player_interaction', playerId:player.id, action, at:now });
  npc.memory = npc.memory.slice(-30);

  const result = interactDialogue(npc, player, action, context, now);
  npc.lastInteractionAt = now;
  return { ok:true, ...result, relationship:npc.relationships[player.id], npcId:npc.id };
}

module.exports = { interactWithNpc };
