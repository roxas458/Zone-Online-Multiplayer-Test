'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const client=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const shop=fs.readFileSync(path.join(root,'src/shared/game-data.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/css/game.css'),'utf8');
test('4.42 identity setup has separate generated real name and callsign',()=>{
  assert.match(html,/id="setupRealName"/);assert.match(html,/id="setupCallsign"/);
  assert.match(client,/function generateSetupRealName\(/);assert.match(client,/function generateSetupCallsign\(/);
  assert.match(client,/g\.realName=realName/);
});
test('4.42 portrait chooser is a compact modal, not a large grid in the faction panel',()=>{
  assert.match(html,/id="setupPortraitModal"/);assert.match(html,/onclick="openSetupPortraitPicker\(\)"/);
  assert.match(css,/\.setup-portrait-modal-card/);assert.match(client,/function closeSetupPortraitPicker\(/);
  assert.equal((html.match(/id="setupAvatar"/g)||[]).length,1);
});
test('4.42 armor expansion is buyable and listed in the encyclopedia armory',()=>{
  for(const id of ['armor_sunrise','armor_berill','armor_guardian','armor_cs3a','armor_ps5m']){
    assert.ok(shop.includes(id),`missing shop armor ${id}`);assert.ok(client.includes(id),`missing client armor ${id}`);
  }
});
test('4.42 cooperative artifact expeditions are server-authoritative and shared by sector',()=>{
  for(const event of ['artifact-expedition:create','artifact-expedition:join','artifact-expedition:claim','artifact-expedition:state'])assert.ok(server.includes(event));
  assert.match(server,/pendingArtifactRewards/);assert.match(server,/status='ready'/);
  assert.match(client,/function createCoopArtifactExpedition\(/);assert.match(client,/function joinCoopArtifactExpedition\(/);
  assert.match(client,/function claimCoopArtifactExpedition\(/);assert.match(client,/showMapCoopArtifact/);
});
