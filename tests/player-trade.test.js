const test = require('node:test');
const assert = require('node:assert/strict');
const { applyPlayerTrade } = require('../src/server/player-trade');
const allowed = new Set(['med', 'artifact']);

function state(money, items) { return { money, items: items.map(x => ({ ...x })) }; }

test('player trade atomically transfers an item and rubles between two profiles', () => {
  const seller = state(100, [{ id: 'med', name: 'Аптечка', qty: 3 }]);
  const buyer = state(500, [{ id: 'bread', name: 'Хлеб', qty: 2 }]);
  const result = applyPlayerTrade({ sellerState: seller, buyerState: buyer, itemId: 'med', qty: 2, price: 75, allowedItemIds: allowed });
  assert.equal(result.ok, true);
  assert.equal(result.sellerState.money, 175);
  assert.equal(result.buyerState.money, 425);
  assert.deepEqual(result.sellerState.items, [{ id: 'med', name: 'Аптечка', qty: 1 }]);
  assert.equal(result.buyerState.items.find(x => x.id === 'med').qty, 2);
  assert.equal(seller.items[0].qty, 3, 'source state remains unchanged before commit');
});

test('player trade rejects insufficient stock or buyer funds without mutating either profile', () => {
  const seller = state(0, [{ id: 'med', qty: 1 }]);
  const buyer = state(5, []);
  const stock = applyPlayerTrade({ sellerState: seller, buyerState: buyer, itemId: 'med', qty: 2, price: 1, allowedItemIds: allowed });
  assert.equal(stock.ok, false);
  const funds = applyPlayerTrade({ sellerState: seller, buyerState: buyer, itemId: 'med', qty: 1, price: 10, allowedItemIds: allowed });
  assert.equal(funds.ok, false);
  assert.equal(seller.items[0].qty, 1);
  assert.equal(buyer.money, 5);
});

test('player trade rejects non-tradeable items and unsafe amounts', () => {
  const seller = state(0, [{ id: 'rifle', qty: 1 }]);
  const buyer = state(100, []);
  assert.equal(applyPlayerTrade({ sellerState: seller, buyerState: buyer, itemId: 'rifle', qty: 1, price: 1, allowedItemIds: allowed }).ok, false);
  assert.equal(applyPlayerTrade({ sellerState: seller, buyerState: buyer, itemId: 'med', qty: 100, price: 1, allowedItemIds: allowed }).ok, false);
});

test('player trade rejects a seller balance overflow', () => {
  const seller = state(99999990, [{ id: 'med', qty: 1 }]);
  const buyer = state(100, []);
  const result = applyPlayerTrade({ sellerState: seller, buyerState: buyer, itemId: 'med', qty: 1, price: 20, allowedItemIds: allowed });
  assert.equal(result.ok, false);
});

test('server enables player trading without PostgreSQL and gates offers to the same sector', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public/js/game.js'), 'utf8');
  assert.match(server, /if\(pool\)\s*\{[\s\S]*?applyPlayerTrade[\s\S]*?\}\s*else\s*\{[\s\S]*?online profiles authoritative in memory/);
  assert.match(server, /from\.location!==to\.location/);
  assert.match(server, /offer\.status='pending'/);
  assert.match(client, /zoneSocket\.on\('trade:result'/);
  assert.match(client, /renderIncomingTrades\(\)/);
});

test('multiplayer warm-up probe is bounded so a running server is not held behind a long health wait', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public/js/game.js'), 'utf8');
  const network = fs.readFileSync(path.join(__dirname, '..', 'public/js/core/network.js'), 'utf8');
  assert.match(client, /waitForMultiplayerHealth\(targetUrl, connectAttempt, maxWaitMs=1800\)/);
  assert.match(client, /await waitForMultiplayerHealth\(targetUrl,connectAttempt,1800\)/);
  assert.match(network, /timeout: 4500/);
  assert.match(network, /reconnectionDelayMax: 2500/);
});

test('player trade rejects an item stack overflow without changing either profile', () => {
  const seller = state(0, [{ id: 'med', qty: 2 }]);
  const buyer = state(0, [{ id: 'med', qty: 9999 }]);
  const result = applyPlayerTrade({ sellerState: seller, buyerState: buyer, itemId: 'med', qty: 1, price: 0, allowedItemIds: allowed });
  assert.equal(result.ok, false);
  assert.equal(seller.items[0].qty, 2);
  assert.equal(buyer.items[0].qty, 9999);
});

test('player trade offer and acceptance both require players to be within the interaction radius', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const offer = server.slice(server.indexOf("socket.on('trade:offer'"), server.indexOf("socket.on('trade:respond'"));
  const accept = server.slice(server.indexOf("socket.on('trade:respond'"), server.indexOf("socket.on('squad:"));
  assert.match(offer, /!inRange\(from,to,INTERACTION_RADIUS\)/);
  assert.match(accept, /!inRange\(from,to,INTERACTION_RADIUS\)/);
});

test('server shop includes new survival foods and weapons for NPC traders', () => {
  const { SHOP, TRADE_ITEM_IDS } = require('../src/shared/game-data');
  for (const id of ['energy_drink','chocolate','nuts','smoked_meat','weapon_pm','weapon_aks74u','weapon_toz34','weapon_ak74','weapon_vintar']) {
    assert.ok(SHOP[id], `missing shop item ${id}`);
    assert.ok(TRADE_ITEM_IDS.has(id), `missing trade permission ${id}`);
  }
});


test('NPC weapon stock is restricted to major traders', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /NPC_WEAPON_STOCK = new Set/);
  assert.match(server, /weaponLocked=NPC_WEAPON_STOCK\.has\(item\)&&!isRich/);
  assert.match(server, /Оружие продают только крупные торговцы Зоны/);
});


test('zero weapon stock remains locked after NPC restocking', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /if\(max===0\)\{account\.stock\[item\]=0;continue;\}/);
});
