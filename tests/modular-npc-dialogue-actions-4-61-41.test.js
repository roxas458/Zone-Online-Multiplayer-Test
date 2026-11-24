const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/npc-dialogue-actions.js'), 'utf8'), { window });
  return window.ZoneNpcDialogueActions;
}
function setup(id = 'wolf', index = 1) {
  const npc = { id, name: 'Волк', topics: [['Кто ты?', 'Привет.'], ['Нужна помощь?', 'Могу помочь.']] };
  const calls = { quests: [], flags: {}, emitted: [], logs: [], saved: 0, html: '' };
  const actions = load().create({
    npcBy: () => npc, npcInInteractionRange: () => true, isSocketConnected: () => true,
    setIgnoredInteractionReplyFor: value => { calls.ignored = value; },
    emitTopic: (...args) => calls.emitted.push(args), addQuest: value => calls.quests.push(value),
    setFlag: (key, value) => { calls.flags[key] = value; },
    renderDialogue: (...args) => { calls.rendered = args; },
    getElement: () => ({ set innerHTML(value) { calls.html = value; } }),
    escapeHtml: value => String(value), alert: value => { calls.alert = value; },
    log: value => calls.logs.push(value), save: () => { calls.saved++; }
  });
  actions.topic(id, index);
  return calls;
}
test('NPC dialogue action preserves quest, flag, server and rendering effects', () => {
  const result = setup();
  assert.deepEqual(result.quests, ['bread', 'bread']);
  assert.equal(result.flags.metWolf, true);
  assert.deepEqual(result.emitted, [['wolf', 1]]);
  assert.equal(result.ignored, 'wolf');
  assert.match(result.html, /Передать хлеб/);
  assert.equal(result.saved, 1);
});
test('NPC dialogue action applies the correct topic-specific quest and flag', () => {
  const result = setup('prof', 1);
  assert.deepEqual(result.quests, ['rumors', 'research']);
  assert.equal(result.flags.metProf, true);
});
test('NPC dialogue action safely ignores missing topics and blocks distant interactions', () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/npc-dialogue-actions.js'), 'utf8'), { window });
  let saved = 0, alertText = '';
  const actions = window.ZoneNpcDialogueActions.create({
    npcBy: () => ({ id: 'wolf', topics: [] }), npcInInteractionRange: () => false,
    alert: value => { alertText = value; }, isSocketConnected: () => false,
    setIgnoredInteractionReplyFor() {}, emitTopic() {}, addQuest() {}, setFlag() {},
    renderDialogue() {}, getElement() { return null; }, escapeHtml: String,
    log() {}, save() { saved++; }
  });
  actions.topic('wolf', 0);
  assert.match(alertText, /8 м/);
  assert.equal(saved, 0);
});
test('browser loads NPC dialogue actions before game and game delegates topic handling', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('npc-dialogue-actions.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.match(game, /function topic\(id,i\)\{return npcDialogueActions\.topic\(id,i\)\}/);
});
