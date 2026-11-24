const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/js/systems/quests.js'), 'utf8');
function loadBrowserModule() {
  const window = {};
  vm.runInNewContext(source, { window });
  return window.ZoneQuests;
}

test('quest rules load before the browser game and are shared with the server', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.ok(html.indexOf('/js/systems/quests.js') < html.indexOf('/js/game.js'));
  assert.match(client, /ZoneQuests\.canComplete\(g,q,g\.loc\)/);
  assert.match(server, /require\('\.\/public\/js\/systems\/quests\.js'\)/);
  assert.match(server, /ZoneQuests\.canComplete\(st,q,p\.location\)/);
});

test('legacy quest conditions preserve item and story flag requirements', () => {
  const quests = loadBrowserModule();
  const state = { flags: { metWolf: true, heardBar: true, metScout: true, metProf: true, foundArtifact: true }, items: [{ id: 'scrap', qty: 3 }, { id: 'bread', qty: 2 }] };
  for (const id of ['intro', 'scrap', 'bread', 'rumors', 'research']) {
    assert.equal(quests.canComplete(state, { id }, 'cordon'), true, id);
  }
  assert.equal(quests.canComplete({ flags: {}, items: [] }, { id: 'scrap' }, 'cordon'), false);
});

test('location and delivery quests require the correct sector and sufficient quantity', () => {
  const quests = loadBrowserModule();
  const quest = { id: 'delivery', requiredLocation: 'bar', requiredItem: 'med', requiredQty: 2 };
  const state = { items: [{ id: 'med', qty: 1 }, { id: 'med', qty: 1 }] };
  assert.equal(quests.canComplete(state, quest, 'cordon'), false);
  assert.equal(quests.canComplete(state, quest, 'bar'), true);
  assert.equal(quests.canComplete({ items: [{ id: 'med', qty: 1 }] }, quest, 'bar'), false);
});

test('artifact-type quests count inventory by type, not by a hard-coded item id', () => {
  const quests = loadBrowserModule();
  const quest = { id: 'sample', requiredLocation: 'yantar', requiredItemType: 'Артефакт', requiredQty: 2 };
  const state = { items: [{ id: 'artifact_a', type: 'Артефакт', qty: 1 }, { id: 'artifact_b', type: 'Артефакт', qty: 1 }, { id: 'med', type: 'Медицина', qty: 20 }] };
  assert.equal(quests.canComplete(state, quest, 'yantar'), true);
  assert.equal(quests.canComplete(state, quest, 'cordon'), false);
  assert.equal(quests.canComplete({ items: [{ id: 'artifact_a', type: 'Артефакт', qty: 1 }] }, quest, 'yantar'), false);
});

test('story quests require both the matching NPC flag and discovered key point', () => {
  const quests = loadBrowserModule();
  const quest = { id: 'story_north_route' };
  const state = {
    storyFlags: { metBeard: true },
    keyPoints: {
      jupiter: [{ id: 'jupiter_extra_3', discovered: true }],
      radar: [{ id: 'radar_extra_1', discovered: false }]
    }
  };
  assert.equal(quests.canComplete(state, quest, 'jupiter'), false);
  state.keyPoints.radar[0].discovered = true;
  assert.equal(quests.canComplete(state, quest, 'jupiter'), true);
  state.storyFlags.metBeard = false;
  assert.equal(quests.canComplete(state, quest, 'jupiter'), false);
});

test('invalid inputs and missing quest conditions fail safely', () => {
  const quests = loadBrowserModule();
  assert.equal(quests.canComplete(null, { id: 'intro' }, 'cordon'), false);
  assert.equal(quests.canComplete({}, null, 'cordon'), false);
  assert.equal(quests.canComplete({ flags: {}, items: [] }, { id: 'unknown' }, 'cordon'), false);
});
