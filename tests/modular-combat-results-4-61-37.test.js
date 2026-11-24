const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/combat-results.js'), 'utf8'), { window });
  return window.ZoneCombatResults;
}

test('local victory resolves the same bounded reward and XP ranges in stable random order', () => {
  const results = load();
  const rolls = [0.5, 0.25];
  const outcome = results.resolveCombatOutcome({ result: 'win', battle: { enemy: { name: 'Псевдособака' } }, random: () => rolls.shift() });
  assert.equal(outcome.status, 'win');
  assert.equal(outcome.enemyName, 'Псевдособака');
  assert.equal(outcome.reward, 110);
  assert.equal(outcome.xp, 22);
  assert.equal(outcome.newsTitle, 'Сводка столкновения');
});

test('NPC victory is handed back to the server without local reward rolls', () => {
  const results = load();
  let calls = 0;
  const outcome = results.resolveCombatOutcome({ result: 'win', battle: { npcId: 'npc-1', enemy: { name: 'Ворон' } }, random: () => { calls++; return 0; } });
  assert.equal(outcome.status, 'await-server');
  assert.equal(calls, 0);
});

test('retreat outcome preserves the eight stamina cost and existing message', () => {
  const outcome = load().resolveCombatOutcome({ result: 'escape', battle: { enemy: { name: 'Снорк' } } });
  assert.equal(outcome.status, 'escape');
  assert.equal(outcome.staminaCost, 8);
  assert.equal(outcome.logMessage, 'Ты отступил и избежал дальнейшего столкновения.');
});

test('defeat outcome returns the same death cause for the game adapter', () => {
  const outcome = load().resolveCombatOutcome({ result: 'defeat', battle: { enemy: { name: 'Кровосос' } } });
  assert.equal(outcome.status, 'defeat');
  assert.equal(outcome.deathCause, 'погиб в столкновении с Кровосос');
});

test('missing battle is ignored without side effects', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(load().resolveCombatOutcome({ result: 'win', battle: null }))), { status: 'ignored' });
});

test('browser loads combat outcome policy before game and finishCombat delegates to it', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('/js/systems/combat-results.js?v=4.61.52') < html.indexOf('/js/game.js?v=4.61.52'));
  assert.match(game, /ZoneCombatResults\.resolveCombatOutcome/);
  assert.doesNotMatch(game, /const reward=60\+Math\.floor\(Math\.random\(\)\*100\)/);
});
