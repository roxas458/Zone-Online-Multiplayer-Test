const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
const shared=fs.readFileSync(path.join(root,'src/shared/game-data.js'),'utf8');

test('4.58.1 starter weapon list exposes every server-supported starter firearm',()=>{
  for(const id of ['weapon_pm','weapon_toz34','weapon_aks74u','weapon_ak74','weapon_vintar']){
    assert.match(js,new RegExp(id));
    assert.match(shared,new RegExp(id));
  }
  assert.match(js,/Основной слот',STARTER_WEAPON_OPTIONS/);
  assert.match(js,/for\(const row of weaponCatalogue\)/);
  assert.match(js,/STARTER_WEAPON_SERVER_IDS/);
  assert.match(js,/const STARTER_WEAPON_SERVER_IDS=new Set\(\[/);
  assert.match(js,/let power=Math\.max\(8,Number\(item\.power\)\|\|12\)/);
  assert.match(js,/STARTER_WEAPON_OPTIONS=Object\.values\(STARTER_GEAR\)/);
  const supported=(js.match(/STARTER_WEAPON_SERVER_IDS=new Set\(\[([^\]]+)\]/)||[])[1];
  assert.ok(supported);
  const ids=[...supported.matchAll(/'([^']+)'/g)].map(match=>match[1]);
  assert.equal(ids.length,30);
  for(const id of ids)assert.ok(shared.includes(`TRADE_ITEM_IDS.add('${id}')`),`${id} is accepted by server inventory rules`);
  assert.match(js,/const STARTER_BUDGET=400/);
});

test('4.58.1 quests are scoped to the selected faction and acceptance is guarded',()=>{
  assert.match(js,/q\.faction.*g\.faction/);
  assert.match(js,/function acceptQuest\(id\).*q\.faction/);
  assert.match(js,/function turnIn\(id\).*q\.faction/);
  assert.match(js,/migrateWorld\(\);\s*const spent=setupSpent\(\)/);
  for(const faction of ['Одиночки','Долг','Свобода','Бандиты','Военные','Учёные','Наёмники','Монолит','Чистое небо','Ренегаты']){
    assert.ok(js.includes(`'${faction}':[{id:`),`faction quest set exists for ${faction}`);
  }
});

test('4.58.1 faction quests have generic location and delivery requirements',()=>{
  assert.match(js,/if\(q\.requiredLocation\)\{const requiredCount/);
  assert.match(js,/if\(q\.requiredItem\)take\(q\.requiredItem/);
  assert.match(js,/requiredItemType:'Артефакт'/);
  assert.match(js,/storyQuestFactions/);
});
