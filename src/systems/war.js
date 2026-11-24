// WAR SYSTEM domain rules. All inputs are validated by the caller before persistence.
const WAR_CONFIG = Object.freeze({ operationCost: 350, deploymentCost: 100, maxParticipants: 24, maxActiveOperations: 8, minimumDeployments: 2 });
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
function createOperation({ id, location, pointId = null, pointName = null, attacker, defender, createdBy, now = Date.now(), territoryControl = 50 }) {
  return { id, location, pointId, pointName, attacker, defender, createdBy, createdAt: now, status: 'active', phase: 'mobilization', participants: [], attackScore: 0, defenseScore: clamp(territoryControl, 20, 100), log: [{ at: now, text: `Началась операция: ${attacker} против ${defender}.` }] };
}
function deploymentPower({ xp = 0, rep = 0, action = 'attack' }) {
  return clamp(10 + Math.floor(clamp(xp, 0, 1e7) / 100) + Math.floor(clamp(rep, -1000, 1000) / 20) + (action === 'defend' ? 4 : 0), 10, 80);
}
function addDeployment(operation, player, action, power, now = Date.now()) {
  if (!operation || operation.status !== 'active') return { ok: false, reason: 'Операция уже завершена.' };
  if (!['attack', 'defend'].includes(action)) return { ok: false, reason: 'Неизвестный приказ.' };
  if (operation.participants.some(x => x.playerId === player.id)) return { ok: false, reason: 'Ты уже участвуешь в этой операции.' };
  if (operation.participants.length >= WAR_CONFIG.maxParticipants) return { ok: false, reason: 'Отряд операции заполнен.' };
  const side = action === 'attack' ? operation.attacker : operation.defender;
  if (player.faction !== side) return { ok: false, reason: 'Группировка не может выполнить этот приказ.' };
  operation.participants.push({ playerId: player.id, name: player.name, faction: player.faction, side, action, power, at: now });
  if (action === 'attack') operation.attackScore += power; else operation.defenseScore += power;
  operation.log.push({ at: now, text: `${player.name} (${player.faction}) присоединился: ${action === 'attack' ? 'штурм' : 'оборона'} · сила ${power}.` });
  operation.log = operation.log.slice(-30);
  return { ok: true };
}
function resolveOperation(operation) {
  if (!operation || operation.status !== 'active') return { ok: false, reason: 'Операция недоступна.' };
  if (operation.participants.length < WAR_CONFIG.minimumDeployments) return { ok: false, reason: 'Нужно минимум два участника операции.' };
  const winner = operation.attackScore > operation.defenseScore ? operation.attacker : operation.defender;
  operation.status = 'resolved'; operation.phase = 'aftermath'; operation.winner = winner; operation.resolvedAt = Date.now();
  operation.log.push({ at: operation.resolvedAt, text: `Операция завершена. Победитель: ${winner}.` });
  return { ok: true, winner, captured: winner === operation.attacker };
}
module.exports = { WAR_CONFIG, createOperation, deploymentPower, addDeployment, resolveOperation };
