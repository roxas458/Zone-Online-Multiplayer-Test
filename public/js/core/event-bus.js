// Small synchronous event bus for decoupled client systems.
(function (global) {
  "use strict";
  const listeners = new Map();
  const bus = {
    on(type, handler) {
      if (typeof handler !== "function") throw new TypeError("Event handler must be a function");
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
      return () => bus.off(type, handler);
    },
    once(type, handler) {
      let off;
      off = bus.on(type, (...args) => { off(); handler(...args); });
      return off;
    },
    off(type, handler) {
      const group = listeners.get(type);
      if (!group) return false;
      const removed = group.delete(handler);
      if (!group.size) listeners.delete(type);
      return removed;
    },
    emit(type, payload) {
      const group = listeners.get(type);
      if (!group) return 0;
      let delivered = 0;
      for (const handler of [...group]) {
        try { handler(payload); delivered++; }
        catch (error) { console.error("[ZoneEventBus]", type, error); }
      }
      return delivered;
    },
    clear(type) {
      if (type === undefined) listeners.clear();
      else listeners.delete(type);
    }
  };
  global.ZoneCore = global.ZoneCore || {};
  global.ZoneCore.events = bus;
})(window);
