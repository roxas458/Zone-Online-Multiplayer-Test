const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/combat.js'), 'utf8'), { window });
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/combat-controller.js'), 'utf8'), { window });
  return window;
}
function fixture(overrides = {}) {
  const w = load();
  const battle = { enemy: { name: 'Тестовый противник', hp: 100, maxHp: 100, power: 8 }, guard: false, log: [], turn: 1, allies: [] };
  const g = { hp: 100, items: [{ id: 'rifle', name: 'АК-74', type: 'Оружие', condition: 80 }, { id: 'med', name: 'Аптечка', type: 'Медицина', qty: 2 }], equipment: { weapon: 'АК-74' } };
  const events = [];
  const ctx = {
    battle, g, zoneSocket: null, zonePlayerReady: false,
    equippedWeapon: () => g.items.find(x => x.type === 'Оружие'), weaponPower: item => w.ZoneCombat.weaponPower(item),
    artifactEffect: () => 0, combatLog: message => events.push(message), renderCombat: () => events.push('render'),
    finishCombat: result => events.push(`finish:${result}`), playerDeath: cause => events.push(`death:${cause}`),
    save: () => events.push('save'), alert: message => events.push(`alert:${message}`),
    random: () => 0.5, ...overrides
  };
  return { w, battle, g, events, ctx };
}

test('combat controller is loaded before game.js and game delegates turn flow', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('/js/systems/combat-controller.js') < html.indexOf('/js/game.js'));
  assert.match(game, /ZoneCombatController\.combatAction\(combatControllerContext\(\),action\)/);
  assert.match(game, /ZoneCombatController\.enemyTurn\(combatControllerContext\(\)\)/);
});

test('attack action applies weapon damage and wear, then lets the enemy respond', () => {
  const { w, battle, g, events, ctx } = fixture();
  w.ZoneCombatController.combatAction(ctx, 'attack');
  assert.equal(battle.enemy.hp, 84); // 16 attack damage; enemy response does not alter enemy HP
  assert.equal(g.items[0].condition, 79);
  assert.equal(g.hp, 90);
  assert.ok(events.some(x => String(x).includes('игровую атаку')));
  assert.ok(events.includes('save'));
});

test('medical action consumes one valid item, heals within cap and triggers enemy turn', () => {
  const { w, g, events, ctx } = fixture();
  g.hp = 70;
  w.ZoneCombatController.combatAction(ctx, 'med');
  assert.equal(g.items[1].qty, 1);
  assert.equal(g.hp, 90); // +32 healing, then 8 enemy damage
  assert.ok(events.some(x => String(x).includes('восстановлено 30')));
});

test('guard and retreat preserve turn behavior and retreat success chance', () => {
  const guarded = fixture();
  guarded.w.ZoneCombatController.combatAction(guarded.ctx, 'guard');
  assert.equal(guarded.battle.guard, false);
  assert.equal(guarded.g.hp, 97); // guard reduces the 8-point hit
  const escaped = fixture({ random: () => 0.1 });
  escaped.w.ZoneCombatController.combatAction(escaped.ctx, 'retreat');
  assert.ok(escaped.events.includes('finish:escape'));
});

test('online NPC combat remains server-authoritative and sends no local damage', () => {
  const sent = [];
  const { w, battle, g, events, ctx } = fixture({ zoneSocket: { connected: true, emit: (...args) => sent.push(args) }, zonePlayerReady: true });
  battle.npcId = 'npc-1';
  const hp = g.hp, enemyHp = battle.enemy.hp;
  w.ZoneCombatController.combatAction(ctx, 'attack');
  assert.equal(JSON.stringify(sent), JSON.stringify([['npc:combat:action', { action: 'attack' }]]));
  assert.equal(g.hp, hp);
  assert.equal(battle.enemy.hp, enemyHp);
  assert.ok(events.some(x => String(x).includes('Ожидаем расчёт серверной')));
});
