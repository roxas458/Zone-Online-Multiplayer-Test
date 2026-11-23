const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../public/css/game.css'), 'utf8');

test('faction war overview uses a CoP-inspired PDA frame and readable mobile layout', () => {
  assert.match(css, /ZONE ONLINE 4\.33\.19 — Call of Pripyat faction-war dossier/);
  assert.match(css, /\.faction-front-panel:before/);
  assert.match(css, /\.faction-front-emblem/);
  assert.match(css, /repeating-linear-gradient\(90deg/);
  assert.match(css, /@media\(max-width:760px\).*?\.faction-front-sides/s);
  assert.match(css, /@media\(max-width:390px\).*?\.faction-front-metrics\{grid-template-columns:1fr\}/s);
});
