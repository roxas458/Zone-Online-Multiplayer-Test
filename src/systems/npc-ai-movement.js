// NPC spatial movement, roaming and proximity combat.
'use strict';
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
function npcSeed(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const { npcWorldPosition, inRange, NPC_SKIRMISH_RADIUS, SECTOR_COORDS } = require('./proximity');
const { resolveSectorAtPosition } = require('./sector-position');
const { isHostileFaction } = require('./npc-ai-factions');

// Lightweight one-second movement step. Strategic decisions remain on the slower AI tick;
// this function only advances already-authorized movement orders in world coordinates.
function tickNpcMovement(world,now=Date.now(),speed=2.5){
  const moved=[];
  const active=Object.values(world.npcState||{}).filter(n=>n&&n.alive!==false&&n.location);
  const combatGrid=new Map(),combatCell=NPC_SKIRMISH_RADIUS;
  for(const n of active){const p=npcWorldPosition(n),key=`${n.location}|${Math.floor(p.x/combatCell)}|${Math.floor(p.y/combatCell)}`;if(!combatGrid.has(key))combatGrid.set(key,[]);combatGrid.get(key).push(n);}
  for(const npc of active){
    if(!npc||npc.alive===false)continue;
    if(!Number.isFinite(Number(npc.x))||!Number.isFinite(Number(npc.y))){const initial=npcWorldPosition(npc);npc.x=initial.x;npc.y=initial.y;}
    // Ordinary stalkers periodically leave their post for short local patrols.
    // Traders and named commanders remain at their authored positions unless ordered.
    if(!npc.lifeRoutine&&!npc.destinationPoint&&!npc.travelTo&&['camp','guard','patrol'].includes(npc.action)&&!['торговец','командир','главарь'].some(role=>String(npc.role||'').includes(role))){
      npc.nextRoamAt ||= now+15000+(npcSeed(npc.id)%35000);
      if(now>=npc.nextRoamAt){const center=SECTOR_COORDS[npc.location]||SECTOR_COORDS.cordon,seed=(npcSeed(npc.id+'|'+Math.floor(now/45000))>>>0),angle=(seed%10000)/10000*Math.PI*2,radius=28+((seed>>>8)%68);npc.destinationPoint={x:Math.max(4,Math.min(996,center[0]+Math.cos(angle)*radius)),y:Math.max(4,Math.min(1996,center[1]+Math.sin(angle)*radius))};npc.action='patrol';npc.behavior='patrol';npc.duty='sector_patrol';npc.guardPost=false;npc.nextRoamAt=now+45000+(seed%45000);}
    }
    if(!npc.destinationPoint)continue;
    // Hostile contacts stop movement before either side can walk through the other.
    // The proximity-combat tick resolves damage and deaths on its own cadence.
    const here=npcWorldPosition(npc),cx=Math.floor(here.x/combatCell),cy=Math.floor(here.y/combatCell);
    let blockedByHostile=false;
    for(let ox=-1;ox<=1&&!blockedByHostile;ox++)for(let oy=-1;oy<=1&&!blockedByHostile;oy++){
      for(const other of combatGrid.get(`${npc.location}|${cx+ox}|${cy+oy}`)||[]){
        if(other===npc||other.alive===false||!isHostileFaction(npc.faction,other.faction,world.diplomacy))continue;
        if(inRange(here,npcWorldPosition(other),NPC_SKIRMISH_RADIUS)){blockedByHostile=true;break;}
      }
    }
    if(blockedByHostile){npc.action='combat';npc.behavior='combat';npc.mood='в бою';npc.destinationPoint=null;continue;}
    if(npc.action==='combat'&&now-(Number(npc.lastSkirmishAt)||0)<12000)continue;
    const dx=Number(npc.destinationPoint.x)-Number(npc.x),dy=Number(npc.destinationPoint.y)-Number(npc.y),distance=Math.hypot(dx,dy),step=Math.min(distance,Math.max(1,Number(speed)||8));
    if(distance<=step+0.5){npc.x=Number(npc.destinationPoint.x);npc.y=Number(npc.destinationPoint.y);npc.destinationPoint=null;if(npc.travelTo){npc.location=npc.travelTo;npc.travelTo=null;}if(npc.action==='travel')npc.action='patrol';}
    else{npc.x+=dx/distance*step;npc.y+=dy/distance*step;npc.action='travel';}
    const crossedSector=resolveSectorAtPosition(npc.location,{x:npc.x,y:npc.y});if(crossedSector!==npc.location)npc.location=crossedSector;
    world.npcPositions ||= {};world.npcPositions[npc.id]=npc.location;
    moved.push({id:npc.id,x:npc.x,y:npc.y,location:npc.location,travelTo:npc.travelTo||null,action:npc.action,behavior:npc.behavior});
  }
  return moved;
}
function tickNpcProximityCombat(world,now=Date.now(),random=Math.random){
 const npcs=Object.values(world.npcState||{}).filter(n=>n&&n.alive!==false&&n.location&&n.action!=='dead'),events=[];
 // Spatial hashing limits combat checks to nearby cells instead of comparing every NPC pair.
 const cellSize=NPC_SKIRMISH_RADIUS,grid=new Map(),positions=npcs.map(n=>npcWorldPosition(n));
 for(let i=0;i<npcs.length;i++){const n=npcs[i],p=positions[i],key=`${n.location}|${Math.floor(p.x/cellSize)}|${Math.floor(p.y/cellSize)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}
 for(let i=0;i<npcs.length;i++){
  const a=npcs[i];if(now-(Number(a.lastSkirmishAt)||0)<12000)continue;const pa=positions[i],cx=Math.floor(pa.x/cellSize),cy=Math.floor(pa.y/cellSize);let candidates=[];
  for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)candidates.push(...(grid.get(`${a.location}|${cx+ox}|${cy+oy}`)||[]));
  for(const j of candidates){if(j<=i)continue;
   const b=npcs[j];if(b.faction===a.faction||b.alive===false||!isHostileFaction(a.faction,b.faction,world.diplomacy)||now-(Number(b.lastSkirmishAt)||0)<12000)continue;
   if(!inRange(pa,positions[j],NPC_SKIRMISH_RADIUS))continue;
   const damageA=2+Math.floor(random()*5),damageB=2+Math.floor(random()*5);a.health=clamp(a.health-damageA,0,100);b.health=clamp(b.health-damageB,0,100);a.action=b.action='combat';a.behavior=b.behavior='combat';a.mood=b.mood='в бою';a.lastSkirmishAt=b.lastSkirmishAt=now;
   events.push({type:'npc_skirmish',location:a.location,npcIds:[a.id,b.id],text:`В радиусе обнаружения встретились отряды ${a.name} («${a.faction}») и ${b.name} («${b.faction}»). Началась перестрелка в секторе ${a.location}.`,at:now});
   for(const [victim,killer] of [[a,b],[b,a]])if(victim.health<=0&&victim.alive){victim.alive=false;victim.action='dead';victim.deathCause=`погиб в перестрелке с группировкой «${killer.faction}»`;victim.diedAt=now;victim.combatDeaths=(Number(victim.combatDeaths)||0)+1;killer.combatKills=(Number(killer.combatKills)||0)+1;killer.lastCombatKillAt=now;killer.lastVictim=victim.name;}
   break;
  }
 }
 return events;
}


module.exports = { tickNpcMovement, tickNpcProximityCombat };
