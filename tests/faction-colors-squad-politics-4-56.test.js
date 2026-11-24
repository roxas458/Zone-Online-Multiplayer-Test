const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/js/game.js'),'utf8');
test('strategic map markers use the owning faction color',()=>{
 assert.match(source, /function factionColor\(faction\)/);
 assert.match(source, /--faction-color:\$\{factionColor\(point\.owner\)\}/);
 assert.match(source, /'Бандиты':'#252525'/);
});
test('squad markers use their faction identity color',()=>{
 assert.match(source, /color:\$\{factionColor\(lead\.faction\)\}/);
});
test('squad leadership and defection logic is persisted in A-Life',()=>{
 const souls=fs.readFileSync(path.join(__dirname,'../src/systems/souls.js'),'utf8');
 assert.match(souls,/function tickSquadPolitics/);
 assert.match(souls,/member\.relationships\?\.\[leader\]/);
 assert.match(souls,/type:'npc_squad_change'/);
 assert.match(souls,/squad\.leaderName/);
});

test('a stalker can leave a squad after a serious conflict with its commander',()=>{
 const {tickSouls}=require('../src/systems/souls');
 const make=(id)=>({id,name:id,faction:'Одиночки',role:'сталкер',location:'cordon',alive:true,generated:true,relationships:{},history:[],memory:[],morale:70});
 const a=make('a'),b=make('b'),c=make('c');
 b.relationships.a=-80;
 const world={npcState:{a,b,c},npcPositions:{},npcSquads:[
  {id:'s1',name:'Первый',faction:'Одиночки',leaderId:'a',members:['a','b'],location:'cordon',status:'camped'},
  {id:'s2',name:'Второй',faction:'Одиночки',leaderId:'c',members:['c'],location:'cordon',status:'camped'}
 ]};
 const events=tickSouls(world,new Set(['cordon']),()=>0,Date.now());
 assert.equal(b.squadId,'s2');
 assert.ok(events.some(e=>e.type==='npc_squad_change'&&e.npcId==='b'));
 assert.ok(b.history.some(e=>e.action==='squad_left'));
});
