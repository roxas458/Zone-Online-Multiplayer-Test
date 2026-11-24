(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ZoneSurvival=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
function advanceNeeds(state,elapsedMs,weather='overcast'){const minutes=Math.max(0,Math.min(180,(Number(elapsedMs)||0)/60000));if(!minutes)return{minutes:0,damage:0};const dry=weather==='rain'?-.04:weather==='clear'||weather==='emission'?.08:0;state.hunger=clamp((state.hunger||0)+minutes*.22);state.thirst=clamp((state.thirst||0)+minutes*(.34+dry));state.stamina=clamp((state.stamina||0)-(state.thirst>90?minutes*.08:0));let damage=0;if(state.hunger>=95)damage+=Math.floor(minutes/8);if(state.thirst>=95)damage+=Math.floor(minutes/5);if(damage)state.hp=clamp((state.hp??100)-damage,1,100);return{minutes,damage};}
function huntChance(pack,weaponQuality=50,stamina=100){return Math.max(.18,Math.min(.82,.72-Math.max(0,Math.min(100,Number(pack?.aggression)||50))*.003+clamp(weaponQuality)*.001-Math.max(0,100-clamp(stamina))*.002));}
function resolveHunt(pack,weaponQuality,stamina,roll=Math.random()){if(!pack||Number(pack.count)<=0)return{ok:false,reason:'В секторе нет доступной группы мутантов.'};if(stamina<18)return{ok:false,reason:'Для охоты нужно минимум 18 выносливости.'};const chance=huntChance(pack,weaponQuality,stamina);return roll<chance?{ok:true,chance,damage:Math.max(0,Math.round((pack.aggression||40)/18)-Math.floor(weaponQuality/45)),kills:1,loot:'mutant_trophy'}:{ok:false,chance,damage:Math.max(2,Math.round((pack.aggression||40)/12)),reason:'Мутанты контратаковали. Следует отступить и перевязаться.'};}
function expeditionCost(risk=30,weather='clear',emission=false){const danger=Math.max(0,Math.min(100,Number(risk)||0));return{stamina:Math.round(7+danger*.08+(weather==='rain'?2:0)+(emission?4:0)),hunger:Math.round(2+danger*.025),thirst:Math.round(3+danger*.03+(weather==='clear'?1:0)),radiation:Math.round(danger*.012+(emission?3:0))};}
function emissionDamage(shelter=false,suitProtection=0){if(shelter)return{hp:0,radiation:0,stamina:0};const p=Math.max(0,Math.min(80,Number(suitProtection)||0));return{hp:Math.max(1,Math.round(12*(1-p/100))),radiation:Math.max(2,Math.round(18*(1-p/100))),stamina:8};}
const RADIATION_HAZARDS=Object.freeze({chaes:1.8,radar:1.5,pripyat:1.1,red:.65,yantar:.45,swamps:.35,darkhollow:.3,limansk:.25});
function radiationLevel(value){return clamp(value);}
function radiationTick(state,location,now=Date.now(),healthRoll,staminaRoll){
 if(!state||typeof state!=='object')return{exposure:0,healthDamage:0,staminaDamage:0,protected:false};
 if(Number(now)<Number(state.radiationProtectionUntil||0))return{exposure:0,healthDamage:0,staminaDamage:0,protected:true};
 const exposure=Number(RADIATION_HAZARDS[location])||0;
 if(!exposure)return{exposure:0,healthDamage:0,staminaDamage:0,protected:false};
 state.radiation=clamp((Number(state.radiation)||0)+exposure);
 let healthDamage=0,staminaDamage=0;
 if(state.radiation>=35&&(healthRoll===undefined?Math.random():Number(healthRoll))<.18){healthDamage=1;state.hp=Math.max(1,clamp(state.hp??100)-1);}
 if(state.radiation>=70&&(staminaRoll===undefined?Math.random():Number(staminaRoll))<.25){staminaDamage=2;state.stamina=Math.max(0,clamp(state.stamina??100)-2);}
 return{exposure,healthDamage,staminaDamage,protected:false};
}
return{clamp,advanceNeeds,huntChance,resolveHunt,expeditionCost,emissionDamage,radiationLevel,radiationTick,RADIATION_HAZARDS};});
