'use strict';

const ARTIFACTS = ['Медуза', 'Колючка', 'Каменный цветок', 'Пустышка', 'Огненный шар', 'Слизень'];
const TRADER_ROLES = ['торговец', 'бармен', 'техник'];
const PROTECTED_ACTIONS = new Set(['combat', 'dead', 'retreat', 'await_rescue', 'rescue_escort', 'travel', 'assault', 'mission', 'war_moving']);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

module.exports = { ARTIFACTS, TRADER_ROLES, PROTECTED_ACTIONS, clamp };
