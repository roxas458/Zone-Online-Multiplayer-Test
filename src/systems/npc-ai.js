// Server-authoritative faction AI. Stationary life is the default; movement requires an order.
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const NPC_FACTIONS = Object.freeze({
  sid:'Одиночки', wolf:'Одиночки', fanatic:'Одиночки', scout:'Одиночки', bandit:'Бандиты',
  barman:'Одиночки', seriy:'Одиночки', scientist:'Учёные', merc:'Наёмники', prof:'Учёные',
  freedom:'Свобода', guide:'Одиночки', loner:'Одиночки', lebedev:'Чистое небо', novikov:'Чистое небо',
  cold:'Чистое небо', renegade_leader:'Ренегаты', renegade_scout:'Ренегаты', lukash:'Свобода', voronin:'Долг', sultan:'Бандиты', beard:'Одиночки',
  charon:'Монолит', wolfhound:'Наёмники', archivist:'Учёные', kravtsov:'Военные', monolith_scout:'Монолит'
});
const ROLES = Object.freeze({ sid:'торговец', wolf:'сталкер', fanatic:'сталкер', scout:'разведчик', bandit:'бандит', barman:'торговец', seriy:'сталкер', scientist:'учёный', merc:'наёмник', prof:'учёный', freedom:'боец', guide:'проводник', loner:'сталкер', lebedev:'командир', novikov:'техник', cold:'боец', renegade_leader:'главарь ренегатов', renegade_scout:'разведчик ренегатов', lukash:'командир', voronin:'командир', sultan:'главарь', beard:'торговец', charon:'командир', wolfhound:'боец', archivist:'учёный', kravtsov:'военный', monolith_scout:'разведчик' });
const { TERRITORY_ADJACENCY, homeForFaction, nearestFriendlyLocation, canEnterTerritory } = require('./territories');
const { buildDialogue } = require('./npc-dialogue');
const { npcSleepWindow, updateNpcNeeds } = require('./npc-ai-needs');
const { resolveNpcWorldConflicts } = require('./npc-ai-conflicts');
const { decideNpcAction } = require('./npc-ai-decisions');
const { interactWithNpc } = require('./npc-interactions');
const { npcWorldPosition, SECTOR_COORDS } = require('./proximity');
const { isHostileFaction } = require('./npc-ai-factions');
const { tickNpcMovement, tickNpcProximityCombat } = require('./npc-ai-movement');
const NPC_DISPLAY = {sid:'Сидорович',wolf:'Волк',fanatic:'Фанатик',scout:'Разведчик',bandit:'Бандит',barman:'Бармен',seriy:'Серый',scientist:'Учёный',merc:'Наёмник',prof:'Профессор Сахаров',freedom:'Свободовец',guide:'Проводник',loner:'Одиночка',lebedev:'Николай Лебедев',novikov:'Новиков',cold:'Холод',renegade_leader:'Грач',renegade_scout:'Шило',lukash:'Лукаш',voronin:'Генерал Воронин',sultan:'Султан',beard:'Борода',charon:'Харон',wolfhound:'Вольфхаунд',archivist:'Архивист',kravtsov:'Командир Кравцов',monolith_scout:'Монолитовский разведчик'};
function createNpcRoster(npcHome, now = Date.now()) {
  const roster = {};
  for (const [id, location] of Object.entries(npcHome || {})) {
    roster[id] = { id, name: NPC_DISPLAY[id] || id, faction: NPC_FACTIONS[id] || 'Одиночки', role: ROLES[id] || 'сталкер', location, homeLocation:location, baseLocation:location, destination: null, action: 'camp', behavior:'camp', duty:'base_guard', guardPost:true, mood: 'спокоен', health: 100, morale: 60, supplies: 50, needs:{hunger:0,thirst:0,fatigue:0,stress:0}, lastNeedsAt:now, alive: true, lastActionAt: now, nextDecisionAt:now+5*60000, relationships: {}, inventory: [], history: [], generated:false, dialogueVersion:0, dialogueCycle:Math.floor(now/900000), lastApproachAt:0, route:[] };
  }
  return roster;
}
function choose(list, random) { return list[Math.floor(random() * list.length)] || null; }
function scheduleNext(npc,now,random,min=1,max=4){npc.nextDecisionAt=now+(min+Math.floor(random()*(max-min+1)))*60000;}
function recordAction(npc,now){npc.lastActionAt=now;npc.history ||= [];npc.history.push({action:npc.action,location:npc.location,at:now});npc.history=npc.history.slice(-12);}
function moveNpc(npc,to,now,events,reason='patrol'){
  if(!to||to===npc.location||npc.travelTo)return false;
  const from=npc.location,center=SECTOR_COORDS[to]||SECTOR_COORDS.cordon;
  if(!Number.isFinite(Number(npc.x))||!Number.isFinite(Number(npc.y))){const start=SECTOR_COORDS[from]||SECTOR_COORDS.cordon;npc.x=start[0];npc.y=start[1];}
  npc.destination=null;npc.travelTo=to;npc.destinationPoint={x:center[0],y:center[1]};npc.action='travel';npc.behavior=reason;npc.route=[from,to];npc.direction=(npc.direction||0)+90;
  events.push({type:'npc_travel',npcId:npc.id,from,location:to,text:`${npc.name} отправился из сектора ${from} в сектор ${to}.`,at:now});return true;
}

function tickNpcWorld(world, locations, random = Math.random, now = Date.now()) {
  world.npcState ||= {}; world.npcPositions ||= {};
  const events = [], owners=world.territoryOwners||{};
  for (const npc of Object.values(world.npcState)) {
    if (!npc.equipment) { const role=npc.role||'сталкер'; npc.equipment={suit:role.includes('учёный')?'Научный комбинезон':role.includes('торговец')?'Куртка торговца':'Комбинезон сталкера',weapon:role.includes('охотник')?'ТОЗ-34':role.includes('разведчик')?'АКС-74У':'ПМ',tool:'Обычный детектор',backpack:'Полевой рюкзак'}; }
    if (!npc.alive) continue;
    const cycle=Math.floor(now/900000); if(npc.dialogueCycle!==cycle || !npc.dialogue){npc.dialogueCycle=cycle;if(npc.dialogue)npc.dialogueVersion=(npc.dialogueVersion||0)+1;npc.dialogue = buildDialogue(npc, {recentWorldEvent:world.zoneEvents?.at(-1)?.title || ''}, now);if(npc.dialogueVersion)events.push({type:'npc_dialogue_updated',npcId:npc.id,text:`${npc.name}: появились новые темы и слухи для разговора.`,at:now});}
    npc.health=clamp(npc.health ?? 100,0,100);npc.morale=clamp(npc.morale ?? 60,0,100);npc.supplies=clamp(npc.supplies ?? 50,0,100);
    updateNpcNeeds(npc,now);
    npc.homeLocation ||= homeForFaction(npc.faction,owners,npc.location);
    npc.baseLocation ||= npc.homeLocation;
    npc.behavior ||= 'camp'; npc.nextDecisionAt ||= now+60000;
    if(!npc.activityPaceUpdated){if(Number(npc.nextDecisionAt)>now+4*60000)npc.nextDecisionAt=now+30000;npc.activityPaceUpdated=true;}
    if(!Number.isFinite(Number(npc.x))||!Number.isFinite(Number(npc.y))){const initial=npcWorldPosition(npc);npc.x=initial.x;npc.y=initial.y;}
    // No unauthorized faction migration: old-save NPCs return to their own nearest friendly sector.
    const activeSquad=(world.npcSquads||[]).find(s=>s.id===npc.squadId&&['travelling','scavenging','returning','war_moving','holding_objective'].includes(s.status));
    if(activeSquad){world.npcPositions[npc.id]=npc.location;continue;}
    if(npc.lifeRoutine&&!npc.missionOrder){world.npcPositions[npc.id]=npc.location;continue;}
    if(npc.missionOrder)npc.lifeRoutine=null;
    if(npc.destinationPoint){world.npcPositions[npc.id]=npc.location;continue;}
    const hasOrder=!!npc.missionOrder;
    const occupied=!!npc.occupationGarrison&&owners[npc.location]===npc.faction;
    if(Object.keys(owners).length&&!occupied&&!hasOrder&&!canEnterTerritory(npc.faction,npc.location,owners,world.territoryOrders||{})){
      const safe=nearestFriendlyLocation(npc.location,npc.faction,owners);
      if(safe!==npc.location){moveNpc(npc,safe,now,events,'retreat');npc.action='retreat';npc.behavior='retreat';npc.duty='return_to_faction';scheduleNext(npc,now,random,8,14);recordAction(npc,now);world.npcPositions[npc.id]=npc.location;continue;}
    }
    if(decideNpcAction(npc,{world,owners,events,now,random,territoryAdjacency:TERRITORY_ADJACENCY,canEnterTerritory,moveNpc,scheduleNext,recordAction,choose})){
      npc.destination=null;
      world.npcPositions[npc.id]=npc.location;
    }
  }
  // Conflict simulation is isolated from per-NPC decision scheduling.
  resolveNpcWorldConflicts({ world, owners, events, now, random, isHostileFaction });
  world.npcPositions=Object.fromEntries(Object.values(world.npcState).filter(n=>n.alive).map(n=>[n.id,n.location]));
  world.factionBases=Object.entries(owners).map(([location,faction])=>{
    const stationed=Object.values(world.npcState).filter(n=>n.alive&&n.location===location&&n.faction===faction);
    return {location,faction,total:stationed.length,guards:stationed.filter(n=>n.guardPost||n.duty==='base_guard'||n.duty==='occupation_garrison').length,campfire:stationed.filter(n=>n.behavior==='campfire').length,patrols:stationed.filter(n=>n.behavior==='patrol').length,squads:[...new Set(stationed.map(n=>n.squadId).filter(Boolean))].length};
  });
  world.npcEvents ||= [];world.npcEvents.push(...events);world.npcEvents=world.npcEvents.slice(-60);
  return events;
}

module.exports = { NPC_FACTIONS, ROLES, createNpcRoster, tickNpcWorld, tickNpcMovement, tickNpcProximityCombat, interactWithNpc, isHostileFaction, updateNpcNeeds, npcSleepWindow };
