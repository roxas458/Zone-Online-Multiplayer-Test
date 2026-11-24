const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dialogue = require('../public/js/systems/npc-dialogue');

const root = path.resolve(__dirname, '..');

test('4.61.10 NPC dialogue module loads before the browser client and replaces inline dialogue content', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.ok(html.indexOf('/js/systems/npc-dialogue.js') < html.indexOf('/js/game.js'));
  assert.match(html, /npc-dialogue\.js\?v=4\.61\.52/);
  assert.match(client, /window\.ZoneNpcDialogue/);
  assert.doesNotMatch(client, /const SIGNATURE_DIALOGUES=/);
  assert.doesNotMatch(client, /function generatedNpcDialogue\(/);
});

test('signature dialogue is applied as an independent copy and preserves authored lines', () => {
  const npc = { id: 'sid', greeting: 'old greeting', topics: [['old', 'old']] };
  assert.equal(dialogue.applySignatureDialogue(npc), true);
  assert.match(npc.greeting, /Сидорович/);
  assert.equal(npc.topics.length, 10);
  assert.equal(npc.topics[0][0], 'Кто ты?');
  npc.topics[0][1] = 'mutated';
  const other = { id: 'sid' };
  dialogue.applySignatureDialogue(other);
  assert.notEqual(other.topics[0][1], 'mutated');
  assert.equal(dialogue.applySignatureDialogue({ id: 'unknown' }), false);
});

test('procedural dialogue keeps the six additional topics and the 15-minute refresh cycle', () => {
  const npc = { id: 'wander_test', name: 'Тестовый сталкер', topics: [['Старый вопрос', 'Старый ответ']] };
  const first = dialogue.generatedNpcDialogue(npc);
  assert.equal(first.length, 7);
  assert.equal(first[0][0], 'Старый вопрос');
  assert.deepEqual(first.slice(1).map(topic => topic[0]), [
    'Расскажи о себе', 'Чем ты занимаешься в Зоне?', 'Что осталось на Большой земле?',
    'Что сейчас происходит вокруг?', 'Как ты попал сюда?', 'Есть ли у тебя планы?'
  ]);
  const cycle = npc._generatedDialogueCycle;
  const topics = npc.topics;
  assert.equal(dialogue.generatedNpcDialogue(npc), topics);
  assert.equal(npc._generatedDialogueCycle, cycle);
  assert.ok(npc.greeting.includes('Тестовый сталкер'));
});

test('browser smoke harness loads the extracted dialogue module before game.js', () => {
  const smoke = fs.readFileSync(path.join(root, 'tests/client-smoke.test.js'), 'utf8');
  assert.match(smoke, /systems\/npc-dialogue\.js/);
});
