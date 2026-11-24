const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/npc-dialogue-view.js'), 'utf8'), { window });
  return window.ZoneNpcDialogueView;
}
function element() {
  return { textContent: '', innerHTML: '', attrs: {}, classes: new Set(), classList: {
    add(name) { this.owner.classes.add(name); }, remove(name) { this.owner.classes.delete(name); }
  }, setAttribute(k, v) { this.attrs[k] = v; } };
}
function setup() {
  const els = Object.fromEntries(['npcDialogueOverlay','zoneMapFrame','dialogueBox','dialogueChoices','dialoguePortraitLeft','dialogueNpcName','dialogueNpcFaction','dialogueNpcRole','dialoguePlayerName','dialoguePlayerFaction'].map(id => [id, element()]));
  for (const el of Object.values(els)) el.classList.owner = el;
  const body = element(); body.classList.owner = body;
  const document = { fullscreenElement: null, body };
  const view = load().create({ getElement: id => els[id], document, portraitMarkup: () => '<portrait/>', playerDisplayName: () => 'Игрок', getGameState: () => ({ faction: 'Одиночки' }), escapeHtml: value => String(value).replaceAll('<', '&lt;') });
  return { view, els, document };
}

test('dialogue view renders safe topic choices and trade actions', () => {
  const { view, els } = setup();
  view.render({ id: 'wolf', name: 'Волк', faction: 'Одиночки', role: 'техник', topics: [['Что нового?', 'Ответ']] }, 'Привет');
  assert.match(els.dialogueBox.innerHTML, /Привет/);
  assert.match(els.dialogueChoices.innerHTML, /topic\('wolf',0\)/);
  assert.match(els.dialogueChoices.innerHTML, /openRepairWorkshop/);
  assert.match(els.dialogueChoices.innerHTML, /openActiveNpcTrade/);
  assert.equal(els.dialoguePlayerFaction.textContent, 'Одиночки');
});

test('dialogue view moves overlay into fullscreen map and restores original parent', () => {
  const { view, els, document } = setup();
  const parent = { insertBefore(node) { node.parentNode = this; }, appendChild(node) { node.parentNode = this; } };
  const frame = { appendChild(node) { node.parentNode = this; } };
  const next = { parentNode: parent };
  els.npcDialogueOverlay.parentNode = parent; els.npcDialogueOverlay.nextSibling = next;
  els.zoneMapFrame = frame; document.fullscreenElement = frame;
  view.showOverlay();
  assert.equal(els.npcDialogueOverlay.parentNode, frame);
  assert.equal(els.npcDialogueOverlay.attrs['aria-hidden'], 'false');
  view.closeOverlay();
  assert.equal(els.npcDialogueOverlay.parentNode, parent);
  assert.equal(els.npcDialogueOverlay.attrs['aria-hidden'], 'true');
  assert.equal(els.dialogueBox.textContent, 'Разговор завершён. Можно осмотреться или встретить другого персонажа.');
});

test('browser loads dialogue view before game adapter and delegates presentation', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('npc-dialogue-view.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.ok(game.includes('window.ZoneNpcDialogueView.create'));
  assert.ok(game.includes('npcDialogueView.render(n,message,choices)'));
});
