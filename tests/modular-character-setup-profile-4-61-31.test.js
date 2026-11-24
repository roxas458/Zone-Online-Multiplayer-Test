const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const profile = require('../public/js/systems/character-setup-profile.js');

const root = path.resolve(__dirname, '..');

test('4.61.51 portrait catalogue matches the 16 shipped stalker portrait assets', () => {
  const files = profile.portraitFiles();
  assert.equal(files.length, 16);
  assert.equal(new Set(files).size, 16);
  for (const file of files) {
    assert.ok(profile.isPortrait(file));
    assert.ok(fs.existsSync(path.join(root, 'public/assets/portraits', file)), `missing portrait asset ${file}`);
  }
  assert.equal(profile.normalizePortrait('stalker-16.webp'), 'stalker-16.webp');
  assert.equal(profile.normalizePortrait('../stalker-01.webp'), profile.DEFAULT_PORTRAIT);
  assert.equal(profile.normalizePortrait('stalker-17.webp'), profile.DEFAULT_PORTRAIT);
});

test('4.61.51 portrait picker owns selection, renders the gallery, and rejects unknown files', () => {
  const elements = {
    setupPortraits: { innerHTML: '' },
    setupAvatar: { innerHTML: '' },
    setupPortraitModal: { hidden: true }
  };
  let changed = null;
  const picker = profile.createPortraitPicker({ getElement: id => elements[id], onChange: value => { changed = value; } });
  assert.equal(picker.getSelected(), 'stalker-01.webp');
  picker.open();
  assert.equal(elements.setupPortraitModal.hidden, false);
  assert.equal((elements.setupPortraits.innerHTML.match(/setup-portrait-choice/g)||[]).length, 16);
  assert.match(elements.setupAvatar.innerHTML, /stalker-01.webp/);
  assert.equal(picker.choose('../bad.webp'), false);
  assert.equal(picker.getSelected(), 'stalker-01.webp');
  assert.equal(picker.choose('stalker-12.webp'), true);
  assert.equal(picker.getSelected(), 'stalker-12.webp');
  assert.equal(changed, 'stalker-12.webp');
  assert.equal(elements.setupPortraitModal.hidden, true);
  assert.match(elements.setupAvatar.innerHTML, /stalker-12.webp/);
});

test('4.61.51 background selection falls back to a valid configured background', () => {
  const backgrounds = { wanderer: {}, medic: {} };
  assert.equal(profile.normalizeBackground('medic', backgrounds), 'medic');
  assert.equal(profile.normalizeBackground('unknown', backgrounds), 'wanderer');
  assert.equal(profile.normalizeBackground('unknown', backgrounds, 'medic'), 'medic');
});

test('4.61.51 character identity validation preserves callsign, real-name and faction requirements', () => {
  const factions = [{ name: 'Одиночки' }, { name: 'Долг' }];
  assert.deepEqual(profile.validateIdentity({ callsign: 'Клык', realName: 'Иван', faction: 'Долг', factions }), { ok: true, reason: null });
  assert.equal(profile.validateIdentity({ callsign: 'Я', realName: 'Иван', faction: 'Долг', factions }).reason, 'callsign');
  assert.equal(profile.validateIdentity({ callsign: 'Клык', realName: 'И', faction: 'Долг', factions }).reason, 'real-name');
  assert.equal(profile.validateIdentity({ callsign: 'Клык', realName: 'Иван', faction: 'Монолит', factions }).reason, 'faction');
});

test('4.61.51 faction spawn choices include the faction base and only owned locations', () => {
  const locations = [
    { id: 'cordon', owner: 'Одиночки' },
    { id: 'farm', owner: 'Одиночки' },
    { id: 'bar', owner: 'Долг' },
    { id: 'dump', owner: 'Бандиты' }
  ];
  assert.deepEqual(profile.spawnOptions('Долг', locations, { 'Долг': 'bar' }).map(x => x.id), ['bar']);
  assert.deepEqual(profile.spawnOptions('Одиночки', locations, { 'Одиночки': 'cordon' }).map(x => x.id), ['cordon', 'farm']);
  assert.equal(profile.resolveSpawn('farm', profile.spawnOptions('Одиночки', locations, { 'Одиночки': 'cordon' }), 'cordon'), 'farm');
  assert.equal(profile.resolveSpawn('dump', profile.spawnOptions('Одиночки', locations, { 'Одиночки': 'cordon' }), 'cordon'), 'cordon');
});

test('4.61.51 browser loads profile rules before game.js and delegates setup decisions', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const profileAt = html.indexOf('/js/systems/character-setup-profile.js?v=4.61.51');
  const gameAt = html.indexOf('/js/game.js?v=4.61.51');
  assert.ok(profileAt >= 0 && gameAt > profileAt);
  assert.match(game, /characterSetupProfile\.createPortraitPicker\(/);
  assert.match(game, /characterPortraitPicker\.choose\(file\)/);
  assert.match(game, /characterSetupProfile\.validateIdentity\(/);
  assert.match(game, /characterSetupProfile\.spawnOptions\(/);
  assert.doesNotMatch(game, /Array\.from\(\{length:16\}/);
});
