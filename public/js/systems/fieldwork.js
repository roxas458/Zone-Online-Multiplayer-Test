// Fieldwork domain calculations shared by exploration and artifact scanning.
(function (global) {
  "use strict";

  const RARITY_TIER = Object.freeze({ обычный: 1, необычный: 1, редкий: 2, "очень редкий": 3 });

  function discoverPoints(points, limit = 2, random = Math.random) {
    const unknown = (Array.isArray(points) ? points : []).filter(point => point && !point.discovered);
    const found = [];
    const count = Math.min(Math.max(0, Math.floor(Number(limit) || 0)), unknown.length);
    for (let i = 0; i < count; i++) {
      const index = Math.min(unknown.length - 1, Math.floor(random() * unknown.length));
      const point = unknown.splice(index, 1)[0];
      point.discovered = true;
      found.push(point.name);
    }
    return found;
  }

  function artifactDiscoveryChance({ anomalyCount = 0, tier = 1, condition = 80 } = {}) {
    return Math.min(0.82, 0.22 + Math.max(0, Number(anomalyCount) || 0) * 0.06 + (Number(tier) || 1) * 0.09 + (Number(condition ?? 80) > 60 ? 0.08 : 0));
  }

  function eligibleArtifacts(definitions, tier = 1) {
    const level = Number(tier) || 1;
    return (Array.isArray(definitions) ? definitions : []).filter(item => item && level >= (RARITY_TIER[item.rarity] || 1));
  }

  global.ZoneFieldwork = Object.freeze({ discoverPoints, artifactDiscoveryChance, eligibleArtifacts });
})(window);
