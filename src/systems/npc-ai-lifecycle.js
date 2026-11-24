// Per-NPC lifecycle preparation: equipment defaults, dialogue refresh, needs, and stable initialization.
'use strict';
const { buildDialogue } = require('./npc-dialogue');
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));

function prepareNpcForTick(npc,{world,owners,events,now,updateNpcNeeds,homeForFaction,npcWorldPosition}) {
  if (!npc.equipment) {
    const role=npc.role||'сталкер';
    npc.equipment={
      suit:role.includes('учёный')?'Научный комбинезон':role.includes('торговец')?'Куртка торговца':'Комбинезон сталкера',
      weapon:role.includes('охотник')?'ТОЗ-34':role.includes('разведчик')?'АКС-74У':'ПМ',
      tool:'Обычный детектор',backpack:'Полевой рюкзак'
    };
  }
  if (!npc.alive) return false;
  const cycle=Math.floor(now/900000);
  if(npc.dialogueCycle!==cycle || !npc.dialogue){
    npc.dialogueCycle=cycle;
    if(npc.dialogue)npc.dialogueVersion=(npc.dialogueVersion||0)+1;
    npc.dialogue=buildDialogue(npc,{recentWorldEvent:world.zoneEvents?.at(-1)?.title||''},now);
    if(npc.dialogueVersion)events.push({type:'npc_dialogue_updated',npcId:npc.id,text:`${npc.name}: появились новые темы и слухи для разговора.`,at:now});
  }
  npc.health=clamp(npc.health??100,0,100);
  npc.morale=clamp(npc.morale??60,0,100);
  npc.supplies=clamp(npc.supplies??50,0,100);
  updateNpcNeeds(npc,now);
  npc.homeLocation ||= homeForFaction(npc.faction,owners,npc.location);
  npc.baseLocation ||= npc.homeLocation;
  npc.behavior ||= 'camp';
  npc.nextDecisionAt ||= now+60000;
  if(!npc.activityPaceUpdated){
    if(Number(npc.nextDecisionAt)>now+4*60000)npc.nextDecisionAt=now+30000;
    npc.activityPaceUpdated=true;
  }
  if(!Number.isFinite(Number(npc.x))||!Number.isFinite(Number(npc.y))){
    const initial=npcWorldPosition(npc);npc.x=initial.x;npc.y=initial.y;
  }
  return true;
}
module.exports={prepareNpcForTick};
