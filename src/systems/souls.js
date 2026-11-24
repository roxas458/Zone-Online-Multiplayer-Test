// Persistent social lives for wandering stalkers: biographies, bonds, squads, raids and memorials.
const { ensureRandomNpcs, generatedName } = require('./npc-roster');
const { TERRITORY_ADJACENCY } = require('./territories');
const { SECTOR_COORDS } = require('./proximity');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const BIOGRAPHY_BITS=[
  'Пришёл в Зону после того, как обычная жизнь стала казаться слишком тесной.',
  'Когда-то работал на железной дороге и до сих пор узнаёт старые пути по звуку.',
  'Потерял напарника на первой же вылазке и с тех пор не любит ходить один.',
  'Уверяет, что попал сюда случайно, хотя знает слишком много старых маршрутов.',
  'Начинал с охоты за артефактами, но теперь больше ценит надёжных людей и горячий чай.',
  'Считает, что в Зоне главное — не меткая стрельба, а умение вовремя промолчать.'
];
const SQUAD_TYPES=['патруль','разведка','сбор припасов','сопровождение','санитарная группа','курьерская группа'];
const QUIRKS=['собирает пустые гильзы','боится заводных игрушек','всегда носит лишнюю ложку','пишет заметки на пачках патронов','разговаривает с детектором','мечтает открыть столовую у костра','никогда не садится спиной к двери'];
function pick(list,random){return list[Math.floor(random()*list.length)]||list[0];}
function initSouls(world,random=Math.random){
  ensureRandomNpcs(world,60);
  const npcs=Object.values(world.npcState||{}).filter(n=>n.generated);
  for(const npc of npcs){
    npc.biography ||= `${npc.name} ${pick(BIOGRAPHY_BITS,random)} Его странная привычка: ${pick(QUIRKS,random)}.`;
    npc.friends ||= []; npc.rivals ||= []; npc.squadId ||= null;
    npc.memory ||= []; npc.replacementDueAt ||= null;
  }
  world.npcSquads ||= [];
  world.npcMemorial ||= [];
  const assignedMembers=new Set((world.npcSquads||[]).flatMap(squad=>squad.members||[]));
  for(const npc of npcs){if(!assignedMembers.has(npc.id))npc.squadId=null;}
  for(const squad of world.npcSquads||[])for(const id of squad.members||[]){const member=world.npcState?.[id];if(member)member.squadId=squad.id;}
  // Seed a few social links once; links are persisted with the world state.
  const linked=new Set();
  for(const npc of npcs){
    if(npc.friends.length||npc.rivals.length)continue;
    const candidates=npcs.filter(other=>other.id!==npc.id&&other.faction===npc.faction&&other.alive);
    if(candidates.length){const friend=candidates[Math.floor(random()*candidates.length)];const key=[npc.id,friend.id].sort().join(':');if(!linked.has(key)){linked.add(key);npc.friends.push(friend.id);friend.friends ||= [];if(!friend.friends.includes(npc.id))friend.friends.push(npc.id);}}
  }
  // Seed rivalries too, so not every stranger in the Zone gets along.
  for(const npc of npcs){
    if(npc.rivals.length)continue;
    const rivals=npcs.filter(other=>other.id!==npc.id&&other.faction!==npc.faction&&other.alive);
    if(rivals.length&&random()<0.42){const rival=rivals[Math.floor(random()*rivals.length)];npc.rivals.push(rival.id);rival.rivals ||= [];if(!rival.rivals.includes(npc.id))rival.rivals.push(npc.id);}
  }
  if(!world.npcSquads.length){
    // Form squads only from people who are physically together; never teleport strangers into a group.
    const byFactionAndLocation={};
    for(const npc of npcs.filter(n=>n.alive)){
      const key=`${npc.faction}::${npc.location}`;
      (byFactionAndLocation[key] ||= []).push(npc);
    }
    for(const members of Object.values(byFactionAndLocation)){
      const faction=members[0]?.faction;
      for(let i=0;i+1<members.length;i+=3){
        const group=members.slice(i,i+3);if(group.length<2)continue;
        const id=`squad_${factionSlug(faction)}_${world.npcSquads.length+1}`;
        const type=SQUAD_TYPES[world.npcSquads.length%SQUAD_TYPES.length];const squad={id,name:`${pick(['Кривой маршрут','Последний болт','Тихая смена','Северный чай'],random)} · ${group[0].name}`,faction,leaderId:group[0].id,members:group.map(n=>n.id),location:group[0].location,status:'camped',type,createdAt:Date.now(),lastRaidAt:0};
        world.npcSquads.push(squad);for(const n of group){n.squadId=id;n.squadType=type;}
      }
    }
  }
  // Keep a real, persistent commander on every squad, including squads migrated from older saves.
  for(const squad of world.npcSquads){
    const members=(squad.members||[]).map(id=>world.npcState?.[id]).filter(n=>n&&n.alive!==false);
    if(!members.length)continue;
    if(!members.some(n=>n.id===squad.leaderId))squad.leaderId=members[0].id;
    squad.leaderName=world.npcState[squad.leaderId]?.name||members[0].name;
    squad.memberRelations ||= {};
    for(const member of members){
      member.relationships ||= {};
      if(!Number.isFinite(Number(member.relationships[squad.leaderId])))member.relationships[squad.leaderId]=member.id===squad.leaderId?100:20;
      squad.memberRelations[member.id]=Number(member.relationships[squad.leaderId]);
    }
  }
  // Migrate older saved squads to a typed role without changing their membership or location.
  for(const [index,squad] of (world.npcSquads||[]).entries()){
    squad.type ||= SQUAD_TYPES[index%SQUAD_TYPES.length];
    for(const id of squad.members||[]){const npc=world.npcState?.[id];if(npc)npc.squadType ||= squad.type;}
  }
  syncNpcGroups(world);
  return world;
}
function syncNpcGroups(world){
  const npcs=world.npcState||{};world.npcPositions ||= {};
  world.npcGroups=(world.npcSquads||[]).map(squad=>{
    const members=(squad.members||[]).map(id=>npcs[id]).filter(n=>n&&n.alive!==false);
    // The squad's strategic sector is canonical. Repair stale per-NPC sector fields
    // left behind by older saves or interrupted route updates before publishing the map.
    const location=squad.location||members[0]?.location||'cordon';
    for(const [memberIndex,member] of members.entries()){const center=SECTOR_COORDS[location]||SECTOR_COORDS.cordon;const staleCoordinates=!Number.isFinite(Number(member.x))||!Number.isFinite(Number(member.y))||Math.hypot(Number(member.x)-center[0],Number(member.y)-center[1])>280;if(member.location!==location||staleCoordinates){member.location=location;world.npcPositions[member.id]=location;const angle=memberIndex*2.399963;const radius=8+(memberIndex%4)*5;member.x=center[0]+Math.cos(angle)*radius;member.y=center[1]+Math.sin(angle)*radius;}}
    return {id:squad.id,name:squad.name,faction:squad.faction,location,members:members.map(n=>n.id),size:members.length,type:squad.type||'патруль',status:squad.status==='camped'?'garrison':'field',missionType:squad.missionType||null,targetPointId:squad.targetPointId||null};
  }).filter(squad=>squad.size>=1);
}
function factionSlug(s){return String(s).toLowerCase().replace(/[^а-яa-z0-9]+/gi,'_').slice(0,18);}
function tickSquadPolitics(world,now,random,events){
  const npcs=world.npcState||{},squads=world.npcSquads||[];
  for(const squad of squads){
    if(!squad||!Array.isArray(squad.members)||!squad.members.length)continue;
    let members=squad.members.map(id=>npcs[id]).filter(n=>n&&n.alive!==false);
    if(!members.length)continue;
    if(!members.some(n=>n.id===squad.leaderId)){squad.leaderId=members[0].id;squad.leaderName=members[0].name;}
    const leader=squad.leaderId;
    for(const member of members){
      if(member.id===leader||!member.generated)continue;
      const trust=Number(member.relationships?.[leader]??20);
      const discontent=trust<=-45||Number(member.morale??60)<=12;
      if(!discontent||now-(Number(member.lastSquadChangeAt)||0)<30*60*1000||random()>.08)continue;
      const destination=squads.find(other=>other!==squad&&other.faction===member.faction&&other.location===member.location&&other.status!=='disbanded'&&(other.members||[]).length<6);
      squad.members=squad.members.filter(id=>id!==member.id);
      if(destination){destination.members.push(member.id);member.squadId=destination.id;member.squadName=destination.name;}
      else{member.squadId=null;member.squadName=null;member.action='camp';member.behavior='camp';}
      member.lastSquadChangeAt=now;member.history ||= [];member.memory ||= [];
      const reason=trust<=-45?'конфликт с командиром':'потеря доверия внутри отряда';
      const record={action:'squad_left',fromSquad:squad.id,toSquad:destination?.id||null,reason,at:now};
      member.history.push(record);member.history=member.history.slice(-40);member.memory.push({type:'squad_change',...record});member.memory=member.memory.slice(-40);
      if(squad.leaderId===member.id){const next=squad.members.map(id=>npcs[id]).find(n=>n&&n.alive!==false);squad.leaderId=next?.id||null;squad.leaderName=next?.name||null;}
      events.push({type:'npc_squad_change',npcId:member.id,fromSquad:squad.id,toSquad:destination?.id||null,text:`${member.name} покинул отряд «${squad.name}» из-за ${reason}${destination?` и присоединился к «${destination.name}»`:''}.`,at:now});
    }
    squad.members=squad.members.filter(id=>npcs[id]&&npcs[id].alive!==false);
    if(!squad.members.length)squad.status='disbanded';
    squad.memberRelations=Object.fromEntries(squad.members.map(id=>[id,Number(npcs[id]?.relationships?.[squad.leaderId]??0)]));
  }
}
function tickSouls(world,locations,random=Math.random,now=Date.now()){
  initSouls(world,random);
  const events=[];const npcs=world.npcState||{};
  tickSquadPolitics(world,now,random,events);
  for(const npc of Object.values(npcs)){
    if(!npc.generated)continue;
    if(npc.alive===false&&!npc.memorialized&&!npc.replacementDueAt)npc.replacementDueAt=now+3*60*1000;
    if(npc.alive===false&&!npc.memorialized&&npc.replacementDueAt&&now>=npc.replacementDueAt){
      const memorial={id:`mem_${npc.id}_${now}`,name:npc.name,faction:npc.faction,role:npc.role,location:npc.location,biography:npc.biography,cause:npc.deathCause||'погиб во время вылазки',diedAt:npc.diedAt||now};
      world.npcMemorial.unshift(memorial);world.npcMemorial=world.npcMemorial.slice(0,100);
      const nextId=`wanderer_${String(Object.keys(npcs).filter(id=>id.startsWith('wanderer_')).length+1).padStart(3,'0')}`;
      const used=new Set(Object.values(npcs).map(n=>n.name));
      const replacement=makeReplacement(nextId,locations,random,now,used);
      npcs[nextId]=replacement;world.npcPositions[nextId]=replacement.location;
      npc.replacementDueAt=null; npc.memorialized=true; // dead profile remains for relationship/history references
      events.push({type:'npc_replacement',npcId:nextId,memorialId:memorial.id,text:`На место погибшего ${npc.name} в Зону пришёл новый сталкер — ${replacement.name}.`,at:now});
    }
  }
  for(const squad of world.npcSquads||[]){
    let living=squad.members.map(id=>npcs[id]).filter(n=>n&&n.alive);
    if(!['travelling','scavenging','returning','war_moving','holding_objective'].includes(squad.status)){
      const togetherAtBase=living.filter(n=>n.location===squad.location);
      for(const n of living.filter(n=>n.location!==squad.location)){n.squadId=null;}
      living=togetherAtBase;squad.members=living.map(n=>n.id);
    }
    squad.members=living.map(n=>n.id);
    if(!living.length){squad.status='disbanded';continue;}
    // Keep a squad together only when its members are actually in the same sector.
    const together=living.filter(n=>n.location===squad.location);
    if(squad.status==='travelling'&&now>=(squad.nextMoveAt||0)){
      const next=squad.route?.[Number(squad.routeIndex||0)+1];
      if(next){
        const from=squad.location;squad.routeIndex=(squad.routeIndex||0)+1;squad.location=next;
        for(const n of together){n.location=next;n.action='travel';n.behavior='squad_raid';n.duty='squad_expedition';n.history ||= [];n.history.push({action:'squad_travel',location:next,at:now});n.history=n.history.slice(-20);world.npcPositions[n.id]=next;}
        squad.nextMoveAt=now+2*60*1000+Math.floor(random()*2*60*1000);
        if(squad.routeIndex>=squad.route.length-1){squad.status='scavenging';squad.scavengeUntil=now+3*60*1000;squad.nextMoveAt=squad.scavengeUntil;}
        events.push({type:'npc_squad_travel',squadId:squad.id,from,location:next,text:`Отряд «${squad.name}» прошёл из ${from} в сектор ${next}.`,at:now});
      }
    } else if(squad.status==='scavenging'&&now>=(squad.scavengeUntil||0)){
      const found=2+Math.floor(random()*5);
      for(const n of together){n.supplies=clamp((n.supplies||0)+found,0,100);n.action='camp';n.behavior='scavenge';n.duty='supply_search';n.memory ||= [];n.memory.push({type:'found_supplies',amount:found,location:squad.location,at:now});n.memory=n.memory.slice(-30);}
      squad.status='returning';squad.route=(squad.route||[]).slice(0,(squad.routeIndex||0)+1).reverse();squad.routeIndex=0;squad.nextMoveAt=now+2*60*1000;
      events.push({type:'npc_squad_scavenge',squadId:squad.id,location:squad.location,text:`Отряд «${squad.name}» нашёл припасы в секторе ${squad.location} и собирается обратно.`,at:now});
    } else if(squad.status==='returning'&&now>=(squad.nextMoveAt||0)){
      const next=squad.route?.[Number(squad.routeIndex||0)+1];
      if(next){const from=squad.location;squad.routeIndex=(squad.routeIndex||0)+1;squad.location=next;for(const n of together){n.location=next;n.action='travel';n.behavior='squad_return';n.duty='return_to_base';world.npcPositions[n.id]=next;}squad.nextMoveAt=now+2*60*1000+Math.floor(random()*2*60*1000);
        if(squad.routeIndex>=squad.route.length-1){squad.status='camped';squad.lastReturnedAt=now;squad.route=[];squad.routeIndex=0;for(const n of together){n.action='camp';n.behavior='camp';n.duty='rest_at_base';n.nextDecisionAt=now+5*60*1000;}}
        events.push({type:'npc_squad_return',squadId:squad.id,from,location:next,text:`Отряд «${squad.name}» возвращается через сектор ${next}.`,at:now});}
      else {squad.status='camped';squad.route=[];}
    } else if(!squad.missionType&&(squad.status==='camped'||!squad.status)&&living.length>=2&&together.length>=2&&now-(squad.lastRaidAt||0)>=20*60*1000&&random()<.08){
      const origin=squad.location;const reachable=[];const queue=[[origin,[origin]]];const seen=new Set([origin]);
      while(queue.length){const [sector,path]=queue.shift();if(path.length>=2&&path.length<=4)reachable.push({sector,path});if(path.length>=4)continue;for(const next of TERRITORY_ADJACENCY[sector]||[]){if(!seen.has(next)){seen.add(next);queue.push([next,[...path,next]]);}}}
      const candidates=reachable.filter(x=>locations.has?locations.has(x.sector):[...locations].includes(x.sector));
      if(candidates.length){const target=pick(candidates,random);squad.route=target.path;squad.routeIndex=0;squad.status='travelling';squad.lastRaidAt=now;squad.returnLocation=origin;squad.nextMoveAt=now+2*60*1000;
        for(const n of together){n.action='travel';n.behavior='squad_raid';n.duty='squad_expedition';n.missionOrder=null;n.nextDecisionAt=now+60*60*1000;}
        events.push({type:'npc_squad_raid',squadId:squad.id,location:origin,target:target.sector,route:target.path,text:`Отряд «${squad.name}» выдвинулся из ${origin} в разведывательный рейд к сектору ${target.sector}.`,at:now});}
    }
    squad.size=living.length;
  }
  for(const ev of events){world.npcEvents ||= [];world.npcEvents.push(ev);}world.npcEvents=(world.npcEvents||[]).slice(-100);
  syncNpcGroups(world);
  return events;
}
function makeReplacement(id,locations,random,now,used){
  const name=generatedName(id,used);
  const factions=['Одиночки','Долг','Свобода','Бандиты','Наёмники','Чистое небо'];
  const roles=['сталкер','разведчик','механик','проводник','охотник'];
  const locs=[...locations];const location=pick(locs,random)||'cordon';
  return {id,name,faction:pick(factions,random),role:pick(roles,random),location,destination:null,action:'rest',mood:'насторожен',health:100,morale:60,supplies:55,alive:true,lastActionAt:now,relationships:{},inventory:[],history:[],generated:true,icon:'◉',personality:'новичок',dialogueDay:-1,dialogueVersion:0,dialogueHistory:[],biography:`${name} недавно пришёл в Зону. Пока о нём известно немного; ${pick(BIOGRAPHY_BITS,random)}`,friends:[],rivals:[],squadId:null,memory:[],replacementDueAt:null};
}
module.exports={initSouls,syncNpcGroups,tickSouls};
