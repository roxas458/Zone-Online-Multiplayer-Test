// Faction relation rules extracted from the browser client without changing their thresholds.
(function (global) {
  "use strict";

  function relationValue(a, b, diplomacy, factions) {
    if (a === "Монолит" || b === "Монолит") return -60;
    const value = diplomacy?.[a]?.[b];
    if (Number.isFinite(Number(value))) return Math.max(-60, Math.min(60, Number(value)));
    const factionA = factions.find((faction) => faction.name === a);
    const factionB = factions.find((faction) => faction.name === b);
    return Math.max(-60, Math.min(60, Math.round(((Number(factionA?.relation) || 0) + (Number(factionB?.relation) || 0)) / 2)));
  }

  global.ZoneFactionRelations = Object.freeze({ relationValue });
})(window);
