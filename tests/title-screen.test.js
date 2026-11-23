const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('4.33.28 title screen has clean branding, resume/new game and integrated settings', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  for (const id of ['titleScreen', 'titleContinue', 'titleOptionsPanel', 'titleCredits']) assert.match(html, new RegExp(`id="${id}"`));
  assert.ok(html.includes('ZONE ONLINE · VER. 4.58.1'));
  assert.match(html, /Новая игра/);
  assert.match(html, /Настройки/);
  assert.doesNotMatch(html, /title-mark">Z</);
  assert.doesNotMatch(html, /Загрузить игру|Сетевая игра/);
  assert.doesNotMatch(html, /id="mainMenuOverlay"/);
  assert.ok(js.includes('function beginNewZoneGame()'));
  assert.ok(js.includes('function continueZoneGame()'));
  assert.ok(js.includes('function returnToTitleScreen()'));
  assert.ok(js.includes('function openTitleOptions()'));
  assert.ok(js.includes('function closeTitleOptions()'));
  assert.ok(js.includes('save();'));
  assert.ok(css.includes('body.title-screen-active .title-screen{display:block}'));
  assert.ok(css.includes('@media(max-width:700px)'));
});
