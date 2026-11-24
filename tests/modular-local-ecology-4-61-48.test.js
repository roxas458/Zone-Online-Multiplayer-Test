const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/local-ecology.js'), 'utf8'), { window });
  return window.ZoneLocalEcology;
}

test('offline ecology fallback preserves the complete deterministic zone coverage', () => {
  const data = load().createFallback();
  assert.equal(data.mutantPacks.length, 17);
  assert.equal(data.anomalies.length, 25);
  assert.deepEqual(Array.from(data.mutantPacks, pack => pack.location), ['cordon','swamps','dump','bar','agro','dark','yantar','army','red','pripyat','zaton','jupiter','radar','wild','darkhollow','limansk','chaes']);
});

test('offline ecology fallback preserves stable ids, ranges and species/anomaly data', () => {
  const data = load().createFallback();
  assert.equal(data.mutantPacks[0].id, 'local_pack_0');
  assert.equal(data.mutantPacks[0].species, 'плоть');
  assert.equal(data.mutantPacks[0].count, 2);
  assert.equal(data.mutantPacks[0].aggression, 30);
  assert.deepEqual(JSON.parse(JSON.stringify(data.anomalies[0])), { id: 'local_anomaly_0', location: 'cordon', kind: 'Электра', danger: 35 });
  assert.deepEqual(JSON.parse(JSON.stringify(data.anomalies.at(-1))), { id: 'local_anomaly_extra_8', location: 'dark', kind: 'Воронка', danger: 57 });
  assert.ok(data.mutantPacks.every(pack => pack.count >= 2 && pack.count <= 7 && pack.aggression >= 30 && pack.aggression <= 99));
});

test('offline ecology creates fresh independent records without mutating previous results', () => {
  const api = load();
  const first = api.createFallback();
  first.mutantPacks[0].count = 99;
  first.anomalies[0].kind = 'changed';
  const second = api.createFallback();
  assert.equal(second.mutantPacks[0].count, 2);
  assert.equal(second.anomalies[0].kind, 'Электра');
});

test('game keeps the legacy ecology entry point and loads the isolated fallback module first', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('local-ecology.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.match(game, /function localEcology\(\)\{return window\.ZoneLocalEcology\.createFallback\(\);\}/);
  assert.match(game, /g\.localEcology \|\|= \(serverWorld\?\.ecosystem\?clone\(serverWorld\.ecosystem\):localEcology\(\)\)/);
});
