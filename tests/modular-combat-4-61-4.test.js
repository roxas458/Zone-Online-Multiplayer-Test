const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function loadCombat() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/combat.js'), 'utf8'), { window });
  return window.ZoneCombat;
}

test('combat system loads before the game compatibility client', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(html.indexOf('/js/systems/combat.js') < html.indexOf('/js/game.js'));
});

test('weapon power preserves weapon classes, condition scaling and empty-hand baseline', () => {
  const combat = loadCombat();
  assert.equal(combat.weaponPower(null), 8);
  assert.equal(combat.weaponPower({ name: 'АК-74', condition: 100 }), 19);
  assert.equal(combat.weaponPower({ name: 'Гаусс-пушка', condition: 50 }), 14);
  assert.equal(combat.weaponPower({ name: 'Неизвестное оружие', power: 16, condition: 100 }), 16);
});

test('encounter probabilities and XP enemy scaling preserve existing limits', () => {
  const combat = loadCombat();
  assert.equal(combat.encounterChance('Низкий'), 0.08);
  assert.equal(combat.encounterChance('Критический'), 0.4);
  assert.equal(combat.encounterChance('неизвестно'), 0.15);
  assert.deepEqual(JSON.parse(JSON.stringify(combat.scaleEnemy({ name: 'Тест', hp: 100 }, 800))), { name: 'Тест', hp: 150, maxHp: 150 });
  assert.equal(combat.scaleEnemy({ hp: 100 }, -10000).hp, 80);
  assert.equal(combat.scaleEnemy({ hp: 100 }, 10000).hp, 150);
});

test('player attack, ally support and healing calculations preserve original ranges', () => {
  const combat = loadCombat();
  assert.equal(combat.playerAttackDamage(12, 0), 9);
  assert.equal(combat.playerAttackDamage(12, 0.999), 17);
  const rolls = [0, 0.5, 0.999];
  assert.equal(combat.allySupportDamage(3, () => rolls.shift()), 24);
  assert.equal(combat.medicalHealing('trauma_kit'), 50);
  assert.equal(combat.medicalHealing('bandage'), 12);
  assert.equal(combat.medicalHealing('med'), 32);
});

test('enemy damage calculation includes armor, helmet, artifacts, support and guard', () => {
  const combat = loadCombat();
  const input = { power: 10, randomValue: 0.8, armorCondition: 100, armorDefense: 4, helmetCondition: 100, helmetDefense: 1, artifactReduction: 2, enemySupportCount: 2, guard: false };
  assert.equal(combat.enemyTurnDamage(input), 11);
  assert.equal(combat.enemyTurnDamage({ ...input, guard: true }), 2);
  assert.equal(combat.enemyTurnDamage({ power: 1, randomValue: 0, enemySupportCount: 0 }), 2);
});

test('game delegates combat calculations while retaining server-authoritative NPC combat actions', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(client, /ZoneCombat\.weaponPower\(item\)/);
  assert.match(client, /ZoneCombatEncounters\.createRandomEncounter/);
  assert.match(client, /ZoneCombatEncounters\.createNpcEncounter/);
  assert.match(client, /ZoneCombatController\.enemyTurn\(/);
  assert.match(client, /ZoneCombatController\.combatAction\(/);
  const controller = fs.readFileSync(path.join(root, 'public/js/systems/combat-controller.js'), 'utf8');
  assert.match(controller, /battle\.npcId && zoneSocket\?\.connected && zonePlayerReady/);
  assert.match(controller, /zoneSocket\.emit\("npc:combat:action"/);
  assert.match(client, /npc:combat:result/);
});
