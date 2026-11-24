// Inventory domain operations. The game keeps ownership of its state object;
// this module mutates only the supplied inventory array for compatibility.
(function (global) {
  "use strict";

  function add(items, id, name, type, desc, weight, value, qty = 1) {
    if (!Array.isArray(items)) throw new TypeError("Inventory must be an array");
    const existing = items.find(item => item.id === id);
    if (existing) existing.qty += qty;
    else items.push({ id, name, type, desc, weight, value, qty });
    return items.find(item => item.id === id);
  }

  function count(items, id) {
    if (!Array.isArray(items)) return 0;
    return items.find(item => item.id === id)?.qty || 0;
  }

  function take(items, id, quantity) {
    if (!Array.isArray(items)) return false;
    const item = items.find(entry => entry.id === id);
    if (!item || item.qty < quantity) return false;
    item.qty -= quantity;
    if (item.qty <= 0) {
      const index = items.indexOf(item);
      if (index !== -1) items.splice(index, 1);
    }
    return true;
  }

  global.ZoneInventory = Object.freeze({ add, count, take });
})(window);
