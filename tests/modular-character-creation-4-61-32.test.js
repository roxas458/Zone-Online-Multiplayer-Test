const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const creation = require('../public/js/systems/character-creation.js');
const root = path.resolve(__dirname, '..');

function fixture(overrides={}) {
  const character = {
    factions: [{name:'Одиночки'},{name:'Долг'}],
    visitedLocations:['cordon'], items:[{id:'old'}], equipment:{weapon:'old'},
    news:[], log:[], rep:0, scienceTrust:0
  };
  const gear = {
    weapon_pm:{id:'weapon_pm',name:'Пистолет ПМ',type:'Оружие',desc:'Пистолет',weight:1,value:100,price:200,power:13},
    armor_stalker:{id:'armor_stalker',name:'Комбинезон М-2',type:'Броня',desc:'Защита',weight:2,value:300,defense:3},
    med:{id:'med',name:'Аптечка',type:'Медицина',desc:'Лечение',weight:.4,value:50}
  };
  return {
    character,name:'Клык',realName:'Иван',faction:'Одиночки',portrait:'stalker-03.webp',background:'wanderer',spawn:'cordon',
    loadout:{weapon:'weapon_pm',suit:'armor_stalker',tool:'detector_none',backpack:'backpack_standard'},
    selectedItems:['weapon_pm','armor_stalker','med','med'],gear,spent:150,budget:400,
    spawnOptions:[{id:'cordon',owner:'Одиночки'}],spawnNames:{cordon:'Кордон'},day:3,hour:'09:30',...overrides
  };
}

test('4.61.51 validates identity, budget and faction spawn before applying creation', () => {
  const input=fixture();
  assert.deepEqual(creation.validate({name:'Клык',realName:'Иван',faction:'Одиночки',factions:input.character.factions,spent:150,budget:400,spawn:'cordon',spawnOptions:input.spawnOptions}),{ok:true,reason:null});
  assert.equal(creation.apply({...input,name:'Я'}).reason,'callsign');
  assert.equal(creation.apply({...input,realName:'И'}).reason,'real-name');
  assert.equal(creation.apply({...input,faction:'Монолит'}).reason,'faction');
  assert.equal(creation.apply({...input,spent:401}).reason,'over-budget');
  assert.equal(creation.apply({...input,spawn:'bar'}).reason,'spawn');
  assert.deepEqual(input.character.items,[{id:'old'}],'failed validation must not partially mutate character');
});

test('4.61.51 applies profile, faction spawn, starter inventory, equipment and background bonuses', () => {
  const input=fixture({background:'researcher',spawn:'cordon'});
  const result=creation.apply(input);
  assert.equal(result.ok,true);
  const c=input.character;
  assert.equal(c.characterCreated,true);
  assert.equal(c.name,'Клык');
  assert.equal(c.realName,'Иван');
  assert.equal(c.playerPortrait,'stalker-03.webp');
  assert.equal(c.loc,'cordon');
  assert.deepEqual(c.visitedLocations,['cordon']);
  assert.equal(c.hp,100); assert.equal(c.stamina,85); assert.equal(c.hunger,18); assert.equal(c.thirst,20);
  assert.equal(c.equipment.weapon,'Пистолет ПМ');
  assert.equal(c.equipment.suit,'Комбинезон М-2');
  assert.equal(c.items.find(x=>x.id==='med').qty,2);
  assert.equal(c.rep,3); assert.equal(c.scienceTrust,3);
  assert.deepEqual(c.startingSupplyPoints,{spent:150,budget:400});
  assert.match(c.news[0].body,/Клык/);
  assert.match(c.log[0],/Кордон/);
});

test('4.61.51 applies medic and technician starter bonuses and avoids minting missing catalogue items', () => {
  const medic=fixture({background:'medic',selectedItems:['missing-item']});
  assert.equal(creation.apply(medic).ok,true);
  assert.equal(medic.character.items.length,1);
  assert.equal(medic.character.items[0].id,'med-background');
  const tech=fixture({background:'technician',selectedItems:[]});
  assert.equal(creation.apply(tech).ok,true);
  assert.equal(tech.character.items[0].id,'scrap-background');
  assert.equal(tech.character.items[0].qty,2);
});

test('4.61.51 browser loads character creation before game.js and delegates profile creation', () => {
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const game=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
  const moduleAt=html.indexOf('/js/systems/character-creation.js?v=4.61.51');
  const gameAt=html.indexOf('/js/game.js?v=4.61.51');
  assert.ok(moduleAt>=0&&gameAt>moduleAt);
  assert.match(game,/ZoneCharacterCreation\.apply\(/);
  assert.doesNotMatch(game,/g\.items=\[\];g\.equipment=\{/);
  assert.match(game,/characterSetupProfile\.validateIdentity\(/);
});
