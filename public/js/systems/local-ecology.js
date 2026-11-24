// Deterministic offline ecology seed data. Does not mutate game state.
(function (global) {
  "use strict";

  const ZONES = Object.freeze(['cordon','swamps','dump','bar','agro','dark','yantar','army','red','pripyat','zaton','jupiter','radar','wild','darkhollow','limansk','chaes']);
  const SPECIES = Object.freeze(['плоть','псевдособака','кабан','снорк','контролёр','кровосос','тушкан','зомбированный сталкер']);
  const ANOMALY_KINDS = Object.freeze(['Электра','Жарка','Воронка','Кисель','Трамплин','Карусель','Пузырь','Пси-поле','Газировка','Комета','Пепелище','Мясорубка']);
  const EXTRA_ANOMALIES = Object.freeze([['cordon','Газировка'],['dump','Мясорубка'],['yantar','Пепелище'],['red','Комета'],['pripyat','Пси-поле'],['swamps','Кисель'],['jupiter','Электра'],['dark','Воронка']]);

  function createFallback() {
    const anomalies = ZONES.map((location, i) => ({
      id: 'local_anomaly_' + i, location, kind: ANOMALY_KINDS[(i * 5) % ANOMALY_KINDS.length], danger: 35 + (i * 17) % 65
    }));
    for (let i = 0; i < EXTRA_ANOMALIES.length; i++) {
      const [location, kind] = EXTRA_ANOMALIES[i];
      anomalies.push({ id: 'local_anomaly_extra_' + (i + 1), location, kind, danger: 42 + (i * 9) % 48 });
    }
    const mutantPacks = ZONES.map((location, i) => ({
      id: 'local_pack_' + i, location, species: SPECIES[(i * 3) % SPECIES.length], count: 2 + (i * 5) % 6, aggression: 30 + (i * 13) % 70
    }));
    return { mutantPacks, anomalies };
  }

  global.ZoneLocalEcology = Object.freeze({ createFallback });
})(window);
