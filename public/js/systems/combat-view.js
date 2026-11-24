// Combat presentation layer. The controller supplies live battle/player data and DOM helpers.
(function (global) {
  "use strict";

  function combatLog(ctx, message) {
    const { battle, $, escapeHtml } = ctx;
    if (!battle) return;
    battle.log.unshift(String(message));
    battle.log = battle.log.slice(0, 12);
    $("combatLog").innerHTML = battle.log.map(line => `<div>${escapeHtml(line)}</div>`).join("");
  }

  function renderCombat(ctx) {
    const { battle, g, $, equippedWeapon, weaponPower } = ctx;
    if (!battle) return;
    const enemy = battle.enemy;
    $("enemyName").textContent = enemy.name;
    $("enemyIcon").textContent = enemy.icon;
    $("enemyDesc").textContent = enemy.desc;
    $("enemyHpText").textContent = Math.max(0, enemy.hp) + " / " + enemy.maxHp;
    $("enemyHpBar").style.width = Math.max(0, enemy.hp / enemy.maxHp * 100) + "%";
    $("playerHpText").textContent = g.hp + "%";
    $("playerHpBar").style.width = g.hp + "%";
    const weapon = equippedWeapon();
    $("combatWeapon").textContent = weapon
      ? `${weapon.name} · сила ${weaponPower(weapon)} · состояние ${weapon.condition ?? "—"}%`
      : "Нет оружия · сила 8";
  }

  global.ZoneCombatView = Object.freeze({ combatLog, renderCombat });
})(window);
