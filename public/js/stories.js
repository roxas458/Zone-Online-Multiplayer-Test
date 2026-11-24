/* ZONE ONLINE 4.9 — personal story threads. State is stored in the player's save. */
(function(root){
  const threads=[
    {id:'sid_cache',npc:'sid',title:'Чужой тайник',place:'dump',placeName:'Свалка',intro:'Сидорович получил обрывок координат старого тайника. Он не доверяет случайным проводникам и предлагает тебе проверить место.',task:'Найти тайник на Свалке и выяснить, кто успел побывать там раньше.',finish:'В тайнике остались следы недавней стоянки и аккуратно сложенные припасы. Сидорович получает сведения, а ты — свою долю.',reward:180,rep:3,xp:12},
    {id:'wolf_signal',npc:'wolf',title:'Тихий сигнал',place:'swamps',placeName:'Большие Болота',intro:'Волк несколько ночей подряд ловит на старой частоте короткий сигнал бедствия. Позывной ему незнаком.',task:'Добраться до болотной тропы и проверить источник сигнала.',finish:'Сигнал оказался старым аварийным передатчиком. Внутри корпуса сохранилась записка с именами пропавшей группы.',reward:140,rep:4,xp:15},
    {id:'saharov_trace',npc:'prof',title:'След в пепле',place:'yantar',placeName:'Янтарь',intro:'Профессор Сахаров просит проверить необычные показания детектора у старого научного маршрута. Данные слишком похожи на записи прошлой экспедиции.',task:'Вернуться на Янтарь и передать полевые наблюдения учёным.',finish:'Показания совпали с архивной аномалией. Учёные добавили новую отметку на карту и поделились частью исследовательского фонда.',reward:220,rep:5,xp:18}
  ];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(state){
    state.storyProgress ||= {};
    const cards=threads.map(t=>{
      const npc=state.npcs.find(n=>n.id===t.npc);if(!npc)return '';
      const stage=Number(state.storyProgress[t.id]||0),done=stage>=2,atPlace=state.loc===t.place;
      const status=done?'ДЕЛО ЗАВЕРШЕНО':stage===1?'АКТИВНОЕ ДЕЛО':'НОВАЯ ИСТОРИЯ';
      const body=done?t.finish:stage===1?t.task:t.intro;
      const action=done?'<span class="story-complete">✓ История завершена</span>':stage===0?`<button onclick="chooseStory('${t.id}')">Взяться за дело</button>`:atPlace?`<button onclick="chooseStory('${t.id}')">Завершить расследование</button>`:`<button onclick="travel('${t.place}')">Отправиться: ${esc(t.placeName)}</button>`;
      return `<article class="story-card ${done?'completed':''}"><div class="story-card-top"><span class="story-status">${status}</span><span class="story-reward">Награда: ${t.reward} ₽ · ${t.rep} реп.</span></div><h3>${esc(t.title)}</h3><div class="story-contact">Контакт: ${esc(npc.name)} · ${esc(npc.role||'сталкер')}</div><p>${esc(body)}</p>${stage===1&&!done?`<div class="story-destination">ЦЕЛЬ: ${esc(t.placeName)} ${atPlace?'· ТЫ НА МЕСТЕ':'· ТРЕБУЕТСЯ ПЕРЕХОД'}</div>`:''}<div class="story-card-action">${action}</div></article>`;
    }).join('');
    return cards||'<div class="mutedbox">Пока нет доступных личных историй.</div>';
  }
  function choose(state,id){
    const t=threads.find(x=>x.id===id);if(!t)return {ok:false,message:'История не найдена.'};
    state.storyProgress ||= {};const stage=Number(state.storyProgress[id]||0);
    if(stage===0){state.storyProgress[id]=1;return {ok:true,message:`Начато дело «${t.title}». Цель: ${t.placeName}.`};}
    if(stage>=2)return {ok:false,message:'Это дело уже завершено.'};
    if(state.loc!==t.place)return {ok:false,message:`Сначала доберись до района «${t.placeName}».`};
    state.storyProgress[id]=2;state.money=(state.money||0)+t.reward;state.rep=(state.rep||0)+t.rep;state.xp=(state.xp||0)+t.xp;
    const rel=state.relationships ||= {};rel[t.npc]=Math.min(100,(rel[t.npc]||0)+8);
    return {ok:true,message:`История «${t.title}» завершена. ${t.finish} Награда: ${t.reward} ₽, ${t.rep} репутации, ${t.xp} опыта.`};
  }
  root.ZoneStories={render,choose,threads:threads.map(({id,title,place})=>({id,title,place}))};
})(window);
