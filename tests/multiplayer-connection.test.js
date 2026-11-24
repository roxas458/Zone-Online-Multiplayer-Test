const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const network = fs.readFileSync(path.join(root, 'public/js/core/network.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');

test('Socket.IO script loading has bounded local and CDN attempts and can be retried', () => {
  assert.match(html, /window\.loadZoneSocketClient\s*=\s*async function/);
  assert.match(html, /loadScript\('\/socket\.io\/socket\.io\.js',\s*7000\)/);
  assert.match(html, /cdn\.socket\.io\/4\.8\.1\/socket\.io\.min\.js',\s*8000/);
  assert.match(html, /window\.zoneSocketClientReady\s*=\s*window\.loadZoneSocketClient\(\)/);
});

test('local development defaults to its own origin and retries a failed Socket.IO load', () => {
  assert.match(game, /DEFAULT_ZONE_SERVER_URL=IS_LOCAL_ZONE_HOST\?window\.location\.origin/);
  assert.match(game, /if\(IS_LOCAL_ZONE_HOST\).*onrender\\\.com/s);
  assert.match(game, /Повторяем загрузку автоматически через 3 секунды/);
  assert.match(game, /window\.zoneSocketClientReady=window\.loadZoneSocketClient\(\)/);
});

test('HTTP server listens without waiting for PostgreSQL and player hello waits for DB bootstrap', () => {
  assert.match(server, /dbInitialization\s*=\s*initDb\(\)\.catch/);
  assert.match(server, /server\.listen\(PORT,'0\.0\.0\.0'/);
  assert.match(server, /await dbInitialization;/);
  assert.doesNotMatch(server, /initDb\(\)[\s\S]{0,180}\.finally\(\(\)=>server\.listen/);
});

test('Render service explicitly uses production mode', () => {
  assert.match(render, /- key: NODE_ENV\s+value: production/);
});


test('Socket.IO accepts full player save payloads larger than the 1 MB default', () => {
  assert.match(server, /maxHttpBufferSize:\s*10\s*\*\s*1024\s*\*\s*1024/);
  assert.doesNotMatch(server, /maxHttpBufferSize:\s*1e6/);
});

test('world snapshots avoid duplicating the NPC roster and resync sends it separately', () => {
  assert.match(server, /function publicWorldSync\(sinceRevision\)/);
  assert.match(server, /const \{npcState,npcEvents,eventLog,stashes,stashIntel,stashSearchCooldown,pendingArtifactRewards,\.\.\.snapshot\}=sync\.snapshot/);
  assert.match(server, /worldSync:initialWorldSync\(/);
  assert.match(server, /socket\.emit\('world:sync',publicWorldSync\([\s\S]*?emitNpcState\(socket\)/);
});


test('initial player:ready sends one world snapshot and a lightweight revision cursor', () => {
  assert.match(server, /function publicWorldSnapshot\(\)[\s\S]*?const \{npcState,npcEvents,eventLog,stashes,stashIntel,stashSearchCooldown,pendingArtifactRewards,\.\.\.snapshot\}=world/);
  assert.match(server, /function initialWorldSync\(sinceRevision\)/);
  assert.match(server, /world:sync',publicWorldSync\(/);
});

test('joining one player sends initial NPC/world state only to that socket', () => {
  assert.match(server, /socket\.emit\('world:npcs',world\.npcPositions\); emitNpcState\(socket\); socket\.emit\('world:ecosystem'/);
  assert.doesNotMatch(server, /io\.emit\('world:npcs',world\.npcPositions\); emitNpcState\(\); io\.emit\('world:ecosystem'/);
});

test('NPC dialogue generation is not repeated on every minute tick', () => {
  const ai = fs.readFileSync(path.join(root, 'src/systems/npc-ai.js'), 'utf8');
  const shared = fs.readFileSync(path.join(root, 'src/server/world.js'), 'utf8');
  assert.match(ai, /npc\.dialogueCycle!==cycle \|\| !npc\.dialogue/);
  assert.match(shared, /if\(!npc\.dialogue \|\| npc\.dialogue\.day!==npc\.dialogueCycle\)/);
});

test('multiplayer reconnect attempts use short bounded delays and login acknowledgements', () => {
  assert.match(network, /timeout: 4500/);
  assert.match(network, /reconnectionDelayMax: 2500/);
  assert.match(game, /zoneSocket\.timeout\(15000\)\.emit\('player:hello'/);
});


test('NPC roster transfer omits precomputed dialogue text and waits for Render health before Socket.IO', () => {
  assert.doesNotMatch(server, /'dialogueVersion','dialogue','relationships'/);
  assert.match(game, /health check passed before Socket\.IO/);
  assert.match(game, /await waitForMultiplayerHealth\(targetUrl,connectAttempt,1800\)/);
  assert.match(game, /trying Socket\.IO anyway/);
});
