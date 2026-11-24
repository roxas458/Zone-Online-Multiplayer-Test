const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadRanking() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('public/js/systems/faction-ranking.js', 'utf8'), context);
  return context.window.ZoneFactionRanking;
}

test('4.61.52 faction ranking preserves score inputs, ownership totals, base and relation rows', () => {
  const ranking = loadRanking();
  const factions = [
    { name: 'Одиночки', members: 10, influence: 20 },
    { name: 'Долг', members: 5, influence: 30 },
  ];
  const rows = ranking.buildRows({
    factions,
    roster: [
      { faction: 'Одиночки', alive: true },
      { faction: 'Одиночки', alive: false },
      { faction: 'Долг' },
    ],
    patrols: [
      { faction: 'Одиночки', strength: 4 },
      { faction: 'Одиночки', strength: '3' },
      { faction: 'Долг', strength: 2 },
    ],
    locations: [
      { id: 'a', name: 'Кордон', owner: 'Одиночки', control: 50 },
      { id: 'b', name: 'Свалка', owner: 'Одиночки', control: 25 },
      { id: 'c', name: 'Бар', owner: 'Долг', control: 80 },
    ],
    factionStats: { 'Одиночки': { wins: 2 } },
    relationValue: (a, b) => a === 'Одиночки' && b === 'Долг' ? -25 : 25,
  });

  assert.equal(rows[0].name, 'Одиночки');
  assert.equal(rows[0].alive, 1);
  assert.equal(rows[0].members, 11);
  assert.equal(rows[0].patrols, 7);
  assert.equal(rows[0].territory, 75);
  assert.equal(rows[0].territoryCount, 2);
  assert.equal(rows[0].wins, 2);
  assert.equal(rows[0].baseName, 'Кордон');
  assert.equal(rows[0].relations[0].value, -25);
  assert.equal(rows[0].score, Math.round(20 * 5 + 11 * 0.35 + 75 * 1.5 + 7 * 3 + 2 * 25));
  assert.equal(rows[0].place, 1);
  assert.equal(rows[1].place, 2);
});

test('4.61.52 faction ranking keeps score and tie-break ordering deterministic', () => {
  const ranking = loadRanking();
  const rows = ranking.buildRows({
    factions: [
      { name: 'Бета', members: 10, influence: 10 },
      { name: 'Альфа', members: 10, influence: 10 },
      { name: 'Гамма', members: 20, influence: 10 },
    ],
  });
  assert.deepEqual(rows.map((row) => row.name), ['Гамма', 'Бета', 'Альфа']);
  assert.deepEqual(rows.map((row) => row.place), [1, 2, 3]);
  assert.equal(rows[0].baseName, 'Нет постоянной базы');
});

test('4.61.52 browser loads faction ranking before game.js and keeps a compatibility wrapper', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  const moduleAt = html.indexOf('/js/systems/faction-ranking.js?v=4.61.52');
  const gameAt = html.indexOf('/js/game.js?v=4.61.52');
  assert.ok(moduleAt >= 0 && gameAt > moduleAt);
  const game = fs.readFileSync('public/js/game.js', 'utf8');
  assert.match(game, /function factionRankRows\(\)\{[\s\S]*?window\.ZoneFactionRanking\.buildRows\(/);
});
