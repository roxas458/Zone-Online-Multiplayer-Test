// Local combat outcome resolution. UI, persistence and death handling remain in the game adapter.
(function (global) {
  "use strict";

  function resolveCombatOutcome({ result, battle, random = Math.random } = {}) {
    if (!battle) return { status: 'ignored' };
    const enemyName = String(battle.enemy?.name || 'противник');

    if (result === 'win') {
      // NPC encounters are settled by the server; never award local rewards here.
      if (battle.npcId) return { status: 'await-server' };
      return {
        status: 'win',
        reward: 60 + Math.floor(random() * 100),
        xp: 18 + Math.floor(random() * 16),
        enemyName,
        logMessage: null,
        newsTitle: 'Сводка столкновения'
      };
    }

    if (result === 'escape') {
      return {
        status: 'escape',
        staminaCost: 8,
        logMessage: 'Ты отступил и избежал дальнейшего столкновения.'
      };
    }

    return {
      status: 'defeat',
      deathCause: `погиб в столкновении с ${enemyName}`
    };
  }

  global.ZoneCombatResults = Object.freeze({ resolveCombatOutcome });
})(window);
