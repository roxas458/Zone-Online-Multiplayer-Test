// Combat encounter setup. This module builds encounter state only; UI,
// validation, rewards, persistence and online authority stay in game.js/server.
(function (global) {
  "use strict";

  const ENEMY_TEMPLATES = Object.freeze([
    Object.freeze({ name: 'Псевдособака', icon: '🐺', hp: 58, power: 9, desc: 'Осторожный мутант держится на расстоянии.' }),
    Object.freeze({ name: 'Плоть', icon: '☣', hp: 72, power: 8, desc: 'Неуклюжий, но выносливый обитатель Зоны.' }),
    Object.freeze({ name: 'Группа мародёров', icon: '♟', hp: 85, power: 10, desc: 'Небольшая враждебная группа перекрыла маршрут.' }),
    Object.freeze({ name: 'Кровосос', icon: '◉', hp: 92, power: 12, desc: 'Опасная встреча. Лучше не затягивать столкновение.' }),
    Object.freeze({ name: 'Снорк', icon: '☢', hp: 66, power: 11, desc: 'Непредсказуемый противник из заражённого сектора.' })
  ]);

  function createRandomEncounter({ risk, xp, force = false, random = Math.random } = {}) {
    if (!force && random() > global.ZoneCombat.encounterChance(risk)) return null;
    const template = ENEMY_TEMPLATES[Math.floor(random() * ENEMY_TEMPLATES.length)];
    const enemy = global.ZoneCombat.scaleEnemy({ ...template }, xp);
    return { enemy, guard: false, log: [], turn: 1, description: template.desc };
  }

  function createNpcEncounter({ npc, allies = [], enemySupport = [], random = Math.random } = {}) {
    if (!npc) return null;
    const hp = Math.max(35, Math.round(Number(npc.health) || 80));
    return {
      npcId: npc.id,
      allies: allies.filter(member => member && member.id !== undefined).map(member => ({ ...member, hp: 100 })),
      enemySupport: enemySupport.filter(member => member && member.id !== npc.id),
      enemy: {
        name: npc.name,
        icon: npc.icon || '♟',
        hp,
        maxHp: hp,
        power: 8 + Math.floor(random() * 6),
        desc: `Враждебный сталкер группировки «${npc.faction}» вступил в бой. ${allies.length ? `Твой отряд поддерживает тебя: ${allies.length} бойца.` : ''} ${enemySupport.length ? `Рядом поддержка противника: ${enemySupport.length} бойца.` : ''}`
      },
      guard: false,
      log: [],
      turn: 1
    };
  }

  global.ZoneCombatEncounters = Object.freeze({
    enemyTemplates: ENEMY_TEMPLATES,
    createRandomEncounter,
    createNpcEncounter
  });
})(window);
