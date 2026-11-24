// NPC dialogue overlay and presentation, separated from game-state decisions.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ZoneNpcDialogueView = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function create(deps) {
    const $ = deps.getElement;
    let overlayOrigin = null;

    function restoreOverlay() {
      const overlay = $('npcDialogueOverlay');
      if (!overlay || !overlayOrigin) return;
      const { parent, next } = overlayOrigin;
      if (parent) {
        if (next && next.parentNode === parent) parent.insertBefore(overlay, next);
        else parent.appendChild(overlay);
      }
      overlayOrigin = null;
    }

    function showOverlay() {
      const overlay = $('npcDialogueOverlay');
      if (!overlay) return;
      const frame = $('zoneMapFrame');
      if (frame && deps.document.fullscreenElement === frame && overlay.parentNode !== frame) {
        if (!overlayOrigin) overlayOrigin = { parent: overlay.parentNode, next: overlay.nextSibling };
        frame.appendChild(overlay);
      }
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      deps.document.body.classList.add('dialogue-open');
    }

    function render(npc, message, choices) {
      const box = $('dialogueBox'), choiceBox = $('dialogueChoices');
      if (!npc || !box || !choiceBox) return;
      const left = $('dialoguePortraitLeft');
      if (left) left.innerHTML = deps.portraitMarkup(npc, true);
      $('dialogueNpcName').textContent = npc.name || 'Сталкер';
      $('dialogueNpcFaction').textContent = npc.faction || 'Неизвестная группировка';
      $('dialogueNpcRole').textContent = npc.role || 'Полевой сталкер';
      $('dialoguePlayerName').textContent = deps.playerDisplayName();
      $('dialoguePlayerFaction').textContent = deps.getGameState().faction || 'Одиночки';
      box.innerHTML = `<div class="cop-message"><b>${deps.escapeHtml(npc.name || 'Сталкер')}</b><p>${deps.escapeHtml(message || npc.greeting || '…')}</p></div>`;
      const safeChoices = (Array.isArray(choices) && choices.length ? choices : (Array.isArray(npc.topics) ? npc.topics : []))
        .filter(topic => Array.isArray(topic) && topic.length >= 2);
      const npcId = deps.escapeHtml(npc.id);
      choiceBox.innerHTML = safeChoices.map((topic, index) => `<button type="button" onclick="topic('${npcId}',${index})">${deps.escapeHtml(topic[0])}</button>`).join('')
        + (npc.role === 'техник' ? `<button type="button" class="dialogue-trade-action" onclick="openRepairWorkshop('${npcId}')">⚙ Мастерская: ремонт оружия и брони</button>` : '')
        + `<button type="button" class="dialogue-trade-action" onclick="openActiveNpcTrade()">Торговать</button>`;
    }

    function closeOverlay() {
      const overlay = $('npcDialogueOverlay');
      if (overlay) {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
      }
      restoreOverlay();
      deps.document.body.classList.remove('dialogue-open');
      const box = $('dialogueBox');
      if (box) box.textContent = 'Разговор завершён. Можно осмотреться или встретить другого персонажа.';
    }

    return Object.freeze({ restoreOverlay, showOverlay, render, closeOverlay });
  }

  return Object.freeze({ create });
});
