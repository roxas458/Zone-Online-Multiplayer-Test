/* ZONE ONLINE map interaction decisions. DOM adapters remain in game.js. */
(function (root) {
  'use strict';

  const navigation = () => root.ZoneMapNavigation;

  function beginPointerDrag(event, view) {
    if (!event || (event.button !== undefined && event.button !== 0)) return null;
    return {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      view
    };
  }

  function movePointerDrag(state, event, rect, threshold = 5) {
    if (!state || !event || state.id !== event.pointerId) return { matched: false, state, center: null };
    const moved = state.moved || Math.hypot(event.clientX - state.x, event.clientY - state.y) > threshold;
    let center = null;
    if (moved && rect?.width && rect?.height) {
      center = {
        x: state.view.x + state.view.w / 2 - (event.clientX - state.x) * state.view.w / rect.width,
        y: state.view.y + state.view.h / 2 - (event.clientY - state.y) * state.view.h / rect.height
      };
    }
    return {
      matched: true,
      center,
      state: { ...state, moved, lastX: event.clientX, lastY: event.clientY }
    };
  }

  function finishPointerDrag(state, event) {
    if (!state || !event || state.id !== event.pointerId) return { matched: false, moved: false };
    return { matched: true, moved: !!state.moved };
  }

  function resolveMapClick({ x, y, mode = 'zone', currentLocation, playerPosition, localOffset = 245, deadZone = 5 } = {}) {
    const nav = navigation();
    if (!nav || !Number.isFinite(x) || !Number.isFinite(y)) return { type: 'invalid' };
    const px = Math.max(8, Math.min(992, x));
    const py = Math.max(8, Math.min(1992, y));
    if (mode === 'zone') {
      const nearest = nav.nearestSector(px, py);
      if (nearest && nearest.id !== currentLocation) return { type: 'sector', sectorId: nearest.id, point: { x: px, y: py } };
    }
    const target = nav.clampLocalTarget(px, py, currentLocation, localOffset);
    if (playerPosition && Math.hypot(playerPosition.x - target.x, playerPosition.y - target.y) < deadZone) return { type: 'same-position', target };
    return { type: 'move', target };
  }

  function planExpedition({ from, to, mode = 'safe', stamina = 0, squadActive = false, isSquadLeader = true } = {}) {
    if (!to) return { ok: false, reason: 'missing-destination' };
    if (to === from) return { ok: false, reason: 'already-there' };
    if (squadActive && !isSquadLeader) return { ok: false, reason: 'not-squad-leader' };
    const path = navigation()?.findLocalRoute(from, to, mode);
    if (!path) return { ok: false, reason: 'no-route' };
    const requiredStamina = (path.length - 1) * 5;
    if (stamina < requiredStamina) return { ok: false, reason: 'insufficient-stamina', path, requiredStamina };
    return { ok: true, path, requiredStamina, destination: to, mode };
  }

  const api = Object.freeze({ beginPointerDrag, movePointerDrag, finishPointerDrag, resolveMapClick, planExpedition });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ZoneMapInteraction = api;
})(typeof window !== 'undefined' ? window : globalThis);
