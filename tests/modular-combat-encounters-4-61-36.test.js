const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/combat.js'), 'utf8'), { window });
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/combat-encounters.js'), 'utf8'), { window });
  return window;
}

test('random encounter factory preserves chance gating, template selection and XP scaling', () => {
  const w = load();
  const rolls = [0.99, 0.4];
  assert.equal(w.ZoneCombatEncounters.createRandomEncounter({ risk: 'Низкий', xp: 0, random: () => rolls.shift() }), null);
  const forced = w.ZoneCombatEncounters.createRandomEncounter({ risk: 'Низкий', xp: 800, force: true, random: () => 0 });
  assert.equal(forced.enemy.name, 'Псевдособака');
  assert.equal(forced.enemy.hp, 87);
  assert.equal(forced.enemy.maxHp, 87);
  assert.equal(forced.description, 'Осторожный мутант держится на расстоянии.');
  assert.equal(forced.guard, false);
  assert.deepEqual(JSON.parse(JSON.stringify(forced.log)), []);
  assert.equal(forced.turn, 1);
});

test('NPC encounter factory builds player allies, enemy support and a bounded starting health value', () => {
  const w = load();
  const npc = { id: 'enemy-1', name: 'Ворон', faction: 'Бандиты', health: 120, icon: '☠' };
  const encounter = w.ZoneCombatEncounters.createNpcEncounter({
    npc,
    allies: [{ id: 'player-1', name: 'Союзник' }, { id: 'local-player', name: 'Игрок' }],
    enemySupport: [{ id: 'enemy-2' }, { id: 'enemy-1' }],
    random: () => 0.5
  });
  assert.equal(encounter.npcId, 'enemy-1');
  assert.equal(encounter.enemy.hp, 120);
  assert.equal(encounter.enemy.maxHp, 120);
  assert.equal(encounter.enemy.power, 11);
  assert.equal(encounter.allies.length, 2);
  assert.equal(encounter.allies[0].hp, 100);
  assert.equal(encounter.enemySupport.length, 1);
  assert.equal(encounter.guard, false);
  assert.equal(encounter.turn, 1);
  assert.match(encounter.enemy.desc, /Бандиты/);
});

test('browser loads encounter factory before game and delegates encounter construction', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('/js/systems/combat-encounters.js') < html.indexOf('/js/game.js'));
  assert.match(game, /ZoneCombatEncounters\.createRandomEncounter/);
  assert.match(game, /ZoneCombatEncounters\.createNpcEncounter/);
  assert.doesNotMatch(game, /const enemyTemplates=\[/);
});
