'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const renderer = require('../public/js/systems/map-renderer');
const root = path.resolve(__dirname, '..');

test('4.61.10 map renderer builds region layer with escaped labels and unchanged geometry', () => {
  const markup = renderer.renderRegions([
    {id:'cordon',name:'Кордон',x:350,y:1650,w:220,h:160},
    {id:'x" onload="bad',name:'A&B <zone>',x:1,y:2,w:3,h:4}
  ], value => String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'));
  assert.match(markup, /data-location="cordon"/);
  assert.match(markup, /<rect x="350" y="1650" width="220" height="160" rx="8"\/>/);
  assert.match(markup, /A&amp;B &lt;zone&gt;/);
  assert.doesNotMatch(markup, /onload="bad/);
});

test('4.61.10 SVG renderer preserves the map image, layer ordering and interaction handlers', () => {
  const svg = renderer.renderSvg({
    viewBox:'1 2 300 400', preserveAspectRatio:'xMidYMid slice', ariaLabel:'Карта <Зоны>',
    regions:'REGIONS', sectorRoutes:'SECTOR_ROUTES', selectedNpcRoute:'NPC_ROUTE',
    movementRoute:'MOVE_ROUTE', rangeOverlay:'RANGE', markers:'MARKERS'
  });
  assert.match(svg, /viewBox="1 2 300 400"/);
  assert.match(svg, /aria-label="Карта &lt;Зоны&gt;"/);
  assert.match(svg, /href="\/assets\/zone-master-map\.jpg"/);
  const order = ['map-region-layer','map-sector-route-layer','map-selected-route-layer','map-marker-layer','map-compass'];
  let last = -1;
  for (const layer of order) { const index = svg.indexOf(layer); assert.ok(index > last, `${layer} order`); last = index; }
  for (const part of ['REGIONS','SECTOR_ROUTES','NPC_ROUTE','MOVE_ROUTE','RANGE','MARKERS','mapZoom(event.deltaY<0?1:-1)','mapPointerDown(event)']) assert.ok(svg.includes(part), `missing ${part}`);
});

test('4.61.10 browser delegates SVG region and layer composition to map renderer before game.js', () => {
  const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client = fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.ok(html.indexOf('/js/systems/map-renderer.js') < html.indexOf('/js/game.js'));
  assert.match(html, /map-renderer\.js\?v=4\.61\.52/);
  assert.match(client, /const zoneMapRenderer=window\.ZoneMapRenderer/);
  assert.match(client, /function mapRegionMarkup\(\)\{return zoneMapRenderer\.renderRegions/);
  assert.match(client, /zoneMapRenderer\.renderSvg\(/);
  assert.doesNotMatch(client, /<svg id="zoneMapSvg"/);
});
