const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

const duplicateNames = ['issueApproachOrder', 'selectMapNpc', 'showMapStash', 'approachStash'];

test('4.46 removes shadowed duplicate map interaction declarations', () => {
  for (const name of duplicateNames) {
    const declarations = client.match(new RegExp(`function\\s+${name}\\s*\\(`, 'g')) || [];
    assert.equal(declarations.length, 1, `${name} must have exactly one function declaration`);
  }
});

test('4.46 sector arrival bookkeeping counts only actual location changes', () => {
  const match = client.match(/function recordSectorArrival\(previousLocation,destination\)\s*\{[\s\S]*?\n\}/);
  assert.ok(match, 'recordSectorArrival helper must exist');
  const context = { g: { loc: 'cordon', careerStats: { travelled: 2 }, visitedLocations: ['cordon'] } };
  vm.runInNewContext(`${match[0]}; resultSame = recordSectorArrival('cordon','cordon'); resultNext = recordSectorArrival('cordon','garbage');`, context);
  assert.equal(context.resultSame, false);
  assert.equal(context.resultNext, true);
  assert.equal(context.g.careerStats.travelled, 3);
  assert.deepEqual(Array.from(context.g.visitedLocations), ['cordon', 'garbage']);
});

test('4.46 local and server expeditions record confirmed sector arrivals', () => {
  assert.match(client, /g\.loc=next;recordSectorArrival\(previousLocation,next\)/);
  assert.match(client, /player:expedition-step[\s\S]*?recordSectorArrival\(previousLocation,data\.location\)/);
  assert.doesNotMatch(client, /const originalTravel=travel/);
});

test('4.46 all first-party browser scripts use the release cache key', () => {
  for (const name of ['content.js', 'stories.js', 'survival.js', 'game.js']) {
    assert.ok(html.includes(`/js/${name}?v=4.59.0`), `${name} cache key is stale or missing`);
  }
});

test('4.46 source tree has no repeated named function declarations in a single file', () => {
  const scan = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : scan(file);
    return file.endsWith('.js') ? [file] : [];
  });
  for (const file of scan(root)) {
    const source = fs.readFileSync(file, 'utf8');
    const names = source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g);
    const seen = new Set();
    for (const match of names) {
      assert.ok(!seen.has(match[1]), `${path.relative(root, file)} repeats function ${match[1]}`);
      seen.add(match[1]);
    }
  }
});
