// Pure faction ranking calculations extracted from the browser client.
(function (global) {
  "use strict";

  function buildRows({ factions = [], roster = [], patrols = [], locations = [], factionStats = {}, relationValue = () => 0 } = {}) {
    return factions.map((faction) => {
      const alive = roster.filter((npc) => npc && npc.alive !== false && npc.faction === faction.name).length;
      const patrolStrength = patrols
        .filter((patrol) => patrol.faction === faction.name)
        .reduce((total, patrol) => total + (Number(patrol.strength) || 0), 0);
      const held = locations.filter((location) => location.owner === faction.name);
      const territory = held.reduce((total, location) => total + (Number(location.control) || 0), 0);
      const members = Math.max(0, Number(faction.members) || 0) + alive;
      const influence = Math.max(0, Number(faction.influence) || 0);
      const wins = Number(factionStats?.[faction.name]?.wins) || 0;
      const score = Math.round(influence * 5 + members * 0.35 + territory * 1.5 + patrolStrength * 3 + wins * 25);
      const base = held[0] || locations.find((location) => location.owner === faction.name) || null;
      const relations = factions
        .filter((other) => other.name !== faction.name)
        .map((other) => ({ name: other.name, value: relationValue(faction.name, other.name) }));

      return {
        ...faction,
        alive,
        members,
        patrols: patrolStrength,
        territory,
        territoryCount: held.length,
        score,
        wins,
        baseName: base?.name || "Нет постоянной базы",
        relations,
      };
    })
      .sort((a, b) => b.score - a.score || b.influence - a.influence || b.members - a.members)
      .map((faction, index) => ({ ...faction, place: index + 1 }));
  }

  global.ZoneFactionRanking = Object.freeze({ buildRows });
})(window);
