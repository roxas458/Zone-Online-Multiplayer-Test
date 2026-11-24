const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/systems/living-world.js'), 'utf8'), { window });
  return window.ZoneLivingWorld;
}
test('living-world rank thresholds remain unchanged', () => {
  const api = load();
  assert.deepEqual([0, 99, 100, 249, 250, 499, 500, 899, 900].map(api.rankForXp), ['Рекрут','Рекрут','Новобранец','Новобранец','Боец','Боец','Старший боец','Старший боец','Ветеран']);
});
test('camp story and rumor selection retain deterministic array ordering', () => {
  const api = load();
  assert.equal(api.campStory(() => 0), 'У костра спорят о безопасной тропе через соседний сектор.');
  assert.equal(api.campStory(() => 0.999999), 'Незнакомец предлагает обменяться сведениями о патрулях.');
  assert.equal(api.rumor(() => 0), 'На Свалке видели усиленный патруль Бандитов.');
  assert.equal(api.rumor(() => 0.999999), 'Говорят, контроль над одним из лагерей скоро изменится.');
});
test('patrol generation preserves faction, location and strength random order', () => {
  const api = load();
  const values = [0.99, 0.51, 0.5]; let i = 0;
  assert.deepEqual(JSON.parse(JSON.stringify(api.createPatrol([{name:'Долг'},{name:'Свобода'}], [{id:'cordon'},{id:'dump'}], () => values[i++], 123))), { faction:'Свобода', loc:'dump', strength:5, at:123 });
  assert.equal(i, 3);
});
test('browser loads living-world rules before game adapter and delegates existing entry points', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('living-world.js?v=4.61.52') < html.indexOf('game.js?v=4.61.52'));
  assert.ok(game.includes('window.ZoneLivingWorld.rankForXp'));
  assert.ok(game.includes('window.ZoneLivingWorld.campStory'));
  assert.ok(game.includes('window.ZoneLivingWorld.rumor'));
  assert.ok(game.includes('window.ZoneLivingWorld.createPatrol'));
});
