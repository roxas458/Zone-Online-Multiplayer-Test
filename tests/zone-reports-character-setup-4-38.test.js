const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/css/game.css'),'utf8');

test('4.38 has a dedicated Zone Reports tab and removes feeds from Contacts',()=>{
 assert.match(html,/data-v="zoneReports">▤ Сводки Зоны/);
 assert.match(html,/id="zoneReports"/);
 assert.match(html,/id="npcApproachFeed"/);
 assert.match(html,/id="factionCasualtyNotices"/);
 assert.match(html,/id="peopleWorldFeed"/);
 const people=html.match(/<div class="view" id="people">([\s\S]*?)<div class="view" id="squads">/);
 assert.ok(people);
 assert.doesNotMatch(people[1],/npcApproachFeed|factionCasualtyNotices|peopleWorldFeed/);
});

test('4.38 restores squad panel rendering whenever the Squads tab opens',()=>{
 assert.match(js,/function renderSquads\(\)\{renderPlayerSquad\(\{squad:activePlayerSquad\|\|null\}\)/);
 assert.match(js,/if\(id==="squads"\)renderSquads\(\)/);
 assert.match(html,/id="playerSquadPanel"/);
});

test('4.38 character setup provides a point budget and starter gear selection',()=>{
 assert.match(html,/id="setupLoadoutChoices"/);
 assert.match(html,/id="setupPointsLeft"/);
 assert.match(html,/id="setupStartButton"/);
 assert.match(js,/const STARTER_BUDGET=400/);
 assert.match(js,/function changeSetupSlot/);
 assert.match(js,/function changeSetupSupply/);
 assert.match(js,/function randomizeStarterLoadout/);
 assert.match(js,/g\.startingSupplyPoints=\{spent,budget:STARTER_BUDGET\}/);
 assert.match(js,/g\.items=\[\];g\.equipment=/);
});

test('4.38 registration layout is responsive and styled as a three-panel PDA',()=>{
 assert.match(html,/setup-person-panel/);
 assert.match(html,/setup-gear-panel/);
 assert.match(html,/setup-extra-panel/);
 assert.match(css,/\.setup-main-grid\{display:grid/);
 assert.match(css,/@media\(max-width:620px\)/);
});
