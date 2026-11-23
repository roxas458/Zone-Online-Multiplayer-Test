'use strict';

const { TERRITORY_ADJACENCY, FACTION_HOME } = require('./territories');
const { FACTIONS, TERRITORY_START, createFactionDiplomacy } = require('../shared/game-data');
const DEFAULT_DIPLOMACY = createFactionDiplomacy([...FACTIONS]);
const { SECTOR_COORDS } = require('./proximity');

const FACTION_OBJECTIVES = Object.freeze({
  'Одиночки': { title: 'Свободные маршруты', description: 'Сохранять безопасные стоянки и открытые переходы для независимых сталкеров.', priorities: ['checkpoint','supply','trade','base'], posture: 'defensive' },
  'Долг': { title: 'Защита периметра', description: 'Укреплять блокпосты, удерживать опасные участки и ограничивать распространение угроз.', priorities: ['checkpoint','base','industry','supply'], posture: 'defensive' },
  'Свобода': { title: 'Свободная Зона', description: 'Расширять сеть наблюдательных пунктов и сохранять доступ к исследовательским районам.', priorities: ['relay','research','anomaly','checkpoint'], posture: 'expansionist' },
  'Бандиты': { title: 'Контроль путей и торговли', description: 'Получать доход от складов, торговых точек и важных транспортных переходов.', priorities: ['trade','supply','industry','checkpoint'], posture: 'opportunistic' },
  'Военные': { title: 'Периметр и блокпосты', description: 'Удерживать контрольные пункты и стратегические подходы к закрытым районам.', priorities: ['checkpoint','relay','base','industry'], posture: 'defensive' },
  'Учёные': { title: 'Исследование Зоны', description: 'Обеспечивать доступ к лабораториям, исследовательским станциям и аномальным полям.', priorities: ['research','anomaly','relay','supply'], posture: 'research' },
  'Наёмники': { title: 'Контрактные позиции', description: 'Закрепляться на объектах, которые обеспечивают ресурсы и выгодные контракты.', priorities: ['industry','supply','research','trade'], posture: 'contract' },
  'Монолит': { title: 'Северный рубеж', description: 'Удерживать северные позиции, ретрансляторы и подходы к закрытым территориям.', priorities: ['relay','base','checkpoint','research'], posture: 'expansionist' },
  'Чистое небо': { title: 'Изучение болот и аномалий', description: 'Сохранять исследовательские лагеря и контролировать аномальные районы.', priorities: ['anomaly','research','supply','relay'], posture: 'research' },
  'Ренегаты': { title: 'Территории на окраинах', description: 'Удерживать удалённые стоянки, склады и обходные маршруты.', priorities: ['supply','trade','checkpoint','base'], posture: 'opportunistic' }
});

const POINT_DEFS = Object.freeze({
  chaes: [['Северный периметр','checkpoint',1],['Ретранслятор «Монолит»','relay',2],['Станция наблюдения','base',1],['Северная станция связи','relay',2],['Старый КПП у тоннеля','checkpoint',2],['Технический двор','industry',2],['Полевой склад Монолита','supply',2],['Зона каменных образований','anomaly',3],['Смотровая площадка','research',1],['Заброшенный пост охраны','base',1]],
  zaton: [['Скадовск','base',3],['Портовые склады','trade',3],['Аномальное плато','anomaly',2],['Лесничество','base',2],['Старая баржа','supply',2],['Станция переработки','industry',3],['Рыбацкий причал','trade',2],['Сигнальная вышка','relay',2],['Топкое урочище','anomaly',3],['Дорожный пост','checkpoint',2]],
  pripyat: [['Центральная площадь','checkpoint',2],['Подземный переход','supply',2],['Городская лаборатория','research',3],['Гостиница «Полесье»','base',2],['Станция скорой помощи','supply',2],['Школьный двор','checkpoint',1],['Промышленный архив','research',3],['Радиоузел города','relay',2],['Склад коммунальной техники','industry',2],['Площадка эвакуации','trade',1]],
  jupiter: [['Завод «Юпитер»','industry',3],['Станция обслуживания','supply',2],['Исследовательский пост','research',3],['Железнодорожное депо','industry',3],['Склад деталей','supply',2],['Пост охраны проходной','checkpoint',2],['Лабораторный корпус № 2','research',3],['Старая котельная','base',1],['Радиомачта завода','relay',2],['Аномальный двор','anomaly',3]],
  limansk: [['Старый блокпост','checkpoint',2],['Городской ретранслятор','relay',2],['Полевой склад','supply',2],['Городская больница','supply',2],['Восточная проходная','checkpoint',2],['Полевой штаб на площади','base',2],['Трамвайное депо','industry',2],['Узел городской связи','relay',2],['Лабораторный архив','research',2],['Аномальная улица','anomaly',3]],
  red: [['Рыжий лес · кордон','checkpoint',2],['Лесная станция','base',2],['Аномальный овраг','anomaly',3],['Северная просека','checkpoint',2],['Лесной кордон','base',2],['Старая пилорама','industry',2],['Полевой склад охотников','supply',2],['Метеорологический пункт','research',2],['Радиовышка','relay',2],['Аномальная поляна','anomaly',3]],
  radar: [['Радарный комплекс','relay',3],['Северный лагерь','base',2],['Технический узел','industry',2],['Южный наблюдательный пункт','checkpoint',2],['Станция ретрансляции','relay',3],['Технический ангар','industry',2],['Подземный склад','supply',2],['Северный командный пост','base',3],['Научный контейнер','research',2],['Поле пространственных аномалий','anomaly',3]],
  army: [['Армейские склады','supply',3],['Старая казарма','base',2],['Контрольный пост','checkpoint',2],['Склад инженерного имущества','supply',3],['Ремонтная мастерская','industry',2],['Южная наблюдательная вышка','checkpoint',2],['Радиорубка гарнизона','relay',2],['Полевой медпункт','base',2],['Старая лаборатория','research',2],['Аномальный овраг','anomaly',2]],
  wild: [['Дикий блокпост','checkpoint',2],['Заброшенный цех','industry',2],['Полевой лагерь','base',1],['Северный гараж','industry',2],['Полевой медпункт','supply',2],['Смотровой пост','checkpoint',2],['Заброшенная станция','base',2],['Радиорелейный узел','relay',2],['Архив ремонтной бригады','research',1],['Аномальный двор','anomaly',2]],
  bar: [['Бар «100 Рентген»','trade',3],['База Долга','base',3],['Северный КПП','checkpoint',2],['Южная стоянка караванов','trade',3],['Ремонтный двор','industry',2],['Склад продовольствия','supply',3],['КПП Ростка','checkpoint',2],['Радиостанция базы','relay',2],['Полевой госпиталь','base',2],['Архив Долга','research',2]],
  yantar: [['Научный бункер','research',3],['Озёрная станция','research',2],['Аномальный берег','anomaly',2],['Западный научный корпус','research',3],['Пункт отбора проб','research',2],['Склад экспедиции','supply',2],['Станция связи учёных','relay',2],['Полевой КПП','checkpoint',2],['Технический ангар','industry',2],['Аномальная низина','anomaly',3]],
  dump: [['Ангар','base',3],['Кладбище техники','industry',3],['Торговая стоянка','trade',2],['Северная стоянка','base',2],['Склад металлолома','industry',3],['Рынок у дороги','trade',3],['Южный КПП','checkpoint',2],['Точка сбора припасов','supply',2],['Радиомачта свалки','relay',1],['Аномальная яма','anomaly',2]],
  agro: [['Военный блокпост','checkpoint',3],['Агропром · склады','supply',2],['Административный корпус','base',2],['Северный корпус','base',2],['Медицинский блок','supply',2],['Ремонтная мастерская','industry',2],['Радиорубка гарнизона','relay',2],['Восточный КПП','checkpoint',3],['Исследовательский архив','research',2],['Аномальный двор','anomaly',2]],
  dark: [['Тёмная долина · завод','industry',3],['Старая ферма','base',2],['Подземный склад','supply',2],['Северная ферма','base',2],['Промышленный склад','industry',3],['Торговый привал','trade',2],['Радиоузел завода','relay',2],['Пост у тоннеля','checkpoint',2],['Запасной склад','supply',2],['Аномальный цех','anomaly',3]],
  cordon: [['Деревня новичков','base',3],['Южный блокпост','checkpoint',3],['Склад у дороги','supply',2],['Старая автобусная остановка','trade',1],['Полевой медпункт','supply',2],['Северная вышка','checkpoint',2],['Заброшенный гараж','industry',2],['Радиопост новичков','relay',1],['Старая ферма','base',2],['Аномальная низина','anomaly',2]],
  swamps: [['Затопленная ферма','base',2],['Научный лагерь','research',2],['Болотная аномалия','anomaly',3],['Северный островок','base',2],['Лодочный склад','supply',2],['Старая радиомачта','relay',2],['Полевой пост наблюдения','checkpoint',2],['Затопленная лаборатория','research',2],['Болотная мастерская','industry',1],['Аномальный омут','anomaly',3]],
  darkhollow: [['Заброшенный форпост','base',2],['Скрытый склад','supply',2],['Старая торговая точка','trade',1],['Старая лесопилка','industry',2],['Тропа у карьера','checkpoint',1],['Радиомачта окраины','relay',2],['Полевой пункт снабжения','supply',2],['Заброшенная метеостанция','research',2],['Охотничий привал','base',1],['Аномальная низина','anomaly',3]]
});

const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const slug=s=>String(s).toLowerCase().replace(/[^a-zа-я0-9]+/gi,'_');

function routeBetween(from,to,maxHops=5){
  if(from===to)return [from];
  const queue=[[from,[from]]],seen=new Set([from]);
  while(queue.length){const [at,path]=queue.shift();if(path.length>maxHops)continue;for(const next of TERRITORY_ADJACENCY[at]||[]){if(seen.has(next))continue;const nextPath=[...path,next];if(next===to)return nextPath;seen.add(next);queue.push([next,nextPath]);}}
  return null;
}

const COMMAND_HEADQUARTERS = Object.freeze({
  'Одиночки':'cordon','Долг':'bar','Свобода':'jupiter','Бандиты':'dump','Военные':'agro',
  'Учёные':'yantar','Наёмники':'limansk','Монолит':'radar','Чистое небо':'swamps','Ренегаты':'darkhollow'
});
const COMMAND_LEADER_IDS = Object.freeze({
  'Одиночки':'wolf','Долг':'voronin','Свобода':'lukash','Бандиты':'sultan','Военные':'kravtsov',
  'Учёные':'prof','Наёмники':'wolfhound','Монолит':'charon','Чистое небо':'lebedev','Ренегаты':'renegade_leader'
});
const COMMAND_INTERVAL=3*60*1000;
const SQUAD_DISPATCH_COOLDOWN=4*60*1000;

function factionCommandState(world,faction,now){
  world.factionCommand ||= {};
  const existing=world.factionCommand[faction]||{};
  const leaderId=COMMAND_LEADER_IDS[faction]||existing.leaderId||null;
  const leader=leaderId?world.npcState?.[leaderId]:null;
  world.factionCommand[faction]={...existing,faction,headquarters:existing.headquarters||COMMAND_HEADQUARTERS[faction]||FACTION_HOME[faction]?.[0]||'cordon',leaderId:leader?.id||leaderId,leaderName:leader?.name||existing.leaderName||`Штаб группировки «${faction}»`,directive:existing.directive||'patrol',directiveText:existing.directiveText||'Поддерживать присутствие на маршрутах и наблюдательных точках.',targetPointId:existing.targetPointId||null,issuedAt:Number(existing.issuedAt)||now,nextDecisionAt:Number(existing.nextDecisionAt)||0,ordersIssued:Number(existing.ordersIssued)||0};
  return world.factionCommand[faction];
}

function evaluateFactionCommand(world,faction,now){
  const command=factionCommandState(world,faction,now),goal=FACTION_OBJECTIVES[faction]||FACTION_OBJECTIVES['Одиночки'],resources=world.factionResources[faction]||{},points=Object.values(world.keyPoints||{}),owned=points.filter(p=>p.owner===faction);
  const pressured=owned.filter(p=>Number(p.captureProgress)>0).sort((a,b)=>b.captureProgress-a.captureProgress)[0];
  let directive='patrol',text='Патрулировать подконтрольные маршруты и поддерживать связь между стоянками.',target=null,hqRelocated=false;
  const hqSecure=points.some(p=>p.location===command.headquarters&&p.owner===faction);
  if(!hqSecure){const byLocation={};for(const point of owned)byLocation[point.location]=(byLocation[point.location]||0)+1;const replacement=Object.entries(byLocation).sort((a,b)=>b[1]-a[1])[0]?.[0];if(replacement&&replacement!==command.headquarters){const old=command.headquarters;command.previousHeadquarters=old;command.headquarters=replacement;directive='guard';target=owned.filter(p=>p.location===replacement).sort((a,b)=>b.production-a.production)[0]||null;text=`Штаб в секторе ${old} потерял опорные объекты. Командование перенесено в ${replacement}; усилить новый узел.`;hqRelocated=true;}}
  const requests=(world.factionCommandRequests?.[faction]||[]).filter(r=>Number(r.expiresAt)>now).sort((a,b)=>(Number(b.trust)||0)-(Number(a.trust)||0)||b.at-a.at);
  const request=requests.find(r=>points.some(p=>p.id===r.pointId&&p.owner!==faction&&!p.contestedBySquadId));
  const requested=request?points.find(p=>p.id===request.pointId):null;
  if(hqRelocated){}
  else if(pressured){directive='guard';text=`Усилить охрану объекта «${pressured.name}»: зафиксировано давление на периметр.`;target=pressured;}
  else if(requested){directive='capture';text=`По запросу сталкера ${request.playerName} штаб рассматривает операцию за объект «${requested.name}». Уровень доверия: ${request.trust}.`;target=requested;request.acceptedAt=now;}
  else if(goal.posture==='expansionist'){const hostile=points.filter(p=>p.owner!==faction&&!p.contestedBySquadId&&Number(world.diplomacy?.[faction]?.[p.owner]??DEFAULT_DIPLOMACY[faction]?.[p.owner]??0)<=-15&&routeBetween(command.headquarters,p.location,5)).sort((a,b)=>pointScore(b,faction)-pointScore(a,faction))[0];if(hostile){directive='capture';text=`Наступление: подготовить операцию за объект «${hostile.name}» в секторе ${hostile.location}.`;target=hostile;}else if(Number(resources.supplies)<45||owned.filter(p=>p.type==='supply').length<2){directive='supply';text='Восстановить запасы и обеспечить бесперебойное снабжение подразделений.';target=owned.filter(p=>p.type==='supply').sort((a,b)=>b.production-a.production)[0]||null;}else if(Number(resources.intel)<35){directive='recon';text='Проверить соседние районы и обновить разведывательную картину.';target=points.filter(p=>p.owner!==faction&&['research','relay','anomaly'].includes(p.type)).sort((a,b)=>pointScore(b,faction)-pointScore(a,faction))[0]||null;}}
  else if(Number(resources.supplies)<45||owned.filter(p=>p.type==='supply').length<2){directive='supply';text='Восстановить запасы и обеспечить бесперебойное снабжение подразделений.';target=owned.filter(p=>p.type==='supply').sort((a,b)=>b.production-a.production)[0]||null;}
  else if(Number(resources.intel)<35){directive='recon';text='Проверить соседние районы и обновить разведывательную картину.';target=points.filter(p=>p.owner!==faction&&['research','relay','anomaly'].includes(p.type)).sort((a,b)=>pointScore(b,faction)-pointScore(a,faction))[0]||null;}
  else {const hostile=points.filter(p=>p.owner!==faction&&!p.contestedBySquadId&&Number(world.diplomacy?.[faction]?.[p.owner]??DEFAULT_DIPLOMACY[faction]?.[p.owner]??0)<=-15&&routeBetween(command.headquarters,p.location,5)).sort((a,b)=>pointScore(b,faction)-pointScore(a,faction))[0];if(hostile){directive='capture';text=`Подготовить операцию за объект «${hostile.name}» в секторе ${hostile.location}.`;target=hostile;}}
  command.directive=directive;command.directiveText=text;command.targetPointId=target?.id||null;command.issuedAt=now;command.nextDecisionAt=now+COMMAND_INTERVAL;command.ordersIssued++;
  const squads=(world.npcSquads||[]).filter(s=>s.faction===faction&&s.status==='camped'&&!s.missionType);
  for(const [index,squad] of squads.entries()){
    let type=directive;
    if(directive==='capture'&&index>0)type=['recon','patrol','supply'][index%3];
    if(directive==='guard'&&index>0)type=index%2?'patrol':'supply';
    squad.commandOrder={type,targetPointId:type==='capture'?target?.id:type==='guard'?target?.id:null,targetLocation:target?.location||command.headquarters,issuedAt:now,expiresAt:now+COMMAND_INTERVAL*2,commander:command.leaderName};
    squad.commandRole=type;
    const members=(squad.members||[]).map(id=>world.npcState?.[id]).filter(n=>n&&n.alive!==false&&n.location===squad.location);
    for(const npc of members){npc.commandRole=type;npc.commander=command.leaderName;if(type==='guard'){npc.duty='base_guard';npc.behavior='guard';npc.guardPost=true;}else if(type==='recon'){npc.duty='recon_assignment';npc.behavior='recon';}else if(type==='supply'){npc.duty='supply_assignment';npc.behavior='supply_run';}else if(type==='capture'){npc.duty='faction_assignment';}else{npc.duty='patrol_assignment';npc.behavior='patrol';}}
  }
  return command;
}

function tickFactionCommand(world,now,events){
  for(const faction of FACTIONS){const command=factionCommandState(world,faction,now);if(now>=command.nextDecisionAt){const previous=command.directive;const next=evaluateFactionCommand(world,faction,now);events.push({type:'faction_command_decision',faction,leader:next.leaderName,directive:next.directive,targetPointId:next.targetPointId,text:`${next.leaderName}: ${next.directiveText}`,at:now});if(previous!==next.directive)next.lastDirectiveChangeAt=now;}}
}

function initFactionWar(world, now=Date.now()){
  world.territoryOwners ||= Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner]));
  world.territoryControl ||= Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.control]));
  world.keyPoints ||= {};
  world.npcPositions ||= {};
  for(const [location,defs] of Object.entries(POINT_DEFS)){
    for(let i=0;i<defs.length;i++){
      const [name,type,production]=defs[i],id=`${location}_${i+1}`;
      const owner=world.territoryOwners[location]||TERRITORY_START[location]?.owner||'Одиночки';
      const existing=world.keyPoints[id];
      world.keyPoints[id]={id,location,name,type,production,owner:existing?.owner||owner,control:clamp(existing?.control??(world.territoryControl[location]??60),0,100),captureProgress:clamp(existing?.captureProgress??0,0,100),garrison:Math.max(0,Math.floor(Number(existing?.garrison)||0)),contestedBySquadId:existing?.contestedBySquadId||null,updatedAt:Number(existing?.updatedAt)||now};
    }
  }
  world.factionObjectives ||= {};
  for(const faction of FACTIONS){
    const def=FACTION_OBJECTIVES[faction]||{title:'Удержание позиций',description:'Сохранять влияние и ресурсы.',priorities:['base','supply'],posture:'balanced'};
    world.factionObjectives[faction] ||= {...def,faction,updatedAt:now};
  }
  world.factionResources ||= {};
  for(const faction of FACTIONS)world.factionResources[faction] ||= {supplies:100,materials:60,intel:30,artifacts:0};
  world.factionCommand ||= {};
  for(const faction of FACTIONS)factionCommandState(world,faction,now);
  world.factionWarHistory ||= [];
  world.factionWarLastDispatchAt ||= 0;
  // Retire legacy sector-wide assault orders from pre-4.51 saves. Their target
  // model conflicts with per-object control and must not continue moving NPCs.
  for(const order of world.frontlineOrders||[]){
    if(order.status==='active'){order.status='superseded';order.resolvedAt=now;order.resolution='migrated_to_key_points';}
  }
  world.territoryOrders ||= {};
  for(const [location,order] of Object.entries(world.territoryOrders)){
    if(order?.type==='attack'||order?.type==='assault')delete world.territoryOrders[location];
  }
  for(const npc of Object.values(world.npcState||{})){
    if(npc?.missionOrder&&['attack','assault'].includes(npc.missionOrder.type)){
      npc.missionOrder=null;npc.action='guard';npc.behavior='guard';npc.duty='base_guard';npc.guardPost=true;
    }
  }
  world.factionWarVersion=2;
  const liveTargets=new Set((world.npcSquads||[]).filter(s=>s.missionType==='faction_war'&&['war_moving','holding_objective'].includes(s.status)).map(s=>s.targetPointId));
  for(const point of Object.values(world.keyPoints))if(point.contestedBySquadId&&!liveTargets.has(point.id))point.contestedBySquadId=null;
  aggregateTerritories(world);
  return world;
}

function aggregateTerritories(world){
  const byLocation={};
  for(const point of Object.values(world.keyPoints||{}))(byLocation[point.location] ||= []).push(point);
  for(const [location,points] of Object.entries(byLocation)){
    const counts={};for(const point of points)counts[point.owner]=(counts[point.owner]||0)+1;
    const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    if(sorted[0]&&sorted[0][1]>points.length/2)world.territoryOwners[location]=sorted[0][0];
    world.territoryControl[location]=Math.round(points.reduce((sum,point)=>sum+clamp(point.control,0,100),0)/Math.max(1,points.length));
  }
}

function pointScore(point,faction){
  const goal=FACTION_OBJECTIVES[faction]||FACTION_OBJECTIVES['Одиночки'];
  const priority=goal.priorities.indexOf(point.type);
  return (priority<0?0:50-priority*9)+(point.owner===faction?-100:0)+(point.captureProgress>0?point.captureProgress*.15:0)+point.production*2;
}

function dispatchFactionSquads(world,now,random){
  const events=[],squads=(world.npcSquads||[]).filter(s=>s&&s.status==='camped'&&!s.missionType&&now-(Number(s.lastFactionMissionAt)||0)>=SQUAD_DISPATCH_COOLDOWN);
  for(const squad of squads){
    const members=(squad.members||[]).map(id=>world.npcState?.[id]).filter(n=>n&&n.alive!==false&&n.location===squad.location);
    const dispatchChance=FACTION_OBJECTIVES[squad.faction]?.posture==='expansionist'?.58:.38;
    if(members.length<2||random()>dispatchChance)continue;
    const faction=squad.faction,goal=FACTION_OBJECTIVES[faction];if(!goal)continue;
    // Only NPCs physically present at the squad's staging sector are deployed.
    const deployedIds=new Set(members.map(n=>n.id));
    for(const id of squad.members||[]){if(!deployedIds.has(id)){const detached=world.npcState?.[id];if(detached?.squadId===squad.id)detached.squadId=null;}}
    squad.members=members.map(n=>n.id);
    const playerLocked=new Set((world.warOperations||[]).filter(op=>op.status==='active').map(op=>op.pointId));
    const candidates=Object.values(world.keyPoints||{}).filter(point=>point.owner!==faction&&!point.contestedBySquadId&&!playerLocked.has(point.id)&&routeBetween(squad.location,point.location,5));
    const eligible=candidates.filter(point=>{
      if(point.owner===faction)return false;
      const relation=Number(world.diplomacy?.[faction]?.[point.owner]??DEFAULT_DIPLOMACY[faction]?.[point.owner]??0);
      return relation<=-15;
    });
    if(!eligible.length)continue;
    const order=squad.commandOrder;
    eligible.sort((a,b)=>((b.id===order?.targetPointId?500:0)+pointScore(b,faction))-((a.id===order?.targetPointId?500:0)+pointScore(a,faction)));

    const shortlist=eligible.slice(0,Math.min(4,eligible.length));
    const target=shortlist[Math.floor(random()*shortlist.length)],route=routeBetween(squad.location,target.location,5);
    if(!route)continue;
    squad.missionType='faction_war';squad.targetPointId=target.id;target.contestedBySquadId=squad.id;squad.targetLocation=target.location;squad.missionFaction=faction;squad.missionStartedAt=now;squad.route=route;squad.routeIndex=0;squad.lastFactionMissionAt=now;
    squad.status=route.length===1?'holding_objective':'war_moving';squad.nextMoveAt=now+(route.length===1?0:75_000+Math.floor(random()*45_000));
    for(const npc of members){npc.missionOrder={type:'secure_key_point',target:target.location,pointId:target.id};npc.action=route.length===1?'guard':'travel';npc.behavior=route.length===1?'objective_guard':'faction_march';npc.duty=route.length===1?'objective_guard':'faction_assignment';npc.guardPost=false;}
    events.push({type:'faction_squad_deployed',location:squad.location,target:target.location,pointId:target.id,faction,text:`Отряд «${squad.name}» группировки «${faction}» получил задачу: ${route.length===1?'укрепить объект':'выдвинуться к объекту'} «${target.name}».`,at:now});
  }
  return events;
}

function finishFactionMission(world,squad,now,events,success){
  const members=(squad.members||[]).map(id=>world.npcState?.[id]).filter(n=>n&&n.alive!==false);
  squad.missionCompletedAt=now;squad.missionResult=success?'secured':'failed';
  if(success)events.push({type:'faction_objective_secured',location:squad.targetLocation,pointId:squad.targetPointId,faction:squad.faction,text:`Отряд «${squad.name}» закрепился на объекте группировки «${squad.faction}».`,at:now});
  const reverse=(squad.route||[]).slice(0,(Number(squad.routeIndex)||0)+1).reverse();
  const point=world.keyPoints?.[squad.targetPointId];if(point?.contestedBySquadId===squad.id)point.contestedBySquadId=null;
  squad.missionType=null;squad.targetPointId=null;squad.targetLocation=null;squad.missionFaction=null;
  if(reverse.length>1){squad.route=reverse;squad.routeIndex=0;squad.status='returning';squad.nextMoveAt=now+90_000;}
  else {squad.route=[];squad.routeIndex=0;squad.status='camped';squad.location=members[0]?.location||squad.location;}
  for(const npc of members){npc.missionOrder=null;npc.action=reverse.length>1?'travel':'guard';npc.behavior=reverse.length>1?'squad_return':'guard';npc.duty=reverse.length>1?'return_to_base':'base_guard';npc.guardPost=reverse.length<=1;}
}

function tickFactionWar(world,now=Date.now(),random=Math.random){
  initFactionWar(world,now);
  const events=[];
  tickFactionCommand(world,now,events);
  // Advance strategic squad routes independently from ordinary NPC roaming.
  for(const squad of world.npcSquads||[]){
    // Both outbound and return legs must advance. Previously returning squads
    // were never ticked and stayed locked forever after their first mission.
    if(['war_moving','returning'].includes(squad.status)&&now>=(Number(squad.nextMoveAt)||0)){
      const returning=squad.status==='returning';
      const next=squad.route?.[Number(squad.routeIndex||0)+1];
      if(next){const from=squad.location;squad.routeIndex=(Number(squad.routeIndex)||0)+1;squad.location=next;
        for(const [memberIndex,id] of (squad.members||[]).entries()){const npc=world.npcState?.[id];if(!npc||npc.alive===false)continue;const center=SECTOR_COORDS[next]||SECTOR_COORDS.cordon;const angle=memberIndex*2.399963;const radius=8+(memberIndex%4)*5;npc.x=center[0]+Math.cos(angle)*radius;npc.y=center[1]+Math.sin(angle)*radius;npc.location=next;npc.action='travel';npc.behavior=returning?'squad_return':'faction_march';npc.duty=returning?'return_to_base':'faction_assignment';npc.history||=[];npc.history.push({action:returning?'squad_return':'faction_march',location:next,at:now});npc.history=npc.history.slice(-20);world.npcPositions[id]=next;}
        if(squad.routeIndex>=squad.route.length-1){
          if(returning){squad.status='camped';squad.route=[];squad.routeIndex=0;squad.nextMoveAt=0;squad.lastFactionMissionAt=now;for(const id of squad.members||[]){const npc=world.npcState?.[id];if(npc&&npc.alive!==false){npc.action='guard';npc.behavior='guard';npc.duty='base_guard';npc.guardPost=true;}}}
          else {squad.status='holding_objective';squad.objectiveStartedAt=now;squad.nextCaptureAt=now;for(const id of squad.members||[]){const npc=world.npcState?.[id];if(npc&&npc.alive!==false){npc.action='guard';npc.behavior='objective_guard';npc.duty='objective_guard';}}}
        } else squad.nextMoveAt=now+90_000+Math.floor(random()*45_000);
        events.push({type:returning?'faction_squad_return_route':'faction_squad_route',location:next,from,faction:squad.faction,squadId:squad.id,text:returning?`Отряд «${squad.name}» возвращается в сектор ${next}.`:`Отряд «${squad.name}» прибыл в сектор ${next} по стратегическому маршруту.`,at:now});
      } else if(returning){squad.status='camped';squad.route=[];squad.routeIndex=0;squad.nextMoveAt=0;squad.lastFactionMissionAt=now;}
    }
    if(squad.status==='holding_objective'&&now>=(Number(squad.nextCaptureAt)||0)){
      const point=world.keyPoints?.[squad.targetPointId];
      if(!point||point.owner===squad.faction){finishFactionMission(world,squad,now,events,!!point);continue;}
      const members=(squad.members||[]).map(id=>world.npcState?.[id]).filter(n=>n&&n.alive!==false&&n.location===squad.location);
      const defenders=Object.values(world.npcState||{}).filter(n=>n.alive!==false&&n.location===point.location&&n.faction===point.owner&&n.guardPost).length;
      const effectiveDefenders=Math.min(defenders,8);
      const gain=clamp(10+members.length*5-effectiveDefenders*1.25,6,30);
      point.captureProgress=clamp(point.captureProgress+gain,0,100);point.control=clamp(100-point.captureProgress,0,100);point.updatedAt=now;squad.nextCaptureAt=now+30_000;
      if(point.captureProgress>=100){const previous=point.owner;point.owner=squad.faction;point.control=55;point.captureProgress=0;point.garrison=members.length;point.updatedAt=now;
        aggregateTerritories(world);
        const resource=world.factionResources[squad.faction];resource.supplies=clamp(resource.supplies+point.production*4,0,10000);resource.materials=clamp(resource.materials+(point.type==='industry'?point.production*5:point.production*2),0,10000);if(point.type==='research'||point.type==='anomaly')resource.intel=clamp(resource.intel+point.production*3,0,10000);
        world.factionWarHistory.unshift({id:`capture_${point.id}_${now}`,pointId:point.id,location:point.location,name:point.name,from:previous,to:squad.faction,at:now});world.factionWarHistory=world.factionWarHistory.slice(0,60);
        events.push({type:'key_point_captured',location:point.location,pointId:point.id,owner:squad.faction,previousOwner:previous,text:`Объект «${point.name}» в секторе ${point.location} перешёл от группировки «${previous}» к «${squad.faction}».`,at:now});
        finishFactionMission(world,squad,now,events,true);
      }
    }
  }
  if(now-(Number(world.factionWarLastDispatchAt)||0)>=60_000){events.push(...dispatchFactionSquads(world,now,random));world.factionWarLastDispatchAt=now;}
  // Every controlled point contributes a small, capped flow of strategic resources.
  if(now-(Number(world.factionResourceTickAt)||0)>=5*60_000){
    for(const point of Object.values(world.keyPoints||{})){const r=world.factionResources[point.owner];if(!r)continue;r.supplies=clamp(r.supplies+point.production,0,10000);if(point.type==='industry')r.materials=clamp(r.materials+point.production,0,10000);if(['research','anomaly','relay'].includes(point.type))r.intel=clamp(r.intel+Math.max(1,Math.floor(point.production/2)),0,10000);}
    for(const squad of world.npcSquads||[]){const order=squad.commandOrder;if(!order||Number(order.expiresAt)<now)continue;const r=world.factionResources[squad.faction];if(!r)continue;if(order.type==='supply')r.supplies=clamp(r.supplies+3,0,10000);else if(order.type==='recon')r.intel=clamp(r.intel+2,0,10000);else if(order.type==='guard'){const point=world.keyPoints?.[order.targetPointId];if(point)point.garrison=clamp(point.garrison+1,0,999);}}
    world.factionResourceTickAt=now;
  }
  for(const ev of events){world.npcEvents||=[];world.npcEvents.push(ev);}world.npcEvents=(world.npcEvents||[]).slice(-120);
  world.npcPositions=Object.fromEntries(Object.values(world.npcState||{}).filter(n=>n.alive!==false).map(n=>[n.id,n.location]));
  return events;
}

module.exports={FACTION_OBJECTIVES,POINT_DEFS,COMMAND_HEADQUARTERS,COMMAND_LEADER_IDS,initFactionWar,tickFactionWar,tickFactionCommand,evaluateFactionCommand,aggregateTerritories,routeBetween};
