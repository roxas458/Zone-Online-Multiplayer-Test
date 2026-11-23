'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SHOP,TRADE_ITEM_IDS,SELL_VALUES}=require('../src/shared/game-data');
const root=path.join(__dirname,'..');
test('4.33.43 medical supplies are stocked, sellable and transferable',()=>{
 for(const id of ['painkillers','trauma_kit']){assert.ok(SHOP[id]);assert.ok(TRADE_ITEM_IDS.has(id));assert.ok(SELL_VALUES[id]>0);assert.equal(SHOP[id].type,'Медицина');}
});
test('4.33.43 client uses distinct effects for painkillers and trauma kit',()=>{
 const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
 assert.match(client,/id===\"painkillers\"[\s\S]*?g\.stamina=Math\.min\(100,g\.stamina\+25\)/);
 assert.match(client,/id===\"trauma_kit\"[\s\S]*?g\.hp=Math\.min\(100,g\.hp\+55\)/);
 assert.match(client,/med\.id==='trauma_kit'\?50:med\.id==='bandage'\?12:32/);
});
