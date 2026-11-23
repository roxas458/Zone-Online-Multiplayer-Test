const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('story campaign is a separate title-menu mode with its own Zaton map asset and save key', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'public/js/story-mode.js'), 'utf8');
  assert.match(html, /onclick="ZoneStoryMode\.open\(\)"/);
  assert.match(html, /id="storyModeScreen"/);
  assert.match(html, /story-mode\.js/);
  assert.match(js, /const SAVE_KEY='zoneStorySave'/);
  assert.match(js, /zaton-story-map\.webp/);
  assert.match(js, /faction==='Бандиты'/);
  assert.match(js, /faction:'Одиночки'/);
  assert.match(js, /faction:'Бандиты'/);
  assert.ok(fs.existsSync(path.join(root, 'public/assets/zaton-story-map.webp')));
});

test('story campaign exposes interactive object and NPC actions without using the faction-war save', () => {
  const js = fs.readFileSync(path.join(root, 'public/js/story-mode.js'), 'utf8');
  for (const action of ['select','talk','approach','inspect','setObjective']) assert.match(js, new RegExp(action));
  assert.doesNotMatch(js, /zoneExpandedSave/);
  assert.match(js, /Старая насосная/);
  assert.match(js, /Последний сигнал/);
});
