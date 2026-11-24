// Pure local territory-operation policy. Game state, notifications and persistence stay in game.js.
(function (global) {
  "use strict";

  const OPERATION_COST = 350;
  const CONTROL_GAIN = 25;
  const CAPTURE_THRESHOLD = 100;
  const CAPTURED_CONTROL = 55;

  function evaluate(location, faction, money) {
    if (!location) return { status: "missing" };
    if (location.owner === faction) return { status: "already-owned" };
    if (money < OPERATION_COST) return { status: "insufficient-funds", cost: OPERATION_COST };

    const nextControl = Math.min(100, location.control + CONTROL_GAIN);
    const captured = nextControl >= CAPTURE_THRESHOLD;
    return {
      status: captured ? "captured" : "progress",
      cost: OPERATION_COST,
      previousOwner: location.owner,
      control: captured ? CAPTURED_CONTROL : nextControl,
      reputationGain: captured ? 8 : 0,
    };
  }

  global.ZoneTerritoryOperations = Object.freeze({ evaluate, OPERATION_COST, CONTROL_GAIN });
})(window);
