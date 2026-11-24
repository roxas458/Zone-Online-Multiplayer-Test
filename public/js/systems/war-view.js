(function (root) {
  'use strict';

  function operationHtml(op, context = {}) {
    const g = context.g || {};
    const zonePlayerId = context.zonePlayerId;
    const escapeHtml = typeof context.escapeHtml === 'function'
      ? context.escapeHtml
      : (value) => String(value ?? '');
    const mine = op.participants?.some((x) => x.playerId === zonePlayerId);
    const side = g.faction === op.attacker ? 'attack' : g.faction === op.defender ? 'defend' : null;
    const commander = op.createdBy === zonePlayerId;
    const location = (g.locations || []).find((l) => l.id === op.location);
    return `<div class="item block"><div class="row" style="justify-content:space-between;align-items:center"><b>⚔ ${escapeHtml(op.pointName || location?.name || op.location)}</b><span class="tag">${op.phase === 'mobilization' ? 'Сбор отрядов' : 'После боя'}</span></div><div class="desc">${escapeHtml(op.attacker)} ⚔ ${escapeHtml(op.defender)}</div><div class="grid three"><div class="stat"><span>Штурм</span><strong>${op.attackScore}</strong></div><div class="stat"><span>Оборона</span><strong>${op.defenseScore}</strong></div><div class="stat"><span>Бойцы</span><strong>${op.participants?.length || 0}</strong></div></div><div class="desc">${(op.log || []).slice(-3).map((x) => escapeHtml(x.text)).join('<br>')}</div><div class="rightbuttons">${side && !mine && op.status === 'active' && g.loc === op.location ? `<button onclick="warDeploy('${op.id}','${side}')">${side === 'attack' ? 'Вступить в штурм' : 'Встать на защиту'} · 100 ₽</button>` : ''}${commander && op.status === 'active' ? `<button onclick="warResolve('${op.id}')">Подвести итог</button>` : ''}${mine ? '<span class="tag">Ты в операции</span>' : ''}</div></div>`;
  }

  root.ZoneWarView = Object.freeze({ operationHtml });
})(typeof window !== 'undefined' ? window : globalThis);
