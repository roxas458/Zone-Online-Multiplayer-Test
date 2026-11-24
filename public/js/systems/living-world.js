// Living-world rules: deterministic helpers for local camp stories, rumors, ranks and patrol records.
(function (global) {
  "use strict";
  const CAMP_STORIES = Object.freeze([
    "У костра спорят о безопасной тропе через соседний сектор.",
    "Кто-то рассказывает историю о тайнике, который появляется на старых картах.",
    "Сталкеры делятся припасами и обсуждают последние новости КПК.",
    "Незнакомец предлагает обменяться сведениями о патрулях."
  ]);
  const RUMORS = Object.freeze([
    "На Свалке видели усиленный патруль Бандитов.",
    "Торговцы ждут караван с медикаментами на Кордоне.",
    "Учёные отмечают рост аномальной активности на Янтаре.",
    "На севере ищут проводника, знающего обходные тропы.",
    "Говорят, контроль над одним из лагерей скоро изменится."
  ]);
  function pick(list, random = Math.random) {
    if (!Array.isArray(list) || !list.length) return null;
    return list[Math.floor(random() * list.length)];
  }
  function rankForXp(value) {
    const xp = Number(value) || 0;
    return xp >= 900 ? "Ветеран" : xp >= 500 ? "Старший боец" : xp >= 250 ? "Боец" : xp >= 100 ? "Новобранец" : "Рекрут";
  }
  function campStory(random = Math.random) { return pick(CAMP_STORIES, random); }
  function rumor(random = Math.random) { return pick(RUMORS, random); }
  function createPatrol(factions, locations, random = Math.random, at = Date.now()) {
    const faction = pick(factions, random);
    const location = pick(locations, random);
    if (!faction || !location || !location.id) return null;
    return { faction: typeof faction === "string" ? faction : faction.name, loc: location.id, strength: 2 + Math.floor(random() * 7), at };
  }
  global.ZoneLivingWorld = Object.freeze({ rankForXp, campStory, rumor, createPatrol });
})(window);
