'use strict';

// Only faction-controlled or faction-headquarters sectors are valid fresh-character spawn points.
const SPAWN_BY_FACTION = Object.freeze({
  'Одиночки':'cordon','Долг':'bar','Свобода':'army','Бандиты':'dump','Военные':'agro',
  'Учёные':'yantar','Наёмники':'limansk','Монолит':'radar','Чистое небо':'swamps','Ренегаты':'darkhollow'
});
const SPAWN_OPTIONS_BY_FACTION = Object.freeze({
  'Одиночки':['cordon','zaton'],'Долг':['bar'],'Свобода':['army'],'Бандиты':['dump','dark'],
  'Военные':['agro'],'Учёные':['yantar'],'Наёмники':['limansk','wild'],
  'Монолит':['radar','chaes','pripyat'],'Чистое небо':['swamps'],'Ренегаты':['darkhollow']
});
function resolveFactionSpawn(faction, requested) {
  const fallback = SPAWN_BY_FACTION[faction] || 'cordon';
  const allowed = SPAWN_OPTIONS_BY_FACTION[faction] || [fallback];
  return { location: allowed.includes(requested) ? requested : fallback, allowed: [...allowed] };
}
module.exports = { SPAWN_BY_FACTION, SPAWN_OPTIONS_BY_FACTION, resolveFactionSpawn };
