/* ZONE ONLINE map/navigation primitives. Kept DOM-free for browser and Node tests. */
(function (root) {
  'use strict';

  const sectorCoords = Object.freeze({
    chaes: [503,104], zaton: [561,405], pripyat: [676,649], jupiter: [391,703],
    limansk: [128,838], red: [311,903], radar: [675,897], army: [502,1046],
    wild: [347,1212], bar: [441,1215], yantar: [174,1302], dump: [466,1470],
    agro: [243,1528], dark: [787,1418], cordon: [463,1753], swamps: [185,1788],
    darkhollow: [793,1742]
  });
  const sectorLinks = Object.freeze([
    ['chaes','zaton'],['zaton','pripyat'],['pripyat','jupiter'],['pripyat','radar'],
    ['jupiter','red'],['red','limansk'],['red','army'],['army','wild'],['wild','bar'],
    ['bar','dump'],['bar','yantar'],['dump','agro'],['dump','dark'],['agro','cordon'],
    ['cordon','swamps'],['dark','darkhollow']
  ]);
  const mapRegions = Object.freeze([
    {name:'ЧАЭС',id:'chaes',x:420,y:10,w:170,h:170},{name:'Затон',id:'zaton',x:400,y:300,w:230,h:190},
    {name:'Припять',id:'pripyat',x:570,y:520,w:220,h:210},{name:'Юпитер',id:'jupiter',x:270,y:640,w:220,h:180},
    {name:'Лиманск',id:'limansk',x:35,y:770,w:210,h:190},{name:'Рыжий лес',id:'red',x:210,y:830,w:220,h:180},
    {name:'Радар',id:'radar',x:590,y:820,w:190,h:170},{name:'Военные склады',id:'army',x:370,y:990,w:230,h:150},
    {name:'Дикие территории',id:'wild',x:260,y:1160,w:180,h:120},{name:'Бар',id:'bar',x:390,y:1160,w:130,h:130},
    {name:'Янтарь',id:'yantar',x:80,y:1260,w:180,h:160},{name:'Свалка',id:'dump',x:330,y:1390,w:230,h:170},
    {name:'Агропром',id:'agro',x:150,y:1460,w:190,h:150},{name:'Тёмная Долина',id:'dark',x:700,y:1320,w:220,h:190},
    {name:'Кордон',id:'cordon',x:350,y:1650,w:220,h:160},{name:'Болота',id:'swamps',x:80,y:1690,w:220,h:190},
    {name:'Тёмная Лощина',id:'darkhollow',x:700,y:1640,w:230,h:180}
  ]);
  const localRoutes = Object.freeze({
    chaes:['pripyat','radar'],zaton:['jupiter','pripyat'],pripyat:['chaes','zaton','jupiter','radar'],
    jupiter:['zaton','pripyat','red','wild'],limansk:['red','wild'],red:['limansk','jupiter','radar','army'],
    radar:['chaes','pripyat','red','army'],army:['radar','red','wild','bar'],wild:['limansk','jupiter','army','bar','yantar'],
    bar:['wild','army','dump'],yantar:['wild','dump','agro'],dump:['bar','yantar','dark','agro','cordon'],
    agro:['yantar','dump','dark','cordon'],dark:['dump','agro','darkhollow'],cordon:['dump','agro','swamps'],
    swamps:['cordon','darkhollow'],darkhollow:['swamps','dark']
  });
  const localRouteRisk = Object.freeze({chaes:95,radar:88,pripyat:78,red:68,dark:65,darkhollow:62,dump:58,limansk:55,army:48,wild:45,swamps:42,jupiter:38,zaton:35,agro:32,yantar:28,bar:18,cordon:22});

  function sectorCenter(id) { return sectorCoords[id] || [500,1000]; }

  // Dijkstra-compatible implementation retained exactly from the legacy client.
  function findLocalRoute(from, to, mode = 'safe') {
    if (!localRoutes[from] || !localRoutes[to]) return null;
    const dist = new Map([[from,0]]), prev = new Map(), open = new Set([from]);
    while (open.size) {
      let cur = null, best = Infinity;
      for (const node of open) { const d = dist.get(node); if (d < best) { best = d; cur = node; } }
      open.delete(cur);
      if (cur === to) break;
      for (const next of localRoutes[cur]) {
        const cost = 1 + (mode === 'safe' ? (localRouteRisk[next] || 30) / 35 : mode === 'fast' ? .2 : .55);
        const nextDistance = best + cost;
        if (nextDistance < (dist.get(next) ?? Infinity)) { dist.set(next,nextDistance); prev.set(next,cur); open.add(next); }
      }
    }
    if (!dist.has(to)) return null;
    const path = [to];
    while (path[0] !== from) path.unshift(prev.get(path[0]));
    return path;
  }

  function resolvePlayerPosition(state, now = Date.now()) {
    if (!state || typeof state !== 'object') return {x:500,y:1024};
    if (state.mapCoordinateVersion !== 2 || !state.worldPosition || !Number.isFinite(state.worldPosition.x) || !Number.isFinite(state.worldPosition.y)) {
      const center = sectorCenter(state.loc);
      state.worldPosition = {x:center[0],y:center[1]+24};
      state.mapCoordinateVersion = 2;
    }
    const expedition = state.expedition;
    if (expedition?.status === 'travelling' && Array.isArray(expedition.path) && expedition.path[expedition.index+1]) {
      const a = sectorCenter(expedition.path[expedition.index] || state.loc);
      const b = sectorCenter(expedition.path[expedition.index+1]);
      const start = Number(expedition.startedAt) || now;
      const end = Number(expedition.nextHopAt) || start + 90000;
      const duration = Math.max(1000,end-start);
      const t = Math.max(0,Math.min(.98,(now-start)/duration));
      return {x:a[0]+(b[0]-a[0])*t,y:a[1]+24+(b[1]-a[1])*t};
    }
    return state.worldPosition;
  }

  function computeViewport({mode='zone',zoom=1,center=null,player={x:500,y:1024},fullscreen=false,aspectRatio=16/9}={}) {
    if (mode === 'zone') {
      if (fullscreen) {
        const h = Math.min(2000,1000/Math.max(.5,aspectRatio))/zoom, w = h*aspectRatio, c = center || {x:500,y:1000};
        return {x:Math.max(-Math.max(0,w-1000)/2,Math.min(1000-w/2,c.x-w/2)),y:Math.max(0,Math.min(2000-h,c.y-h/2)),w,h};
      }
      const w=1000/zoom,h=2000/zoom,c=center||player;
      return {x:Math.max(0,Math.min(1000-w,c.x-w/2)),y:Math.max(0,Math.min(2000-h,c.y-h/2)),w,h};
    }
    const size=470/zoom,c=center||player;
    return {x:Math.max(0,Math.min(1000-size,c.x-size/2)),y:Math.max(0,Math.min(2000-size,c.y-size/2)),w:size,h:size};
  }

  function clampLocalTarget(x,y,location,offset=245) {
    const center=sectorCenter(location);
    return {x:Math.max(center[0]-offset,Math.min(center[0]+offset,x)),y:Math.max(center[1]-offset,Math.min(center[1]+offset,y))};
  }

  function nearestSector(x,y) {
    return Object.entries(sectorCoords).map(([id,point])=>({id,distance:Math.hypot(point[0]-x,point[1]-y)})).sort((a,b)=>a.distance-b.distance)[0] || null;
  }

  const api = Object.freeze({sectorCoords,sectorLinks,mapRegions,localRoutes,localRouteRisk,sectorCenter,findLocalRoute,resolvePlayerPosition,computeViewport,clampLocalTarget,nearestSector});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ZoneMapNavigation = api;
})(typeof window !== 'undefined' ? window : globalThis);
