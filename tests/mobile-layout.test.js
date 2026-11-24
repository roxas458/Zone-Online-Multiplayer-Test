const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../public/css/game.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

test('mobile PDA has full-width safe-area layout and compact navigation', () => {
  assert.match(css, /ZONE ONLINE 4\.33\.20 — COMPLETE MOBILE PDA ADAPTATION/);
  assert.match(css, /overflow-x:hidden/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.mobile-dock\s*\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/s);
  assert.match(css, /@media\s*\(max-width:\s*430px\)/);
  assert.match(css, /@media\s*\(max-width:\s*350px\)/);
  assert.match(html, /class="mobile-dock"/);
  assert.match(html, /id="overviewFactionFront"/);
});
