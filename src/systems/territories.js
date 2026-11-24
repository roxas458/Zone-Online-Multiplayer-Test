// Canonical faction territory graph. NPCs may only relocate for a valid order.
const TERRITORY_ADJACENCY = Object.freeze({
  chaes:['zaton'], zaton:['chaes','pripyat'], pripyat:['zaton','jupiter','radar'],
  jupiter:['pripyat','red'], red:['jupiter','limansk','army'], limansk:['red'],
  radar:['pripyat'], army:['red','wild'], wild:['army','bar'], bar:['wild','dump','yantar'],
  yantar:['bar'], dump:['bar','agro','dark'], agro:['dump','cordon'], dark:['dump','darkhollow'],
  cordon:['agro','swamps'], swamps:['cordon'], darkhollow:['dark']
});
const FACTION_HOME = Object.freeze({
  'Одиночки':['cordon','zaton'], 'Долг':['bar'], 'Свобода':['jupiter','red','army'],
  'Бандиты':['dump','dark','darkhollow'], 'Военные':['agro'], 'Учёные':['yantar'],
  'Наёмники':['limansk','wild'], 'Монолит':['chaes','pripyat','radar'], 'Чистое небо':['swamps'], 'Ренегаты':['darkhollow']
});
function addInfluence(control,amount){return Math.max(0,Math.min(100,(Number(control)||0)+amount));}
function resolveControl(owner,claimant,control){return control>=100?{owner:claimant,control:55}:{owner,control};}
function areAdjacent(a,b){return (TERRITORY_ADJACENCY[a]||[]).includes(b);}
function friendlyLocations(faction, owners={}){return Object.entries(owners).filter(([,owner])=>owner===faction).map(([id])=>id);}
function homeForFaction(faction, owners={}, preferred=null){
  const owned=friendlyLocations(faction,owners);
  if(preferred&&owned.includes(preferred))return preferred;
  const configured=FACTION_HOME[faction]||[];
  return configured.find(id=>owned.includes(id))||owned[0]||configured[0]||'cordon';
}
function nearestFriendlyLocation(from,faction,owners={}){
  const owned=friendlyLocations(faction,owners); if(!owned.length)return homeForFaction(faction,owners);
  const queue=[[from,0]],seen=new Set([from]);
  while(queue.length){const [id,d]=queue.shift();if(owned.includes(id))return id;for(const next of TERRITORY_ADJACENCY[id]||[]){if(!seen.has(next)){seen.add(next);queue.push([next,d+1]);}}}
  return owned[0];
}
function canEnterTerritory(faction,location,owners={},orders={}){
  if(owners[location]===faction)return true;
  const order=orders[location];
  return !!order && order.faction===faction && ['attack','recon','escort','retreat'].includes(order.type);
}
module.exports={addInfluence,resolveControl,TERRITORY_ADJACENCY,FACTION_HOME,areAdjacent,friendlyLocations,homeForFaction,nearestFriendlyLocation,canEnterTerritory};
