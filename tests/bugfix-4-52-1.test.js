const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createSafeState } = require('../src/server/validation');

const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

function functionSource(name) {
  const line = client.split('\n').find((entry) => entry.startsWith(`function ${name}(`));
  assert.ok(line, `${name} helper exists`);
  return line;
}

test('4.53.0 player display combines real name and callsign without changing the canonical callsign', () => {
  const context = { g: { realName: 'Денис', name: 'Шаман' } };
  vm.runInNewContext(`${functionSource('cleanPlayerCallsign')}; ${functionSource('playerDisplayName')}; result=playerDisplayName();`, context);
  assert.equal(context.result, 'Денис Шаман');
  assert.equal(context.g.name, 'Шаман');
  const safe = createSafeState(new Set(['Одиночки']), new Set(['cordon']))({ name: 'Шаман', realName: 'Денис', faction: 'Одиночки', loc: 'cordon', characterCreated: true });
  assert.equal(safe.state.realName, 'Денис', 'server save normalization preserves the real name');
  assert.match(client, /g\.name=name;g\.realName=realName/);
  assert.match(client, /function mpRename\(\)[\s\S]*?g\.name=n;save\(\);\}/);
  assert.doesNotMatch(client.match(/function mpRename\(\)[^\n]*/)?.[0] || '', /player:update/);
  for (const id of ['headerPlayerName', 'dialoguePlayerName', 'inventoryOwner', 'tradePlayerName']) {
    assert.ok(client.includes(`playerDisplayName()`), `${id} uses the formatted identity`);
  }
});

test('4.53.0 leaving map fullscreen before navigating prevents hidden destination views', () => {
  assert.match(client, /function leaveMapFullscreenForView\(\)[\s\S]*?document\.exitFullscreen\?\.\(\)[\s\S]*?map-fullscreen-fallback/);
  assert.match(client, /exit\?\.catch\?\.\(error=>console\.warn\('Не удалось закрыть полноэкранную карту:'/);
  assert.match(client, /function view\(id\)\{if\(id!=='world'\)leaveMapFullscreenForView\(\)/);
  assert.match(client, /function view\(id\)[\s\S]*?if\(id==='radio'&&zoneSocket\?\.connected\)zoneSocket\.emit\('radio:state'\)/);
});

test('4.53.0 NPC dialogue is moved into the fullscreen map and restored to its original DOM position', () => {
  assert.match(client, /function showNpcDialogue\(\)[\s\S]*?document\.fullscreenElement===frame[\s\S]*?frame\.appendChild\(overlay\)/);
  assert.match(client, /function restoreNpcDialogueOverlay\(\)[\s\S]*?parent\.insertBefore\(overlay,next\)/);
  assert.match(client, /function closeTalk\(\)[\s\S]*?restoreNpcDialogueOverlay\(\)/);
  assert.match(client, /document\.addEventListener\('fullscreenchange'/);
});

test('4.53.0 map zoom uses exponential steps and reaches a close 24x view', () => {
  const context = {
    zoneMapZoom: 1,
    zoneMapCenter: null,
    zoneMapDirty: false,
    currentMapView: () => ({ x: 0, y: 0, w: 1000, h: 2000 }),
    renderZoneMap() {}
  };
  vm.runInNewContext(`${functionSource('mapZoom')}; for(let i=0;i<100;i++)mapZoom(1); zoomedIn=zoneMapZoom; mapZoom(-1); zoomedOut=zoneMapZoom; mapZoom(0); reset=zoneMapZoom;`, context);
  assert.equal(context.zoomedIn, 24);
  assert.ok(context.zoomedOut >= 1 && context.zoomedOut < 24);
  assert.equal(context.reset, 1);
});

test('4.53.0 server-originated news and log text are escaped before insertion into HTML', () => {
  assert.match(client, /function renderNews\(\)[\s\S]*?escapeHtml\(n\.title\)[\s\S]*?escapeHtml\(n\.body\)/);
  assert.match(client, /g\.log\.map\(\(x,i\)=>`<div><time>[\s\S]*?escapeHtml\(x\)/);
});

test('4.53.0 build labels and browser cache keys match the package version', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '4.61.2');
  assert.ok(html.includes('ZONE ONLINE · VER. 4.61.2'));
  for (const name of ['content.js', 'stories.js', 'survival.js', 'game.js']) {
    assert.ok(html.includes(`/js/${name}?v=4.61.2`));
  }
});
