// Shared client configuration. Keep compatibility with the classic-script client.
(function (global) {
  "use strict";
  global.ZoneCoreConfig = Object.freeze({
    version: "4.61.11",
    saveKey: "zoneExpandedSave",
    saveMaxBytes: 5 * 1024 * 1024,
    localWorldPulseMs: 15 * 60 * 1000,
    worldClockRefreshMs: 15000,
    radiationRefreshMs: 60000
  });
})(window);
