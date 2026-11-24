// Per-NPC behavioral decision policy, separated from world orchestration.
'use strict';
const { npcSleepWindow } = require('./npc-ai-needs');
const { SECTOR_COORDS } = require('./proximity');
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));

function decideNpcAction(npc, { world, owners, events, now, random, territoryAdjacency, canEnterTerritory, moveNpc, scheduleNext, recordAction, choose }) {
    if(now < npc.nextDecisionAt && npc.action!=='combat') return false;
    if(npc.action==='combat') { npc.action='guard';npc.behavior='guard';npc.mood='насторожен';scheduleNext(npc,now,random,1,3);recordAction(npc,now);return false; }
    if(npc.missionOrder){
      const target=npc.missionOrder.target;
      if(npc.location===target){npc.action='guard';npc.behavior='mission';npc.duty=npc.missionOrder.type||'mission';npc.missionOrder=null;}
      else {
        const next=(territoryAdjacency[npc.location]||[]).find(id=>id===target||(territoryAdjacency[id]||[]).includes(target)&&canEnterTerritory(npc.faction,id,owners,world.territoryOrders||{}));
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
        const friendly=(territoryAdjacency[npc.location]||[]).filter(id=>(owners[id]===npc.faction||canEnterTerritory(npc.faction,id,owners,world.territoryOrders||{})));
        const next=choose(friendly,random);
        if(next&&random()<.28){npc.action='patrol';npc.behavior='patrol';npc.duty='sector_patrol';npc.guardPost=false;moveNpc(npc,next,now,events,'patrol');npc.homeLocation=npc.homeLocation||npc.baseLocation;}
        else {const center=SECTOR_COORDS[npc.location]||SECTOR_COORDS.cordon,angle=random()*Math.PI*2,radius=18+random()*78;npc.destinationPoint={x:Math.max(4,Math.min(996,center[0]+Math.cos(angle)*radius)),y:Math.max(4,Math.min(1996,center[1]+Math.sin(angle)*radius))};npc.action='patrol';npc.behavior='patrol';npc.duty='sector_patrol';npc.guardPost=false;} 
      }
      if(atHome&&npc.action==='camp'&&random()<.12)events.push({type:'npc_camp_event',npcId:npc.id,location:npc.location,text:`${npc.name} отдыхает у костра на базе «${npc.faction}».`,at:now});
      scheduleNext(npc,now,random,npc.action==='rest'?8:1,npc.action==='rest'?14:4);recordAction(npc,now);
    }
  return true;
}

module.exports = { decideNpcAction };
