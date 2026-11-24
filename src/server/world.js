// Shared world bootstrap helpers.
const { TERRITORY_START, createFactionDiplomacy } = require('../shared/game-data');
const { createNpcRoster } = require('../systems/npc-ai');
const { ensureRandomNpcs } = require('../systems/npc-roster');
const { buildDialogue } = require('../systems/npc-dialogue');
const { initEcosystem } = require('../systems/ecosystem');
const { initEmission } = require('../systems/emissions');
function initSharedWorld(world, NPC_HOME, LOCATIONS, COOP_TEMPLATES) {
  world.npcPositions ||= {};
  world.npcState ||= {};
  world.npcEvents ||= [];
  world.territoryOwners ||= Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v]) => [id,v.owner]));
  if(world.territoryOwners.darkhollow==='Бандиты' && Number(world.territoryControl?.darkhollow ?? TERRITORY_START.darkhollow.control)===TERRITORY_START.darkhollow.control) world.territoryOwners.darkhollow='Ренегаты';
  world.territoryControl ||= Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v]) => [id,v.control]));
  world.warOperations ||= [];
  world.battlefronts ||= []; world.convoys ||= []; world.radiationZones ||= {chaes:90,radar:82,pripyat:65,red:48,yantar:38,swamps:32,darkhollow:28,limansk:30};
  world.warHistory ||= [];
  world.discoveredPoints ||= {};
  world.zoneEvents ||= [];
  for (const [id, loc] of Object.entries(NPC_HOME)) {
    if (!LOCATIONS.has(world.npcPositions[id])) world.npcPositions[id] = loc;
  }
  const defaults = createNpcRoster(NPC_HOME);
  for (const [id, npc] of Object.entries(defaults)) world.npcState[id] ||= npc;
  ensureRandomNpcs(world,340);
  for (const [id, npc] of Object.entries(world.npcState)) { if (!LOCATIONS.has(npc.location)) npc.location = world.npcPositions[id] || NPC_HOME[id] || 'cordon'; if (!npc.generated && NPC_HOME[id] && !npc.missionOrder && npc.location !== NPC_HOME[id]) { npc.location = NPC_HOME[id]; npc.homeLocation = NPC_HOME[id]; npc.baseLocation = NPC_HOME[id]; npc.action = 'camp'; npc.behavior = 'camp'; npc.duty = 'base_guard'; npc.guardPost = true; } npc.alive = npc.alive !== false; npc.dialogueCycle ??= Math.floor(Date.now()/900000); npc.dialogueVersion ??= 0; if(!npc.dialogue || npc.dialogue.day!==npc.dialogueCycle){ npc.dialogue = buildDialogue(npc,{},Date.now()); } }
  world.npcPositions = Object.fromEntries(Object.values(world.npcState).filter(n => n.alive).map(n => [n.id, n.location]));
  world.coOpQuests ||= COOP_TEMPLATES.map(q => ({ ...q, participants: [], done: false }));
  initEcosystem(world);
  initEmission(world);
}

function initDiplomacy(world, FACTIONS) {
  // One-time migration replaces the old averaged-reputation matrix with canon defaults.
  // Later calls preserve in-game diplomatic changes, except Monolith's permanent hostility.
  if (Number(world.diplomacyVersion || 0) < 2) {
    world.diplomacy = createFactionDiplomacy([...FACTIONS]);
    world.diplomacyVersion = 2;
  }
  const defaults = createFactionDiplomacy([...FACTIONS]);
  world.diplomacy ||= {};
  for (const a of FACTIONS) {
    world.diplomacy[a] ||= {};
    for (const b of FACTIONS) {
      if (a === b) continue;
      if (a === 'Монолит' || b === 'Монолит') world.diplomacy[a][b] = -60;
      else if (!Number.isFinite(Number(world.diplomacy[a][b]))) world.diplomacy[a][b] = defaults[a][b];
    }
  }
}

module.exports = { initSharedWorld, initDiplomacy };
