// Synchronous local save adapter. Server synchronization remains authoritative
// in game.js; this module owns only the browser's durable cache.
(function (global) {
  "use strict";
  function storage() {
    try { return global.localStorage; }
    catch (error) { return null; }
  }
  const manager = {
    read(key, fallback = null) {
      const store = storage();
      if (!store) return fallback;
      try {
        const raw = store.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        global.ZoneCore?.events?.emit("save:error", { operation: "read", key, error });
        return fallback;
      }
    },
    write(key, value) {
      const store = storage();
      if (!store) return false;
      try {
        const serialized = JSON.stringify(value);
        if (typeof serialized !== "string") return false;
        const maxBytes = global.ZoneCoreConfig?.saveMaxBytes || 5 * 1024 * 1024;
        if (new Blob([serialized]).size > maxBytes) {
          global.ZoneCore?.events?.emit("save:error", { operation: "write", key, error: new Error("Save exceeds size limit") });
          return false;
        }
        store.setItem(key, serialized);
        if (key === global.ZoneCoreConfig?.saveKey) global.ZoneCore?.state?.set(value, "save-manager");
        global.ZoneCore?.events?.emit("save:written", { key, bytes: new Blob([serialized]).size });
        return true;
      } catch (error) {
        global.ZoneCore?.events?.emit("save:error", { operation: "write", key, error });
        return false;
      }
    },
    remove(key) {
      const store = storage();
      if (!store) return false;
      try { store.removeItem(key); global.ZoneCore?.events?.emit("save:removed", { key }); return true; }
      catch (error) {
        global.ZoneCore?.events?.emit("save:error", { operation: "remove", key, error });
        return false;
      }
    }
  };
  global.ZoneCore = global.ZoneCore || {};
  global.ZoneCore.saveManager = manager;
})(window);
