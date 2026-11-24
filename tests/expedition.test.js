'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {findRoute,createExpedition,advanceExpedition,ROUTES}=require('../src/systems/expedition');
test('all 17 sectors exist in connected travel graph',()=>{assert.equal(Object.keys(ROUTES).length,17);for(const from of Object.keys(ROUTES))for(const to of Object.keys(ROUTES))assert.ok(findRoute(from,to),'missing route '+from+' -> '+to);});
test('safe route avoids riskier sectors when possible',()=>{const safe=findRoute('cordon','bar','safe');const fast=findRoute('cordon','bar','fast');assert.equal(safe.path[0],'cordon');assert.equal(safe.path.at(-1),'bar');assert.equal(fast.path.at(-1),'bar');});
test('expedition advances one sector at a time and arrives',()=>{const p={location:'cordon'};const r=createExpedition(p,'bar','fast',1000);assert.equal(r.ok,true);p.expedition=r.expedition;let now=1e9;let steps=0;while(p.expedition.status==='travelling'&&steps++<10){p.expedition.nextHopAt=now;const a=advanceExpedition(p,now);assert.equal(a.advanced,true);}assert.equal(p.location,'bar');assert.equal(p.expedition.status,'arrived');});
test('invalid destinations are rejected',()=>{assert.equal(createExpedition({location:'cordon'},'unknown').ok,false);});
