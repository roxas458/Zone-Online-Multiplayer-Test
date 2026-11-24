// Socket.IO transport lifecycle. Game-specific event handlers stay in game.js.
(function (global) {
  "use strict";

  const DEFAULT_OPTIONS = Object.freeze({
    transports: Object.freeze(["polling", "websocket"]),
    tryAllTransports: true,
    timeout: 4500,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2500,
    randomizationFactor: 0.25,
    path: "/socket.io/",
    autoConnect: false,
    withCredentials: false
  });

  function normalizeServerUrl(value, fallback) {
    const raw = String(value || fallback || "").trim();
    if (!raw) return "";
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new TypeError("Socket.IO server URL must use http or https");
    }
    return parsed.origin;
  }

  function canReuse(socket, currentTarget, nextTarget) {
    return !!socket && currentTarget === nextTarget && !!(socket.connected || socket.active);
  }

  function dispose(socket) {
    if (!socket) return false;
    try {
      socket.removeAllListeners?.();
      socket.disconnect?.();
    } catch (error) {
      console.warn("ZONE ONLINE: socket cleanup failed", error);
    }
    return true;
  }

  function create(ioFactory, serverUrl) {
    if (typeof ioFactory !== "function") throw new TypeError("Socket.IO client is not available");
    return ioFactory(serverUrl || undefined, {
      ...DEFAULT_OPTIONS,
      transports: [...DEFAULT_OPTIONS.transports]
    });
  }

  global.ZoneNetwork = Object.freeze({
    normalizeServerUrl,
    canReuse,
    dispose,
    create,
    options: DEFAULT_OPTIONS
  });
})(window);
