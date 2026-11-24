// Shared quest-condition rules. Rewards and state mutations stay in the
// existing client/server authority flows; this module only validates progress.
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ZoneQuests = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function itemCount(items, itemId) {
    return (Array.isArray(items) ? items : []).reduce((sum, item) =>
      sum + (item && item.id === itemId ? Math.max(0, Number(item.qty) || 0) : 0), 0);
  }

  function itemTypeCount(items, itemType) {
    return (Array.isArray(items) ? items : []).reduce((sum, item) =>
      sum + (item && item.type === itemType ? Math.max(0, Number(item.qty) || 0) : 0), 0);
  }

  function hasPoint(state, location, pointId) {
    return !!state?.keyPoints?.[location]?.some(point => point.id === pointId && point.discovered);
  }

  function storyCondition(state, questId) {
    const flags = state?.storyFlags || {};
    const point = (location, id) => hasPoint(state, location, id);
    const checks = {
      story_swamp_signal: () => !!flags.metLebedev && point("swamps", "swamps_extra_0"),
      story_swamp_relay: () => !!flags.metNovikov && point("swamps", "swamps_extra_3"),
      story_yantar_echo: () => !!flags.metSakharov && point("yantar", "yantar_extra_0"),
      story_north_route: () => !!flags.metBeard && point("jupiter", "jupiter_extra_3") && point("radar", "radar_extra_1"),
      story_pripyat_archive: () => !!flags.metArchivist && point("pripyat", "pripyat_extra_3")
    };
    return checks[questId] ? checks[questId]() : false;
  }

  function canComplete(state, quest, location) {
    if (!state || !quest) return false;
    const id = String(quest.id || "");
    const flags = state.flags || {};
    let ok = storyCondition(state, id);

    if (quest.requiredLocation) {
      const required = quest.requiredItemType
        ? itemTypeCount(state.items, quest.requiredItemType)
        : itemCount(state.items, quest.requiredItem);
      ok = location === quest.requiredLocation &&
        (!quest.requiredItem && !quest.requiredItemType || required >= Number(quest.requiredQty || 1));
    }

    if (id === "intro") ok = !!flags.metWolf;
    if (id === "scrap") ok = itemCount(state.items, "scrap") >= 3;
    if (id === "bread") ok = itemCount(state.items, "bread") >= 2;
    if (id === "rumors") ok = !!(flags.metWolf && flags.heardBar && flags.metScout && flags.metProf);
    if (id === "research") ok = !!flags.foundArtifact;
    return !!ok;
  }

  return Object.freeze({ itemCount, itemTypeCount, hasPoint, storyCondition, canComplete });
});
