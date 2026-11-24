// Read-only preparation of the living-zone ecosystem data shown in the camp view.
(function (global) {
  "use strict";

  function prepare(ecosystem, locationId, faction) {
    const source = ecosystem || {};
    const packs = (source.mutantPacks || []).filter(pack => pack.location === locationId);
    const anomalies = (source.anomalies || []).filter(anomaly => anomaly.location === locationId);
    const bases = Object.values(source.bases || {}).filter(base => base.faction === faction);
    const clans = Object.values(source.clans || {}).filter(clan => clan.faction === faction);
    return {
      packs,
      anomalies,
      bases,
      clans,
      mutantCount: packs.reduce((total, pack) => total + pack.count, 0),
      anomalyCount: anomalies.length
    };
  }

  global.ZoneLivingEcosystemView = Object.freeze({ prepare });
})(window);
