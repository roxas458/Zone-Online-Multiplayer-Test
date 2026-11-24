/* ZONE ONLINE map motion batching. Coalesces marker transforms into one animation frame. */
(function (root) {
  'use strict';

  function createMotionBatcher() {
    let pending = new Map();
    let scheduled = false;

    function flush(resolveMarker) {
      scheduled = false;
      const batch = pending;
      pending = new Map();
      for (const [id, transform] of batch) {
        const marker = resolveMarker(id);
        if (!marker) continue;
        marker.style.transition = 'transform 950ms linear';
        marker.setAttribute('transform', transform);
      }
      return batch.size;
    }

    function schedule(entries, resolveMarker, requestFrame) {
      let accepted = 0;
      for (const entry of Array.isArray(entries) ? entries : []) {
        if (!entry || entry.id == null || typeof entry.transform !== 'string') continue;
        pending.set(String(entry.id), entry.transform);
        accepted++;
      }
      if (!pending.size || scheduled) return accepted;
      const raf = requestFrame || root.requestAnimationFrame || (callback => callback());
      scheduled = true;
      raf(() => flush(resolveMarker));
      return accepted;
    }

    return Object.freeze({ schedule, flush: resolveMarker => flush(resolveMarker), get pendingCount() { return pending.size; } });
  }

  const api = Object.freeze({ createMotionBatcher });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ZoneMapMotion = api;
})(typeof window !== 'undefined' ? window : globalThis);
