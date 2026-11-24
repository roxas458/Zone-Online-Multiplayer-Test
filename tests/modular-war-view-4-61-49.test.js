const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/war-view.js'), 'utf8'), { window });
  return window.ZoneWarView;
}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

test('war operation renderer preserves the active attack action and localized labels', () => {
  const html = load().operationHtml({
    id: 'op-1', pointName: 'Мост', location: 'cordon', attacker: 'Долг', defender: 'Свобода',
    phase: 'mobilization', status: 'active', attackScore: 12, defenseScore: 8,
    participants: [{ playerId: 'other' }], log: [{ text: 'Отряд собирается' }]
  }, { g: { faction: 'Долг', loc: 'cordon', locations: [{ id: 'cordon', name: 'Кордон' }] }, zonePlayerId: 'player', escapeHtml });
  assert.match(html, /Сбор отрядов/);
  assert.match(html, /warDeploy\('op-1','attack'\)/);
  assert.match(html, /Вступить в штурм · 100 ₽/);
  assert.match(html, /Отряд собирается/);
});

test('war operation renderer preserves defender, commander and participant states', () => {
  const api = load();
  const base = { id: 'op-2', location: 'bar', attacker: 'Свобода', defender: 'Долг', phase: 'after', status: 'active', attackScore: 4, defenseScore: 9, participants: [], log: [] };
  const defender = api.operationHtml(base, { g: { faction: 'Долг', loc: 'bar', locations: [] }, zonePlayerId: 'p', escapeHtml });
  assert.match(defender, /warDeploy\('op-2','defend'\)/);
  assert.match(defender, /Встать на защиту · 100 ₽/);
  const commander = api.operationHtml({ ...base, createdBy: 'p' }, { g: { faction: 'Нейтрал', loc: 'bar', locations: [] }, zonePlayerId: 'p', escapeHtml });
  assert.match(commander, /warResolve\('op-2'\)/);
  const mine = api.operationHtml({ ...base, participants: [{ playerId: 'p' }] }, { g: { faction: 'Нейтрал', loc: 'bar', locations: [] }, zonePlayerId: 'p', escapeHtml });
  assert.match(mine, /Ты в операции/);
  assert.doesNotMatch(mine, /warDeploy/);
});

test('war operation renderer escapes untrusted text and supports inactive operations without actions', () => {
  const html = load().operationHtml({ id: 'x', pointName: '<img src=x>', attacker: '<script>', defender: 'B', phase: 'resolved', status: 'resolved', participants: [], log: [{ text: '<bad>' }] }, { g: { faction: 'N', loc: 'elsewhere', locations: [] }, zonePlayerId: 'p', escapeHtml });
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;bad&gt;/);
  assert.doesNotMatch(html, /warDeploy|warResolve/);
});

test('game keeps the legacy warOperationHtml entry point and loads the view module before game.js', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('war-view.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.match(game, /function warOperationHtml\(op\)\{return window\.ZoneWarView\.operationHtml\(op,\{g,zonePlayerId,escapeHtml\}\);\}/);
  assert.match(game, /active\.map\(warOperationHtml\)/);
});
