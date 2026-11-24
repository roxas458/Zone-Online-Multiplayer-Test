'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/css/game.css'),'utf8');
test('4.44 character generator creates a first name and callsign without surname data',()=>{
  assert.match(html,/for="setupRealName">Имя</);
  assert.match(html,/for="setupCallsign">Позывной</);
  assert.match(js,/function generateSetupRealName\(\)\{const el=\$\('setupRealName'\);if\(el\)el\.value=pickSetup\(SETUP_FIRST_NAMES\)/);
  assert.doesNotMatch(js,/SETUP_LAST_NAMES/);
  for(const sample of ['Ярик','Вася','Пугливый','Прокурор','Пророк'])assert.ok(js.includes(sample));
  assert.match(js,/split\(\/\\s\+\/\)\[0\]/);
  assert.match(js,/\[g\.realName,g\.name\]\.filter\(Boolean\)\.join\(" "\)/);
});
test('4.44 comfort options are persisted, applied and available from title and in-game menus',()=>{
  for(const key of ['largeText','reduceMotion','compactUI','highContrast','largeControls','reduceBackground','uiScale'])assert.ok(js.includes(`'${key}'`));
  assert.match(js,/function resetGameOptions\(/);
  assert.match(html,/id="settingUiScale"/);
  assert.match(html,/id="titleUiScale"/);
  assert.match(css,/body\.high-contrast/);
  assert.match(css,/body\.large-controls/);
  assert.match(css,/body\.reduce-background/);
});
