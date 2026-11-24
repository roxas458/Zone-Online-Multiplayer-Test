const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');

test('4.45 map includes integrated PDA intelligence tabs inside the map frame', () => {
  assert.match(html, /id="mapIntelShell"/);
  for (const tab of ['brief', 'news', 'tasks', 'radio', 'sectors']) assert.ok(html.includes(`data-map-intel="${tab}"`));
  assert.match(html, /id="zoneMap"/);
});

test('4.45 map intelligence renders current sector, news, tasks, receive-only radio and sector navigation', () => {
  for (const token of ['function setMapIntelTab', 'function renderMapIntel', 'factionRadioMessages', 'g.quests', 'g.news', 'function renderMap(){\n renderMapIntel()']) assert.ok(client.includes(token), `missing ${token}`);
  assert.match(client, /mapIntelTab==='radio'[\s\S]*?factionRadioMessages/);
  assert.match(client, /function news\(t,b\)[\s\S]*renderMapIntel/);
});

test('4.45 map intelligence is responsive on mobile', () => {
  assert.match(css, /\.map-intel-shell/);
  assert.match(css, /@media\(max-width:650px\)[\s\S]*?\.map-intel-brief\{grid-template-columns:1fr\}/);
});
