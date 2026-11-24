const test = require('node:test');
const assert = require('node:assert/strict');
const { createEncyclopediaSystem } = require('../public/js/systems/encyclopedia.js');

function fixture() {
  const state = {
    locations: [{ id: 'cordon', name: 'Кордон', owner: 'Одиночки', control: 50, desc: 'Стартовый сектор' }],
    keyPoints: { cordon: [{ id: 'checkpoint', name: 'Блокпост', kind: 'ориентир', desc: 'Старый блокпост', discovered: true }] },
    factions: [{ name: 'Одиночки', style: 'нейтральные', members: 12, influence: 20, relation: 0, leader: { name: 'Сидорович' } }],
    npcs: [{ id: 'wolf', name: 'Волк', role: 'сталкер', faction: 'Одиночки', loc: 'cordon', desc: 'Опытный проводник', alive: true }],
    relationships: { wolf: 15 },
    items: [],
    discoveredWeapons: []
  };
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', innerHTML: '', hidden: false, classList: { toggle() {} } });
    return elements.get(id);
  };
  const system = createEncyclopediaSystem({
    getState: () => state,
    getEntries: () => ({ mutants: [['Плоть', 'Мутант', 'Медленный мутант']], armor: [], artifacts: [['Пружина', 'Гравитационный', 'Снижает усталость']] }),
    getAnomalyDossiers: () => [['Воронка', 'гравитационная', 'Опасное поле', 'высокий риск']],
    getWeaponCatalogue: () => [['pm', 'ПМм', 'Пистолет', '9×18 мм', 'ПМ', 0.9, 850, 78]],
    getArtifactDefinitions: () => ({ artifact_spring: { id: 'artifact_spring', name: 'Пружина', rarity: 'обычный', effects: { staminaDrain: 0.08 }, desc: 'Артефакт' } }),
    weaponGlyph: () => '▰',
    locationName: id => id === 'cordon' ? 'Кордон' : String(id),
    escapeHtml: value => String(value),
    $: getElement,
    renderArmory: () => { calls.armory += 1; }
  });
  return { state, elements, system, getElement };
}

test('encyclopedia composes entries from live game state and injected catalogs', () => {
  const { system } = fixture();
  const entries = system.encyclopediaBase();
  assert.ok(entries.some(entry => entry.id === 'loc-cordon' && entry.title === 'Кордон'));
  assert.ok(entries.some(entry => entry.id === 'poi-checkpoint'));
  assert.ok(entries.some(entry => entry.id === 'person-wolf' && entry.body.includes('Опытный проводник')));
  assert.ok(entries.some(entry => entry.id === 'anomaly-Воронка'));
  assert.ok(entries.some(entry => entry.id === 'mutant-Плоть'));
  assert.ok(entries.some(entry => entry.id === 'artifact-Пружина'));
});

test('encyclopedia renders search results and selected article through injected DOM adapter', () => {
  const { system, getElement } = fixture();
  getElement('encyclopediaSearch').value = 'блокпост';
  system.renderEncyclopedia();
  assert.match(getElement('encyclopediaTree').innerHTML, /Блокпост/);
  assert.match(getElement('encyclopediaArticle').innerHTML, /Блокпост/);
  assert.match(getElement('encyclopediaPath').textContent, /Блокпост/);
});

test('encyclopedia mode opens the extracted armory renderer and selection remains stateful', () => {
  const { system, getElement } = fixture();
  system.selectEncyclopediaEntry('history');
  system.renderEncyclopedia();
  assert.match(getElement('encyclopediaArticle').innerHTML, /Хронология Зоны/);
  system.setEncyclopediaMode('armory');
  assert.match(getElement('armoryList').innerHTML, /ПМм/);
  assert.equal(getElement('encyclopediaKnowledge').hidden, true);
  assert.equal(getElement('encyclopediaArmory').hidden, false);
});

test('armory catalogue is owned by the encyclopedia module and filters injected catalogs', () => {
  const { system, getElement, state } = fixture();
  state.items = [{ id: 'pm', name: 'ПМм', qty: 1 }];
  state.discoveredWeapons = ['pm'];
  const rows = system.armoryCatalog();
  assert.ok(rows.some(row => row.id === 'pm' && row.category === 'weapons'));
  assert.ok(rows.some(row => row.id === 'helmet_stalker' && row.category === 'helmets'));
  assert.ok(rows.some(row => row.id === 'artifact_spring' && row.category === 'artifacts'));
  system.renderArmory();
  assert.match(getElement('armoryList').innerHTML, /ПМм/);
});

test('browser loads encyclopedia module before the compatibility client entry point', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const moduleAt = html.indexOf('/js/systems/encyclopedia.js?v=4.61.51');
  const gameAt = html.indexOf('/js/game.js?v=4.61.51');
  assert.ok(moduleAt >= 0 && gameAt > moduleAt);
  assert.match(html, /ZONE ONLINE · VER\. 4\.61\.51/);
});
