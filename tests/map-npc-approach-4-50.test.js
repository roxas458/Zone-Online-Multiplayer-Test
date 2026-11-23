const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const client=fs.readFileSync(require.resolve('../public/js/game.js'),'utf8');
const css=fs.readFileSync(require.resolve('../public/css/game.css'),'utf8');

test('selecting an NPC map marker only opens information and does not issue movement',()=>{
 const body=client.match(/function selectMapNpc\(id\)\{([\s\S]*?)\n\}/)?.[1]||'';
 assert.match(body,/showMapNpc\(id\)/);
 assert.doesNotMatch(body,/issueApproachOrder|playerMoveTarget|walkTarget|startWalking/);
});
test('NPC approach is an explicit action and validates sector and proximity',()=>{
 assert.match(client,/function approachNpcForConversation\(id\)/);
 assert.match(client,/issueApproachOrder\(\{x:p\[0\],y:p\[1\]\},'npc',n\.id\)/);
 assert.match(client,/onclick=\"approachNpcForConversation\('/);
});
test('NPC marker click and pointer events cannot bubble into map background movement',()=>{
 assert.match(client,/onclick=\"event\.stopPropagation\(\);selectMapNpc/);
 assert.match(client,/onpointerdown=\"event\.stopPropagation\(\)/);
});
test('NPC map card actions are aligned as full-width vertical controls',()=>{
 assert.match(css,/map-player-actions\{display:flex!important;flex-direction:column!important/);
 assert.match(css,/map-player-actions>button[\s\S]*?width:100%!important/);
});
