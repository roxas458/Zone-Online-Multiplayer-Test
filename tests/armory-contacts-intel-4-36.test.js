const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');

test('4.36 Armory is a unified non-equipping reference catalogue', () => {
  assert.match(html, /id="armoryClass"[\s\S]*value="armor"[\s\S]*value="helmets"[\s\S]*value="detectors"[\s\S]*value="artifacts"[\s\S]*value="tools"/);
  assert.match(js, /const armoryCatalog\s*=\s*\(\)\s*=>/);
  assert.match(js, /category:'helmets'/);
  assert.match(js, /category:'detectors'/);
  assert.match(js, /category:'armor'/);
  assert.match(js, /function renderArmory\(\)/);
  assert.doesNotMatch(js.slice(js.indexOf('function renderArmory'), js.indexOf('function realClock')), /equipItem\(/);
  assert.doesNotMatch(js, /add\('weapon-'[^\n]*'gear'/);
  assert.doesNotMatch(js, /\['gear','Снаряжение'/);
});

test('4.36 squad summaries are no longer rendered in Contacts', () => {
  const start = js.indexOf('function renderPeople()');
  const end = js.indexOf('function selectContactNpc', start);
  const people = js.slice(start, end);
  assert.doesNotMatch(people, /serverWorld\?\.npcSquads/);
  assert.match(html, /id="squads"[\s\S]*id="localNpcSquads"/);
  assert.match(html, /id="peopleWorldFeed"/);
});

test('4.36 right sidebar shows field intelligence instead of duplicate survival meters and quick contact', () => {
  assert.match(html, /id="sectorIntel"/);
  assert.match(html, /id="fieldSignals"/);
  assert.doesNotMatch(html, /id="miniStatus"|id="quickNpc"/);
  assert.match(js, /function renderRightIntel\(\)/);
  assert.match(js, /renderRightIntel\(\);/);
  assert.match(css, /\.intel-grid/);
});
