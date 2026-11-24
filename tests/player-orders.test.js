'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createMoveOrder,advanceMoveOrder}=require('../src/systems/player-orders');
test('creates a bounded slow movement order',()=>{const r=createMoveOrder({x:100,y:100},{x:150,y:100},1000,7);assert.equal(r.ok,true);assert.equal(r.order.distance,50);assert.equal(r.order.speed,7);});
test('rejects malformed or already reached targets',()=>{assert.equal(createMoveOrder({x:1,y:1},{x:NaN,y:4}).ok,false);assert.equal(createMoveOrder({x:1,y:1},{x:2,y:2}).ok,false);});
test('advances gradually and completes at destination',()=>{const p={x:0,y:0,moveOrder:{x:20,y:0,speed:5}};let a=advanceMoveOrder(p,1);assert.equal(a.arrived,false);assert.equal(p.x,5);a=advanceMoveOrder(p,3);assert.equal(a.arrived,true);assert.equal(p.x,20);assert.equal(p.moveOrder,null);});
test('pauses when a travel encounter is active',()=>{const p={x:0,y:0,travelEncounter:{type:'mutants'},moveOrder:{x:20,y:0,speed:5}};const a=advanceMoveOrder(p,1);assert.equal(a.moved,false);assert.equal(p.x,0);});
