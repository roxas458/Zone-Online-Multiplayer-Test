// NPC dialogue choices and their gameplay side effects.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ZoneNpcDialogueActions = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function create(deps) {
    function topic(id, index) {
      const npc = deps.npcBy(id);
      if (npc && !deps.npcInInteractionRange(npc)) {
        deps.alert('Ты отошёл слишком далеко от сталкера. Подойди ближе (8 м).');
        return;
      }
      if (deps.isSocketConnected()) {
        deps.setIgnoredInteractionReplyFor(id);
        deps.emitTopic(id, index);
      }
      const current = deps.npcBy(id);
      const selected = current?.topics?.[index];
      if (!current || !selected) return;
      const result = selected[1];

      if (id === 'wolf' && index === 1) deps.addQuest('bread');
      if (id === 'sid' && index === 2) deps.addQuest('scrap');
      if (id === 'barman' && index === 2) deps.addQuest('rumors');
      if (id === 'prof' && index === 1) { deps.addQuest('rumors'); deps.addQuest('research'); }
      if (id === 'scientist' && index === 1) deps.addQuest('scrap');
      if (id === 'wolf') { deps.setFlag('metWolf', true); if (index === 1) deps.addQuest('bread'); }
      if (id === 'scout') deps.setFlag('metScout', true);
      if (id === 'prof') deps.setFlag('metProf', true);
      if (id === 'sid') deps.setFlag('metSid', true);
      if (id === 'barman') deps.setFlag('heardBar', true);

      deps.renderDialogue(current, result, [['Задать другой вопрос', 0], ['Завершить разговор', 1]]);
      const choiceBox = deps.getElement('dialogueChoices');
      if (choiceBox) {
        const safeId = deps.escapeHtml(id);
        choiceBox.innerHTML = `<button onclick="startTalk('${safeId}')">Задать другой вопрос</button>${id === 'sid' && index === 2 ? '<button onclick="turnIn(\'scrap\')">Передать металлолом</button>' : ''}${id === 'wolf' && index === 1 ? '<button onclick="turnIn(\'bread\')">Передать хлеб</button>' : ''}<button onclick="closeTalk()">Попрощаться</button>`;
      }
      deps.log(`Разговор: ${current.name} — ${selected[0]}`);
      deps.save();
    }
    return Object.freeze({ topic });
  }

  return Object.freeze({ create });
});
