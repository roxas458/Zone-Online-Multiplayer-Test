// Deterministic combat calculations. Game state, UI, rewards and online
// authority remain in game.js / the server; this module only computes values.
(function (global) {
  "use strict";

  function weaponPower(item) {
    if (!item) return 8;
    const name = String(item.name || "").toLowerCase();
    let power = Math.max(8, Number(item.power) || 12);
    if (/гаусс/.test(name)) power = 27;
    else if (/свд|сву|винтарь|вс/.test(name)) power = 22;
    else if (/гроза|бульдог|рп-74|гп37|ас-96|обокан|трс|ил86|акм|ак-74|акс-74/.test(name)) power = 19;
    else if (/спса|chaser|protecta|обрез|тоз-34/.test(name)) power = 20;
    else if (/форт|кора|удп|пмм|мартышка/.test(name)) power = 13;
    return Math.round(power * (Math.max(25, Number(item.condition ?? 75)) / 100));
  }

  function encounterChance(risk) {
    return ({ "Низкий": .08, "Средний": .17, "Высокий": .26, "Очень высокий": .34, "Критический": .4 })[risk] || .15;
  }

  function scaleEnemy(enemy, xp) {
    const scale = Math.max(.8, Math.min(1.5, 1 + (Number(xp) / 800)));
    const hp = Math.round(enemy.hp * scale);
    return { ...enemy, hp, maxHp: hp };
  }

  function playerAttackDamage(power, randomValue) {
    return Math.max(4, Number(power) + Math.floor(randomValue * 9) - 3);
  }

  function allySupportDamage(count, random) {
    let total = 0;
    for (let i = 0; i < count; i += 1) total += 6 + Math.floor(random() * 5);
    return total;
  }

  function enemyTurnDamage(input) {
    const baseDamage = Number(input.power) + Math.floor(input.randomValue * 5);
    const armor = input.armorCondition == null ? 0 : Math.round((Number(input.armorCondition) / 100) * (Number(input.armorDefense) || 4));
    const helmet = input.helmetCondition == null ? 0 : Math.round((Number(input.helmetCondition) / 100) * (Number(input.helmetDefense) || 1));
    const defense = armor + helmet + Math.round(Number(input.artifactReduction) || 0);
    const squadPressure = Math.min(8, (Number(input.enemySupportCount) || 0) * 2);
    return Math.max(2, baseDamage + squadPressure - defense - (input.guard ? Math.round(baseDamage * .65) : 0));
  }

  function medicalHealing(itemId) {
    return itemId === "trauma_kit" ? 50 : itemId === "bandage" ? 12 : 32;
  }

  global.ZoneCombat = Object.freeze({
    weaponPower, encounterChance, scaleEnemy, playerAttackDamage,
    allySupportDamage, enemyTurnDamage, medicalHealing
  });
})(window);
