'use strict';

const PHASES = Object.freeze({
  calm: { label: 'Спокойно', duration: null },
  warning: { label: 'Предупреждение', duration: 3 * 60 * 1000 },
  active: { label: 'Выброс', duration: 2 * 60 * 1000 },
  cooldown: { label: 'Остаточный фон', duration: 8 * 60 * 1000 }
});

function randomBetween(random, min, max) {
  return min + Math.floor(Math.max(0, Math.min(0.999999, Number(random()) || 0)) * (max - min + 1));
}

function initEmission(world, now = Date.now(), random = Math.random) {
  if (!world || typeof world !== 'object') throw new TypeError('world must be an object');
  const current = world.emission;
  if (!current || !PHASES[current.phase]) {
    world.emission = {
      phase: 'calm', cycle: 0, startedAt: now,
      endsAt: 0, nextAt: now + randomBetween(random, 20, 35) * 60 * 1000,
      lastTransitionAt: now
    };
  } else {
    current.cycle = Math.max(0, Math.floor(Number(current.cycle) || 0));
    current.startedAt = Number(current.startedAt) || now;
    current.endsAt = Math.max(0, Number(current.endsAt) || (current.phase === 'calm' ? 0 : now + (PHASES[current.phase].duration || 0)));
    current.nextAt = Math.max(0, Number(current.nextAt) || (current.phase === 'calm' ? now + 20 * 60 * 1000 : 0));
    current.lastTransitionAt = Number(current.lastTransitionAt) || current.startedAt;
  }
  return world.emission;
}

function transition(emission, phase, now, random) {
  emission.phase = phase;
  emission.startedAt = now;
  emission.lastTransitionAt = now;
  const duration = PHASES[phase].duration;
  emission.endsAt = duration ? now + duration : 0;
  if (phase === 'calm') emission.nextAt = now + randomBetween(random, 20, 35) * 60 * 1000;
  if (phase === 'warning') { emission.cycle += 1; emission.nextAt = 0; }
  return {
    type: 'emission_phase', phase, cycle: emission.cycle, at: now,
    title: phase === 'warning' ? 'Предупреждение о выбросе'
      : phase === 'active' ? 'Начался выброс'
      : phase === 'cooldown' ? 'Выброс отступил' : 'Зона постепенно успокаивается',
    body: phase === 'warning' ? 'Детекторы фиксируют резкий рост активности. Срочно найди капитальное укрытие.'
      : phase === 'active' ? 'Началась волна выброса. На открытой местности смертельно опасно.'
      : phase === 'cooldown' ? 'Основная волна прошла. Остаточный радиационный фон всё ещё опасен.'
      : 'Активность снизилась. До следующего выброса есть время подготовиться.'
  };
}

function tickEmission(world, now = Date.now(), random = Math.random) {
  const emission = initEmission(world, now, random);
  if (emission.phase === 'calm' && now >= emission.nextAt) return transition(emission, 'warning', now, random);
  if (emission.phase === 'warning' && now >= emission.endsAt) return transition(emission, 'active', now, random);
  if (emission.phase === 'active' && now >= emission.endsAt) return transition(emission, 'cooldown', now, random);
  if (emission.phase === 'cooldown' && now >= emission.endsAt) return transition(emission, 'calm', now, random);
  return null;
}

function emissionDamage(sheltered = false, suitProtection = 0) {
  if (sheltered) return { hp: 0, radiation: 0, stamina: 0 };
  const protection = Math.max(0, Math.min(80, Number(suitProtection) || 0));
  const factor = 1 - protection / 100;
  return {
    hp: Math.max(1, Math.round(12 * factor)),
    radiation: Math.max(2, Math.round(18 * factor)),
    stamina: 8
  };
}

function publicEmissionState(world) {
  const e = initEmission(world);
  return { phase: e.phase, cycle: e.cycle, startedAt: e.startedAt, endsAt: e.endsAt, nextAt: e.nextAt, label: PHASES[e.phase].label };
}

module.exports = { PHASES, initEmission, tickEmission, emissionDamage, publicEmissionState };
