const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');

test('diplomacy is integrated into the faction dossier and removed from main navigation', () => {
  assert.match(html, /data-faction-tab="talks"/);
  assert.match(html, /id="factionTabRelations"/);
  assert.match(html, /id="factionTabTalks"/);
  assert.doesNotMatch(html, /data-v="diplomacy"/);
  assert.doesNotMatch(html, /id="diplomacy"/);
});

test('overview contains the two-sided faction front panel and live comparison fields', () => {
  for (const id of ['overviewFactionFront', 'overviewRival', 'overviewOwnEmblem', 'overviewRivalEmblem', 'overviewOwnStrengthBar', 'overviewRivalStrengthBar', 'overviewOwnSquads', 'overviewRivalResources']) {
    assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  }
  assert.match(js, /function renderOverviewFactionFront\(/);
  assert.match(js, /renderOverviewFactionFront\(\)/);
});
