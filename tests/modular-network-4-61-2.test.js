const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function loadNetwork() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/core/network.js'), 'utf8'), { window, URL, console });
  return window.ZoneNetwork;
}

test('network module loads before the game compatibility client', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(html.indexOf('/js/core/network.js') < html.indexOf('/js/game.js'));
});

test('network URL normalization accepts HTTP(S), strips paths and rejects unsafe protocols', () => {
  const network = loadNetwork();
  assert.equal(network.normalizeServerUrl('https://zone.example/path?q=1'), 'https://zone.example');
  assert.equal(network.normalizeServerUrl('http://localhost:3000/socket.io'), 'http://localhost:3000');
  assert.throws(() => network.normalizeServerUrl('javascript:alert(1)'), /http or https/);
});

test('network manager reuses only an active socket aimed at the same server', () => {
  const network = loadNetwork();
  assert.equal(network.canReuse({ connected: true }, 'https://a.test', 'https://a.test'), true);
  assert.equal(network.canReuse({ active: true }, 'https://a.test', 'https://a.test'), true);
  assert.equal(network.canReuse({ connected: true }, 'https://a.test', 'https://b.test'), false);
  assert.equal(network.canReuse({ connected: false, active: false }, 'https://a.test', 'https://a.test'), false);
});

test('network manager creates the existing Socket.IO transport configuration', () => {
  const network = loadNetwork();
  let call;
  const socket = {};
  const result = network.create((...args) => { call = args; return socket; }, 'https://zone.example');
  assert.equal(result, socket);
  assert.equal(call[0], 'https://zone.example');
  assert.deepEqual(Array.from(call[1].transports), ['polling', 'websocket']);
  assert.equal(call[1].reconnection, true);
  assert.equal(call[1].reconnectionAttempts, Infinity);
  assert.equal(call[1].path, '/socket.io/');
  assert.equal(call[1].autoConnect, false);
});

test('network manager safely disposes old socket listeners and connection', () => {
  const network = loadNetwork();
  const calls = [];
  assert.equal(network.dispose({ removeAllListeners() { calls.push('listeners'); }, disconnect() { calls.push('disconnect'); } }), true);
  assert.deepEqual(calls, ['listeners', 'disconnect']);
  assert.equal(network.dispose(null), false);
});
