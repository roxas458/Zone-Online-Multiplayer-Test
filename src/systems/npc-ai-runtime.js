// Shared deterministic helpers for NPC decision scheduling, history, and travel orders.
'use strict';
const { SECTOR_COORDS } = require('./proximity');
function choose(list, random) { return list[Math.floor(random() * list.length)] || null; }
function scheduleNext(npc,now,random,min=1,max=4){npc.nextDecisionAt=now+(min+Math.floor(random()*(max-min+1)))*60000;}
function recordAction(npc,now){npc.lastActionAt=now;npc.history ||= [];npc.history.push({action:npc.action,location:npc.location,at:now});npc.history=npc.history.slice(-12);}
function moveNpc(npc,to,now,events,reason='patrol'){
  if(!to||to===npc.location||npc.travelTo)return false;
  const from=npc.location,center=SECTOR_COORDS[to]||SECTOR_COORDS.cordon;
  if(!Number.isFinite(Number(npc.x))||!Number.isFinite(Number(npc.y))){const start=SECTOR_COORDS[from]||SECTOR_COORDS.cordon;npc.x=start[0];npc.y=start[1];}
  npc.destination=null;npc.travelTo=to;npc.destinationPoint={x:center[0],y:center[1]};npc.action='travel';npc.behavior=reason;npc.route=[from,to];npc.direction=(npc.direction||0)+90;
  events.push({type:'npc_travel',npcId:npc.id,from,location:to,text:`${npc.name} отправился из сектора ${from} в сектор ${to}.`,at:now});return true;
}

module.exports = { choose, scheduleNext, recordAction, moveNpc };
