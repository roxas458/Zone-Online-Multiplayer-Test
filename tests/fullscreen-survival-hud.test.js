import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/js/game.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/css/game.css'),'utf8');
test('4.33.23 survival HUD exposes health, stamina and equipped weapon condition',()=>{
  for(const id of ['survivalHud','hudHealthTicks','hudStaminaTicks','hudWeaponName','hudWeaponConditionFill','hudWeaponConditionValue']) assert.ok(html.includes(`id="${id}"`));
  assert.match(js,/function renderSurvivalHud\(\)/);
  assert.match(js,/renderSurvivalHud\(\)/);
  assert.match(js,/equippedWeapon\(\)/);
});
test('4.33.23 desktop layout fills the viewport and provides a fullscreen control',()=>{
  assert.match(html,/onclick="toggleGameFullscreen\(\)"/);
  assert.match(js,/requestFullscreen/);
  assert.match(css,/main\{width:100%;max-width:none/);
  assert.match(css,/\.survival-hud\{position:fixed/);
});
test('survival HUD is hidden on title screen and repositioned above mobile navigation',()=>{
  assert.match(css,/body\.title-screen-active \.survival-hud\{display:none\}/);
  assert.match(css,/bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
});
