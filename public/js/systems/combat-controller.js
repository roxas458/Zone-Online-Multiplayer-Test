// Turn-based combat flow. All world mutations are supplied by the game adapter;
// NPC combat remains server-authoritative whenever the online session is active.
(function (global) {
  "use strict";

  function enemyTurn(ctx) {
    const { battle, g, artifactEffect, combatLog, renderCombat, playerDeath, random = Math.random } = ctx;
    if (!battle) return;
    const armor = g.items.find(x => x.name === g.equipment?.suit && x.type === "Броня");
    const helmet = g.items.find(x => x.name === g.equipment?.helmet && x.type === "Шлем");
    const damage = global.ZoneCombat.enemyTurnDamage({
      power: battle.enemy.power,
      randomValue: random(),
      armorCondition: armor ? Number(armor.condition ?? 70) : null,
      armorDefense: armor?.defense,
      helmetCondition: helmet ? Number(helmet.condition ?? 100) : null,
      helmetDefense: helmet?.defense,
      artifactReduction: artifactEffect("damageReduction"),
      enemySupportCount: (battle.enemySupport || []).length,
      guard: battle.guard
    });
    battle.guard = false;
    g.hp = Math.max(0, g.hp - damage);
    if (armor && damage > 0) armor.condition = Math.max(0, Number(armor.condition ?? 100) - Math.max(1, Math.ceil(damage / 12)));
    if (helmet && damage > 0) helmet.condition = Math.max(0, Number(helmet.condition ?? 100) - Math.max(1, Math.ceil(damage / 28)));
    combatLog(`${battle.enemy.name} наносит условный урон: −${damage} здоровья. Броня: ${armor ? Math.round(armor.condition) + "%" : "не надета"}.`);
    if (g.hp <= 0) {
      playerDeath(`погиб в бою с ${battle.enemy.name}`);
      return;
    }
    renderCombat();
  }

  function combatAction(ctx, action) {
    const { battle, g, zoneSocket, zonePlayerReady, equippedWeapon, weaponPower, combatLog, renderCombat, finishCombat, save, alert, random = Math.random } = ctx;
    if (!battle) return;
    if (battle.npcId && zoneSocket?.connected && zonePlayerReady) {
      zoneSocket.emit("npc:combat:action", { action });
      combatLog("Действие отправлено. Ожидаем расчёт серверной боевой системы…");
      return;
    }
    if (action === "retreat") {
      if (random() < .68) { finishCombat("escape"); return; }
      combatLog("Отступление не удалось: противник не даёт пройти.");
      enemyTurn(ctx);
      return;
    }
    if (action === "guard") {
      battle.guard = true;
      combatLog("Ты занял защитную позицию. Следующий ответный урон будет снижен.");
      enemyTurn(ctx);
      return;
    }
    if (action === "med") {
      const med = g.items.find(x => ["med", "bandage", "trauma_kit"].includes(x.id) && x.qty > 0);
      if (!med) return alert("В рюкзаке нет подходящего медицинского средства.");
      if (g.hp >= 100) return alert("Здоровье уже полное.");
      med.qty--;
      const restored = global.ZoneCombat.medicalHealing(med.id);
      const actual = Math.min(restored, 100 - g.hp);
      g.hp += actual;
      combatLog(`${med.name}: восстановлено ${actual} здоровья.`);
      enemyTurn(ctx);
      save();
      return;
    }
    const weapon = equippedWeapon();
    const power = weaponPower(weapon);
    const damage = global.ZoneCombat.playerAttackDamage(power, random());
    battle.enemy.hp = Math.max(0, battle.enemy.hp - damage);
    if (weapon && weapon.condition != null) weapon.condition = Math.max(0, weapon.condition - 1);
    combatLog(`Ты провёл игровую атаку. Противник потерял ${damage} очков здоровья.`);
    const allies = (battle.allies || []).filter(ally => ally.hp > 0);
    if (allies.length && battle.enemy.hp > 0) {
      const support = global.ZoneCombat.allySupportDamage(allies.length, random);
      battle.enemy.hp = Math.max(0, battle.enemy.hp - support);
      combatLog(`Твой отряд поддержал огнём: ещё −${support} здоровья противнику.`);
    }
    if (battle.enemy.hp <= 0) {
      renderCombat();
      finishCombat("win");
      return;
    }
    enemyTurn(ctx);
    save();
  }

  global.ZoneCombatController = Object.freeze({ enemyTurn, combatAction });
})(window);
