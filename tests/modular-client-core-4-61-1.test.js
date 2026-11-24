const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function loadCore() {
  const store = new Map();
  const window = {
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    }
  };
  const context = vm.createContext({ window, console, Blob, Map, Set, TypeError, JSON, Object, Array, Error });
  for (const file of [
    'config.js', 'event-bus.js', 'game-state.js', 'save-manager.js', 'default-state.js'
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, 'public/js/core', file), 'utf8'), context, { filename: file });
  }
  return { window, store };
}

test('client core modules load before the compatibility client and declare a shared config', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const paths = [
    '/js/core/config.js', '/js/core/event-bus.js', '/js/core/game-state.js',
    '/js/core/save-manager.js', '/js/core/default-state.js', '/js/core/network.js', '/js/game.js'
  ];
  let previous = -1;
  for (const source of paths) {
    const position = html.indexOf(source);
    assert.ok(position > previous, `${source} must load in dependency order`);
    previous = position;
  }
  assert.ok(html.includes('ZONE ONLINE 4.61.4'));
});

test('default game template is extracted without changing its canonical starting values', () => {
  const { window } = loadCore();
  assert.equal(window.ZoneCoreDefaults.name, 'Новичок');
  assert.equal(window.ZoneCoreDefaults.money, 1450);
  assert.equal(window.ZoneCoreDefaults.loc, 'cordon');
  assert.ok(Array.isArray(window.ZoneCoreDefaults.npcs));
  assert.ok(Array.isArray(window.ZoneCoreDefaults.quests));
});

test('save manager preserves the legacy key and round-trips existing save objects', () => {
  const { window, store } = loadCore();
  const legacySave = { name: 'Север', money: 12345, loc: 'bar', items: [{ id: 'med', qty: 7 }] };
  assert.equal(window.ZoneCore.saveManager.write(window.ZoneCoreConfig.saveKey, legacySave), true);
  assert.equal(store.has('zoneExpandedSave'), true);
  assert.deepEqual(JSON.parse(store.get('zoneExpandedSave')), legacySave);
  assert.deepEqual(window.ZoneCore.saveManager.read('zoneExpandedSave', null), legacySave);
  assert.equal(window.ZoneCore.saveManager.remove('zoneExpandedSave'), true);
  assert.equal(window.ZoneCore.saveManager.read('zoneExpandedSave', null), null);
});

test('event bus and game-state registry share the same live object reference', () => {
  const { window } = loadCore();
  const seen = [];
  const off = window.ZoneCore.events.on('state:changed', event => seen.push(event.reason));
  const state = { money: 100, items: [] };
  window.ZoneCore.state.set(state, 'test');
  assert.equal(window.ZoneCore.state.get(), state);
  assert.equal(window.ZoneCore.events.emit('custom:event', {}), 0);
  assert.deepEqual(seen, ['test']);
  off();
  window.ZoneCore.state.set({ money: 200 }, 'second');
  assert.deepEqual(seen, ['test']);
});

test('game client routes main save reads, writes, and deletes through the save manager', () => {
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(client, /ZoneCore\.saveManager\.read\(window\.ZoneCoreConfig\.saveKey/);
  assert.match(client, /ZoneCore\.saveManager\.write\(window\.ZoneCoreConfig\.saveKey,g\)/);
  assert.match(client, /ZoneCore\.saveManager\.remove\(window\.ZoneCoreConfig\.saveKey\)/);
  assert.equal(client.includes('localStorage.setItem(\"zoneExpandedSave\"'), false);
});
