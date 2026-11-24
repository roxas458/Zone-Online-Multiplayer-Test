// Supply convoy creation, route progress, ambushes, and expiry.
'use strict';
function choose(list, random) { return list[Math.floor(random() * list.length)] || null; }

function tickNpcConvoys({ world, owners, events, now, random, isHostileFaction }) {
  world.convoys ||= [];
  const hostility = (a, b) => isHostileFaction(a, b, world.diplomacy);
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
}
module.exports = { tickNpcConvoys };
