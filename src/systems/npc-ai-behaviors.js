// Ordinary NPC activity policy: rest, camp, squad duties, guard, and patrol.
'use strict';
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const { npcSleepWindow } = require('./npc-ai-needs');
const { applyNpcTacticalDecision, startNpcSectorPatrol } = require('./npc-ai-tactics');

function chooseNpcRoutineBehavior(npc, context, roll) {
  const { world, owners, events, now, random, territoryAdjacency, canEnterTerritory, moveNpc, scheduleNext, recordAction, choose } = context;
      if(npc.needs.fatigue>=82 || (npcSleepWindow(npc,now)&&npc.needs.fatigue>=28)){
        npc.action='rest';npc.behavior='rest';npc.duty='recover';npc.guardPost=false;npc.mood='устал';
        npc.needs.fatigue=clamp(npc.needs.fatigue-8,0,100);npc.morale=clamp(npc.morale+1,0,100);
      }
      else if(applyNpcTacticalDecision(npc, { events, now, random, scheduleNext, recordAction, owners }, roll, 'special')) {
        // Reconnaissance policy owns this decision cycle.
      }
      else if(npc.squadType==='сбор припасов'&&roll<.34){npc.action='scavenge';npc.behavior='scavenge';npc.duty='field_scavenging';npc.guardPost=false;npc.supplies=clamp(npc.supplies+2,0,100);npc.mood='сосредоточен';events.push({type:'npc_scavenging',npcId:npc.id,location:npc.location,text:`${npc.name} из отряда «${npc.squadName||'сталкеры'}» осматривает укрытия и собирает припасы в секторе ${npc.location}.`,at:now});}
      else if(npc.squadType==='санитарная группа'&&roll<.34){npc.action='support';npc.behavior='field_medic';npc.duty='field_medic';npc.guardPost=false;npc.mood='сосредоточен';npc.health=clamp(npc.health+4,0,100);events.push({type:'npc_medical_patrol',npcId:npc.id,location:npc.location,text:`Санитарная группа «${npc.squadName||'медики'}» проверяет состояние раненых в секторе ${npc.location}.`,at:now});}
      else if(npc.squadType==='сопровождение'&&roll<.34){npc.action='escort';npc.behavior='escort';npc.duty='caravan_escort';npc.guardPost=false;npc.mood='насторожен';events.push({type:'npc_escort_patrol',npcId:npc.id,location:npc.location,text:`Отряд сопровождения «${npc.squadName||'сталкеры'}» проверяет торговый маршрут в секторе ${npc.location}.`,at:now});}
      else if(roll<.24){npc.action='camp';npc.behavior='campfire';npc.duty='rest_at_base';npc.guardPost=false;npc.mood='спокоен';npc.health=clamp(npc.health+3,0,100);npc.morale=clamp(npc.morale+3,0,100);npc.supplies=clamp(npc.supplies+1,0,100);}
      else if(applyNpcTacticalDecision(npc, { events, now, random, scheduleNext, recordAction, owners }, roll, 'guard')) {
        // Guard-post policy owns this decision cycle.
      }
      else if(roll<.62){npc.action='rest';npc.behavior='rest';npc.duty='recover';npc.guardPost=false;npc.health=clamp(npc.health+5,0,100);npc.morale=clamp(npc.morale+2,0,100);}
      else {
        startNpcSectorPatrol(npc, { territoryAdjacency, owners, world, canEnterTerritory, choose, random, moveNpc, events, now });
      }
  return npc.action;
}
module.exports = { chooseNpcRoutineBehavior };
