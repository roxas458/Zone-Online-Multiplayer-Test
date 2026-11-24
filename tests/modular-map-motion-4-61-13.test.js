'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const motion = require('../public/js/systems/map-motion');
const root = path.resolve(__dirname, '..');

test('4.61.15 batches NPC marker writes into one animation frame and keeps only the latest transform', () => {
  const batcher = motion.createMotionBatcher();
  const markers = new Map();
  const writes = [];
  for (const id of ['a', 'b']) markers.set(id, {
    style: {}, setAttribute(name, value) { writes.push([id, name, value]); }
  });
  const frames = [];
  const requestFrame = callback => frames.push(callback);
  const resolve = id => markers.get(id);
  batcher.schedule([{id:'a',transform:'translate(1 1) scale(.42)'}], resolve, requestFrame);
  batcher.schedule([
    {id:'a',transform:'translate(2 2) scale(.42)'},
    {id:'b',transform:'translate(3 3) scale(.48)'},
    {id:'bad',transform:'translate(0 0)'}
  ], resolve, requestFrame);
  assert.equal(frames.length, 1, 'only one frame should be queued');
  assert.equal(batcher.pendingCount, 3);
  frames[0]();
  assert.deepEqual(writes, [
    ['a','transform','translate(2 2) scale(.42)'],
    ['b','transform','translate(3 3) scale(.48)']
  ]);
  assert.equal(batcher.pendingCount, 0);
  assert.equal(markers.get('a').style.transition, 'transform 950ms linear');
});

test('4.61.15 browser loads the isolated map-motion module before game.js', () => {
  const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const client = fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  assert.ok(html.indexOf('/js/systems/map-motion.js') < html.indexOf('/js/game.js'));
  assert.match(client, /window\.ZoneMapMotion\.createMotionBatcher\(\)/);
  assert.match(client, /zoneMapMotion\.schedule\(transforms/);
  assert.match(html, /map-motion\.js\?v=4\.61\.17/);
});
