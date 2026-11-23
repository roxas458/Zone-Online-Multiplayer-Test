'use strict';

/**
 * Reconcile client-saved profile data with the server-owned world position.
 * A normal profile save may update inventory and other profile fields, but it
 * must never teleport an online player or change their current sector.
 */
function reconcilePlayerPosition(player, incomingState, options = {}) {
  const firstCharacter = options.firstCharacter === true;
  const spawnLocation = options.spawnLocation || null;
  const spawnPoint = options.spawnPoint || null;
  const squadLocation = options.squadLocation || null;

  const useSpawn = firstCharacter && spawnLocation && spawnPoint
    && Number.isFinite(Number(spawnPoint[0]))
    && Number.isFinite(Number(spawnPoint[1]));

  const location = squadLocation || (useSpawn ? spawnLocation : player.location);
  const x = useSpawn ? Number(spawnPoint[0]) : Number(player.x) || 0;
  const y = useSpawn ? Number(spawnPoint[1]) : Number(player.y) || 0;
  const state = {
    ...incomingState,
    loc: location,
    worldPosition: { x, y }
  };

  if (useSpawn) state.mapCoordinateVersion = 2;
  return { location, x, y, state };
}

module.exports = { reconcilePlayerPosition };
