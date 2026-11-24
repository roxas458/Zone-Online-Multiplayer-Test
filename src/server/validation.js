// Input sanitization and player-state normalization.
function clean(value, max = 80) {
  return String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
}

function validId(value) {
  return /^[a-f0-9-]{16,64}$/i.test(String(value || ''));
}

function createSafeState(FACTIONS, LOCATIONS) {
  const boundedNumber = (value, fallback, min, max) => {
    const number = value === null || value === '' ? NaN : Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
  };

  return function safeState(input) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const name = clean(source.name, 24) || 'Сталкер';
    const faction = FACTIONS.has(source.faction) ? source.faction : 'Одиночки';
    const characterCreated = source.characterCreated === true;
    const loc = LOCATIONS.has(source.loc) ? source.loc : 'cordon';
    const money = boundedNumber(source.money, 0, 0, 99999999);
    // Zero HP is a valid defeated/dead state; do not turn it back into 100.
    const hp = boundedNumber(source.hp, 100, 0, 100);
    const xp = boundedNumber(source.xp, 0, 0, 1e7);
    const rep = boundedNumber(source.rep, 0, -1000, 1000);

    // Keep game-specific fields, but make the canonical fields safe in BOTH
    // the summary and the persisted state. Previously only the summary was
    // clamped, allowing oversized values to survive in state and be reused.
    const state = {
      ...source,
      name,
      faction,
      characterCreated,
      loc,
      money,
      hp,
      xp,
      rep
    };

    return { name, faction, characterCreated, loc, money, hp, xp, rep, state };
  };
}

module.exports = { clean, validId, createSafeState };
