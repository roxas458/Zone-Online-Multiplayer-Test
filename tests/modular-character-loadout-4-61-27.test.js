const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createCharacterLoadoutSystem } = require('../public/js/systems/character-loadout.js');

function fixture(){
  let loadout={weapon:'pm',suit:'leather',tool:'detector',backpack:'pack',supplies:['med','bread']};
  const gear={pm:{points:40},rifle:{points:60},leather:{points:20},armor:{points:80},detector:{points:10},pack:{points:0},med:{points:15},bread:{points:10},water:{points:10}};
  const system=createCharacterLoadoutSystem({getLoadout:()=>loadout,setLoadout:value=>{loadout=value;},getGear:()=>gear,budget:120});
  return {system,getLoadout:()=>loadout,gear};
}

test('character loadout calculates selected starter items and supply budget',()=>{
  const {system}=fixture();
  assert.deepEqual(system.selectedItems(),['pm','leather','detector','pack','med','bread']);
  assert.equal(system.spent(),95);
  assert.deepEqual(system.validate(),{ok:true,spent:95,budget:120,remaining:25,items:['pm','leather','detector','pack','med','bread']});
});

test('character loadout rejects over-budget slot changes without mutating selection',()=>{
  const {system,getLoadout}=fixture();
  const result=system.setSlot('suit','armor');
  assert.equal(result.ok,false);
  assert.equal(result.reason,'over-budget');
  assert.equal(getLoadout().suit,'leather');
});

test('character loadout applies valid slot changes and rejects unknown slots or gear',()=>{
  const {system,getLoadout}=fixture();
  assert.equal(system.setSlot('weapon','rifle').ok,true);
  assert.equal(getLoadout().weapon,'rifle');
  assert.equal(system.setSlot('helmet','armor').reason,'invalid-slot');
  assert.equal(system.setSlot('weapon','missing').reason,'unknown-item');
});

test('character loadout enforces supply quantity and budget while supporting removal',()=>{
  const {system,getLoadout}=fixture();
  assert.equal(system.changeSupply('water',1).ok,true);
  assert.equal(system.changeSupply('water',1).ok,true);
  assert.equal(system.changeSupply('water',1).reason,'over-budget');
  assert.equal(getLoadout().supplies.filter(x=>x==='water').length,2);
  assert.equal(system.changeSupply('med',-1).ok,true);
  assert.equal(getLoadout().supplies.includes('med'),false);
});

test('character loadout reset restores faction suit and standard starter supplies',()=>{
  const {system,getLoadout}=fixture();
  system.reset({suit:'armor'});
  assert.deepEqual(getLoadout(),{weapon:'weapon_pm',suit:'armor',tool:'detector_echo',backpack:'backpack_standard',supplies:['med','bread','bandage']});
});

test('browser loads character loadout rules before game.js and includes current cache keys',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  const moduleAt=html.indexOf('/js/systems/character-loadout.js?v=4.61.52');
  const gameAt=html.indexOf('/js/game.js?v=4.61.52');
  assert.ok(moduleAt>=0&&gameAt>moduleAt);
  assert.match(html,/ZONE ONLINE · VER\. 4\.61\.52/);
});
