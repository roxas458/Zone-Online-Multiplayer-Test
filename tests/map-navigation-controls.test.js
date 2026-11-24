const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'public/js/systems/map-renderer.js'), 'utf8');
const interaction = fs.readFileSync(path.join(root, 'public/js/systems/map-interaction.js'), 'utf8');
const mapSource = client + renderer + interaction;
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
test('map supports drag panning, wheel zoom, click destinations in both map modes and fullscreen', () => {
  for (const fn of ['mapPointerDown','mapPointerMove','mapPointerUp','mapPointer','toggleMapFullscreen']) assert.match(client, new RegExp(`function ${fn}\\(`));
  assert.match(mapSource, /onpointerdown="mapPointerDown\(event\)"/);
  assert.match(mapSource, /onpointermove="mapPointerMove\(event\)"/);
  assert.match(interaction, /nearest\.id !== currentLocation/);
  assert.match(client, /zoneMapInteraction\.resolveMapClick/);
  assert.match(html, /id="zoneMapFrame"/);
  assert.match(css, /touch-action:none/);
});
test('online and offline walking use a slower movement speed', () => {
  assert.match(client, /const step=2\.5\*dt/);
  assert.match(server, /createMoveOrder\(p,\{x:tx,y:ty\},Date\.now\(\),2\.5\)/);
});

test('4.33.28 confirms sector travel, routes sector clicks, and opens the whole-Zone map fullscreen', () => {
  assert.match(client, /function handleMapSectorSelect\(id\)/);
  assert.doesNotMatch(client.match(/function handleMapSectorSelect\(id\)[\s\S]*?\n\nfunction sectorCenter/)?.[0]||'', /confirm\(/);
  assert.match(mapSource, /onclick=\"handleMapSectorSelect/);
  assert.match(client, /toggleMapFullscreen\(true\)/);
  assert.match(client, /function blockedAt\(x,y\)\{const r=5;return x<r\|\|y<r\|\|x>1000-r\|\|y>2000-r;/);
  assert.match(css, /map-fullscreen-fallback/);
});


test('clicking a sector starts travel immediately and sector travel animates the player marker', () => {
  assert.match(client, /function handleMapSectorSelect\(id\)[\s\S]*?startExpedition\(\)/);
  assert.doesNotMatch(client.match(/function handleMapSectorSelect\(id\)[\s\S]*?\n\nfunction sectorCenter/)?.[0]||'', /confirm\(/);
  assert.match(client, /function playerWorldPosition\(\)\{return zoneMapNavigation\.resolvePlayerPosition\(g,Date\.now\(\)\)\}/);
  assert.match(client, /function startExpeditionVisual\(\)[\s\S]*?setInterval\([\s\S]*?updatePlayerMapMarker\(\)/);
  assert.match(client, /const regions=zoneMapMode==='zone'\?mapRegionMarkup\(\):''/);
});
