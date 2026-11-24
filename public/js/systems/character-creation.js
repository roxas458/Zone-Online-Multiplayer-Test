/* ZONE ONLINE character creation domain logic.
 * Builds the new player profile and starter inventory without touching the DOM,
 * persistence, networking, or presentation layers.
 */
(function(root){
  'use strict';

  function validate({name,realName,faction,factions,spent,budget,spawn,spawnOptions}={}){
    if(String(name||'').trim().length<2)return {ok:false,reason:'callsign'};
    if(String(realName||'').trim().length<2)return {ok:false,reason:'real-name'};
    if(!Array.isArray(factions)||!factions.some(item=>item&&item.name===faction))return {ok:false,reason:'faction'};
    if(Number(spent)>Number(budget))return {ok:false,reason:'over-budget'};
    if(!Array.isArray(spawnOptions)||!spawnOptions.some(location=>location&&location.id===spawn))return {ok:false,reason:'spawn'};
    return {ok:true,reason:null};
  }

  function apply({character,name,realName,faction,portrait,background='wanderer',spawn,loadout={},selectedItems=[],gear={},spent=0,budget=400,spawnOptions=[],spawnNames={},day=1,hour='08:00'}={}){
    const check=validate({name,realName,faction,factions:character?.factions,spent,budget,spawn,spawnOptions});
    if(!check.ok)return check;
    if(!character||typeof character!=='object')return {ok:false,reason:'character'};

    character.name=name;
    character.realName=realName;
    character.faction=faction;
    character.hp=100;
    character.radiation=0;
    character.stamina=85;
    character.hunger=18;
    character.thirst=20;
    character.characterCreated=true;
    delete character.dead;
    delete character.deathCause;
    character.playerPortrait=portrait||'stalker-01.webp';
    character.background=background;
    character.characterTraits=[background];
    character.guideDiscount=background==='courier'?.12:0;
    character.startingLocation=spawn;
    character.loc=spawn;
    character.visitedLocations=[...new Set([...(character.visitedLocations||[]),spawn])];
    character.worldPosition=null;

    // The selected starter kit becomes real inventory and equipped gear.
    character.items=[];
    character.equipment={weapon:'',sidearm:'',suit:'',tool:'',helmet:'',artifact:'',backpack:''};
    const counts={};
    for(const id of (Array.isArray(selectedItems)?selectedItems:[]))counts[id]=(counts[id]||0)+1;
    for(const [id,qty] of Object.entries(counts)){
      const item=gear[id];
      if(!item)continue;
      character.items.push({id:item.id,name:item.name,type:item.type,desc:item.desc,weight:item.weight||0,value:item.value||0,qty,price:item.price||0,defense:item.defense||0,power:item.power||0,capacity:item.capacity||0,condition:100});
    }
    for(const slot of ['weapon','suit','tool','backpack']){
      const item=gear[loadout[slot]];
      if(item&&item.id&&!item.id.endsWith('_none'))character.equipment[slot]=item.name;
    }
    if(background==='medic')character.items.push({id:'med-background',name:'Дополнительная аптечка',type:'Медицина',desc:'Бонус предыстории полевого медика.',weight:.4,value:100,qty:1,condition:100});
    if(background==='technician')character.items.push({id:'scrap-background',name:'Запас деталей',type:'Материал',desc:'Бонус предыстории техника.',weight:.8,value:30,qty:2,condition:100});
    if(background==='researcher'){
      character.rep=(character.rep||0)+3;
      character.scienceTrust=(character.scienceTrust||0)+3;
    }
    if(background==='wanderer')character.rep=(character.rep||0)+3;
    character.startingSupplyPoints={spent,budget};
    character.news=Array.isArray(character.news)?character.news:[];
    character.log=Array.isArray(character.log)?character.log:[];
    character.news.unshift({day,hour,title:'Регистрация завершена',body:`Сталкер ${name} зарегистрирован в КПК. Группировка: ${faction}. Стартовый комплект: ${spent}/${budget} очков снабжения.`});
    character.log.unshift(`Позывной: ${name}. Группировка: ${faction}. Начальная база: ${spawnNames[spawn]||spawn}. Стартовый комплект: ${spent}/${budget} очков.`);
    return {ok:true,reason:null,character};
  }

  const api=Object.freeze({validate,apply});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ZoneCharacterCreation=api;
})(typeof window!=='undefined'?window:globalThis);
