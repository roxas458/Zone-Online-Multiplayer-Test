'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createGuestAuth } = require('../src/server/guest-auth');
const root = path.join(__dirname, '..');

const auth = createGuestAuth({ secret: 'test-secret-that-is-at-least-thirty-two-bytes-long' });

test('4.49 signed guest token is bound to one player id', () => {
  const token = auth.issue('abcdef12-3456-7890-abcd-ef1234567890', 1_800_000_000_000);
  assert.equal(auth.verify(token, 'abcdef12-3456-7890-abcd-ef1234567890', 1_800_000_001_000), true);
  assert.equal(auth.verify(token, '12345678-1234-1234-1234-123456789012', 1_800_000_001_000), false);
});

test('4.49 signed guest token rejects tampering, malformed tokens and expiry', () => {
  const now = 1_800_000_000_000;
  const token = auth.issue('abcdef12-3456-7890-abcd-ef1234567890', now);
  assert.equal(auth.verify(`${token}x`, 'abcdef12-3456-7890-abcd-ef1234567890', now), false);
  assert.equal(auth.verify('not-a-token', 'abcdef12-3456-7890-abcd-ef1234567890', now), false);
  assert.equal(auth.verify(token, 'abcdef12-3456-7890-abcd-ef1234567890', now + 91 * 24 * 60 * 60 * 1000), false);
});

test('4.49 guest auth requires a sufficiently long secret', () => {
  assert.throws(() => createGuestAuth({ secret: 'short' }), /at least 32 bytes/);
});

test('4.49 server migrates legacy profiles once and rejects invalid tokens for claimed profiles', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(server, /guestAuth\.verify\(payload\?\.sessionToken, requestedId\)/);
  assert.match(server, /guestSessionVersion/);
  assert.match(server, /GUEST_SESSION_INVALID/);
  assert.match(server, /sessionToken, world:/);
  assert.match(client, /zoneGuestSessionToken/);
  assert.match(client, /sessionToken:localStorage\.getItem\('zoneGuestSessionToken'\)/);
});


test('production requires a persistent guest-session secret and Render generates one', () => {
  const { spawnSync } = require('node:child_process');
  const production = spawnSync(process.execPath, ['-e', "require('./server.js')"], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production', PORT: '0', ZONE_SESSION_SECRET: '' }
  });
  assert.notEqual(production.status, 0);
  assert.match(String(production.stderr), /ZONE_SESSION_SECRET is required in production/);
  const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
  assert.match(render, /- key: ZONE_SESSION_SECRET\s+generateValue: true/);
});
