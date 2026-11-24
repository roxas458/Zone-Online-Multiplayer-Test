const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8')+fs.readFileSync(path.join(root,'public/js/systems/character-setup-data.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const ai=fs.readFileSync(path.join(root,'src/systems/npc-ai.js'),'utf8');
const aiConflicts=fs.readFileSync(path.join(root,'src/systems/npc-ai-faction-battles.js'),'utf8');
const ecosystem=fs.readFileSync(path.join(root,'src/systems/ecosystem.js'),'utf8');
const {initEcosystem}=require('../src/systems/ecosystem');

test('4.59 starter budget matches every visible setup counter and blocks over-budget choices',()=>{
 assert.match(game,/const STARTER_BUDGET=400/);
 assert.match(html,/setupPointsLeft[\s\S]*setupBudgetTotal/);
 assert.match(html,/setupBudgetMax/);
 assert.match(game,/characterLoadoutSystem\.setSlot\(slot,id\)/);
 assert.match(game,/Недостаточно очков снабжения для этого припаса/);
 assert.match(game,/supplies:\['med','bread','bandage'\]/);
 assert.match(game,/g\.startingSupplyPoints=\{spent,budget:STARTER_BUDGET\}/);
});

test('4.59 sector clicks open intelligence before travel and provide an explicit route action',()=>{
 assert.match(game,/function handleMapSectorSelect\(id\)\{showMapSectorCard/);
 assert.match(game,/function showMapSectorCard\(id\)/);
 assert.match(game,/function beginMapSectorTravel\(id\)/);
 for(const field of ['живых НПС','игроков онлайн','аномалий','мутантов','активных боёв','сигналов артефактов','Стратегические объекты'])assert.ok(game.includes(field));
});

test('4.59 battle card displays names, factions, roles, health and persisted snapshots',()=>{
 assert.match(game,/function showMapBattle\(id\)/);
 assert.match(game,/battle\.participants/);
 assert.match(game,/participantSnapshots/);
 assert.match(game,/map-battle-health/);
 assert.match(aiConflicts,/engagement\.participantSnapshots/);
});

test('4.59 ecosystem adds eight anomalies and migrates existing persistent worlds without duplicates',()=>{
 assert.match(ecosystem,/for\(let i=0;i<36;i\+\+\)/);
 assert.match(ecosystem,/for\(let i=28;i<36;i\+\+\)/);
 assert.match(ecosystem,/existing\.has\(id\)/);
 const old={ecosystem:{mutantPacks:Array.from({length:54},(_,i)=>({id:'pack_'+i,location:'cordon',count:1})),anomalies:Array.from({length:28},(_,i)=>({id:'anomaly_'+(i+1),location:'cordon'}))}};
 const migrated=initEcosystem(old);assert.equal(migrated.anomalies.length,36);assert.equal(new Set(migrated.anomalies.map(a=>a.id)).size,36);
 assert.match(game,/local_anomaly_extra_/);
});

test('4.59 game client has no duplicate function declarations',()=>{
 const names=[...game.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
 const duplicates=names.filter((name,index)=>names.indexOf(name)!==index);
 assert.deepEqual([...new Set(duplicates)],[]);
});
