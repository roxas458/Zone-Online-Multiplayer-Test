const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');

test('self map marker is compact and opens nearby players', () => {
  assert.match(js, /function playerDotMarkup\(p\)[\s\S]*?scale\(\.42\)[\s\S]*?showNearbyPlayersCard/);
});
test('nearby player list is sorted by distance and scoped to current sector', () => {
  assert.match(js, /function showNearbyPlayersCard\(\)[\s\S]*?p\.location===g\.loc[\s\S]*?sort\(\(a,b\)=>\(a\.d\?\?Infinity\)-\(b\.d\?\?Infinity\)\)/);
});
test('player map card exposes message, trade, squad and friend actions', () => {
  for (const action of ['openMapPlayerMessage', 'openMapPlayerTrade', "squadAction('invite'", 'friendRequest']) assert.ok(js.includes(action), `missing ${action}`);
});
test('map player markers are touch and keyboard friendly', () => {
  assert.match(js, /function playerMapPointMarkup[\s\S]*?role=\\?"button/);
  assert.match(css, /map-player-hit \.marker-hit-area/);
});
test('desktop connection prefers polling before websocket upgrade with bounded health probe', () => {
  assert.match(js, /maxWaitMs=1800/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'public/js/core/network.js'), 'utf8'), /polling.*websocket/);
});

test('self marker nearby panel includes NPC conversation-radius discovery', () => {
  assert.match(js, /const npcs=\(g\.npcs\|\|\[\]\)[\s\S]*?filter\(x=>x\.d<=8\)/);
  assert.match(js, /NPC рядом · до 8 м/);
  assert.match(js, /startTalk\('\$\{String\(n\.id\)/);
});

test('player trade opens a dedicated player offer sheet instead of the NPC merchant screen', () => {
  assert.match(js, /function openMapPlayerTrade\(id\)[\s\S]*?ОБМЕН С ИГРОКОМ/);
  assert.match(js, /function sendMapPlayerTrade\(id\)[\s\S]*?trade:offer/);
  assert.doesNotMatch(js, /function openMapPlayerTrade\(id\)[^}]*view\('trade'\)/);
});


test('player trade uses exact coordinate distance instead of rounded display meters', () => {
  assert.match(js, /function playerDistanceExact\(player\)/);
  assert.match(js, /exactDistance>8/);
  assert.match(js, /exactDistance<=8/);
});
