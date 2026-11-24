const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const npcAI = fs.readFileSync(path.join(root, 'src/systems/npc-ai.js'), 'utf8');
const npcAIConflicts = fs.readFileSync(path.join(root, 'src/systems/npc-ai-conflicts.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');

test('4.33.12 PDA Top 20 view is linked from navigation and includes both dossier panes', () => {
  assert.match(html, /data-v="ranks"/);
  assert.match(html, /id="ranks"/);
  assert.match(html, /id="stalkerLeaderboard"/);
  assert.match(html, /id="rankDetail"/);
  assert.match(css, /\.pda-rank-shell/);
});

test('leaderboard is exposed through HTTP and synchronized to Socket.IO clients', () => {
  assert.match(server, /app\.get\('\/api\/leaderboard'/);
  assert.match(server, /world:leaderboard/);
  assert.match(server, /function buildStalkerLeaderboard\(\)/);
});

test('player and NPC victories update leaderboard kill statistics', () => {
  assert.match(server, /recordStalkerKill\(p,npc\)/);
  assert.match(npcAIConflicts, /killer\.combatKills=\(Number\(killer\.combatKills\)\|\|0\)\+1/);
});

test('client renders server leaderboard and has a local fallback', () => {
  assert.match(game, /function localLeaderboardFallback\(\)/);
  assert.match(game, /function renderStalkerLeaderboard\(\)/);
  assert.match(game, /world:leaderboard/);
});


test('fallen NPC stalkers are archived and removed from the live Top 20', () => {
  assert.match(server, /function archiveFallenStalkers\(\)/);
  assert.match(server, /world\.stalkerHallOfFame\.unshift/);
  assert.match(server, /row\.alive=false/);
  assert.match(server, /leaderboardArchived=true/);
});

test('leaderboard includes achievements, exploration, reputation, and news', () => {
  assert.match(server, /function stalkerAchievements\(row\)/);
  assert.match(server, /row\.discoveries\*18/);
  assert.match(server, /row\.mutantHunts\*20/);
  assert.match(server, /Охотник на мутантов/);
  assert.match(server, /stalkerRumorAt/);
  assert.match(server, /row\.quests\*25/);
  assert.match(server, /row\.reputation/);
  assert.match(server, /function addStalkerNews\(/);
  assert.match(server, /hallOfFame:/);
  assert.match(html, /id="rankHallOfFame"/);
  assert.match(html, /id="rankAchievements"/);
  assert.match(html, /id="rankNews"/);
});

test('NPC skirmish deaths increment career death statistics', () => {
  assert.match(npcAIConflicts, /victim\.combatDeaths=\(Number\(victim\.combatDeaths\)\|\|0\)\+1/);
});
