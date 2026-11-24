const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('PDA faction leaderboard matches the reference layout and is wired into the statistics view', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
  assert.match(html, /id="factionLeaderboard"/);
  assert.match(html, /Рейтинг группировок/);
  assert.match(html, /id="factionRankDetail"/);
  assert.match(js, /function factionRankRows\(\)/);
  assert.match(js, /function renderFactionLeaderboard\(\)/);
  assert.match(js, /function selectFactionRank\(name\)/);
  assert.match(js, /renderFactionLeaderboard\(\)/);
  assert.match(css, /\.faction-rank-row/);
  assert.match(css, /\.faction-rel-cell\.enemy/);
  assert.match(css, /\.faction-rel-cell\.friend/);
});

test('all supported faction leaderboard emblems exist as local assets', () => {
  const assets = path.join(root, 'public/assets/factions');
  for (const file of ['loners.svg','duty.svg','freedom.svg','bandits.svg','military.svg','scientists.svg','mercenaries.svg','monolith.svg','clear-sky.svg']) {
    assert.ok(fs.existsSync(path.join(assets, file)), `missing faction emblem ${file}`);
  }
});


test('faction leaderboard is rendered inside the Factions tab, not the Ranks tab', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const ranks = html.slice(html.indexOf('id="ranks"'), html.indexOf('id="stories"'));
  const factions = html.slice(html.indexOf('id="factions"'), html.indexOf('id="living"'));
  assert.doesNotMatch(ranks, /factionLeaderboard|Рейтинг группировок/);
  assert.match(factions, /factionLeaderboard/);
  assert.match(factions, /factionRankDetail/);
});
