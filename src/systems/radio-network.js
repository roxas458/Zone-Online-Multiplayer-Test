'use strict';
const MAX_MESSAGES=100;
const RADIO_CALLS=[
 {kind:'help',title:'Запрос помощи',make:(n,l)=>`Нужна помощь на маршруте возле сектора «${l}». Самостоятельно не справляемся. Если кто рядом — отзовитесь.`,activity:'просит помощи'},
 {kind:'movement',title:'Передвижение отряда',make:(n,l)=>`Наш отряд выдвигается из района «${l}». Проверяем дорогу и выйдем на связь после прибытия.`,activity:'сообщает о выдвижении'},
 {kind:'patrol',title:'Патруль',make:(n,l)=>`Патруль «${n}» занял наблюдательную точку в секторе «${l}». Пока всё спокойно, продолжаем осмотр.`,activity:'докладывает о патруле'},
 {kind:'sighting',title:'Замечена активность',make:(n,l)=>`В районе «${l}» замечено движение неизвестной группы. Не приближайтесь без необходимости. Передаю координаты дежурному.`,activity:'сообщает о наблюдении'},
 {kind:'trade',title:'Обновление запасов',make:(n,l)=>`На базе в секторе «${l}» обновили часть припасов. Торговец принимает посетителей, ассортимент уточняйте на месте.`,activity:'передаёт торговую сводку'},
 {kind:'anomaly',title:'Аномальный сигнал',make:(n,l)=>`Детектор фиксирует нестабильный сигнал неподалёку от «${l}». Нужны наблюдатели и осторожная проверка.`,activity:'сообщает об аномальном сигнале'},
 {kind:'mutants',title:'Следы мутантов',make:(n,l)=>`На подходах к «${l}» обнаружены свежие следы мутантов. Рекомендуем временно держаться основного маршрута.`,activity:'предупреждает об угрозе'},
 {kind:'return',title:'Отряд вернулся',make:(n,l)=>`Разведка завершена. Группа вернулась в сектор «${l}». Есть наблюдения, передадим их командиру после отдыха.`,activity:'докладывает о возвращении'}
];
function ensureFactionRadio(world){world.factionRadio ||= {};return world.factionRadio;}
function listFactionRadio(world,faction){const radio=ensureFactionRadio(world);return (radio[faction]||[]).slice(-MAX_MESSAGES);}
function createNpcRadioMessage(world,faction,now=Date.now(),rng=Math.random){
 const roster=Object.values(world?.npcState||{}).filter(n=>n&&n.alive!==false&&n.faction===faction);
 const npc=roster.length?roster[Math.floor(rng()*roster.length)]:null;
 const call=RADIO_CALLS[Math.floor(rng()*RADIO_CALLS.length)];
 const location=npc?.location||npc?.loc||Object.keys(world?.territoryOwners||{})[0]||'cordon';
 const name=npc?.name||({ 'Одиночки':'Волк','Долг':'Дежурный Долга','Свобода':'Радист Свободы','Бандиты':'Связной','Военные':'Дежурный поста','Учёные':'Лаборант','Наёмники':'Оператор','Монолит':'Голос Монолита','Чистое небо':'Связист Чистого неба','Ренегаты':'Наблюдатель' }[faction]||'Сталкер');
 const message={id:`radio-${now}-${Math.floor(rng()*1e9).toString(36)}`,faction,name,text:call.make(name,location),kind:call.kind,title:call.title,at:now,location,source:'npc'};
 const radio=ensureFactionRadio(world);radio[faction] ||= [];radio[faction].push(message);if(radio[faction].length>MAX_MESSAGES)radio[faction]=radio[faction].slice(-MAX_MESSAGES);
 return message;
}
module.exports={MAX_MESSAGES,RADIO_CALLS,ensureFactionRadio,listFactionRadio,createNpcRadioMessage};
