// Single-reference client state registry. It intentionally does not clone state:
// the legacy UI and the new modules must observe the same live game object.
(function (global) {
  "use strict";
  let current = null;
  const subscribers = new Set();
  const state = {
    get() { return current; },
    set(next, reason = "update") {
      if (!next || typeof next !== "object" || Array.isArray(next)) throw new TypeError("Game state must be an object");
      current = next;
      for (const handler of [...subscribers]) {
        try { handler(current, reason); }
        catch (error) { console.error("[ZoneGameState]", error); }
      }
      global.ZoneCore?.events?.emit("state:changed", { state: current, reason });
      return current;
    },
    subscribe(handler) {
      if (typeof handler !== "function") throw new TypeError("State subscriber must be a function");
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    }
  };
  global.ZoneCore = global.ZoneCore || {};
  global.ZoneCore.state = state;
})(window);
