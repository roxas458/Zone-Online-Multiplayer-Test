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
    movementRoute = '', rangeOverlay = '', npcMarkers = '', dynamicMarkers = '', markers = '', compass = true,
    onWheel = 'onwheel="event.preventDefault();mapZoom(event.deltaY<0?1:-1)"',
    pointerHandlers = 'onpointerdown="mapPointerDown(event)" onpointermove="mapPointerMove(event)" onpointerup="mapPointerUp(event)" onpointercancel="mapPointerUp(event)"'
  } = {}) {
    const safe = value => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const compassLayer = compass ? '<g class="map-compass" data-map-layer="compass" transform="translate(920 110)"><circle r="28"/><path d="M0 -20L7 7 0 2 -7 7Z"/><text y="-38" text-anchor="middle">N</text></g>' : '';
    return `<svg id="zoneMapSvg" viewBox="${safe(viewBox)}" preserveAspectRatio="${safe(preserveAspectRatio)}" ${onWheel} ${pointerHandlers} aria-label="${safe(ariaLabel)}"><g class="map-background-layer" data-map-layer="background"><image href="/assets/zone-master-map.jpg" x="0" y="0" width="1000" height="2000" preserveAspectRatio="none"/><rect x="0" y="0" width="1000" height="2000" fill="#10170f" opacity=".08"/></g><g class="map-region-layer" data-map-layer="regions">${regions}</g><g class="map-sector-route-layer" data-map-layer="sector-routes">${sectorRoutes}</g><g class="map-selected-route-layer" data-map-layer="selected-routes">${selectedNpcRoute}${movementRoute}</g><g class="map-npc-marker-layer" data-map-layer="npc-markers">${npcMarkers}</g><g class="map-dynamic-marker-layer" data-map-layer="dynamic-markers">${dynamicMarkers}</g><g class="map-marker-layer" data-map-layer="markers">${rangeOverlay}${markers}</g>${compassLayer}</svg>`;
  }

  // Reconcile NPC markers by stable npc id. Unchanged SVG nodes remain alive,
  // so hover state, focus, pointer interactions and motion transforms are not
  // needlessly discarded when another NPC changes.
  function patchKeyedNpcLayer(currentLayer, nextLayer) {
    const currentNodes = Array.from(currentLayer.children || []);
    const nextNodes = Array.from(nextLayer.children || []);
    const keyed = nodes => nodes.every(node => node.getAttribute && node.getAttribute('data-npc-id'));
    if (!keyed(currentNodes) || !keyed(nextNodes)) {
      if (currentLayer.innerHTML !== nextLayer.innerHTML) currentLayer.innerHTML = nextLayer.innerHTML;
      return;
    }
    const currentById = new Map(currentNodes.map(node => [node.getAttribute('data-npc-id'), node]));
    const nextIds = new Set();
    let anchor = null;
    for (let i = nextNodes.length - 1; i >= 0; i--) {
      const nextNode = nextNodes[i];
      const id = nextNode.getAttribute('data-npc-id');
      nextIds.add(id);
      let node = currentById.get(id);
      if (!node) {
        node = document.importNode(nextNode, true);
      } else if (node.outerHTML !== nextNode.outerHTML) {
        const replacement = document.importNode(nextNode, true);
        currentLayer.replaceChild(replacement, node);
        node = replacement;
      }
      currentLayer.insertBefore(node, anchor);
      anchor = node;
    }
    for (const node of currentNodes) {
      if (!nextIds.has(node.getAttribute('data-npc-id')) && node.parentNode === currentLayer) currentLayer.removeChild(node);
    }
  }

  // Reconcile independently changing world entities (players, mutants, convoys,
  // battles, artifacts and stashes) without replacing neighboring SVG nodes.
  function patchKeyedLayer(currentLayer, nextLayer, attribute = 'data-map-key') {
    const currentNodes = Array.from(currentLayer.children || []);
    const nextNodes = Array.from(nextLayer.children || []);
    const keyed = nodes => nodes.every(node => node.getAttribute && node.getAttribute(attribute));
    if (!keyed(currentNodes) || !keyed(nextNodes)) {
      if (currentLayer.innerHTML !== nextLayer.innerHTML) currentLayer.innerHTML = nextLayer.innerHTML;
      return;
    }
    const currentById = new Map(currentNodes.map(node => [node.getAttribute(attribute), node]));
    const nextIds = new Set();
    let anchor = null;
    for (let i = nextNodes.length - 1; i >= 0; i--) {
      const nextNode = nextNodes[i];
      const id = nextNode.getAttribute(attribute);
      nextIds.add(id);
      let node = currentById.get(id);
      if (!node) node = document.importNode(nextNode, true);
      else if (node.outerHTML !== nextNode.outerHTML) {
        const replacement = document.importNode(nextNode, true);
        currentLayer.replaceChild(replacement, node);
        node = replacement;
      }
      currentLayer.insertBefore(node, anchor);
      anchor = node;
    }
    for (const node of currentNodes) {
      if (!nextIds.has(node.getAttribute(attribute)) && node.parentNode === currentLayer) currentLayer.removeChild(node);
    }
  }

  // Keep the SVG root (and therefore pointer capture) alive between renders.
  // Static layers are only touched when their actual markup changes.
  function patchSvg(host, markup) {
    if (!host || !markup || typeof document === 'undefined') return null;
    const holder = document.createElement('div');
    holder.innerHTML = markup;
    const nextSvg = holder.querySelector('svg#zoneMapSvg');
    if (!nextSvg) return null;
    let currentSvg = host.querySelector('#zoneMapSvg');
    if (!currentSvg) {
      host.insertBefore(nextSvg, host.firstChild || null);
      return nextSvg;
    }
    // Lightweight DOM mocks and older embedded browsers may not expose the
    // SVG collection APIs; retain the safe full-render fallback there.
    if (!currentSvg.attributes || !currentSvg.children || typeof document.importNode !== 'function') {
      host.innerHTML = markup;
      return host.querySelector('#zoneMapSvg');
    }
    for (const attr of Array.from(currentSvg.attributes)) {
      if (!nextSvg.hasAttribute(attr.name)) currentSvg.removeAttribute(attr.name);
    }
    for (const attr of Array.from(nextSvg.attributes)) currentSvg.setAttribute(attr.name, attr.value);

    const currentLayers = new Map(Array.from(currentSvg.children).filter(node => node.hasAttribute('data-map-layer')).map(node => [node.getAttribute('data-map-layer'), node]));
    const nextLayers = Array.from(nextSvg.children).filter(node => node.hasAttribute('data-map-layer'));
    const nextKeys = new Set();
    for (const nextLayer of nextLayers) {
      const key = nextLayer.getAttribute('data-map-layer');
      nextKeys.add(key);
      const currentLayer = currentLayers.get(key);
      if (!currentLayer) {
        currentSvg.appendChild(document.importNode(nextLayer, true));
      } else if (key === 'npc-markers') {
        patchKeyedNpcLayer(currentLayer, nextLayer);
      } else if (key === 'dynamic-markers') {
        patchKeyedLayer(currentLayer, nextLayer);
      } else if (currentLayer.innerHTML !== nextLayer.innerHTML) {
        currentLayer.innerHTML = nextLayer.innerHTML;
      }
    }
    for (const [key, layer] of currentLayers) if (!nextKeys.has(key)) layer.remove();
    // Restore canonical layer order without replacing unchanged layer nodes.
    let anchor = null;
    for (let i = nextLayers.length - 1; i >= 0; i--) {
      const layer = currentLayers.get(nextLayers[i].getAttribute('data-map-layer')) || Array.from(currentSvg.children).find(node => node.getAttribute?.('data-map-layer') === nextLayers[i].getAttribute('data-map-layer'));
      if (layer) { currentSvg.insertBefore(layer, anchor); anchor = layer; }
    }
    return currentSvg;
  }

  const api = Object.freeze({ renderRegions, renderSvg, patchSvg, patchKeyedNpcLayer, patchKeyedLayer });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ZoneMapRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis);
