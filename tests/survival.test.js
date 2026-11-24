'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const survival=require('../public/js/survival');

test('survival needs advance gradually and are bounded',()=>{
 const p={hunger:10,thirst:10,stamina:80,hp:100};
 const r=survival.advanceNeeds(p,10*60000,'clear');
 assert.equal(r.minutes,10);assert.ok(p.hunger>10&&p.thirst>10);assert.ok(p.hunger<=100&&p.thirst<=100);
});
test('offline catch-up is capped to three hours',()=>{
 const p={hunger:0,thirst:0,stamina:100,hp:100};
 const r=survival.advanceNeeds(p,24*60*60000,'overcast');assert.equal(r.minutes,180);
});
test('hunting requires a live pack and enough stamina',()=>{
 assert.equal(survival.resolveHunt({count:0,aggression:20},60,100,0).ok,false);
 assert.equal(survival.resolveHunt({count:2,aggression:20},60,10,0).ok,false);
 assert.equal(survival.resolveHunt({count:2,aggression:20},60,100,0).ok,true);
});
test('dangerous expedition costs more stamina and radiation',()=>{
 const safe=survival.expeditionCost(10,'clear',false),danger=survival.expeditionCost(90,'rain',true);
 assert.ok(danger.stamina>safe.stamina);assert.ok(danger.radiation>safe.radiation);assert.ok(danger.thirst>=safe.thirst);
});
test('a proper shelter prevents emission damage',()=>{
 assert.deepEqual(survival.emissionDamage(true,0),{hp:0,radiation:0,stamina:0});
 assert.ok(survival.emissionDamage(false,0).hp>0);
});
