'use strict';
const {findRoute}=require('./expedition');
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const ACTIVE_SQUAD_STATES=new Set(['travelling','scavenging','returning']);
function pushEvent(world,events,event){events.push(event);world.npcEvents||=[];world.npcEvents.push(event);}
function tickNpcRescue(world,now=Date.now(),random=Math.random){
  world.npcState||={};world.npcSquads||=[];world.rescueOperations||=[];world.npcEvents||=[];
  const events=[],npcs=world.npcState,operations=world.rescueOperations;
  // Resolve outbound arrival only after the squad has physically reached the survivor's sector.
  for(const squad of world.npcSquads){
    const op=operations.find(x=>x.id===squad.rescueOperationId&&x.status==='active');
    if(!op)continue;
    const patient=npcs[op.patientId];
    if(!patient||patient.alive===false){op.status='failed';op.finishedAt=now;squad.rescueOperationId=null;continue;}
    if(op.phase==='outbound'&&squad.status==='scavenging'&&squad.location===patient.location){
      const route=(squad.route||[]).slice(0,Number(squad.routeIndex||0)+1).reverse();
      if(route.length<2){op.status='failed';op.finishedAt=now;squad.rescueOperationId=null;continue;}
      patient.squadId=squad.id;patient.squadName=squad.name;patient.action='travel';patient.behavior='rescue_escort';patient.duty='rescue_patient';patient.mood='эвакуируется';
      patient.health=clamp(Number(patient.health)+12,1,100);patient.lastRescueAt=now;
      if(!squad.members.includes(patient.id))squad.members.push(patient.id);
      squad.route=route;squad.routeIndex=0;squad.status='returning';squad.nextMoveAt=now+120000;
      op.phase='returning';op.pickupAt=now;op.pickupLocation=squad.location;op.returnRoute=route.slice();
      const ev={type:'npc_rescue_pickup',operationId:op.id,squadId:squad.id,npcId:patient.id,location:squad.location,text:`Отряд «${squad.name}» обнаружил ${patient.name} в секторе ${patient.location}. Сталкеру оказана первая помощь, начинается сопровождение к безопасной стоянке.`,at:now};pushEvent(world,events,ev);
    }else if(op.phase==='returning'&&squad.status==='camped'){
      op.status='completed';op.phase='completed';op.finishedAt=now;op.rescuedAt=squad.location;
      patient.action='camp';patient.behavior='camp';patient.duty='rest_at_base';patient.mood='благодарен';patient.health=clamp(Number(patient.health)+8,1,100);patient.supplies=clamp((Number(patient.supplies)||0)+3,0,100);
      for(const id of squad.members){const member=npcs[id];if(!member||member.alive===false)continue;member.morale=clamp((Number(member.morale)||50)+5,0,100);member.memory||=[];member.memory.push({type:'rescue_success',patientId:patient.id,location:squad.location,at:now});member.memory=member.memory.slice(-30);}
      squad.lastRescueAt=now;squad.rescueOperationId=null;
      const ev={type:'npc_rescue_completed',operationId:op.id,squadId:squad.id,npcId:patient.id,location:squad.location,text:`Операция спасения завершена: ${patient.name} доставлен в безопасный сектор ${squad.location}. Отряд «${squad.name}» получил припасы и признание товарищей.`,at:now};pushEvent(world,events,ev);
    }
  }
  // Create operations for isolated, critically wounded stalkers. No teleporting: the rescuers use the world route graph.
  const activeCount=operations.filter(x=>x.status==='active').length;
  if(activeCount<8){
    const patients=Object.values(npcs).filter(n=>n&&n.generated&&n.alive!==false&&!n.squadId&&n.location&&Number(n.health)<=30&&now-(Number(n.lastRescueAttemptAt)||0)>20*60*1000).sort((a,b)=>(Number(a.health)||0)-(Number(b.health)||0));
    for(const patient of patients){
      if(operations.some(x=>x.patientId===patient.id&&x.status==='active'))continue;
      const candidates=world.npcSquads.filter(s=>s&&s.status==='camped'&&!s.rescueOperationId&&now-(Number(s.lastRescueAt)||0)>10*60*1000&&s.location&&s.faction===patient.faction)
        .map(s=>({squad:s,route:findRoute(s.location,patient.location,'safe')}))
        .filter(x=>x.route&&x.route.sectorCount>0&&x.route.sectorCount<=7&&x.squad.members.map(id=>npcs[id]).filter(n=>n&&n.alive!==false&&n.location===x.squad.location&&Number(n.health)>=35).length>=2)
        .sort((a,b)=>a.route.risk-b.route.risk);
      if(!candidates.length)continue;
      const {squad,route}=candidates[0];const id=`rescue_${patient.id}_${now}`;
      const op={id,patientId:patient.id,patientName:patient.name,faction:patient.faction,origin:squad.location,target:patient.location,rescueBase:squad.location,squadId:squad.id,squadName:squad.name,route:route.path.slice(),phase:'outbound',status:'active',createdAt:now};
      operations.unshift(op);operations.splice(40);squad.route=route.path.slice();squad.routeIndex=0;squad.status='travelling';squad.nextMoveAt=now+120000+Math.round(route.risk*1000);squad.rescueOperationId=id;squad.lastRescueAt=now;
      patient.lastRescueAttemptAt=now;patient.action='await_rescue';patient.behavior='stranded';patient.mood='тяжело ранен';
      const ev={type:'npc_rescue_dispatched',operationId:id,squadId:squad.id,npcId:patient.id,location:patient.location,route:route.path.slice(),text:`Получен сигнал бедствия: ${patient.name} (${patient.faction}) ранен в секторе ${patient.location}. Отряд «${squad.name}» выдвинулся по маршруту ${route.path.join(' → ')}.`,at:now};pushEvent(world,events,ev);
      break;
    }
  }
  world.rescueOperations=operations.filter(x=>x.status==='active'||now-(Number(x.finishedAt)||now)<24*60*60*1000).slice(0,40);
  world.npcEvents=world.npcEvents.slice(-100);
  return events;
}
module.exports={tickNpcRescue};
