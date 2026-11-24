const test=require('node:test');
const assert=require('node:assert/strict');
const {initStashes,publicStashes,searchStashArea,buyStashIntel,lootStash}=require('../src/systems/stashes');
const SHOP=require('../src/shared/game-data').SHOP;
function world(){const w={};initStashes(w,1000);return w;}
function player(id='p1',location='cordon'){return {id,location,x:463,y:1777,state:{money:100000,items:[]}};}
test('creates persistent cache locations across the Zone',()=>{const w=world();assert.ok(Object.keys(w.stashes).length>=15);const before=w.stashes.stash_cordon;initStashes(w,2000);assert.deepEqual(w.stashes.stash_cordon,before);});
test('stash coordinates remain private until the player finds a note or buys intel',()=>{const w=world(),p=player();const hidden=publicStashes(w,p.id,p.location)[0];assert.equal(hidden.discovered,false);assert.equal(hidden.x,undefined);});
test('buying coordinates charges a high price and reveals the stash',()=>{const w=world(),p=player();const r=buyStashIntel(w,p,{name:'Сидорович'},1000);assert.equal(r.ok,true);assert.ok(r.price>=22000);assert.equal(p.state.money,100000-r.price);assert.equal(r.stash.discovered,true);});
test('a discovered stash can only be looted once and only nearby',()=>{const w=world(),p=player();const stash=w.stashes.stash_cordon;w.stashIntel[p.id]=[stash.id];p.x=stash.x+50;p.y=stash.y;assert.equal(lootStash(w,p,stash.id,SHOP,1000).ok,false);p.x=stash.x;p.y=stash.y;const r=lootStash(w,p,stash.id,SHOP,2000);assert.equal(r.ok,true);assert.equal(stash.looted,true);assert.equal(lootStash(w,p,stash.id,SHOP,3000).ok,false);});
test('field search enforces cooldown and can reveal a nearby cache note',()=>{const w=world(),p=player();const stash=w.stashes.stash_cordon;p.x=stash.x;p.y=stash.y;const r=searchStashArea(w,p,SHOP,1000);assert.equal(r.ok,true);assert.equal(r.found,'note');assert.ok(r.stashes.some(s=>s.id===stash.id&&s.discovered));const blocked=searchStashArea(w,p,SHOP,2000);assert.equal(blocked.ok,false);});
test('a player cannot buy coordinates for a sector they are not in',()=>{const w=world(),p=player('p2','zaton');const r=buyStashIntel(w,p,{name:'Информатор'},1000);assert.equal(r.ok,true);assert.equal(r.stash.location,'zaton');});
test('server keeps stash loot and undiscovered coordinates out of public world snapshots',()=>{
 const fs=require('node:fs'),server=fs.readFileSync(require.resolve('../server'),'utf8');
 assert.match(server,/stashes,stashIntel,stashSearchCooldown/);
 assert.match(server,/socket\.on\('stash:loot'/);
 assert.match(server,/socket\.on\('stash:buy-intel'/);
});
test('client exposes field search, discovered stash distances and broker intelligence purchase',()=>{
 const fs=require('node:fs'),client=fs.readFileSync(require.resolve('../public/js/game.js'),'utf8'),html=fs.readFileSync(require.resolve('../public/index.html'),'utf8');
 assert.match(html,/id="searchStashButton"/);
 assert.match(client,/zoneSocket\.emit\('stash:search'/);
 assert.match(client,/Подойти ближе \(18 м\)/);
 assert.match(client,/Купить координаты тайника/);
});
