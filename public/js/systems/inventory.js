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

  const SLOT_BY_TYPE = Object.freeze({
    "Оружие": "weapon", "Броня": "suit", "Детектор": "tool",
    "Шлем": "helmet", "Рюкзак": "backpack", "Артефакт": "artifact"
  });
  const TYPES_BY_SLOT = Object.freeze({
    weapon: ["Оружие"], sidearm: ["Оружие"], suit: ["Броня"],
    tool: ["Детектор"], helmet: ["Шлем"], backpack: ["Рюкзак"], artifact: ["Артефакт"]
  });

  function slotForItem(item) { return item ? (SLOT_BY_TYPE[item.type] || null) : null; }

  function itemsForSlot(items, slot, equipment = {}) {
    const types = TYPES_BY_SLOT[slot];
    if (!Array.isArray(items) || !types) return [];
    return items.filter(item => types.includes(item.type) && Number(item.qty) > 0)
      .filter(item => slot !== "weapon" || item.name !== equipment.sidearm)
      .filter(item => slot !== "sidearm" || item.name !== equipment.weapon);
  }

  function equip(equipment, item, slot = slotForItem(item)) {
    if (!equipment || !item || !slot || !TYPES_BY_SLOT[slot] || !TYPES_BY_SLOT[slot].includes(item.type)) return false;
    if (slot === "weapon" && equipment.sidearm === item.name) equipment.sidearm = "";
    if (slot === "sidearm" && equipment.weapon === item.name) equipment.weapon = "";
    equipment[slot] = item.name;
    return true;
  }

  function unequip(equipment, slot) {
    if (!equipment || !Object.prototype.hasOwnProperty.call(TYPES_BY_SLOT, slot)) return false;
    equipment[slot] = "";
    return true;
  }

  function filterAndSort(items, { filter = "all", query = "", sort = "name" } = {}) {
    const normalizedQuery = String(query).toLocaleLowerCase("ru-RU");
    return (Array.isArray(items) ? items : []).filter(item =>
      (filter === "all" || item.type === filter) && String(item.name || "").toLocaleLowerCase("ru-RU").includes(normalizedQuery)
    ).slice().sort((a, b) => {
      if (sort === "value") return (Number(b.value) || 0) - (Number(a.value) || 0);
      if (sort === "weight") return (Number(b.weight) || 0) - (Number(a.weight) || 0);
      if (sort === "type") return String(a.type || "").localeCompare(String(b.type || ""), "ru");
      return String(a.name || "").localeCompare(String(b.name || ""), "ru");
    });
  }

  function summarize(items, equipment = {}) {
    const list = Array.isArray(items) ? items : [];
    const weight = list.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.qty) || 0), 0);
    const quantity = list.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const backpack = list.find(item => item.name === equipment.backpack && item.type === "Рюкзак");
    const capacity = Number(backpack?.capacity) || 50;
    return { weight, quantity, capacity, loadPercent: Math.min(100, capacity > 0 ? weight / capacity * 100 : 100) };
  }

  global.ZoneInventory = Object.freeze({ add, count, take, slotForItem, itemsForSlot, equip, unequip, filterAndSort, summarize });
})(window);
