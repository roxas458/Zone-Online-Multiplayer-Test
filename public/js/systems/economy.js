// Shared economy calculations. Currency mutations remain in the existing
// authoritative game/server flows; this module centralizes deterministic math.
(function (global) {
  "use strict";

  function canAfford(balance, price) {
    return Number(balance) >= Number(price);
  }

  function saleUnitPrice(item, rate = 0.65) {
    if (!item) return 0;
    return Math.floor(Number(item.value) * rate);
  }

  function saleTotal(item, quantity = 1, rate = 0.65) {
    return saleUnitPrice(item, rate) * quantity;
  }

  global.ZoneEconomy = Object.freeze({ canAfford, saleUnitPrice, saleTotal });
})(window);
