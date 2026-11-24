'use strict';
const {SECTOR_COORDS}=require('./proximity');
const crypto=require('crypto');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const NOTES=[
 '«Если читаешь это, значит, я всё-таки не вернулся. Я спрятал запас у старой бетонной плиты. Не шуми — рядом часто ходят кабаны».',
 '«После выброса пришлось бросить рюкзак. Ориентир — ржавая цистерна и два поваленных дерева. Забери консервы, мне они уже не понадобятся».',
 '«Тайник не у самой дороги. Ищи за обвалившейся стеной, где детектор начинает потрескивать. Артефакт оставил на потом».',
 '«Координаты на обратной стороне этой записки. Если нашёл её — считай, повезло. Только проверь округу на аномалии».',
 '«Спрятал аптечку и патроны возле старого укрытия. Метку на карте не ставь: за нами следят».',
 '«Доверять торговцам нельзя, поэтому часть припасов оставил в поле. Забирай, если дойдёшь целым».'];
const LOOT=[
 {id:'canned',qty:2,money:0},{id:'bandage',qty:2,money:0},{id:'med',qty:1,money:120},
 {id:'anti_rad',qty:1,money:180},{id:'scrap',qty:3,money:90},{id:'ration',qty:2,money:140},
 {id:'painkillers',qty:1,money:250},{id:'trauma_kit',qty:1,money:700},{id:'artifact_medusa',qty:1,money:500}
];
function seeded(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function initStashes(world,now=Date.now()){
 world.stashes ||= {};
 for(const [location,center] of Object.entries(SECTOR_COORDS)){
  const id=`stash_${location}`;if(world.stashes[id])continue;
  let seed=seeded(`${location}:zone-cache-v1`);const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const angle=rand()*Math.PI*2,radius=75+rand()*100,loot=LOOT[Math.floor(rand()*LOOT.length)];
  world.stashes[id]={id,location,x:Math.round(clamp(center[0]+Math.cos(angle)*radius,8,992)),y:Math.round(clamp(center[1]+Math.sin(angle)*radius,8,1992)),createdAt:now,looted:false,loot:{...loot},note:NOTES[Math.floor(rand()*NOTES.length)],discoveredBy:[],lootedBy:null};
 }
 world.stashIntel ||= {};world.stashSearchCooldown ||= {};
 return world.stashes;
}
function intelFor(world,playerId){return new Set(world.stashIntel?.[playerId]||[]);}
function publicStashes(world,playerId,location){const intel=intelFor(world,playerId);return Object.values(world.stashes||{}).filter(s=>s.location===location&&!s.looted).map(s=>({id:s.id,location:s.location,looted:s.looted,discovered:intel.has(s.id),...(intel.has(s.id)?{x:s.x,y:s.y,note:s.note}: {})}));}
function addItem(state,goods,qty){state.items ||= [];const item=state.items.find(x=>x.id===goods.id);if(item)item.qty=clamp(item.qty+qty,0,999);else state.items.push({id:goods.id,name:goods.name,type:goods.type,desc:goods.desc,weight:goods.weight,qty,value:goods.value});}
function searchStashArea(world,player,SHOP,now=Date.now()){
 initStashes(world,now);const cooldown=Number(world.stashSearchCooldown[player.id])||0;
 if(now<cooldown)return {ok:false,message:`Нужно немного подождать. Повторный поиск через ${Math.ceil((cooldown-now)/1000)} сек.`};
 world.stashSearchCooldown[player.id]=now+45000;
 const candidates=Object.values(world.stashes).filter(s=>s.location===player.location&&!s.looted);
 const nearest=candidates.map(s=>({...s,d:Math.hypot((Number(player.x)||0)-s.x,(Number(player.y)||0)-s.y)})).sort((a,b)=>a.d-b.d)[0];
 if(nearest&&nearest.d<=75){world.stashIntel[player.id] ||= [];if(!world.stashIntel[player.id].includes(nearest.id))world.stashIntel[player.id].push(nearest.id);return {ok:true,found:'note',message:'Под слоем пыли обнаружена записка с координатами тайника. Отметка добавлена в полевой журнал.',stashes:publicStashes(world,player.id,player.location),note:nearest.note};}
 const roll=seeded(`${player.id}:${player.location}:${Math.floor(now/45000)}`)%100;
 if(roll<28){const item=LOOT[seeded(`${player.id}:${now}:loot`)%LOOT.length],goods=SHOP[item.id];if(goods){addItem(player.state,goods,item.qty);player.state.money=clamp((Number(player.state.money)||0)+item.money,0,99999999);return {ok:true,found:'loot',message:`Среди обломков найдены ${goods.name} ×${item.qty}${item.money?` и ${item.money} ₽`:''}.`,state:player.state,stashes:publicStashes(world,player.id,player.location)};}}
 if(roll<42&&nearest){world.stashIntel[player.id] ||= [];if(!world.stashIntel[player.id].includes(nearest.id))world.stashIntel[player.id].push(nearest.id);return {ok:true,found:'note',message:'Ты нашёл промокшую записку. На ней сохранился ориентир тайника.',note:nearest.note,stashes:publicStashes(world,player.id,player.location)};}
 return {ok:true,found:'nothing',message:'Ты осмотрел укрытия и обломки, но ничего ценного не обнаружил.',stashes:publicStashes(world,player.id,player.location)};
}
function buyStashIntel(world,player,npc,now=Date.now()){
 initStashes(world,now);const stash=Object.values(world.stashes).filter(s=>s.location===player.location&&!s.looted&&!world.stashIntel?.[player.id]?.includes(s.id)).sort((a,b)=>a.id.localeCompare(b.id))[0];
 if(!stash)return {ok:false,message:'В этом секторе у меня больше нет свежих координат. Сначала проверь старые тайники.'};
 const price=22000+(seeded(stash.id)%4)*7000;const state=player.state;if((Number(state.money)||0)<price)return {ok:false,message:`За проверенные координаты нужно ${price.toLocaleString('ru-RU')} ₽. Денег недостаточно.`};
 state.money-=price;world.stashIntel[player.id] ||= [];world.stashIntel[player.id].push(stash.id);world.stashIntelRevision=(world.stashIntelRevision||0)+1;
 return {ok:true,state,price,stash:publicStashes(world,player.id,player.location).find(s=>s.id===stash.id),message:`${npc.name} передал координаты тайника за ${price.toLocaleString('ru-RU')} ₽. Отметка появилась в полевом журнале.`};
}
function lootStash(world,player,stashId,SHOP,now=Date.now()){
 const stash=world.stashes?.[String(stashId||'')];if(!stash||stash.looted)return {ok:false,message:'Тайник уже опустошён или не существует.'};
 if(stash.location!==player.location)return {ok:false,message:'Тайник находится в другом секторе.'};
 if(!world.stashIntel?.[player.id]?.includes(stash.id))return {ok:false,message:'Сначала найди записку или купи координаты у информатора.'};
 if(Math.hypot((Number(player.x)||0)-stash.x,(Number(player.y)||0)-stash.y)>18)return {ok:false,message:'Подойди к тайнику ближе (не дальше 18 метров).'};
 const loot=stash.loot,goods=SHOP[loot.id];if(goods)addItem(player.state,goods,loot.qty);player.state.money=clamp((Number(player.state.money)||0)+(loot.money||0),0,99999999);stash.looted=true;stash.lootedBy=player.id;stash.lootedAt=now;stash.noteReadAt=now;
 return {ok:true,state:player.state,message:`Тайник обыскан: ${goods?.name||'припасы'} ×${loot.qty}${loot.money?`, ${loot.money} ₽`:''}.`,stashId:stash.id};
}
module.exports={initStashes,publicStashes,searchStashArea,buyStashIntel,lootStash,NOTES};
