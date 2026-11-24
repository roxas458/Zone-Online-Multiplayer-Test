const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('4.61.52 world migration module loads before the compatibility client and keeps the legacy adapter', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'public/js/systems/world-migration.js'), 'utf8');
  assert.ok(html.indexOf('/js/systems/world-migration.js') < html.indexOf('/js/game.js'));
  assert.match(client, /function migrateWorld\(\)\{\s*return window\.ZoneWorldMigration\.migrate\(g,base/);
  assert.match(migration, /function migrate\(state, base, helpers=\{\}\)/);
  assert.match(migration, /helpers\.migrateLocalNpcCallsigns\(state\)/);
  assert.match(migration, /state\.foodKitGranted/);
});

test('4.61.52 terminal tabs point to real game views and have an explicit navigation adapter', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const mappings = ['world','quests','profile','factions','people','encyclopedia','radio','multiplayer','living'];
  for (const id of mappings) assert.ok(html.includes(`data-terminal-view="${id}"`), `missing PDA tab for ${id}`);
  assert.match(client, /function openTitleTerminalSection\(id\)/);
  assert.match(client, /view\(id\);/);
  assert.match(client, /addEventListener\('click',\(\)=>openTitleTerminalSection/);
});
