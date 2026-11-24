'use strict';
function seeded(id,slot){let h=2166136261;for(const c of `${id}|${slot}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function addMemory(npc,item){npc.memory ||= [];npc.memory.push(item);npc.memory=npc.memory.slice(-40);}
function formSocialSquad(world,a,b,now){
 if(!a.generated||!b.generated||a.squadId||b.squadId||a.faction!==b.faction||a.location!==b.location)return null;
 const friends=(a.friends||[]).includes(b.id)||(b.friends||[]).includes(a.id);if(!friends)return null;
 world.npcSquads ||= [];const id=`alife_${String(a.id).replace(/[^a-zA-Z0-9_-]/g,'_')}_${String(b.id).replace(/[^a-zA-Z0-9_-]/g,'_')}`;
 if(world.npcSquads.some(s=>s.id===id))return null;
 const types=['патруль','разведка','сбор припасов','сопровождение'];const type=types[(seeded(id,'type')%types.length)];
 const squad={id,name:`${['Старая тропа','Два фонаря','Тихий дозор','Верные напарники'][seeded(id,'name')%4]} · ${a.name}`,faction:a.faction,leaderId:a.id,members:[a.id,b.id],location:a.location,status:'camped',type,createdAt:now,lastRaidAt:now};
 world.npcSquads.push(squad);a.squadId=b.squadId=id;a.squadType=b.squadType=type;
 addMemory(a,{type:'squad_formed',npcId:b.id,name:b.name,location:a.location,at:now});addMemory(b,{type:'squad_formed',npcId:a.id,name:a.name,location:b.location,at:now});return squad;
}
module.exports = { seeded, addMemory };
