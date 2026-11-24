// Lightweight persistent simulation for mutant packs, faction bases, clans and local markets.
const crypto=require('crypto');
const { SECTOR_COORDS } = require('./proximity');
const { TERRITORY_ADJACENCY } = require('./territories');
const { resolveSectorAtPosition } = require('./sector-position');
const SPECIES=['плоть','псевдособака','кабан','снорк','контролёр','кровосос','тушкан','зомбированный сталкер'];
const TARGET_MUTANT_PACKS=54;
const ZONES=['cordon','dump','bar','agro','dark','yantar','army','red','pripyat','zaton','jupiter','radar','wild','darkhollow','limansk','swamps'];
function initEcosystem(world){
  world.ecosystem ||= {mutantPacks:[],anomalies:[],bases:{},markets:{},clans:{},events:[],revision:1};
  const e=world.ecosystem; e.anomalies ||= []; e.mutantPacks ||= []; e.bases ||= {}; e.markets ||= {}; e.clans ||= {}; e.events ||= []; e.revision ||= 1;
  if(!e.mutantPacks.length){for(let i=0;i<TARGET_MUTANT_PACKS;i++)e.mutantPacks.push({id:`pack_${i+1}`,species:SPECIES[i%SPECIES.length],location:ZONES[(i*7+1)%ZONES.length],count:2+(i*3)%7,aggression:25+(i*13)%76,health:100,updatedAt:Date.now()});}
  else if(e.mutantPacks.length<TARGET_MUTANT_PACKS){
    const existing=new Set(e.mutantPacks.map(p=>p.id));
    for(let i=1;e.mutantPacks.length<TARGET_MUTANT_PACKS;i++){
      const id=`pack_${i+1}`;if(existing.has(id))continue;
      e.mutantPacks.push({id,species:SPECIES[(i*5)%SPECIES.length],location:ZONES[(i*11+3)%ZONES.length],count:2+(i*7)%8,aggression:35+(i*17)%66,health:100,updatedAt:Date.now()});existing.add(id);
    }
  }
  for(const [index,pack] of e.mutantPacks.entries()){
    const center=SECTOR_COORDS[pack.location]||SECTOR_COORDS.cordon;
    if(!Number.isFinite(Number(pack.x))||!Number.isFinite(Number(pack.y))){const angle=((index*137.508)%360)*Math.PI/180,radius=24+(index%7)*11;pack.x=center[0]+Math.cos(angle)*radius;pack.y=center[1]+Math.sin(angle)*radius;}
  }
  const anomalyKinds=['Электра','Жарка','Воронка','Кисель','Трамплин','Карусель','Пузырь','Пси-поле','Газировка','Мясорубка','Пепелище','Комета'];
  if(!e.anomalies.length){for(let i=0;i<36;i++)e.anomalies.push({id:`anomaly_${i+1}`,kind:anomalyKinds[i%anomalyKinds.length],location:ZONES[(i*5+3)%ZONES.length],danger:35+(i*17)%66,stability:45+(i*11)%55,discovered:false,updatedAt:Date.now()});}
  else {const existing=new Set(e.anomalies.map(a=>a.id));for(let i=28;i<36;i++){const id=`anomaly_${i+1}`;if(existing.has(id))continue;e.anomalies.push({id,kind:anomalyKinds[i%anomalyKinds.length],location:ZONES[(i*5+3)%ZONES.length],danger:38+(i*13)%58,stability:42+(i*9)%56,discovered:false,updatedAt:Date.now()});existing.add(id);}}
  for(const [loc,owner] of Object.entries(world.territoryOwners||{}))e.bases[loc] ||= {location:loc,faction:owner,level:1,fortification:20,supplies:70,updatedAt:Date.now()};
  for(const loc of ZONES)e.markets[loc] ||= {location:loc,priceIndex:1,scarcity:0,updatedAt:Date.now()};
  return e;
}
function addEcoEvent(world,type,text,now=Date.now()){const e=initEcosystem(world);const event={id:crypto.randomUUID(),type,text,at:now};e.events.unshift(event);e.events=e.events.slice(0,40);e.revision++;return event;}
function tickEcosystem(world,random=Math.random,now=Date.now()){
 const e=initEcosystem(world),events=[];
 for(const pack of e.mutantPacks){if(!pack.travelTo&&random()<.04){const from=pack.location,neighbors=TERRITORY_ADJACENCY[from]||[],next=neighbors.length?neighbors[Math.floor(random()*neighbors.length)]:null;if(next){const center=SECTOR_COORDS[next]||SECTOR_COORDS.cordon;pack.travelTo=next;pack.destinationPoint={x:center[0],y:center[1]};events.push(addEcoEvent(world,'mutant_migration',`Следы группы «${pack.species}» замечены на маршруте ${from} → ${next}.`,now));}}
  if(random()<.12){pack.count=Math.max(1,Math.min(12,pack.count+(random()<.55?1:-1)));pack.aggression=Math.max(10,Math.min(100,pack.aggression+(random()<.5?5:-4)));}
  const nearbyNpcs=Object.values(world.npcState||{}).filter(n=>n.alive!==false&&n.location===pack.location&&now-(Number(n.lastMutantAttackAt)||0)>90000);
  const activeSquads=(world.npcSquads||[]).filter(s=>['travelling','scavenging','returning'].includes(s.status)&&s.location===pack.location);
  const squad=activeSquads.find(s=>s.members?.some(id=>nearbyNpcs.some(n=>n.id===id)));
  if(squad&&pack.count>0&&now-(Number(pack.lastAttackAt)||0)>90000&&now-(Number(squad.lastMutantEncounterAt)||0)>90000&&random()<.5){
    const members=squad.members.map(id=>(world.npcState||{})[id]).filter(n=>n&&n.alive!==false&&n.location===pack.location);
    if(members.length){
      const target=members[Math.floor(random()*members.length)];const damage=5+Math.floor(random()*11);target.lastMutantAttackAt=now;pack.lastAttackAt=now;squad.lastMutantEncounterAt=now;
      target.health=Math.max(0,(Number(target.health)||100)-damage);target.action='combat';target.behavior='mutant_encounter';target.mood='в бою';target.needs ||= {hunger:0,thirst:0,fatigue:0,stress:0};target.needs.stress=Math.min(100,(Number(target.needs.stress)||0)+12);
      const firepower=members.reduce((sum,n)=>sum+(n.alive!==false?(n.role==='охотник'?1.8:n.role==='разведчик'?1.35:1):0),0);
      const packDamage=Math.max(1,Math.round(firepower*(3+random()*5)));pack.health=Math.max(0,(Number(pack.health)||100)-packDamage);
      if(target.health<=0){target.alive=false;target.action='dead';target.deathCause=`погиб в схватке с мутантами (${pack.species})`;target.diedAt=now;target.combatDeaths=(Number(target.combatDeaths)||0)+1;}
      const injured=members.find(n=>n.alive!==false&&n.health<35);const medic=members.find(n=>n!==injured&&n.alive!==false&&(Number(n.supplies)||0)>=8);
      if(injured&&medic&&now-(Number(injured.lastRescueAt)||0)>180000){medic.supplies=Math.max(0,medic.supplies-8);injured.health=Math.min(100,injured.health+12);injured.lastRescueAt=now;injured.action='combat';events.push(addEcoEvent(world,'mutant_squad_rescue',`${medic.name} оказал помощь ${injured.name} во время нападения мутантов в ${pack.location}.`,now));}
      let defeated=false;if(pack.health<=0){pack.count=Math.max(0,pack.count-1);pack.health=pack.count?65:0;defeated=true;}
      const living=members.filter(n=>n.alive!==false);const critical=living.some(n=>n.health<18);let retreat=false;
      if(critical&&squad.status!=='returning'){
        const currentIndex=Math.max(0,Number(squad.routeIndex)||0);const route=(squad.route||[]).slice(0,currentIndex+1).reverse();
        if(route.length>1){squad.route=route;squad.routeIndex=0;squad.status='returning';squad.nextMoveAt=now+120000;squad.retreating=true;retreat=true;for(const n of living){n.action='retreat';n.behavior='squad_retreat';n.mood='отступает';}events.push(addEcoEvent(world,'mutant_squad_retreat',`Отряд «${squad.name}» отступает из ${pack.location} после тяжёлого столкновения с мутантами.`,now));}
      }
      events.push(addEcoEvent(world,'mutant_squad_encounter',`Отряд «${squad.name}» столкнулся с группой «${pack.species}» (${pack.count}): ${target.name} получил ${damage} урона.${defeated?' Сталкеры отбросили часть мутантов.':''}${retreat?' Отряд начал организованное отступление.':''}`,now));
      if(defeated&&pack.count===0)events.push(addEcoEvent(world,'mutant_pack_defeated',`Отряд «${squad.name}» уничтожил стаю «${pack.species}» в секторе ${pack.location}.`,now));
    }
  } else if(!squad&&nearbyNpcs.length&&pack.count>0&&now-(Number(pack.lastAttackAt)||0)>90000&&random()<.16){
    const target=nearbyNpcs[Math.floor(random()*nearbyNpcs.length)],damage=4+Math.floor(random()*9);target.lastMutantAttackAt=now;pack.lastAttackAt=now;target.health=Math.max(0,(Number(target.health)||100)-damage);target.action='combat';target.behavior='combat';target.mood='в бою';pack.count=Math.max(0,pack.count-(random()<.22?1:0));if(target.health<=0){target.alive=false;target.action='dead';target.deathCause=`погиб в схватке с мутантами (${pack.species})`;target.diedAt=now;target.combatDeaths=(Number(target.combatDeaths)||0)+1;}events.push(addEcoEvent(world,'mutant_npc_combat',`Группа «${pack.species}» атаковала ${target.name} в секторе ${pack.location}. ${target.alive===false?'Сталкер погиб.':`Здоровье сталкера: ${Math.round(target.health)}%.`}`,now));
  }
  pack.updatedAt=now;
 }
 // Anomaly fields are not fixed map decorations: unstable fields can drift between nearby expeditions.
 for(const anomaly of e.anomalies){
  if(random()<.025){const from=anomaly.location;anomaly.location=ZONES[Math.floor(random()*ZONES.length)];if(from!==anomaly.location)events.push(addEcoEvent(world,'anomaly_migration',`Полевые датчики зафиксировали смещение аномалии «${anomaly.kind}»: ${from} → ${anomaly.location}.`,now));}
  anomaly.stability=Math.max(10,Math.min(100,(Number(anomaly.stability)||50)+(random()<.5?-2:1)));
  anomaly.danger=Math.max(10,Math.min(100,Math.round((Number(anomaly.danger)||50)+(anomaly.stability<30?2:random()<.35?-1:0))));
  anomaly.updatedAt=now;
 }
 for(const market of Object.values(e.markets)){market.scarcity=Math.max(0,Math.min(100,market.scarcity+(random()<.5?3:-2)));market.priceIndex=Math.max(.65,Math.min(2.4,Number((.8+market.scarcity/100+random()*.18).toFixed(2))));market.updatedAt=now;}
 for(const base of Object.values(e.bases)){base.supplies=Math.max(0,base.supplies-(random()<.35?1:0));if(base.supplies<20&&random()<.08)events.push(addEcoEvent(world,'base_supply',`На базе «${base.faction}» в секторе ${base.location} заканчиваются припасы.`,now));}
 return events;
}
function tickMutantMovement(world,now=Date.now(),speed=3){
 const e=initEcosystem(world),updates=[];
 for(const [index,pack] of e.mutantPacks.entries()){
  if(!pack||Number(pack.count)<=0)continue;
  const center=SECTOR_COORDS[pack.location]||SECTOR_COORDS.cordon;
  if(!pack.destinationPoint&&now>=Number(pack.nextRoamAt||0)){
   const seed=(index*2654435761+Math.floor(now/30000)*2246822519)>>>0,angle=(seed%10000)/10000*Math.PI*2,radius=22+((seed>>>8)%82);
   pack.destinationPoint={x:Math.max(4,Math.min(996,center[0]+Math.cos(angle)*radius)),y:Math.max(4,Math.min(1996,center[1]+Math.sin(angle)*radius))};pack.nextRoamAt=now+18000+(seed%27000);
  }
  if(pack.destinationPoint){const dx=pack.destinationPoint.x-pack.x,dy=pack.destinationPoint.y-pack.y,d=Math.hypot(dx,dy),step=Math.min(d,Math.max(.5,speed));if(d<=step+.5){pack.x=pack.destinationPoint.x;pack.y=pack.destinationPoint.y;pack.destinationPoint=null;if(pack.travelTo){pack.location=pack.travelTo;pack.travelTo=null;}}else{pack.x+=dx/d*step;pack.y+=dy/d*step;}}
  const crossed=resolveSectorAtPosition(pack.location,{x:pack.x,y:pack.y});if(crossed!==pack.location)pack.location=crossed;
  pack.updatedAt=now;updates.push({id:pack.id,x:pack.x,y:pack.y,location:pack.location});
 }
 return updates;
}
function upgradeBase(world,location,faction,cost=500){const e=initEcosystem(world),b=e.bases[location];if(!b)return {ok:false,reason:'В этом секторе нет оборудованной базы.'};if(b.faction!==faction)return {ok:false,reason:'Улучшать можно только базу своей группировки.'};if(b.level>=5)return {ok:false,reason:'База уже достигла максимального уровня.'};b.level++;b.fortification=Math.min(100,b.fortification+15);b.supplies=Math.min(100,b.supplies+10);b.updatedAt=Date.now();addEcoEvent(world,'base_upgraded',`База «${faction}» в секторе ${location} улучшена до уровня ${b.level}.`);return {ok:true,base:b,cost};}
function joinClan(world,player,clanId){const e=initEcosystem(world),clan=e.clans[String(clanId||'')];if(!clan)return {ok:false,reason:'Клан не найден.'};if(clan.faction!==player.faction)return {ok:false,reason:'Вступить можно только в клан своей группировки.'};if(clan.members.some(m=>m.id===player.id))return {ok:false,reason:'Ты уже состоишь в этом клане.'};clan.members.push({id:player.id,name:player.name,rank:'боец',joinedAt:Date.now()});addEcoEvent(world,'clan_member_joined',`${player.name} вступил в клан «${clan.name}».`);return {ok:true,clan};}
function createClan(world,player,name){const e=initEcosystem(world);const clean=String(name||'').trim().replace(/[<>]/g,'').slice(0,24);if(clean.length<3)return {ok:false,reason:'Название клана должно содержать от 3 до 24 символов.'};if(Object.values(e.clans).some(c=>c.name.toLowerCase()===clean.toLowerCase()))return {ok:false,reason:'Такое название клана уже занято.'};const id=crypto.randomUUID();const clan={id,name:clean,leaderId:player.id,leaderName:player.name,faction:player.faction,members:[{id:player.id,name:player.name,rank:'лидер',joinedAt:Date.now()}],createdAt:Date.now(),level:1,stash:{money:0,items:[]}};e.clans[id]=clan;addEcoEvent(world,'clan_created',`Создан клан «${clean}» (${player.faction}).`);return {ok:true,clan};}
module.exports={initEcosystem,tickEcosystem,tickMutantMovement,upgradeBase,createClan,joinClan,addEcoEvent,TARGET_MUTANT_PACKS};
