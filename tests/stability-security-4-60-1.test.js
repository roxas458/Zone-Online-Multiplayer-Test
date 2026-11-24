'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

test('4.60.1 import sanitizer preserves normal punctuation, digits and underscores', () => {
  const source = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const match = source.match(/function sanitizeImportedValue\(value,depth=0\)\{[\s\S]*?\n\}/);
  assert.ok(match, 'sanitizer function exists');
  const sanitize = vm.runInNewContext(`(${match[0]})`);
  assert.equal(sanitize('STALKER 2 - AK-74'), 'STALKER 2 - AK-74');
  assert.equal(sanitize('player_123'), 'player_123');
  assert.equal(sanitize('Привет, сталкер!'), 'Привет, сталкер!');
  assert.equal(sanitize('safe\u0001text'), 'safetext');
});

test('4.60.1 import sanitizer blocks prototype-pollution keys and excessive nesting', () => {
  const source = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const match = source.match(/function sanitizeImportedValue\(value,depth=0\)\{[\s\S]*?\n\}/);
  const sanitize = vm.runInNewContext(`(${match[0]})`);
  const input = JSON.parse('{"ok":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"bad":1}}}');
  const result = sanitize(input);
  assert.equal(result.ok, 1);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.prototype.bad, undefined);
  let deep = {}; let cursor = deep;
  for (let i = 0; i < 15; i++) cursor = cursor.next = {};
  assert.equal(sanitize(deep).next.next.next.next.next.next.next.next.next.next.next.next.next, null);
});

test('4.60.1 legacy migration requires matching old local profile proof', () => {
  const { verifyLegacyProfileClaim } = require('../src/server/legacy-claim');
  const saved = { name:'Сталкер', faction:'Одиночки', money:120, xp:50, items:[{id:'bread',qty:2}], quests:[{id:'intro'}], careerStats:{kills:1} };
  assert.equal(verifyLegacyProfileClaim(saved, structuredClone(saved)), true);
  assert.equal(verifyLegacyProfileClaim(saved, {...saved, money:999999}), false);
  assert.equal(verifyLegacyProfileClaim(saved, null), false);
});

test('4.60.1 socket event rate limits are per socket and per event', () => {
  const { createSocketRateLimiter } = require('../src/server/rate-limit');
  let now = 1000;
  const allow = createSocketRateLimiter({'player:save':{limit:2,windowMs:1000},'*':{limit:5,windowMs:1000}}, () => now);
  assert.equal(allow('a','player:save'), true);
  assert.equal(allow('a','player:save'), true);
  assert.equal(allow('a','player:save'), false);
  assert.equal(allow('b','player:save'), true);
  now += 1001;
  assert.equal(allow('a','player:save'), true);
  allow.clear('a');
  assert.equal(allow('a','player:save'), true);
});

test('4.60.1 server wires authoritative quest, item and combat actions', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(server, /player:quest:accept/);
  assert.match(server, /player:quest:turnin/);
  assert.match(server, /player:item:use/);
  assert.match(server, /player:rest/);
  assert.match(server, /player:survival:camp/);
  assert.match(server, /player:contract:complete/);
  assert.match(server, /player:progression:result/);
  assert.match(server, /npc:combat:start/);
  assert.match(server, /activeCombat\.startedAt/);
  assert.match(server, /npc:combat:action/);
  assert.match(server, /Direct client kill requests are deliberately disabled/);
  assert.match(server, /createSocketRateLimiter/);
  assert.match(client, /player:quest:turnin/);
  assert.match(client, /player:item:use/);
  assert.match(client, /npc:combat:start/);
});

test('4.60.1 online survival is server-owned and advances from elapsed server time', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const authority = fs.readFileSync(path.join(root, 'src/server/player-save.js'), 'utf8');
  assert.match(server, /ZoneSurvival\.advanceNeeds\(mergedState,elapsed/);
  assert.match(server, /offlineElapsed=Math\.max\(0,Math\.min\(3\*60\*60\*1000/);
  assert.match(server, /survivalServerAt/);
  assert.match(authority, /'hunger', 'thirst', 'stamina', 'radiation'/);
});

test('4.60.1 cooperative rewards update online summary and persistent state', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /q\.completing=true/);
  assert.match(server, /q\.rewardedPlayers=winners\.slice\(\)/);
  assert.match(server, /pl\.money=st\.state\.money/);
  assert.match(server, /pl\.xp=st\.state\.xp/);
  assert.match(server, /persistPlayer\(id,st\.state\)/);
});
