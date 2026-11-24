'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const renderer = require('../public/js/systems/map-renderer');
const root = path.resolve(__dirname, '..');

test('4.61.15 renderer labels independently patchable SVG layers', () => {
  const svg = renderer.renderSvg({
    regions: '<rect id="region"/>',
    sectorRoutes: '<path id="sector-route"/>',
    selectedNpcRoute: '<path id="npc-route"/>',
    movementRoute: '<path id="player-route"/>',
    rangeOverlay: '<circle id="range"/>',
    markers: '<g id="npc-marker"/>'
  });
  for (const layer of ['background','regions','sector-routes','selected-routes','markers','compass']) {
    assert.match(svg, new RegExp(`data-map-layer="${layer}"`));
  }
  const order = ['map-background-layer','map-region-layer','map-sector-route-layer','map-selected-route-layer','map-marker-layer','map-compass'];
  let last = -1;
  for (const layer of order) { const index = svg.indexOf(layer); assert.ok(index > last, `${layer} order`); last = index; }
});

test('4.61.15 map renderer patches existing SVG layers instead of replacing the root', () => {
  const source = fs.readFileSync(path.join(root, 'public/js/systems/map-renderer.js'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(source, /function patchSvg\(host, markup\)/);
  assert.match(source, /currentSvg\.querySelector|currentSvg\.children/);
  assert.match(source, /currentLayer\.innerHTML !== nextLayer\.innerHTML/);
  assert.match(game, /zoneMapRenderer\.patchSvg\(mapHost,svgMarkup\)/);
  assert.doesNotMatch(game, /\$\('zoneMap'\)\.innerHTML=svgMarkup/);
});

test('4.61.15 browser loads the patched map renderer before game.js', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(html.indexOf('/js/systems/map-renderer.js') < html.indexOf('/js/game.js'));
  assert.match(html, /map-renderer\.js\?v=4\.61\.26/);
});
