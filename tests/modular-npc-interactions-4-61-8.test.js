const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { interactWithNpc } = require('../src/systems/npc-interactions');
const npcAi = require('../src/systems/npc-ai');

const root = path.resolve(__dirname, '..');

test('4.61.8 NPC interaction rules are extracted and kept behind the npc-ai compatibility export', () => {
  const aiSource = fs.readFileSync(path.join(root, 'src/systems/npc-ai.js'), 'utf8');
  const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(aiSource, /require\('\.\/npc-interactions'\)/);
  assert.doesNotMatch(aiSource, /function interactWithNpc\(/);
  assert.match(serverSource, /interactWithNpc/);
  assert.equal(npcAi.interactWithNpc, interactWithNpc);
});

test('NPC interaction rejects dead, remote, out-of-range, and unknown actions without mutating state', () => {
  const player = { id:'player-1', location:'cordon', x:463, y:1753 };
  const dead = { id:'npc-dead', location:'cordon', x:463, y:1753, alive:false };
  assert.equal(interactWithNpc(dead, player, 'greet').ok, false);
  const remote = { id:'npc-remote', location:'agro', x:463, y:1753, alive:true };
  assert.equal(interactWithNpc(remote, player, 'greet').ok, false);
  const far = { id:'npc-far', location:'cordon', x:700, y:1753, alive:true };
  assert.equal(interactWithNpc(far, player, 'greet').ok, false);
  const invalid = { id:'npc-invalid', location:'cordon', x:463, y:1753, alive:true, relationships:{}, memory:[] };
  assert.equal(interactWithNpc(invalid, player, 'grant_money').ok, false);
  assert.deepEqual(invalid.relationships, {});
  assert.deepEqual(invalid.memory, []);
});

test('valid NPC interactions preserve relationship deltas, bounded memory, dialogue, and timestamp', () => {
  const npc = { id:'wolf', name:'Волк', location:'cordon', x:463, y:1753, alive:true, relationships:{'player-1':98}, memory:Array.from({length:30}, (_,i)=>({type:'old',i})) };
  const player = { id:'player-1', location:'cordon', x:463, y:1753 };
  const result = interactWithNpc(npc, player, 'help', 123456, { locationName:'Кордон' });
  assert.equal(result.ok, true);
  assert.equal(result.relationship, 100);
  assert.equal(result.npcId, 'wolf');
  assert.ok(result.reply.length > 0);
  assert.equal(npc.lastInteractionAt, 123456);
  assert.equal(npc.memory.length, 30);
  assert.deepEqual(npc.memory.at(-1), { type:'player_interaction', playerId:'player-1', action:'help', at:123456 });
});

test('all supported interaction actions retain their original relationship changes', () => {
  const expected = { greet:2, ask:0, trade:1, help:5, topic:0 };
  for (const [action, delta] of Object.entries(expected)) {
    const npc = { id:`npc-${action}`, name:'Сталкер', location:'cordon', x:463, y:1753, alive:true, relationships:{p:0} };
    const result = interactWithNpc(npc, {id:'p',location:'cordon',x:463,y:1753}, action, 10);
    assert.equal(result.ok, true, action);
    assert.equal(result.relationship, delta, action);
  }
});
