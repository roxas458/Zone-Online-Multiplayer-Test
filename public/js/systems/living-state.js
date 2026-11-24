// Persistent local living-world state defaults and bounded news feeds.
(function (global) {
  "use strict";

  const DEFAULT_CONTRACTS = Object.freeze([
    Object.freeze({ id: "supply_cordon", title: "Снабжение Кордона", giver: "Сидорович", loc: "cordon", desc: "Передай 2 единицы металлолома торговцу.", item: "scrap", qty: 2, reward: 260, xp: 30, rep: 4 }),
    Object.freeze({ id: "scout_dump", title: "Разведка Свалки", giver: "Разведчик", loc: "dump", desc: "Посети Свалку и подтверди маршрут.", item: null, qty: 0, reward: 190, xp: 24, rep: 3 }),
    Object.freeze({ id: "science_yantar", title: "Образцы для лаборатории", giver: "Профессор Сахаров", loc: "yantar", desc: "Доставь один артефакт на Янтарь.", item: "artifact", qty: 1, reward: 480, xp: 55, rep: 7 })
  ]);

  function initialize(state, npcs = []) {
    state.relationships ||= {};
    state.factionRanks ||= {};
    state.contracts ||= DEFAULT_CONTRACTS.map(contract => ({ ...contract }));
    state.patrols ||= [];
    state.campFeed ||= [];
    state.emission ||= { active: false, warning: false };
    state.worldTick ||= 0;
    for (const npc of npcs || []) {
      if (state.relationships[npc.id] === undefined) state.relationships[npc.id] = 0;
    }
    return state;
  }

  function appendNews(state, title, body, clock) {
    state.news.unshift({ day: clock.day, hour: clock.time, title, body });
    state.news = state.news.slice(0, 60);
    state.campFeed.unshift({ title, body, day: state.day });
    state.campFeed = state.campFeed.slice(0, 12);
    return state;
  }

  global.ZoneLivingState = Object.freeze({ initialize, appendNews });
})(window);
