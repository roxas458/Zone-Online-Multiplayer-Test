// Story NPC identity, faction metadata, roles, and initial roster construction.
'use strict';
const NPC_FACTIONS = Object.freeze({
  sid:'Одиночки', wolf:'Одиночки', fanatic:'Одиночки', scout:'Одиночки', bandit:'Бандиты',
  barman:'Одиночки', seriy:'Одиночки', scientist:'Учёные', merc:'Наёмники', prof:'Учёные',
  freedom:'Свобода', guide:'Одиночки', loner:'Одиночки', lebedev:'Чистое небо', novikov:'Чистое небо',
  cold:'Чистое небо', renegade_leader:'Ренегаты', renegade_scout:'Ренегаты', lukash:'Свобода', voronin:'Долг', sultan:'Бандиты', beard:'Одиночки',
  charon:'Монолит', wolfhound:'Наёмники', archivist:'Учёные', kravtsov:'Военные', monolith_scout:'Монолит'
});
const ROLES = Object.freeze({ sid:'торговец', wolf:'сталкер', fanatic:'сталкер', scout:'разведчик', bandit:'бандит', barman:'торговец', seriy:'сталкер', scientist:'учёный', merc:'наёмник', prof:'учёный', freedom:'боец', guide:'проводник', loner:'сталкер', lebedev:'командир', novikov:'техник', cold:'боец', renegade_leader:'главарь ренегатов', renegade_scout:'разведчик ренегатов', lukash:'командир', voronin:'командир', sultan:'главарь', beard:'торговец', charon:'командир', wolfhound:'боец', archivist:'учёный', kravtsov:'военный', monolith_scout:'разведчик' });
const NPC_DISPLAY = {sid:'Сидорович',wolf:'Волк',fanatic:'Фанатик',scout:'Разведчик',bandit:'Бандит',barman:'Бармен',seriy:'Серый',scientist:'Учёный',merc:'Наёмник',prof:'Профессор Сахаров',freedom:'Свободовец',guide:'Проводник',loner:'Одиночка',lebedev:'Николай Лебедев',novikov:'Новиков',cold:'Холод',renegade_leader:'Грач',renegade_scout:'Шило',lukash:'Лукаш',voronin:'Генерал Воронин',sultan:'Султан',beard:'Борода',charon:'Харон',wolfhound:'Вольфхаунд',archivist:'Архивист',kravtsov:'Командир Кравцов',monolith_scout:'Монолитовский разведчик'};
function createNpcRoster(npcHome, now = Date.now()) {
  const roster = {};
  for (const [id, location] of Object.entries(npcHome || {})) {
    roster[id] = { id, name: NPC_DISPLAY[id] || id, faction: NPC_FACTIONS[id] || 'Одиночки', role: ROLES[id] || 'сталкер', location, homeLocation:location, baseLocation:location, destination: null, action: 'camp', behavior:'camp', duty:'base_guard', guardPost:true, mood: 'спокоен', health: 100, morale: 60, supplies: 50, needs:{hunger:0,thirst:0,fatigue:0,stress:0}, lastNeedsAt:now, alive: true, lastActionAt: now, nextDecisionAt:now+5*60000, relationships: {}, inventory: [], history: [], generated:false, dialogueVersion:0, dialogueCycle:Math.floor(now/900000), lastApproachAt:0, route:[] };
  }
  return roster;
}
module.exports = { NPC_FACTIONS, ROLES, createNpcRoster };
