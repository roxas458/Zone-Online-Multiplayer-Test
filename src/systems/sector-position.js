'use strict';
const { SECTOR_COORDS } = require('./proximity');
const { TERRITORY_ADJACENCY } = require('./territories');

// Sector ownership follows the nearest connected sector center. A small hysteresis
// prevents rapid flip-flopping when an entity stands exactly on a border.
function resolveSectorAtPosition(currentLocation, position, margin = 12) {
  if (!position || !Number.isFinite(Number(position.x)) || !Number.isFinite(Number(position.y))) return currentLocation || 'cordon';
  const current = SECTOR_COORDS[currentLocation] || SECTOR_COORDS.cordon;
  const currentDistance = Math.hypot(Number(position.x) - current[0], Number(position.y) - current[1]);
  let best = currentLocation || 'cordon';
  let bestDistance = currentDistance;
  for (const id of TERRITORY_ADJACENCY[currentLocation] || []) {
    const center = SECTOR_COORDS[id];
    if (!center) continue;
    const distance = Math.hypot(Number(position.x) - center[0], Number(position.y) - center[1]);
    if (distance + margin < bestDistance) { best = id; bestDistance = distance; }
  }
  return best;
}
module.exports = { resolveSectorAtPosition };
