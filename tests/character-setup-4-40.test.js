const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
test('4.40 character setup is full-screen and includes a selectable portrait gallery', () => {
  assert.match(html, /id="setupPortraits"/);
  assert.match(js, /function chooseSetupPortrait/);
  const profile = fs.readFileSync(path.join(root, 'public/js/systems/character-setup-profile.js'), 'utf8');
  assert.match(js, /characterSetupProfile\.createPortraitPicker\(/);
  assert.match(profile, /const PORTRAIT_COUNT=16/);
  assert.match(profile, /function isPortrait/);
  assert.match(css, /\.setup-overlay\{position:fixed!important;inset:0!important/);
  assert.match(css, /width:100vw!important;height:100dvh!important/);
});
test('4.40 backgrounds grant persistent character-specific starting bonuses', () => {
  for (const id of ['wanderer','medic','technician','researcher','courier']) assert.match(js, new RegExp(id));
  assert.match(js, /g\.background=setupBackground/);
  assert.match(js, /g\.guideDiscount=setupBackground==='courier'/);
});
test('4.40 faction guides require a visited destination, faction base and high fare', () => {
  assert.match(js, /const factionGuides=/);
  assert.match(js, /const guideBaseFare=8500/);
  assert.match(js, /g\.loc!==guide\.base/);
  assert.match(js, /visitedLocations\|\|\[\]\)\.includes\(destination\)/);
  assert.match(js, /function useFactionGuide/);
});
test('4.40 faction-specific armor is available in starter selection and encyclopedia', () => {
  for (const id of ['armor_duty','armor_freedom','armor_bandit','armor_military','armor_ecologist','armor_merc','armor_monolith','armor_clearsky','armor_renegade']) assert.match(js, new RegExp(id));
  assert.match(js, /Фракционный бронекостюм/);
  assert.match(js, /encyclopediaEntries/);
});
