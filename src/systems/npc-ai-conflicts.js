// NPC faction clashes, local skirmishes and convoy lifecycle.
'use strict';
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const { npcWorldPosition, inRange, NPC_SKIRMISH_RADIUS } = require('./proximity');
function choose(list, random) { return list[Math.floor(random() * list.length)] || null; }

function resolveNpcWorldConflicts({ world, owners, events, now, random, isHostileFaction }) {
// Strategic campaigns are managed by faction-war.js against explicit key points.
world.territoryOrders ||= {}; world.battlefronts ||= []; world.convoys ||= [];
for(const [sector,order] of Object.entries(world.territoryOrders))if(order.expiresAt&&order.expiresAt<=now)delete world.territoryOrders[sector];
// This replaces the legacy sector-wide border assault scheduler.
// Persistent faction warfare: hostile units that meet in a sector exchange fire.
const byLocation = new Map();
for (const npc of Object.values(world.npcState)) if (npc.alive) { const group = byLocation.get(npc.location) || []; group.push(npc); byLocation.set(npc.location, group); }
world.battlefronts ||= []; world.convoys ||= [];
const hostility = (a,b) => isHostileFaction(a,b,world.diplomacy);
for (const [location, group] of byLocation) {
  const sides=[...new Set(group.map(n=>n.faction))].filter(f=>group.some(n=>hostility(f,n.faction)));
  if(sides.length<2 || random()>.42) continue;
  const a=group.find(n=>n.faction===sides[0]), b=group.find(n=>hostility(sides[0],n.faction));
  if(!a||!b) continue;
  const battle=world.battlefronts.find(x=>x.location===location&&x.status==='active');
  const engagement=battle||{id:`battle_${location}_${now}`,location,attacker:a.faction,defender:b.faction,status:'active',startedAt:now,rounds:0,losses:0,participants:[]};
  engagement.participants ||= [];for(const participant of [a.id,b.id])if(participant&&!engagement.participants.includes(participant))engagement.participants.push(participant);engagement.participants=engagement.participants.slice(-24);
  engagement.rounds++;engagement.lastAt=now;
  const damageA=4+Math.floor(random()*13),damageB=4+Math.floor(random()*13);
  b.health=clamp(b.health-damageA,0,100);a.health=clamp(a.health-damageB,0,100);a.action=b.action='combat';a.behavior=b.behavior='combat';a.mood=b.mood='в бою';
  for(const [victim,killer] of [[a,b],[b,a]])if(victim.health<=0&&victim.alive){victim.alive=false;victim.action='dead';victim.deathCause=`погиб в бою с группировкой «${killer.faction}»`;victim.diedAt=now;victim.combatDeaths=(Number(victim.combatDeaths)||0)+1;killer.combatKills=(Number(killer.combatKills)||0)+1;killer.lastCombatKillAt=now;killer.lastVictim=victim.name;engagement.losses++;}
  engagement.participantSnapshots ||= [];for(const unit of [a,b]){const snapshot={id:unit.id,name:unit.name,faction:unit.faction,role:unit.role,health:unit.health,alive:unit.alive,action:unit.action,behavior:unit.behavior,updatedAt:now};const index=engagement.participantSnapshots.findIndex(x=>x.id===unit.id);if(index>=0)engagement.participantSnapshots[index]=snapshot;else engagement.participantSnapshots.push(snapshot);}engagement.participantSnapshots=engagement.participantSnapshots.slice(-24);
  if(!battle)world.battlefronts.unshift(engagement);
  const attackAlive=group.filter(n=>n.alive&&n.faction===engagement.attacker).length;
  const defenseAlive=group.filter(n=>n.alive&&n.faction===engagement.defender).length;
  if(engagement.rounds>=4||attackAlive===0||defenseAlive===0){
    engagement.status='resolved';engagement.endedAt=now;
    const winner=attackAlive===defenseAlive?(attackAlive>0?(random()<.5?engagement.attacker:engagement.defender):null):(attackAlive>defenseAlive?engagement.attacker:engagement.defender);
    engagement.winner=winner;
    if(winner){
      // A local NPC clash is not enough to transfer an entire sector.
      // Key-point ownership and sector aggregation are handled centrally by faction-war.js.
      for(const survivor of group.filter(n=>n.alive&&n.faction===winner)){
        survivor.lastClashWinner=winner;
        survivor.morale=clamp((Number(survivor.morale)||50)+3,0,100);
      }
      events.push({type:'faction_clash_resolved',location,winner,text:`Столкновение в секторе ${location} завершилось в пользу группировки «${winner}». Контроль ключевых объектов пока не изменился.`,at:now});
    }
  }
  events.push({type:'npc_skirmish',location,participants:[a.id,b.id],attacker:engagement.attacker,defender:engagement.defender,text:`Перестрелка: ${engagement.attacker} и ${engagement.defender} ведут бой в секторе ${location}.`,at:now});
}
world.battlefronts=world.battlefronts.slice(0,40);
// Convoys use the Zone's connected routes and remain visible to every player.
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
// Local skirmishes: hostile NPCs only engage when their map-space positions overlap.
const combatants=Object.values(world.npcState).filter(n=>n.alive&&n.location&&!n.missionOrder&&n.action!=='dead');
for(let i=0;i<combatants.length;i++){const a=combatants[i];if(a.action==='combat'||a.lastSkirmishAt&&now-a.lastSkirmishAt<45000)continue;const pa=npcWorldPosition(a);const b=combatants.slice(i+1).find(other=>other.alive&&other.location===a.location&&other.faction!==a.faction&&isHostileFaction(a.faction,other.faction,world.diplomacy)&&other.action!=='combat'&&(!other.lastSkirmishAt||now-other.lastSkirmishAt>=45000)&&inRange(pa,npcWorldPosition(other),NPC_SKIRMISH_RADIUS));if(!b||random()>.38)continue;const damageA=5+Math.floor(random()*9),damageB=5+Math.floor(random()*9);a.health=clamp(a.health-damageA,0,100);b.health=clamp(b.health-damageB,0,100);a.action=b.action='combat';a.behavior=b.behavior='combat';a.mood=b.mood='в бою';a.lastSkirmishAt=b.lastSkirmishAt=now;a.combatEngagementId=b.combatEngagementId=`local_${a.id}_${b.id}_${Math.floor(now/30000)}`;events.push({type:'npc_skirmish',location:a.location,npcIds:[a.id,b.id],text:`Перестрелка между ${a.name} («${a.faction}») и ${b.name} («${b.faction}») в секторе ${a.location}.`,at:now});for(const [victim,killer] of [[a,b],[b,a]])if(victim.health<=0&&victim.alive){victim.alive=false;victim.action='dead';victim.deathCause=`погиб в перестрелке с группировкой «${killer.faction}»`;victim.diedAt=now;victim.combatDeaths=(Number(victim.combatDeaths)||0)+1;killer.combatKills=(Number(killer.combatKills)||0)+1;killer.lastCombatKillAt=now;killer.lastVictim=victim.name;}
}
}

module.exports = { resolveNpcWorldConflicts };
