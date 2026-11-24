// Pure trade-basket state and calculation helpers. Currency and inventory mutations
// remain in the game/server adapters.
(function (global) {
  'use strict';
  function create() { return { buy: {}, sell: {} }; }
  function add(state, side, key, { max = 20 } = {}) {
    if (!state || !['buy', 'sell'].includes(side) || key == null || max <= 0) return state || create();
    const next = Math.min((Number(state[side][key]) || 0) + 1, Math.floor(Number(max)));
    if (!next) return state;
    return { ...state, [side]: { ...state[side], [key]: next } };
  }
  function remove(state, side, key) {
    if (!state || !['buy', 'sell'].includes(side)) return state || create();
    const bucket = { ...state[side] }; delete bucket[key];
    return { ...state, [side]: bucket };
  }
  function totals(state, goods = [], items = [], saleUnitPrice = () => 0) {
    let buy = 0, sell = 0;
    for (const [index, quantity] of Object.entries(state?.buy || {})) {
      const item = goods[Number(index)]; if (item) buy += Number(item[3]) * Number(quantity);
    }
    for (const [id, quantity] of Object.entries(state?.sell || {})) {
      const item = items.find(value => value.id === id); if (item) sell += saleUnitPrice(item) * Number(quantity);
    }
    return { buy, sell, net: buy - sell };
  }
  function toDeal(state, goods = []) {
    const buy = Object.entries(state?.buy || {}).map(([index, qty]) => ({ item: goods[Number(index)]?.[1], qty: Number(qty) })).filter(x => x.item && Number.isInteger(x.qty) && x.qty > 0);
    const sell = Object.entries(state?.sell || {}).map(([item, qty]) => ({ item, qty: Number(qty) })).filter(x => Number.isInteger(x.qty) && x.qty > 0);
    return { buy, sell };
  }
  global.ZoneTradeBasket = Object.freeze({ create, add, remove, totals, toDeal });
})(window);
