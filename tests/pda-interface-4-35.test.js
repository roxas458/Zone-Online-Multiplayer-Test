'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=()=>fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const js=()=>fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
const css=()=>fs.readFileSync(path.join(root,'public/css/game.css'),'utf8');
test('4.35 player identity card keeps portrait, callsign, faction, balance, time and location together on the right',()=>{
 const h=html(),c=css();
 assert.match(h,/<header class="zone-header">[\s\S]*?class="header-player-card"[\s\S]*?id="headerPlayerPortrait"[\s\S]*?id="headerPlayerName"[\s\S]*?id="headerPlayerFaction"[\s\S]*?id="topMoney"[\s\S]*?id="topDay"[\s\S]*?id="topLoc"/);
 assert.match(c,/\.header-player-card\{order:3;flex:0 0 auto/);
});
test('4.35 contacts view is a two-pane PDA directory with searchable rows and a selected NPC dossier',()=>{
 const h=html(),j=js(),c=css();
 for(const id of ['peopleSearch','peopleList','peopleDetail','peopleDetailTitle','peopleWorldFeed'])assert.ok(h.includes(`id="${id}"`));
 assert.match(j,/function selectContactNpc\(id\)/);assert.match(j,/function renderContactDetail\(\)/);
 assert.match(c,/\.pda-contacts-shell\{display:grid;grid-template-columns/);
});
test('4.35 armory is integrated into the full-screen encyclopedia and removed from the sidebar',()=>{
 const h=html(),j=js(),c=css();
 assert.match(h,/id="encyclopediaArmory"/);assert.match(h,/id="encyModeArmory"/);
 assert.doesNotMatch(h,/data-v="armory"/);assert.doesNotMatch(h,/id="armory"/);
 assert.match(j,/function setEncyclopediaMode\(mode\)/);assert.match(c,/#encyclopedia\.view\.active\{position:fixed;inset:0/);
});
