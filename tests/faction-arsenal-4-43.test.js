const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('4.43 adds a broad weapon catalogue without replacing existing entries', () => {
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const module = fs.readFileSync(path.join(root, 'public/js/systems/encyclopedia.js'), 'utf8');
  const block = game.match(/const weaponCatalogue=\[([\s\S]*?)\n\];/);
  assert.ok(block);
  for (const id of ['sig220','beretta','walther_p99','spas12','winchester1300','ak101','lr300','g36','asval','vss_vintorez','sv98','pkm','rg6']) assert.match(block[1], new RegExp('\\["'+id+'"'));
  assert.match(game, /for\(const w of weaponCatalogue\)if\(g\.weaponConditions\[w\[0\]\]==null\)/);
  assert.match(module, /for\(const w of getWeaponCatalogue\(\)\)rows\.push\(\{id:w\[0\],name:w\[1\],category:'weapons'/);
});

test('4.43 faction armor variants are equippable starter items for the relevant groups', () => {
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8') + fs.readFileSync(path.join(root, 'public/js/systems/character-setup-data.js'), 'utf8');
  const ids = ['armor_duty_veteran','armor_duty_defender','armor_freedom_wind','armor_freedom_wanderer','armor_military_guard','armor_military_kordon','armor_merc_contract','armor_merc_blue','armor_clearsky_azure','armor_loner_mist','armor_monolith_acolyte','armor_bandit_collector','armor_renegade_marsh','armor_science_expedition'];
  for (const id of ids) {
    assert.match(game, new RegExp(id+":\\{id:'"+id+"',name:"));
    assert.match(game, new RegExp("'"+id+"'"));
  }
  assert.match(game, /defense:\d+,price:\d+,points:\d+,slot:'suit'/);
});

test('4.43 new equipment is available through the shared NPC shop and player-trade allowlist', () => {
  const data = fs.readFileSync(path.join(root, 'src/shared/game-data.js'), 'utf8');
  assert.match(data, /TRADE_ITEM_IDS\.add\('asval'\); SHOP\.asval=/);
  assert.match(data, /TRADE_ITEM_IDS\.add\('armor_duty_veteran'\); SHOP\.armor_duty_veteran=/);
  assert.match(data, /type:'Оружие'/);
  assert.match(data, /type:'Броня'/);
});
