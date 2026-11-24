// Server-authoritative faction AI. Stationary life is the default; movement requires an order.
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
function npcSeed(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
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
const { interactWithNpc } = require('./npc-interactions');
const { createFactionDiplomacy, FACTIONS } = require('../shared/game-data');
const DEFAULT_DIPLOMACY = createFactionDiplomacy([...FACTIONS]);
const { npcWorldPosition, inRange, NPC_SKIRMISH_RADIUS, SECTOR_COORDS } = require('./proximity');
const { resolveSectorAtPosition } = require('./sector-position');
function isHostileFaction(a,b,diplomacy={}) {
  if (!a || !b || a === b) return false;
  if (a === 'Монолит' || b === 'Монолит') return true;
  const canonical = Number(DEFAULT_DIPLOMACY[a]?.[b]);
  const current = diplomacy?.[a]?.[b];
  return Number.isFinite(Number(current)) ? Number(current) <= -25 : canonical <= -25;
}
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
function npcSleepWindow(npc, now) {
  if (!Number.isInteger(npc.sleepStartHour)) {
    let hash=0; for (const char of String(npc.id||'')) hash=(hash*31+char.charCodeAt(0))>>>0;
    npc.sleepStartHour=21+(hash%4); npc.sleepEndHour=5+(hash%3);
  }
  const hour=new Date(now).getUTCHours();
  return npc.sleepStartHour>npc.sleepEndHour
    ? hour>=npc.sleepStartHour||hour<npc.sleepEndHour
    : hour>=npc.sleepStartHour&&hour<npc.sleepEndHour;
}
function updateNpcNeeds(npc, now) {
  npc.needs ||= { hunger:0, thirst:0, fatigue:0, stress:0 };
  for (const key of ['hunger','thirst','fatigue','stress']) npc.needs[key]=clamp(npc.needs[key],0,100);
  const previous=Number(npc.lastNeedsAt)||now;
  const minutes=Math.max(0,Math.min(5,(now-previous)/60000));
  npc.lastNeedsAt=now;
  if (!minutes) return;
  npc.needs.hunger=clamp(npc.needs.hunger+minutes*.035,0,100);
  npc.needs.thirst=clamp(npc.needs.thirst+minutes*.055,0,100);
  npc.needs.fatigue=clamp(npc.needs.fatigue+minutes*(npc.action==='travel'? .05:.03),0,100);
  if (npc.action==='combat') npc.needs.stress=clamp(npc.needs.stress+minutes*.8,0,100);
  else if (npc.action==='camp'||npc.action==='rest') npc.needs.stress=clamp(npc.needs.stress-minutes*.35,0,100);
  if ((npc.needs.hunger>=65||npc.needs.thirst>=65) && Number(npc.supplies)>0) {
    npc.supplies=clamp(npc.supplies-2,0,100);
    if(npc.needs.hunger>=65)npc.needs.hunger=clamp(npc.needs.hunger-42,0,100);
    if(npc.needs.thirst>=65)npc.needs.thirst=clamp(npc.needs.thirst-48,0,100);
    npc.lastSupplyUseAt=now;
  } else if ((npc.needs.hunger>=65||npc.needs.thirst>=65) && Number(npc.supplies)<=0) {
    npc.morale=clamp(Number(npc.morale)-minutes*.025,0,100);
  }
  if(npc.action==='camp'||npc.action==='rest') npc.needs.fatigue=clamp(npc.needs.fatigue-minutes*.22,0,100);
}
function recordAction(npc,now){npc.lastActionAt=now;npc.history ||= [];npc.history.push({action:npc.action,location:npc.location,at:now});npc.history=npc.history.slice(-12);}
function moveNpc(npc,to,now,events,reason='patrol'){
  if(!to||to===npc.location||npc.travelTo)return false;
  const from=npc.location,center=SECTOR_COORDS[to]||SECTOR_COORDS.cordon;
  if(!Number.isFinite(Number(npc.x))||!Number.isFinite(Number(npc.y))){const start=SECTOR_COORDS[from]||SECTOR_COORDS.cordon;npc.x=start[0];npc.y=start[1];}
  npc.destination=null;npc.travelTo=to;npc.destinationPoint={x:center[0],y:center[1]};npc.action='travel';npc.behavior=reason;npc.route=[from,to];npc.direction=(npc.direction||0)+90;
  events.push({type:'npc_travel',npcId:npc.id,from,location:to,text:`${npc.name} отправился из сектора ${from} в сектор ${to}.`,at:now});return true;
}

// Lightweight one-second movement step. Strategic decisions remain on the slower AI tick;
// this function only advances already-authorized movement orders in world coordinates.
function tickNpcMovement(world,now=Date.now(),speed=2.5){
  const moved=[];
  const active=Object.values(world.npcState||{}).filter(n=>n&&n.alive!==false&&n.location);
  const combatGrid=new Map(),combatCell=NPC_SKIRMISH_RADIUS;
  for(const n of active){const p=npcWorldPosition(n),key=`${n.location}|${Math.floor(p.x/combatCell)}|${Math.floor(p.y/combatCell)}`;if(!combatGrid.has(key))combatGrid.set(key,[]);combatGrid.get(key).push(n);}
  for(const npc of active){
    if(!npc||npc.alive===false)continue;
    if(!Number.isFinite(Number(npc.x))||!Number.isFinite(Number(npc.y))){const initial=npcWorldPosition(npc);npc.x=initial.x;npc.y=initial.y;}
    // Ordinary stalkers periodically leave their post for short local patrols.
    // Traders and named commanders remain at their authored positions unless ordered.
    if(!npc.lifeRoutine&&!npc.destinationPoint&&!npc.travelTo&&['camp','guard','patrol'].includes(npc.action)&&!['торговец','командир','главарь'].some(role=>String(npc.role||'').includes(role))){
      npc.nextRoamAt ||= now+15000+(npcSeed(npc.id)%35000);
      if(now>=npc.nextRoamAt){const center=SECTOR_COORDS[npc.location]||SECTOR_COORDS.cordon,seed=(npcSeed(npc.id+'|'+Math.floor(now/45000))>>>0),angle=(seed%10000)/10000*Math.PI*2,radius=28+((seed>>>8)%68);npc.destinationPoint={x:Math.max(4,Math.min(996,center[0]+Math.cos(angle)*radius)),y:Math.max(4,Math.min(1996,center[1]+Math.sin(angle)*radius))};npc.action='patrol';npc.behavior='patrol';npc.duty='sector_patrol';npc.guardPost=false;npc.nextRoamAt=now+45000+(seed%45000);}
    }
    if(!npc.destinationPoint)continue;
    // Hostile contacts stop movement before either side can walk through the other.
    // The proximity-combat tick resolves damage and deaths on its own cadence.
    const here=npcWorldPosition(npc),cx=Math.floor(here.x/combatCell),cy=Math.floor(here.y/combatCell);
    let blockedByHostile=false;
    for(let ox=-1;ox<=1&&!blockedByHostile;ox++)for(let oy=-1;oy<=1&&!blockedByHostile;oy++){
      for(const other of combatGrid.get(`${npc.location}|${cx+ox}|${cy+oy}`)||[]){
        if(other===npc||other.alive===false||!isHostileFaction(npc.faction,other.faction,world.diplomacy))continue;
        if(inRange(here,npcWorldPosition(other),NPC_SKIRMISH_RADIUS)){blockedByHostile=true;break;}
      }
    }
    if(blockedByHostile){npc.action='combat';npc.behavior='combat';npc.mood='в бою';npc.destinationPoint=null;continue;}
    if(npc.action==='combat'&&now-(Number(npc.lastSkirmishAt)||0)<12000)continue;
    const dx=Number(npc.destinationPoint.x)-Number(npc.x),dy=Number(npc.destinationPoint.y)-Number(npc.y),distance=Math.hypot(dx,dy),step=Math.min(distance,Math.max(1,Number(speed)||8));
    if(distance<=step+0.5){npc.x=Number(npc.destinationPoint.x);npc.y=Number(npc.destinationPoint.y);npc.destinationPoint=null;if(npc.travelTo){npc.location=npc.travelTo;npc.travelTo=null;}if(npc.action==='travel')npc.action='patrol';}
    else{npc.x+=dx/distance*step;npc.y+=dy/distance*step;npc.action='travel';}
    const crossedSector=resolveSectorAtPosition(npc.location,{x:npc.x,y:npc.y});if(crossedSector!==npc.location)npc.location=crossedSector;
    world.npcPositions ||= {};world.npcPositions[npc.id]=npc.location;
    moved.push({id:npc.id,x:npc.x,y:npc.y,location:npc.location,travelTo:npc.travelTo||null,action:npc.action,behavior:npc.behavior});
  }
  return moved;
}
function tickNpcProximityCombat(world,now=Date.now(),random=Math.random){
 const npcs=Object.values(world.npcState||{}).filter(n=>n&&n.alive!==false&&n.location&&n.action!=='dead'),events=[];
 // Spatial hashing limits combat checks to nearby cells instead of comparing every NPC pair.
 const cellSize=NPC_SKIRMISH_RADIUS,grid=new Map(),positions=npcs.map(n=>npcWorldPosition(n));
 for(let i=0;i<npcs.length;i++){const n=npcs[i],p=positions[i],key=`${n.location}|${Math.floor(p.x/cellSize)}|${Math.floor(p.y/cellSize)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}
 for(let i=0;i<npcs.length;i++){
  const a=npcs[i];if(now-(Number(a.lastSkirmishAt)||0)<12000)continue;const pa=positions[i],cx=Math.floor(pa.x/cellSize),cy=Math.floor(pa.y/cellSize);let candidates=[];
  for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)candidates.push(...(grid.get(`${a.location}|${cx+ox}|${cy+oy}`)||[]));
  for(const j of candidates){if(j<=i)continue;
   const b=npcs[j];if(b.faction===a.faction||b.alive===false||!isHostileFaction(a.faction,b.faction,world.diplomacy)||now-(Number(b.lastSkirmishAt)||0)<12000)continue;
   if(!inRange(pa,positions[j],NPC_SKIRMISH_RADIUS))continue;
   const damageA=2+Math.floor(random()*5),damageB=2+Math.floor(random()*5);a.health=clamp(a.health-damageA,0,100);b.health=clamp(b.health-damageB,0,100);a.action=b.action='combat';a.behavior=b.behavior='combat';a.mood=b.mood='в бою';a.lastSkirmishAt=b.lastSkirmishAt=now;
   events.push({type:'npc_skirmish',location:a.location,npcIds:[a.id,b.id],text:`В радиусе обнаружения встретились отряды ${a.name} («${a.faction}») и ${b.name} («${b.faction}»). Началась перестрелка в секторе ${a.location}.`,at:now});
   for(const [victim,killer] of [[a,b],[b,a]])if(victim.health<=0&&victim.alive){victim.alive=false;victim.action='dead';victim.deathCause=`погиб в перестрелке с группировкой «${killer.faction}»`;victim.diedAt=now;victim.combatDeaths=(Number(victim.combatDeaths)||0)+1;killer.combatKills=(Number(killer.combatKills)||0)+1;killer.lastCombatKillAt=now;killer.lastVictim=victim.name;}
   break;
  }
 }
 return events;
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
    if(now < npc.nextDecisionAt && npc.action!=='combat') continue;
    if(npc.action==='combat') { npc.action='guard';npc.behavior='guard';npc.mood='насторожен';scheduleNext(npc,now,random,1,3);recordAction(npc,now);continue; }
    if(npc.missionOrder){
      const target=npc.missionOrder.target;
      if(npc.location===target){npc.action='guard';npc.behavior='mission';npc.duty=npc.missionOrder.type||'mission';npc.missionOrder=null;}
      else {
        const next=(TERRITORY_ADJACENCY[npc.location]||[]).find(id=>id===target||(TERRITORY_ADJACENCY[id]||[]).includes(target)&&canEnterTerritory(npc.faction,id,owners,world.territoryOrders||{}));
        if(next&&canEnterTerritory(npc.faction,next,owners,world.territoryOrders||{}))moveNpc(npc,next,now,events,'mission');
        else {npc.missionOrder=null;npc.action='retreat';npc.behavior='retreat';}
      }
      scheduleNext(npc,now,random,5,9);recordAction(npc,now);
    } else {
      const atHome=npc.location===npc.homeLocation||npc.location===npc.baseLocation;
      const roll=random();
      if(npc.needs.fatigue>=82 || (npcSleepWindow(npc,now)&&npc.needs.fatigue>=28)){
        npc.action='rest';npc.behavior='rest';npc.duty='recover';npc.guardPost=false;npc.mood='устал';
        npc.needs.fatigue=clamp(npc.needs.fatigue-8,0,100);npc.morale=clamp(npc.morale+1,0,100);
      }
      else if(npc.squadType==='сбор припасов'&&roll<.34){npc.action='scavenge';npc.behavior='scavenge';npc.duty='field_scavenging';npc.guardPost=false;npc.supplies=clamp(npc.supplies+2,0,100);npc.mood='сосредоточен';events.push({type:'npc_scavenging',npcId:npc.id,location:npc.location,text:`${npc.name} из отряда «${npc.squadName||'сталкеры'}» осматривает укрытия и собирает припасы в секторе ${npc.location}.`,at:now});}
      else if(npc.squadType==='разведка'&&roll<.38){npc.action='patrol';npc.behavior='recon';npc.duty='forward_recon';npc.guardPost=false;npc.mood='насторожен';events.push({type:'npc_recon_report',npcId:npc.id,location:npc.location,text:`${npc.name} ведёт разведку маршрутов в секторе ${npc.location} и отмечает подозрительную активность.`,at:now});}
      else if(npc.squadType==='санитарная группа'&&roll<.34){npc.action='support';npc.behavior='field_medic';npc.duty='field_medic';npc.guardPost=false;npc.mood='сосредоточен';npc.health=clamp(npc.health+4,0,100);events.push({type:'npc_medical_patrol',npcId:npc.id,location:npc.location,text:`Санитарная группа «${npc.squadName||'медики'}» проверяет состояние раненых в секторе ${npc.location}.`,at:now});}
      else if(npc.squadType==='сопровождение'&&roll<.34){npc.action='escort';npc.behavior='escort';npc.duty='caravan_escort';npc.guardPost=false;npc.mood='насторожен';events.push({type:'npc_escort_patrol',npcId:npc.id,location:npc.location,text:`Отряд сопровождения «${npc.squadName||'сталкеры'}» проверяет торговый маршрут в секторе ${npc.location}.`,at:now});}
      else if(roll<.24){npc.action='camp';npc.behavior='campfire';npc.duty='rest_at_base';npc.guardPost=false;npc.mood='спокоен';npc.health=clamp(npc.health+3,0,100);npc.morale=clamp(npc.morale+3,0,100);npc.supplies=clamp(npc.supplies+1,0,100);}
      else if(roll<.48){npc.action='guard';npc.behavior='guard';npc.duty='base_guard';npc.guardPost=true;npc.mood='насторожен';npc.morale=clamp(npc.morale+1,0,100);}
      else if(roll<.62){npc.action='rest';npc.behavior='rest';npc.duty='recover';npc.guardPost=false;npc.health=clamp(npc.health+5,0,100);npc.morale=clamp(npc.morale+2,0,100);}
      else {
        const friendly=(TERRITORY_ADJACENCY[npc.location]||[]).filter(id=>(owners[id]===npc.faction||canEnterTerritory(npc.faction,id,owners,world.territoryOrders||{})));
        const next=choose(friendly,random);
        if(next&&random()<.28){npc.action='patrol';npc.behavior='patrol';npc.duty='sector_patrol';npc.guardPost=false;moveNpc(npc,next,now,events,'patrol');npc.homeLocation=npc.homeLocation||npc.baseLocation;}
        else {const center=SECTOR_COORDS[npc.location]||SECTOR_COORDS.cordon,angle=random()*Math.PI*2,radius=18+random()*78;npc.destinationPoint={x:Math.max(4,Math.min(996,center[0]+Math.cos(angle)*radius)),y:Math.max(4,Math.min(1996,center[1]+Math.sin(angle)*radius))};npc.action='patrol';npc.behavior='patrol';npc.duty='sector_patrol';npc.guardPost=false;} 
      }
      if(atHome&&npc.action==='camp'&&random()<.12)events.push({type:'npc_camp_event',npcId:npc.id,location:npc.location,text:`${npc.name} отдыхает у костра на базе «${npc.faction}».`,at:now});
      scheduleNext(npc,now,random,npc.action==='rest'?8:1,npc.action==='rest'?14:4);recordAction(npc,now);
    }
    npc.destination=null;
    world.npcPositions[npc.id]=npc.location;
  }
  // Strategic campaigns are managed by faction-war.js against explicit key points.
  world.territoryOrders ||= {}; world.battlefronts ||= []; world.convoys ||= [];
  for(const [sector,order] of Object.entries(world.territoryOrders))if(order.expiresAt&&order.expiresAt<=now)delete world.territoryOrders[sector];
  // This replaces the legacy sector-wide border assault scheduler.
  // Persistent faction warfare: hostile units that meet in a sector exchange fire.
  const byLocation = new Map();
  for (const npc of Object.values(world.npcState)) if (npc.alive) { const group = byLocation.get(npc.location) || []; group.push(npc); byLocation.set(npc.location, group); }
  world.battlefronts ||= []; world.convoys ||= [];
  const hostility = (a,b) => isHostileFaction(a,b,world.diplomacy);
  for (const [location, group] of byLocation) {
    const sides=[...new Set(group.map(n=>n.faction))].filter(f=>group.some(n=>hostility(f,n.faction)));
    if(sides.length<2 || random()>.42) continue;
    const a=group.find(n=>n.faction===sides[0]), b=group.find(n=>hostility(sides[0],n.faction));
    if(!a||!b) continue;
    const battle=world.battlefronts.find(x=>x.location===location&&x.status==='active');
    const engagement=battle||{id:`battle_${location}_${now}`,location,attacker:a.faction,defender:b.faction,status:'active',startedAt:now,rounds:0,losses:0,participants:[]};
    engagement.participants ||= [];for(const participant of [a.id,b.id])if(participant&&!engagement.participants.includes(participant))engagement.participants.push(participant);engagement.participants=engagement.participants.slice(-24);
    engagement.rounds++;engagement.lastAt=now;
    const damageA=4+Math.floor(random()*13),damageB=4+Math.floor(random()*13);
    b.health=clamp(b.health-damageA,0,100);a.health=clamp(a.health-damageB,0,100);a.action=b.action='combat';a.behavior=b.behavior='combat';a.mood=b.mood='в бою';
    for(const [victim,killer] of [[a,b],[b,a]])if(victim.health<=0&&victim.alive){victim.alive=false;victim.action='dead';victim.deathCause=`погиб в бою с группировкой «${killer.faction}»`;victim.diedAt=now;victim.combatDeaths=(Number(victim.combatDeaths)||0)+1;killer.combatKills=(Number(killer.combatKills)||0)+1;killer.lastCombatKillAt=now;killer.lastVictim=victim.name;engagement.losses++;}
    engagement.participantSnapshots ||= [];for(const unit of [a,b]){const snapshot={id:unit.id,name:unit.name,faction:unit.faction,role:unit.role,health:unit.health,alive:unit.alive,action:unit.action,behavior:unit.behavior,updatedAt:now};const index=engagement.participantSnapshots.findIndex(x=>x.id===unit.id);if(index>=0)engagement.participantSnapshots[index]=snapshot;else engagement.participantSnapshots.push(snapshot);}engagement.participantSnapshots=engagement.participantSnapshots.slice(-24);
    if(!battle)world.battlefronts.unshift(engagement);
    const attackAlive=group.filter(n=>n.alive&&n.faction===engagement.attacker).length;
    const defenseAlive=group.filter(n=>n.alive&&n.faction===engagement.defender).length;
    if(engagement.rounds>=4||attackAlive===0||defenseAlive===0){
      engagement.status='resolved';engagement.endedAt=now;
      const winner=attackAlive===defenseAlive?(attackAlive>0?(random()<.5?engagement.attacker:engagement.defender):null):(attackAlive>defenseAlive?engagement.attacker:engagement.defender);
      engagement.winner=winner;
      if(winner){
        // A local NPC clash is not enough to transfer an entire sector.
        // Key-point ownership and sector aggregation are handled centrally by faction-war.js.
        for(const survivor of group.filter(n=>n.alive&&n.faction===winner)){
          survivor.lastClashWinner=winner;
          survivor.morale=clamp((Number(survivor.morale)||50)+3,0,100);
        }
        events.push({type:'faction_clash_resolved',location,winner,text:`Столкновение в секторе ${location} завершилось в пользу группировки «${winner}». Контроль ключевых объектов пока не изменился.`,at:now});
      }
    }
    events.push({type:'npc_skirmish',location,participants:[a.id,b.id],attacker:engagement.attacker,defender:engagement.defender,text:`Перестрелка: ${engagement.attacker} и ${engagement.defender} ведут бой в секторе ${location}.`,at:now});
  }
  world.battlefronts=world.battlefronts.slice(0,40);
  // Convoys use the Zone's connected routes and remain visible to every player.
  if(!world.convoys.length||(now-(world.convoys.at(-1)?.createdAt||0)>12*60*1000&&random()<.35)){
    const routes=[['cordon','agro','dump','bar'],['swamps','cordon','agro','yantar'],['jupiter','pripyat','zaton'],['limansk','red','jupiter','radar']];
    const route=choose(routes,random);const originOwner=owners[route[0]]||'Одиночки';
    world.convoys.push({id:`convoy_${now}`,faction:originOwner,route,index:0,location:route[0],strength:3+Math.floor(random()*4),status:'moving',createdAt:now});
    events.push({type:'convoy_started',location:route[0],text:`Караван снабжения группировки «${originOwner}» отправился из сектора ${route[0]}.`,at:now});
  }
  for(const convoy of world.convoys.filter(x=>x.status==='moving')){
    if(random()<.7){convoy.index++;convoy.location=convoy.route[Math.min(convoy.index,convoy.route.length-1)];if(convoy.index>=convoy.route.length-1)convoy.status='arrived';}
    const enemies=Object.values(world.npcState).filter(n=>n.alive&&n.location===convoy.location&&hostility(convoy.faction,n.faction));
    if(enemies.length&&random()<.25){convoy.status='ambushed';events.push({type:'convoy_ambush',location:convoy.location,text:`Засада на караван ${convoy.faction} в секторе ${convoy.location}!`,at:now});}
  }
  world.convoys=world.convoys.filter(x=>now-x.createdAt<24*60*60*1000).slice(-20);
  // Local skirmishes: hostile NPCs only engage when their map-space positions overlap.
  const combatants=Object.values(world.npcState).filter(n=>n.alive&&n.location&&!n.missionOrder&&n.action!=='dead');
  for(let i=0;i<combatants.length;i++){const a=combatants[i];if(a.action==='combat'||a.lastSkirmishAt&&now-a.lastSkirmishAt<45000)continue;const pa=npcWorldPosition(a);const b=combatants.slice(i+1).find(other=>other.alive&&other.location===a.location&&other.faction!==a.faction&&isHostileFaction(a.faction,other.faction,world.diplomacy)&&other.action!=='combat'&&(!other.lastSkirmishAt||now-other.lastSkirmishAt>=45000)&&inRange(pa,npcWorldPosition(other),NPC_SKIRMISH_RADIUS));if(!b||random()>.38)continue;const damageA=5+Math.floor(random()*9),damageB=5+Math.floor(random()*9);a.health=clamp(a.health-damageA,0,100);b.health=clamp(b.health-damageB,0,100);a.action=b.action='combat';a.behavior=b.behavior='combat';a.mood=b.mood='в бою';a.lastSkirmishAt=b.lastSkirmishAt=now;a.combatEngagementId=b.combatEngagementId=`local_${a.id}_${b.id}_${Math.floor(now/30000)}`;events.push({type:'npc_skirmish',location:a.location,npcIds:[a.id,b.id],text:`Перестрелка между ${a.name} («${a.faction}») и ${b.name} («${b.faction}») в секторе ${a.location}.`,at:now});for(const [victim,killer] of [[a,b],[b,a]])if(victim.health<=0&&victim.alive){victim.alive=false;victim.action='dead';victim.deathCause=`погиб в перестрелке с группировкой «${killer.faction}»`;victim.diedAt=now;victim.combatDeaths=(Number(victim.combatDeaths)||0)+1;killer.combatKills=(Number(killer.combatKills)||0)+1;killer.lastCombatKillAt=now;killer.lastVictim=victim.name;}
  }
  world.npcPositions=Object.fromEntries(Object.values(world.npcState).filter(n=>n.alive).map(n=>[n.id,n.location]));
  world.factionBases=Object.entries(owners).map(([location,faction])=>{
    const stationed=Object.values(world.npcState).filter(n=>n.alive&&n.location===location&&n.faction===faction);
    return {location,faction,total:stationed.length,guards:stationed.filter(n=>n.guardPost||n.duty==='base_guard'||n.duty==='occupation_garrison').length,campfire:stationed.filter(n=>n.behavior==='campfire').length,patrols:stationed.filter(n=>n.behavior==='patrol').length,squads:[...new Set(stationed.map(n=>n.squadId).filter(Boolean))].length};
  });
  world.npcEvents ||= [];world.npcEvents.push(...events);world.npcEvents=world.npcEvents.slice(-60);
  return events;
}

module.exports = { NPC_FACTIONS, ROLES, createNpcRoster, tickNpcWorld, tickNpcMovement, tickNpcProximityCombat, interactWithNpc, isHostileFaction, updateNpcNeeds, npcSleepWindow };
