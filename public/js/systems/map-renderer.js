/* ZONE ONLINE map SVG layer composition. DOM-free and deterministic. */
(function (root) {
  'use strict';

  function renderRegions(regions, escapeText = value => String(value ?? '')) {
    return (Array.isArray(regions) ? regions : []).map(region => {
      const id = escapeText(region.id);
      const name = escapeText(region.name);
      const x = Number(region.x) || 0;
      const y = Number(region.y) || 0;
      const width = Math.max(0, Number(region.w) || 0);
      const height = Math.max(0, Number(region.h) || 0);
      return `<g class="map-region map-region-linked" data-location="${id}" role="button" tabindex="0" aria-label="${name}" onclick="handleMapSectorSelect('${id}')"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8"/></g>`;
    }).join('');
  }

  function renderSvg({
    viewBox = '0 0 1000 2000', preserveAspectRatio = 'xMidYMid meet',
    ariaLabel = 'Карта Зоны', regions = '', sectorRoutes = '', selectedNpcRoute = '',
    movementRoute = '', rangeOverlay = '', markers = '', compass = true,
    onWheel = 'onwheel="event.preventDefault();mapZoom(event.deltaY<0?1:-1)"',
    pointerHandlers = 'onpointerdown="mapPointerDown(event)" onpointermove="mapPointerMove(event)" onpointerup="mapPointerUp(event)" onpointercancel="mapPointerUp(event)"'
  } = {}) {
    const safe = value => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const compassLayer = compass ? '<g class="map-compass" transform="translate(920 110)"><circle r="28"/><path d="M0 -20L7 7 0 2 -7 7Z"/><text y="-38" text-anchor="middle">N</text></g>' : '';
    return `<svg id="zoneMapSvg" viewBox="${safe(viewBox)}" preserveAspectRatio="${safe(preserveAspectRatio)}" ${onWheel} ${pointerHandlers} aria-label="${safe(ariaLabel)}"><image href="/assets/zone-master-map.jpg" x="0" y="0" width="1000" height="2000" preserveAspectRatio="none"/><rect x="0" y="0" width="1000" height="2000" fill="#10170f" opacity=".08"/><g class="map-region-layer">${regions}</g><g class="map-sector-route-layer">${sectorRoutes}</g><g class="map-selected-route-layer">${selectedNpcRoute}${movementRoute}</g><g class="map-marker-layer">${rangeOverlay}${markers}</g>${compassLayer}</svg>`;
  }

  const api = Object.freeze({ renderRegions, renderSvg });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ZoneMapRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis);
