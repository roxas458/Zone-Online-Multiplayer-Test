// NPC survival needs and sleep-cycle calculations.
'use strict';
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
function npcSleepWindow(npc, now) {
  if (!Number.isInteger(npc.sleepStartHour)) {
    let hash=0; for (const char of String(npc.id||'')) hash=(hash*31+char.charCodeAt(0))>>>0;
    npc.sleepStartHour=21+(hash%4); npc.sleepEndHour=5+(hash%3);
  }
  const hour=new Date(now).getUTCHours();
  return npc.sleepStartHour>npc.sleepEndHour
    ? hour>=npc.sleepStartHour||hour<npc.sleepEndHour
    : hour>=npc.sleepStartHour&&hour<npc.sleepEndHour;
}
function updateNpcNeeds(npc, now) {
  npc.needs ||= { hunger:0, thirst:0, fatigue:0, stress:0 };
  for (const key of ['hunger','thirst','fatigue','stress']) npc.needs[key]=clamp(npc.needs[key],0,100);
  const previous=Number(npc.lastNeedsAt)||now;
  const minutes=Math.max(0,Math.min(5,(now-previous)/60000));
  npc.lastNeedsAt=now;
  if (!minutes) return;
  npc.needs.hunger=clamp(npc.needs.hunger+minutes*.035,0,100);
  npc.needs.thirst=clamp(npc.needs.thirst+minutes*.055,0,100);
  npc.needs.fatigue=clamp(npc.needs.fatigue+minutes*(npc.action==='travel'? .05:.03),0,100);
  if (npc.action==='combat') npc.needs.stress=clamp(npc.needs.stress+minutes*.8,0,100);
  else if (npc.action==='camp'||npc.action==='rest') npc.needs.stress=clamp(npc.needs.stress-minutes*.35,0,100);
  if ((npc.needs.hunger>=65||npc.needs.thirst>=65) && Number(npc.supplies)>0) {
    npc.supplies=clamp(npc.supplies-2,0,100);
    if(npc.needs.hunger>=65)npc.needs.hunger=clamp(npc.needs.hunger-42,0,100);
    if(npc.needs.thirst>=65)npc.needs.thirst=clamp(npc.needs.thirst-48,0,100);
    npc.lastSupplyUseAt=now;
  } else if ((npc.needs.hunger>=65||npc.needs.thirst>=65) && Number(npc.supplies)<=0) {
    npc.morale=clamp(Number(npc.morale)-minutes*.025,0,100);
  }
  if(npc.action==='camp'||npc.action==='rest') npc.needs.fatigue=clamp(npc.needs.fatigue-minutes*.22,0,100);
}

module.exports = { npcSleepWindow, updateNpcNeeds };
