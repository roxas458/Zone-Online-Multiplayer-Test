// Short-range NPC combat resolution, isolated from position advancement.
'use strict';
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const { npcWorldPosition, inRange, NPC_SKIRMISH_RADIUS } = require('./proximity');
const { isHostileFaction } = require('./npc-ai-factions');
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


module.exports = { tickNpcProximityCombat };
