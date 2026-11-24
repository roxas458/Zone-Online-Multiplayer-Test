const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('4.34 adds signature dialogue branches for Sidorovich, Wolf and Sultan', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'src/systems/npc-dialogue.js'), 'utf8');
  const dialogueModule = fs.readFileSync(path.join(root, 'public/js/systems/npc-dialogue.js'), 'utf8');
  for (const id of ['sid', 'wolf', 'sultan']) {
    assert.match(dialogueModule, new RegExp(`${id}:\\{greeting:`));
    assert.match(server, new RegExp(`${id}: \\{`));
  }
  assert.match(dialogueModule, /Что осталось на Большой земле/);
  assert.match(dialogueModule, /Чем ты занимался до Зоны/);
  assert.match(dialogueModule, /function generatedNpcDialogue/);
  assert.match(client, /npcDialogueSystem\.generatedNpcDialogue/);
});

test('4.34 moves map access into the main header and removes it from left navigation', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const nav = html.slice(html.indexOf('<nav class="nav">'), html.indexOf('</nav>'));
  assert.match(html, /class="header-map-trigger"[^>]*onclick="openZoneMapFullscreen\(\)"/);
  assert.doesNotMatch(nav, /data-v="world"/);
  assert.doesNotMatch(html.slice(html.indexOf('<div class="mobile-dock"'), html.indexOf('</div>', html.indexOf('<div class="mobile-dock"'))), /data-v="world"/);
});

test('4.34 displays player identity in the main header', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(html, /id="headerPlayerPortrait"/);
  assert.match(html, /id="headerPlayerName"/);
  assert.match(html, /id="headerPlayerFaction"/);
  assert.match(client, /function render\(\).*headerPlayerPortrait/s);
});
