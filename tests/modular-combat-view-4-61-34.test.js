const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/js/systems/combat-view.js'), 'utf8');
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function loadView() {
  const window = {};
  vm.runInNewContext(source, { window });
  return window.ZoneCombatView;
}
function makeDom() {
  const ids = ['combatLog','enemyName','enemyIcon','enemyDesc','enemyHpText','enemyHpBar','playerHpText','playerHpBar','combatWeapon'];
  const elements = Object.fromEntries(ids.map(id => [id, { textContent: '', innerHTML: '', style: {} }]));
  return id => elements[id] || null;
}

test('combat view module loads before the game client', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(html.indexOf('/js/systems/combat-view.js') < html.indexOf('/js/game.js'));
});

test('combat log escapes messages and keeps only the latest twelve entries', () => {
  const view = loadView(), $ = makeDom();
  const battle = { log: [] };
  view.combatLog({ battle, $, escapeHtml }, '<danger>');
  assert.match($('combatLog').innerHTML, /&lt;danger&gt;/);
  assert.doesNotMatch($('combatLog').innerHTML, /<danger>/);
  for (let i = 0; i < 14; i += 1) view.combatLog({ battle, $, escapeHtml }, `event-${i}`);
  assert.equal(battle.log.length, 12);
  assert.equal(battle.log[0], 'event-13');
  assert.match($('combatLog').innerHTML, /event-13/);
});

test('combat view renders enemy, player health and equipped weapon details', () => {
  const view = loadView(), $ = makeDom();
  const battle = { enemy: { name: 'Псевдособака', icon: '🐺', desc: 'Опасная мутировавшая особь', hp: 35, maxHp: 70 } };
  const g = { hp: 64 };
  const weapon = { name: 'АК-74', condition: 82 };
  view.renderCombat({ battle, g, $, equippedWeapon: () => weapon, weaponPower: () => 19 });
  assert.equal($('enemyName').textContent, 'Псевдособака');
  assert.equal($('enemyHpText').textContent, '35 / 70');
  assert.equal($('enemyHpBar').style.width, '50%');
  assert.equal($('playerHpText').textContent, '64%');
  assert.equal($('playerHpBar').style.width, '64%');
  assert.equal($('combatWeapon').textContent, 'АК-74 · сила 19 · состояние 82%');
});

test('combat view handles absent weapon and absent battle safely', () => {
  const view = loadView(), $ = makeDom();
  view.renderCombat({ battle: { enemy: { name: 'Кровосос', icon: '◉', desc: '', hp: 10, maxHp: 10 } }, g: { hp: 100 }, $, equippedWeapon: () => null, weaponPower: () => 8 });
  assert.equal($('combatWeapon').textContent, 'Нет оружия · сила 8');
  assert.doesNotThrow(() => view.renderCombat({ battle: null }));
  assert.doesNotThrow(() => view.combatLog({ battle: null }, 'ignored'));
});

test('game delegates combat presentation while retaining its controller wrappers', () => {
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(game, /ZoneCombatView\.combatLog\(/);
  assert.match(game, /ZoneCombatView\.renderCombat\(/);
  assert.match(game, /function combatAction\(action\)/);
  assert.match(game, /function enemyTurn\(\)/);
});
