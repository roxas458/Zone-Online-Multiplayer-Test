const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/living-state.js'), 'utf8'), { window });
  return window.ZoneLivingState;
}
test('living-state initialization preserves existing data and fills only missing defaults', () => {
  const api = load();
  const existingContract = { id: 'custom', title: 'Custom' };
  const state = { relationships: { npc1: 7 }, contracts: [existingContract], patrols: [{ id: 1 }], worldTick: 4 };
  api.initialize(state, [{ id: 'npc1' }, { id: 'npc2' }]);
  assert.equal(state.relationships.npc1, 7);
  assert.equal(state.relationships.npc2, 0);
  assert.equal(state.contracts[0], existingContract);
  assert.deepEqual(state.patrols, [{ id: 1 }]);
  assert.equal(state.worldTick, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(state.emission)), { active: false, warning: false });
});
test('living-state creates the same three starter contracts and initializes feed state', () => {
  const api = load();
  const state = {};
  api.initialize(state, []);
  assert.deepEqual(JSON.parse(JSON.stringify(state.contracts.map(({ id, reward, xp, rep }) => ({ id, reward, xp, rep })))), [
    { id: 'supply_cordon', reward: 260, xp: 30, rep: 4 },
    { id: 'scout_dump', reward: 190, xp: 24, rep: 3 },
    { id: 'science_yantar', reward: 480, xp: 55, rep: 7 }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(state.patrols)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(state.campFeed)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(state.factionRanks)), {});
  assert.equal(state.worldTick, 0);
});
test('living-state news prepends entries and preserves the 60/12 item limits', () => {
  const api = load();
  const state = { day: 9, news: Array.from({ length: 65 }, (_, i) => ({ title: `n${i}` })), campFeed: Array.from({ length: 15 }, (_, i) => ({ title: `c${i}` })) };
  api.appendNews(state, 'Новая запись', 'Текст', { day: 3, time: '18:30' });
  assert.equal(state.news.length, 60);
  assert.deepEqual(JSON.parse(JSON.stringify(state.news[0])), { day: 3, hour: '18:30', title: 'Новая запись', body: 'Текст' });
  assert.equal(state.campFeed.length, 12);
  assert.deepEqual(JSON.parse(JSON.stringify(state.campFeed[0])), { title: 'Новая запись', body: 'Текст', day: 9 });
});
test('browser loads living-state before its consumers and game delegates legacy helpers', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('living-state.js?v=4.61.52') < html.indexOf('living-world.js?v=4.61.52'));
  assert.ok(html.indexOf('living-world.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.match(game, /ZoneLivingState\.initialize\(g,g\.npcs\)/);
  assert.match(game, /ZoneLivingState\.appendNews\(g,title,body,realClock\(\)\)/);
});
