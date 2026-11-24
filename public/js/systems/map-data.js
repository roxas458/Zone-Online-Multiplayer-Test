/* ZONE ONLINE map data preparation. Pure filtering/grouping; no DOM or game mutations. */
(function (root) {
  'use strict';

  const asArray = value => Array.isArray(value) ? value : [];
  function prepareMapData({ mode = 'local', location = '', npcState = null, npcs = [], keyPoints = {}, battlefronts = [], convoys = [], mutantPacks = [], anomalies = [], onlinePlayers = [], playerId = null, artifactExpeditions = [], artifactSites = [], stashes = [] } = {}) {
    const sourceNpcs = mode === 'zone' && npcState ? Object.values(npcState) : asArray(npcs);
    const livingNpcs = sourceNpcs.filter(n => n && n.alive !== false && (mode === 'zone' || (n.loc || n.location) === location || n.travelTo === location)).slice(0, 400);
    const squadBuckets = new Map();
    for (const npc of livingNpcs) {
      const key = npc.squadId || `solo_${npc.id}`;
      if (!squadBuckets.has(key)) squadBuckets.set(key, []);
      squadBuckets.get(key).push(npc);
    }
    const inScope = item => mode === 'zone' || item?.location === location;
    return {
      livingNpcs,
      squadBuckets,
      strategicPoints: Object.values(keyPoints || {}).filter(inScope),
      activeBattles: asArray(battlefronts).filter(b => b?.status === 'active' && inScope(b)),
      convoys: asArray(convoys).filter(c => c?.status === 'moving' || c?.status === 'ambushed'),
      mutantPacks: asArray(mutantPacks).filter(inScope),
      anomalies: asArray(anomalies).filter(inScope),
      onlinePlayers: asArray(onlinePlayers).filter(p => p?.id !== playerId && (mode === 'zone' || p?.location === location)),
      sharedArtifactSites: asArray(artifactExpeditions).filter(a => (a?.status === 'searching' || a?.status === 'ready') && inScope(a)),
      artifactSites: asArray(artifactSites).filter(a => a?.discovered && !a?.collected && inScope(a)),
      caches: asArray(stashes).filter(s => s?.discovered && !s?.looted && inScope(s))
    };
  }
  const api = Object.freeze({ prepareMapData });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ZoneMapData = api;
})(typeof window !== 'undefined' ? window : globalThis);
