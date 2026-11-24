// World-save migration extracted from the legacy client coordinator.
// This module mutates the supplied save object in place and preserves legacy semantics.
(function(global){
  "use strict";
  function migrate(state, base, helpers={}) {
    const clone = helpers.clone || (value => JSON.parse(JSON.stringify(value)));
    const addItem = helpers.addItem;

 state.locations ||= clone(base.locations); state.npcs ||= clone(base.npcs); state.factions ||= clone(base.factions); state.items ||= []; state.quests ||= clone(base.quests);
 const locationAliases={yanov:"radar",kopachi:"wild",volkhov:"darkhollow",iron:"limansk"};
 const canonicalIds=new Set(base.locations.map(l=>l.id));
 const migrateLoc=id=>locationAliases[id]|| (canonicalIds.has(id)?id:"cordon");
 state.loc=migrateLoc(state.loc||"cordon");
 for(const n of state.npcs){n.loc=migrateLoc(n.loc||n.location||"cordon");if(n.location)n.location=migrateLoc(n.location);}
 for(const [oldId,newId] of Object.entries(locationAliases)){if(state.keyPoints?.[oldId]&&!state.keyPoints[newId])state.keyPoints[newId]=state.keyPoints[oldId];}
 if(state.keyPoints){for(const [oldId,newId] of Object.entries(locationAliases)){delete state.keyPoints[oldId];}}
 state.visitedLocations=(state.visitedLocations||[]).map(migrateLoc);state.visitedLocations=[...new Set(state.visitedLocations)];
 state.locations=base.locations.map(def=>{const oldLoc=(state.locations||[]).find(x=>migrateLoc(x.id)===def.id);const npcPeople=(state.npcs||[]).filter(n=>migrateLoc(n.loc||n.location||'cordon')===def.id).map(n=>n.id);const people=[...new Set([...(oldLoc?.people||def.people||[]),...npcPeople])];return oldLoc?{...clone(def),owner:oldLoc.owner||def.owner,control:oldLoc.control??def.control,people}: {...clone(def),people};});
 for(const f of state.factions){const b=base.factions.find(x=>x.name===f.name);if(b&& !f.icon)f.icon=b.icon;}
 state.achievements ||= {}; state.diplomacy ||= {};
 const canonicalDiplomacy={
  'Одиночки':{'Долг':10,'Свобода':10,'Бандиты':-45,'Военные':-35,'Учёные':30,'Наёмники':-15,'Монолит':-60,'Чистое небо':25,'Ренегаты':-50},
  'Долг':{'Свобода':-60,'Бандиты':-55,'Военные':-40,'Учёные':30,'Наёмники':-45,'Монолит':-60,'Чистое небо':15,'Ренегаты':-50},
  'Свобода':{'Бандиты':-45,'Военные':-50,'Учёные':25,'Наёмники':-45,'Монолит':-60,'Чистое небо':25,'Ренегаты':-55},
  'Бандиты':{'Военные':-45,'Учёные':-20,'Наёмники':0,'Монолит':-60,'Чистое небо':-45,'Ренегаты':15},
  'Военные':{'Учёные':45,'Наёмники':-40,'Монолит':-60,'Чистое небо':0,'Ренегаты':-45},
  'Учёные':{'Наёмники':0,'Монолит':-60,'Чистое небо':35,'Ренегаты':-50},
  'Наёмники':{'Монолит':-60,'Чистое небо':0,'Ренегаты':-15},
  'Монолит':{'Чистое небо':-60,'Ренегаты':-60},'Чистое небо':{'Ренегаты':-55}
 };
 if(Number(state.diplomacyVersion||0)<2){state.diplomacy={};for(const a of Object.keys(canonicalDiplomacy)){state.diplomacy[a]={};for(const [b,v] of Object.entries(canonicalDiplomacy[a])){state.diplomacy[a][b]=v;(state.diplomacy[b]||={})[a]=v;}}state.diplomacyVersion=2;}
 for(const f of state.factions){state.diplomacy[f.name]||={};for(const other of state.factions){if(f.name!==other.name&&(f.name==='Монолит'||other.name==='Монолит'))state.diplomacy[f.name][other.name]=-60;else if(f.name!==other.name&&!Number.isFinite(Number(state.diplomacy[f.name][other.name])))state.diplomacy[f.name][other.name]=0;}}
 const names=['Васян Глюк','Лёша Дворецкий','Максим Скелет','Влад Князь','Колька Глобус','Андрюха Француз','Сева Грубиян','Пётр Авторитет','Жора Стрелец','Влад Железный','Андрей Шутник'];
 const roles=["Одиночка","Разведчик","Торговец","Проводник","Охотник за артефактами","Научный помощник"];
 const icons=["◉","♟","⌖","▣","⚑","◈","✚","☼"];
 const factions=state.factions.map(x=>x.name);
 for(const l of state.locations){l.people ||= []; if(l.people.length<6){for(let j=0;j<Math.min(3,6-l.people.length);j++){let id="wander_"+l.id+"_"+j;if(!state.npcs.some(n=>n.id===id)){let name=names[(state.npcs.length+j*3)%names.length];let role=roles[(state.npcs.length+j)%roles.length];let n={id,name,role,loc:l.id,icon:icons[(state.npcs.length+j)%icons.length],desc:"Случайный сталкер. У него есть собственные слухи о районе.",greeting:"Здорово. В этих местах лучше держать ухо востро. Что хотел узнать?",topics:[["Что нового в округе?",`Говорят, в районе «${l.name}» меняется обстановка. Кто-то ищет работу, кто-то — надёжный маршрут.`],["Кто здесь главный?",`Здесь пересекаются интересы разных групп. Сейчас заметнее всего влияние: ${l.owner}.`],["Есть работа?","Пока только слухи. Загляни позже — возможно, появится поручение."]]};n.faction=factions[(state.npcs.length+j)%factions.length];n.mood="нейтральное";state.npcs.push(n);l.people.push(id);}}}}

 if(!state.items.some(x=>x.id==="pm"))state.items.push({id:"pm",name:"ПМм",type:"Оружие",desc:"Служебный пистолет. Состояние: 78%.",weight:.9,qty:1,value:850,icon:"▰",condition:78});
 if(!state.items.some(x=>x.id==="shotgun"))state.items.push({id:"shotgun",name:"Обрез",type:"Оружие",desc:"Старое двуствольное ружьё. Состояние: 62%.",weight:2.4,qty:1,value:1250,icon:"╾",condition:62});
 if(!state.items.some(x=>x.id==="suit"))state.items.push({id:"suit",name:"Комбинезон сталкера",type:"Броня",desc:"Полевой костюм с базовой защитой.",weight:4.2,qty:1,value:1700,icon:"▤",condition:84});
 if(!state.items.some(x=>x.id==="detector"))state.items.push({id:"detector",name:"Детектор Отклик",type:"Детектор",desc:"Помогает отмечать аномальные сигналы.",weight:1.1,qty:1,value:950,icon:"⌁",condition:91});
 if(!state.items.some(x=>x.id==="helmet_stalker"))state.items.push({id:"helmet_stalker",name:"Шлем сталкера",type:"Шлем",desc:"Лёгкий защитный шлем для обычных вылазок.",weight:1.2,qty:1,value:780,condition:92,defense:1});
 if(!state.items.some(x=>x.id==="backpack_standard"))state.items.push({id:"backpack_standard",name:"Стандартный рюкзак",type:"Рюкзак",desc:"Обычный полевой рюкзак. Базовая вместимость — 50 кг.",weight:1.0,qty:1,value:450,capacity:50});
 state.equipment ||= {suit:"Кожаная куртка",tool:"Простой детектор",weapon:"Старый ПМ"}; Object.assign(state.equipment,{helmet:state.equipment.helmet||"",sidearm:state.equipment.sidearm||"",artifact:state.equipment.artifact||"",backpack:state.equipment.backpack||"Стандартный рюкзак"}); for(const item of (state.items||[])){if((item.type==="Оружие"||item.type==="Броня"||item.type==="Детектор")&&item.condition==null)item.condition=100;}
 state.hunger=Number.isFinite(state.hunger)?Math.max(0,Math.min(100,state.hunger)):18;
 state.thirst=Number.isFinite(state.thirst)?Math.max(0,Math.min(100,state.thirst)):20;
 state.storyFlags ||= {};
 state.realTimeStartedAt = Number.isFinite(Number(state.realTimeStartedAt)) ? Number(state.realTimeStartedAt) : Date.now();
 state.lastVitalsAt = Number.isFinite(Number(state.lastVitalsAt)) ? Number(state.lastVitalsAt) : Date.now();
 const content=window.ZONE_CONTENT||{};
 for(const [faction,leader] of Object.entries(content.factionLeaders||{})){const f=state.factions.find(x=>x.name===faction);if(f)f.leader=clone(leader);}
 for(const n of (content.npcs||[])){if(!state.npcs.some(x=>x.id===n.id))state.npcs.push(clone(n));const l=state.locations.find(x=>x.id===n.loc);if(l&&!l.people.includes(n.id))l.people.push(n.id);}
 for(const q of (content.storyQuests||[])){if(!state.quests.some(x=>x.id===q.id))state.quests.push({...clone(q),accepted:false,done:false});}
 // Legacy starter quests belong only to the Loners; campaign missions are explicitly faction-scoped.
 const storyFactionById={story_swamp_signal:'Чистое небо',story_swamp_relay:'Чистое небо',story_yantar_echo:'Учёные',story_north_route:'Одиночки',story_pripyat_archive:'Одиночки'};
 for(const q of state.quests){if(['intro','scrap','bread','rumors','research'].includes(q.id))q.faction='Одиночки';if(storyFactionById[q.id])q.faction=storyFactionById[q.id];}
 const factionMissions={
  'Одиночки':[{id:'fquest_loner_supply',title:'Провизия для стоянки',giver:'Тихон',desc:'Доставь 2 консервы на Кордон и вернись к механику.',requiredLocation:'cordon',requiredItem:'canned',requiredQty:2,reward:260,xp:30,rep:3},{id:'fquest_loner_scout',title:'Разведка старой дороги',giver:'Тихон',desc:'Доберись до Свалки и отметься у механика.',requiredLocation:'dump',reward:320,xp:38,rep:4}],
  'Долг':[{id:'fquest_duty_patrol',title:'Проверка периметра',giver:'Медведь',desc:'Проверь периметр на Свалке и вернись на базу Долга.',requiredLocation:'dump',reward:340,xp:40,rep:5},{id:'fquest_duty_med',title:'Медицинский резерв',giver:'Медведь',desc:'Принеси 2 аптечки для патрульного отряда.',requiredLocation:'bar',requiredItem:'med',requiredQty:2,reward:380,xp:45,rep:5}],
  'Свобода':[{id:'fquest_freedom_route',title:'Свободный маршрут',giver:'Лис',desc:'Разведай маршрут через Красный лес и вернись на базу.',requiredLocation:'red',reward:330,xp:38,rep:5},{id:'fquest_freedom_food',title:'Запас для дозора',giver:'Лис',desc:'Доставь 2 пайка для дежурной смены.',requiredLocation:'army',requiredItem:'canned',requiredQty:2,reward:360,xp:42,rep:5}],
  'Бандиты':[{id:'fquest_bandit_debt',title:'Долг за проход',giver:'Шило',desc:'Доберись до Тёмной Долины и вернись с докладом.',requiredLocation:'dark',reward:300,xp:35,rep:4},{id:'fquest_bandit_goods',title:'Товар для барыги',giver:'Шило',desc:'Принеси 2 единицы металлолома на Свалку.',requiredLocation:'dump',requiredItem:'scrap',requiredQty:2,reward:350,xp:40,rep:5}],
  'Военные':[{id:'fquest_military_checkpoint',title:'Контроль блокпоста',giver:'Сержант Ковалёв',desc:'Проверь Агропром и вернись с докладом.',requiredLocation:'agro',reward:360,xp:42,rep:5},{id:'fquest_military_med',title:'Снабжение гарнизона',giver:'Сержант Ковалёв',desc:'Доставь 2 бинта на блокпост.',requiredLocation:'agro',requiredItem:'bandage',requiredQty:2,reward:320,xp:36,rep:4}],
  'Учёные':[{id:'fquest_science_sample',title:'Полевые образцы',giver:'Кондратьев',desc:'Найди артефакт и доставь его на Янтарь.',requiredLocation:'yantar',requiredItemType:'Артефакт',requiredQty:1,reward:520,xp:60,rep:7},{id:'fquest_science_data',title:'Наблюдение за аномалией',giver:'Кондратьев',desc:'Посети Красный лес и вернись с наблюдениями.',requiredLocation:'red',reward:420,xp:50,rep:6}],
  'Наёмники':[{id:'fquest_merc_contract',title:'Контракт на разведку',giver:'Грей',desc:'Посети Лиманск и вернись к координатору.',requiredLocation:'limansk',reward:480,xp:55,rep:5},{id:'fquest_merc_parts',title:'Комплект запчастей',giver:'Грей',desc:'Доставь 2 единицы металлолома в Лиманск.',requiredLocation:'limansk',requiredItem:'scrap',requiredQty:2,reward:390,xp:45,rep:4}],
  'Монолит':[{id:'fquest_monolith_signal',title:'Зов монолита',giver:'Послушник',desc:'Доберись до Припяти и вернись с докладом.',requiredLocation:'pripyat',reward:500,xp:58,rep:6},{id:'fquest_monolith_ration',title:'Испытание верности',giver:'Послушник',desc:'Принеси 2 пайка на базу группировки.',requiredLocation:'radar',requiredItem:'ration',requiredQty:2,reward:420,xp:48,rep:5}],
  'Чистое небо':[{id:'fquest_cs_marsh',title:'Тропа через болота',giver:'Новиков',desc:'Исследуй старую насосную на Больших Болотах.',requiredLocation:'swamps',reward:360,xp:42,rep:6},{id:'fquest_cs_supplies',title:'Запас фильтров',giver:'Новиков',desc:'Доставь 2 антирада на базу.',requiredLocation:'swamps',requiredItem:'anti_rad',requiredQty:2,reward:390,xp:45,rep:6}],
  'Ренегаты':[{id:'fquest_renegade_hideout',title:'Тропа изгоев',giver:'Гвоздь',desc:'Разведай Тёмную Лощину и вернись к ремонтнику.',requiredLocation:'darkhollow',reward:330,xp:38,rep:5},{id:'fquest_renegade_scrap',title:'Добыча со старой стоянки',giver:'Гвоздь',desc:'Принеси 2 единицы металлолома.',requiredLocation:'darkhollow',requiredItem:'scrap',requiredQty:2,reward:350,xp:40,rep:5}]
 };
 for(const [faction,missions] of Object.entries(factionMissions)){for(const mission of missions){if(!state.quests.some(q=>q.id===mission.id))state.quests.push({...clone(mission),faction,accepted:false,done:false});}}
 // Give every faction a permanent technician at its home base. Existing saves are migrated without resetting progress.
 const factionTechBases={
  'Одиночки':['cordon','Тихон','Полевой механик одиночек'],
  'Долг':['bar','Медведь','Техник ремонтной службы Долга'],
  'Свобода':['army','Лис','Механик свободовцев'],
  'Бандиты':['dump','Шило','Мастер бандитской стоянки'],
  'Военные':['agro','Сержант Ковалёв','Техник ремонтной роты'],
  'Учёные':['yantar','Кондратьев','Инженер научной экспедиции'],
  'Наёмники':['limansk','Грей','Контрактный оружейник'],
  'Монолит':['radar','Послушник','Механик группировки Монолит'],
  'Чистое небо':['swamps','Новиков','Техник базы Чистого неба'],
  'Ренегаты':['darkhollow','Гвоздь','Ремонтник болотной группировки']
 };
 for(const [faction,[loc,name,desc]] of Object.entries(factionTechBases)){
  const id='faction-tech-'+faction.toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'-');
  if(!state.npcs.some(n=>n.id===id))state.npcs.push({id,name,role:'техник',faction,loc,icon:'🔧',desc,greeting:'Показывай снаряжение. Для своих сделаю по нормальной цене.',topics:[['Что ремонтируешь?','Оружие, броню и детекторы. Осмотр и ремонт прямо здесь.'],['Условия ремонта','Цена зависит от стоимости предмета и степени износа. Для бойцов нашей группировки действует скидка.']]});
  const baseLocation=state.locations.find(l=>l.id===loc);if(baseLocation){baseLocation.people||=[];if(!baseLocation.people.includes(id))baseLocation.people.push(id);}
 }
 // Run AFTER all legacy and content NPCs are loaded, otherwise old browser saves keep their real-name NPCs.
 if(typeof helpers.migrateLocalNpcCallsigns === "function") helpers.migrateLocalNpcCallsigns(state);
 if(!state.foodKitGranted){addItem("canned","Консервы","Еда","Сытный полевой паёк.",.45,65,1);addItem("water","Бутылка воды","Еда","Чистая питьевая вода.",.5,25,2);state.foodKitGranted=true;}

    return state;
  }
  global.ZoneWorldMigration = Object.freeze({ migrate });
})(window);
