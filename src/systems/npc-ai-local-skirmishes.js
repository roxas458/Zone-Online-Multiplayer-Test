// Spatially constrained hostile NPC skirmishes.
'use strict';
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const { npcWorldPosition, inRange, NPC_SKIRMISH_RADIUS } = require('./proximity');
const { recordNpcAllyDeath, recordNpcInteraction } = require('./npc-ai-memory');

function resolveLocalSkirmishes({ world, events, now, random, isHostileFaction }) {
// Local skirmishes: hostile NPCs only engage when their map-space positions overlap.
const combatants=Object.values(world.npcState).filter(n=>n.alive&&n.location&&!n.missionOrder&&n.action!=='dead');
for(let i=0;i<combatants.length;i++){const a=combatants[i];if(a.action==='combat'||a.lastSkirmishAt&&now-a.lastSkirmishAt<45000)continue;const pa=npcWorldPosition(a);const b=combatants.slice(i+1).find(other=>other.alive&&other.location===a.location&&other.faction!==a.faction&&isHostileFaction(a.faction,other.faction,world.diplomacy)&&other.action!=='combat'&&(!other.lastSkirmishAt||now-other.lastSkirmishAt>=45000)&&inRange(pa,npcWorldPosition(other),NPC_SKIRMISH_RADIUS));if(!b||random()>.38)continue;const damageA=5+Math.floor(random()*9),damageB=5+Math.floor(random()*9);a.health=clamp(a.health-damageA,0,100);b.health=clamp(b.health-damageB,0,100);a.action=b.action='combat';a.behavior=b.behavior='combat';a.mood=b.mood='в бою';a.lastSkirmishAt=b.lastSkirmishAt=now;a.combatEngagementId=b.combatEngagementId=`local_${a.id}_${b.id}_${Math.floor(now/30000)}`;events.push({type:'npc_skirmish',location:a.location,npcIds:[a.id,b.id],text:`Перестрелка между ${a.name} («${a.faction}») и ${b.name} («${b.faction}») в секторе ${a.location}.`,at:now});for(const [victim,killer] of [[a,b],[b,a]])if(victim.health<=0&&victim.alive){victim.alive=false;victim.action='dead';victim.deathCause=`погиб в перестрелке с группировкой «${killer.faction}»`;victim.diedAt=now;victim.combatDeaths=(Number(victim.combatDeaths)||0)+1;killer.combatKills=(Number(killer.combatKills)||0)+1;killer.lastCombatKillAt=now;killer.lastVictim=victim.name;recordNpcAllyDeath(world,victim,killer,now);recordNpcInteraction(victim,killer,'attacked',{location:a.location,at:now,delta:-30});}
}
}
module.exports = { resolveLocalSkirmishes };
