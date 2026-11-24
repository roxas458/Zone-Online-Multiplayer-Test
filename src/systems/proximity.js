// Shared map-space proximity rules. Coordinates match the original 1000x2000 Zone map.
const SECTOR_COORDS = Object.freeze({chaes:[503,104],zaton:[561,405],pripyat:[676,649],jupiter:[391,703],limansk:[128,838],red:[311,903],radar:[675,897],army:[502,1046],wild:[347,1212],bar:[441,1215],yantar:[174,1302],dump:[466,1470],agro:[243,1528],dark:[787,1418],cordon:[463,1753],swamps:[185,1788],darkhollow:[793,1742]});
const INTERACTION_RADIUS=8, APPROACH_DISTANCE=5, COMBAT_RADIUS=18, NPC_SKIRMISH_RADIUS=48;
function hashMapSeed(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function npcWorldPosition(npc){if(npc?.x!==null&&npc?.x!==undefined&&npc?.y!==null&&npc?.y!==undefined&&Number.isFinite(Number(npc.x))&&Number.isFinite(Number(npc.y)))return{x:Number(npc.x),y:Number(npc.y)};const loc=npc?.location||npc?.loc||'cordon',center=SECTOR_COORDS[loc]||SECTOR_COORDS.cordon;let seed=hashMapSeed(`${npc?.id||npc?.name||'npc'}|${loc}`);const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const angle=rand()*Math.PI*2,radius=28+rand()*112;return{x:center[0]+Math.cos(angle)*radius,y:center[1]+Math.sin(angle)*radius};}
function distance(a,b){return Math.hypot(Number(a?.x)-Number(b?.x),Number(a?.y)-Number(b?.y));}
function inRange(a,b,radius){return !!a&&!!b&&Number.isFinite(Number(a.x))&&Number.isFinite(Number(a.y))&&distance(a,b)<=radius;}
module.exports={SECTOR_COORDS,INTERACTION_RADIUS,APPROACH_DISTANCE,COMBAT_RADIUS,NPC_SKIRMISH_RADIUS,npcWorldPosition,distance,inRange};
