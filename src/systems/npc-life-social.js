// NPC social simulation: proximity encounters, relationships, rumours and squad formation.
'use strict';
const { recordNpcInteraction, rememberNpcEvent } = require('./npc-ai-memory');
const { seeded } = require('./npc-life-utils');
const PROTECTED_ACTIONS = new Set(['combat','dead','retreat','await_rescue','rescue_escort','travel','assault','mission','war_moving']);
function formSocialSquad(world,a,b,now){
 if(!a.generated||!b.generated||a.squadId||b.squadId||a.faction!==b.faction||a.location!==b.location)return null;
 const friends=(a.friends||[]).includes(b.id)||(b.friends||[]).includes(a.id);if(!friends)return null;
 world.npcSquads ||= [];const id=`alife_${String(a.id).replace(/[^a-zA-Z0-9_-]/g,'_')}_${String(b.id).replace(/[^a-zA-Z0-9_-]/g,'_')}`;
 if(world.npcSquads.some(s=>s.id===id))return null;
 const types=['патруль','разведка','сбор припасов','сопровождение'];const type=types[(seeded(id,'type')%types.length)];
 const squad={id,name:`${['Старая тропа','Два фонаря','Тихий дозор','Верные напарники'][seeded(id,'name')%4]} · ${a.name}`,faction:a.faction,leaderId:a.id,members:[a.id,b.id],location:a.location,status:'camped',type,createdAt:now,lastRaidAt:now};
 world.npcSquads.push(squad);a.squadId=b.squadId=id;a.squadType=b.squadType=type;
 recordNpcInteraction(a,b,'squad_formed',{location:a.location,at:now});return squad;
}
function tickNpcSocialEncounters(world, bySector, now, random = Math.random) {
 const events = [];
 // Social encounters use a small spatial grid: only NPCs in neighboring 38m cells are compared.
 for(const [location,group] of bySector){
  const cellSize=38,grid=new Map(),cellOf=n=>`${Math.floor((Number(n.x)||0)/cellSize)}|${Math.floor((Number(n.y)||0)/cellSize)}`;
  for(let i=0;i<group.length;i++){const key=cellOf(group[i]);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}
  for(let i=0;i<group.length;i++){
   const a=group[i];if(a.alive===false||now-(Number(a.lastSocialAt)||0)<8*60*1000||PROTECTED_ACTIONS.has(a.action))continue;
   const cx=Math.floor((Number(a.x)||0)/cellSize),cy=Math.floor((Number(a.y)||0)/cellSize);let candidates=[];
   for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)candidates.push(...(grid.get(`${cx+ox}|${cy+oy}`)||[]));
   for(const j of candidates){if(j<=i)continue;const b=group[j];if(b.alive===false||PROTECTED_ACTIONS.has(b.action)||now-(Number(b.lastSocialAt)||0)<8*60*1000)continue;
    const crossFaction=a.faction!==b.faction,relation=Number(world.diplomacy?.[a.faction]?.[b.faction]??0),knownRival=(a.rivals||[]).includes(b.id)||(b.rivals||[]).includes(a.id);if(crossFaction&&(a.faction==='Монолит'||b.faction==='Монолит'||relation<=-25||knownRival))continue;
    const d=Math.hypot((Number(a.x)||0)-(Number(b.x)||0),(Number(a.y)||0)-(Number(b.y)||0));if(d>38||random()>.035)continue;
    recordNpcInteraction(a,b,'npc_conversation',{location,at:now});a.lastSocialAt=b.lastSocialAt=now;
    const formed=formSocialSquad(world,a,b,now);if(formed)events.push({type:'npc_squad_formed',location,squadId:formed.id,npcIds:[a.id,b.id],text:`${a.name} пригласил знакомого ${b.name} в небольшой отряд «${formed.name}» в секторе ${location}.` ,at:now});
    const rumor=(a.memory||[]).slice().reverse().find(m=>m.type==='artifact_found'&&now-(Number(m.at)||0)<24*60*60*1000);if(rumor&&!((b.memory||[]).some(m=>m.type==='rumor'&&m.sourceNpcId===a.id&&m.name===rumor.name))){rememberNpcEvent(b,{type:'rumor',sourceNpcId:a.id,name:rumor.name,location:rumor.location,at:now});recordNpcInteraction(a,b,'rumor_shared',{location,at:now});events.push({type:'npc_rumor_shared',location,npcIds:[a.id,b.id],text:`${a.name} рассказал ${b.name} слух об артефакте «${rumor.name}» в секторе ${rumor.location}.`,at:now});}
    if(a.faction!==b.faction){recordNpcInteraction(a,b,'road_encounter',{location,at:now});events.push({type:'npc_road_encounter',location,npcIds:[a.id,b.id],text:`На дороге в секторе ${location} встретились ${a.name} и ${b.name} из разных группировок. После короткого разговора они разошлись.` ,at:now});}
    else events.push({type:'npc_social_encounter',location,npcIds:[a.id,b.id],text:`${a.name} и ${b.name} беседуют у стоянки в секторе ${location}.`,at:now});break;
   }
  }
 }
 return events;
}
module.exports = { tickNpcSocialEncounters };
