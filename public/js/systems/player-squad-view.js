(function (root) {
  'use strict';

  function panelHtml(data, context = {}) {
    const squad = data?.squad;
    const g = context.g || {};
    const zonePlayerId = context.zonePlayerId;
    const escapeHtml = typeof context.escapeHtml === 'function'
      ? context.escapeHtml
      : (value) => String(value ?? '');
    const npcBy = typeof context.npcBy === 'function' ? context.npcBy : () => null;
    const locationName = typeof context.locationName === 'function'
      ? context.locationName
      : (value) => String(value ?? '');

    if (!squad) {
      return '<div class="mutedbox small">Ты пока не состоишь в отряде.</div><button onclick="squadAction(\'create\')">Создать отряд</button>';
    }

    const leader = squad.leader === zonePlayerId;
    const roles = { leader: 'Командир', scout: 'Разведчик', medic: 'Медик', rifleman: 'Стрелок', technician: 'Техник' };
    const members = squad.members.map((m) => `<div class="squad-member"><div><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.faction)} · ${roles[m.role] || 'Стрелок'} ${m.id === squad.leader ? ' · ЛИДЕР' : ''}</small></div>${leader && m.id !== squad.leader ? `<select aria-label="Роль бойца" onchange="squadRole('${m.id}',this.value)"><option value="scout" ${m.role === 'scout' ? 'selected' : ''}>Разведчик</option><option value="medic" ${m.role === 'medic' ? 'selected' : ''}>Медик</option><option value="rifleman" ${m.role === 'rifleman' ? 'selected' : ''}>Стрелок</option><option value="technician" ${m.role === 'technician' ? 'selected' : ''}>Техник</option></select>` : ''}</div>`).join('');
    const journal = (squad.journal || []).slice(0, 8).map((e) => `<div class="squad-log-entry"><small>${new Date(e.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</small> ${escapeHtml(e.text)}</div>`).join('') || '<small class="muted">Журнал пока пуст.</small>';
    const escort = squad.escortNpcId ? `<div class="desc">Сопровождает NPC: ${escapeHtml(npcBy(squad.escortNpcId)?.name || squad.escortNpcId)}</div>` : '';
    const candidates = (g.npcs || []).filter((n) => n.loc === g.loc && n.alive !== false && (n.faction === g.faction || Number(n.relationship || 0) >= 15)).slice(0, 8);

    return `<div class="item block"><div class="squad-heading"><b>Отряд «${escapeHtml(squad.name)}»</b><span class="tag">${squad.members.length}/4</span></div><div class="desc">${escapeHtml(locationName(squad.location))} · ${leader ? 'Ты командуешь' : 'Следуй за командиром'}</div>${members}${escort}${leader && candidates.length ? `<label class="small">Пригласить NPC в сопровождение</label><select id="squadEscortNpc" class="field">${candidates.map((n) => `<option value="${escapeHtml(n.id)}">${escapeHtml(n.name)} · ${escapeHtml(n.role || 'сталкер')}</option>`).join('')}</select><button onclick="squadEscort(document.getElementById('squadEscortNpc').value)">Попросить сопровождать</button>` : ''}<div class="section">Журнал отряда</div><div class="squad-journal">${journal}</div><button class="quiet-action" onclick="squadAction('leave')">Покинуть отряд</button></div>`;
  }

  root.ZonePlayerSquadView = Object.freeze({ panelHtml });
})(typeof window !== 'undefined' ? window : globalThis);
