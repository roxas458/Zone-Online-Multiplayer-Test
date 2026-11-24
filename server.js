const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');
const {
  LOCATIONS, FACTIONS, TERRITORY_START, NPC_HOME, TRADE_ITEM_IDS, SHOP, SELL_VALUES,
  COOP_TEMPLATES, ZONE_EVENTS
} = require('./src/shared/game-data');
const { clean, validId, createSafeState } = require('./src/server/validation');
const { reconcilePlayerPosition } = require('./src/server/player-authority');
const { mergeClientSaveState } = require('./src/server/player-save');
const { createGuestAuth } = require('./src/server/guest-auth');
const { verifyLegacyProfileClaim } = require('./src/server/legacy-claim');
const { createSocketRateLimiter } = require('./src/server/rate-limit');
const ZoneSurvival = require('./public/js/survival.js');
const { applyPlayerTrade } = require('./src/server/player-trade');
const safeState = createSafeState(FACTIONS, LOCATIONS);
const guestSessionSecret = process.env.ZONE_SESSION_SECRET || crypto.randomBytes(48).toString('hex');
const guestAuth = createGuestAuth({ secret: guestSessionSecret });
if (!process.env.ZONE_SESSION_SECRET) console.warn('[auth] ZONE_SESSION_SECRET is not configured; guest sessions will be invalidated when this process restarts.');
const { createMoveOrder, advanceMoveOrder } = require('./src/systems/player-orders');
const { resolveSectorAtPosition } = require('./src/systems/sector-position');
const { createExpedition, advanceExpedition, findRoute } = require('./src/systems/expedition');
const { resolveFactionSpawn } = require('./src/systems/faction-spawns');
const { initSharedWorld, initDiplomacy } = require('./src/server/world');
const { WAR_CONFIG, createOperation, deploymentPower, addDeployment, resolveOperation } = require('./src/systems/war');
const { tickNpcWorld, tickNpcMovement, tickNpcProximityCombat, interactWithNpc, isHostileFaction } = require('./src/systems/npc-ai');
const { npcWorldPosition, inRange, INTERACTION_RADIUS, COMBAT_RADIUS } = require('./src/systems/proximity');
const { ensureOnlineWorld, appendWorldEvent, buildWorldSync, publicWorldStatus } = require('./src/systems/online-world');
const { initEcosystem, tickEcosystem, tickMutantMovement, upgradeBase, createClan, joinClan, addEcoEvent } = require('./src/systems/ecosystem');
const { initSouls, tickSouls } = require('./src/systems/souls');
const { tickNpcLife } = require('./src/systems/npc-life');
const { initFactionWar, tickFactionWar, aggregateTerritories } = require('./src/systems/faction-war');
const { tickNpcAftermath, lootCorpse } = require('./src/systems/npc-aftermath');
const { tickNpcRescue } = require('./src/systems/npc-rescue');
const { initStashes, publicStashes, searchStashArea, buyStashIntel, lootStash } = require('./src/systems/stashes');
const { tickEmission, emissionDamage, publicEmissionState } = require('./src/systems/emissions');
const { ensureFactionRadio, listFactionRadio, createNpcRadioMessage } = require('./src/systems/radio-network');

const online = new Map();
const recentChat = [];
let pool = null;
let dbReady = false;
let dbInitialization = Promise.resolve();
let world = { diplomacy: {}, events: [], revision: 1, npcPositions: {}, coOpQuests: [], discoveredPoints: {}, zoneEvents: [], warOperations: [], warHistory: [], eventLog: [] };
let npcTickRunning = false;

const NPC_RICH_TRADERS = new Set(['sid','barman','scout','prof','scientist','beard']);
const NPC_WEAPON_STOCK = new Set(['weapon_pm','weapon_aks74u','weapon_toz34','weapon_ak74','weapon_vintar']);
const NPC_STARTING_STOCK = Object.freeze(Object.keys(SHOP));
function npcEconomyFor(npc) {
  world.npcEconomy ||= {};
  const id=String(npc.id);
  const isRich=NPC_RICH_TRADERS.has(id)||String(npc.role||'').toLowerCase().includes('торгов');
  let account=world.npcEconomy[id];
  if(!account) {
    account={
      balance:NPC_RICH_TRADERS.has(id)||String(npc.role||'').toLowerCase().includes('торгов')?10000000:5000,
      stock:Object.fromEntries(NPC_STARTING_STOCK.map(item=>[item,NPC_WEAPON_STOCK.has(item)&&!isRich?0:Math.max(2,(SHOP[item]?.qty||1)*5)])),
      maxStock:Object.fromEntries(NPC_STARTING_STOCK.map(item=>[item,NPC_WEAPON_STOCK.has(item)&&!isRich?0:Math.max(8,(SHOP[item]?.qty||1)*16)])),
      restockedAt:Date.now(),
      history:[]
    };
    world.npcEconomy[id]=account;
  }
  account.balance=Math.max(0,Math.min(999999999,Math.floor(Number(account.balance)||0)));
  account.stock ||= {};
  account.maxStock ||= {};
  if(isRich&&!account.capitalBoosted){account.balance=Math.max(Number(account.balance)||0,250000);account.capitalBoosted=true;}
  for(const item of NPC_STARTING_STOCK){const goods=SHOP[item],weaponLocked=NPC_WEAPON_STOCK.has(item)&&!isRich;account.stock[item]??=(weaponLocked?0:Math.max(2,(goods?.qty||1)*5));account.maxStock[item]??=(weaponLocked?0:Math.max(8,(goods?.qty||1)*16));}
  account.history ||= [];
  const now=Date.now(), elapsed=now-(Number(account.restockedAt)||now);
  if(elapsed>=300000) {
    const cycles=Math.min(12,Math.floor(elapsed/300000));
    for(const item of Object.keys(account.stock)) {
      if(!SHOP[item])continue;
      const configuredMax=Number(account.maxStock[item]);
      const max=Number.isFinite(configuredMax)?Math.max(0,Math.min(99,configuredMax)):Math.max(1,Math.min(99,(SHOP[item].qty||1)*10));
      if(max===0){account.stock[item]=0;continue;}
      account.stock[item]=Math.min(max,Math.max(0,Number(account.stock[item])||0)+cycles*(SHOP[item].qty||1));
    }
    account.restockedAt=now;
  }
  return account;
}
function recordNpcTrade(account, entry) {
  account.history.unshift({...entry,at:Date.now()});
  account.history=account.history.slice(0,30);
}


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET','POST'] },
  // Keep the original single-connection transport. Render supports WebSockets;
  // polling can fail when successive requests are routed to different instances.
  transports: ['websocket','polling'],
  allowUpgrades: true,
  pingInterval: 20000,
  pingTimeout: 45000,
  connectTimeout: 30000,
  // Player saves contain the complete persistent game state. The Socket.IO
  // default (1 MB) rejected valid player:hello/player:save packets and closed
  // otherwise successful WebSocket handshakes. Keep a bounded 10 MB ceiling.
  maxHttpBufferSize: 10 * 1024 * 1024
});
io.engine.on('connection', rawSocket=>{
  console.info(`[engine] handshake id=${rawSocket.id} transport=${rawSocket.transport.name} origin=${clean(rawSocket.request.headers.origin||'unknown',180)}`);
  rawSocket.on('error', error=>console.error(`[engine] socket_error id=${rawSocket.id} transport=${rawSocket.transport.name}: ${clean(error?.message||error,240)}`));
  rawSocket.on('close', (reason, description)=>console.warn(`[engine] socket_closed id=${rawSocket.id} transport=${rawSocket.transport.name} reason=${clean(reason,120)} detail=${clean(description?.message||'',200)}`));
});
io.engine.on('connection_error', error=>console.error(`[engine] connection_error code=${error.code} message=${error.message} context=${JSON.stringify(error.context||{})}`));
const PORT = process.env.PORT || 3000;
const allowSocketEvent = createSocketRateLimiter();
const SERVER_PROCESS_STARTED_AT = Date.now();
const SECTOR_COORDS = Object.freeze({chaes:[503,104],zaton:[561,405],pripyat:[676,649],jupiter:[391,703],limansk:[128,838],red:[311,903],radar:[675,897],army:[502,1046],wild:[347,1212],bar:[441,1215],yantar:[174,1302],dump:[466,1470],agro:[243,1528],dark:[787,1418],cordon:[463,1753],swamps:[185,1788],darkhollow:[793,1742]});
app.use(express.json({limit:'64kb'}));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req,res) => { res.set('Access-Control-Allow-Origin','*'); res.set('Cache-Control','no-store'); res.status(200).json({ ok:true, service:'ZONE ONLINE', version:require('./package.json').version, database:dbReady?'postgres':'memory-fallback', databaseRequiredForAccounts:false, online:online.size, revision:world.revision||1, uptimeSeconds:Math.floor(process.uptime()), worldNpcCount:Object.keys(world.npcState||{}).length, timestamp:Date.now() }); });
app.get('/api/diagnostics', (_req,res) => { res.set('Access-Control-Allow-Origin','*'); res.set('Cache-Control','no-store'); res.json({ ok:true, version:require('./package.json').version, multiplayer:true, guestMode:true, database:dbReady?'postgres':'memory-fallback', online:online.size, socketPath:'/socket.io', transports:['websocket','polling'], transportMode:'websocket-first-with-polling-fallback', node:process.version, nodeMajor:Number(process.versions.node.split('.')[0]), timestamp:Date.now() }); });
app.get('/api/status', (_req,res) => res.json({ ...publicWorldStatus(world, online.size), persistent:dbReady, service:`ZONE ONLINE ${require('./package.json').version} SURVIVAL & EXPEDITIONS` }));
app.get('/api/leaderboard', (_req,res) => { res.set('Cache-Control','no-store'); res.json({ok:true,updatedAt:Date.now(),entries:buildStalkerLeaderboard(),hallOfFame:(world.stalkerHallOfFame||[]).slice(0,100),news:(world.stalkerNews||[]).slice(0,40)}); });
app.get('/api/world/snapshot', (_req,res) => res.json({ status:publicWorldStatus(world, online.size), world:publicWorldSnapshot() }));
app.get('/api/world/events', (req,res) => { const since=Number(req.query.since||0); res.json(publicWorldSync(Number.isSafeInteger(since)?since:0)); });

function publicPlayer(p){ return { id:p.id, name:p.name, faction:p.faction, location:p.location, x:p.x, y:p.y, hp:p.hp, xp:p.xp, joinedAt:p.joinedAt, lastSeen:p.lastSeen }; }
function onlineList(){ return [...online.values()].map(publicPlayer).sort((a,b)=>a.name.localeCompare(b.name,'ru')); }
function stalkerAchievements(row){
  const out=[];const kills=Number(row.kills)||0,xp=Number(row.xp)||0,discoveries=Number(row.discoveries)||0,quests=Number(row.quests)||0,travelled=Number(row.travelled)||0,mutantHunts=Number(row.mutantHunts)||0,artifacts=Number(row.artifacts)||0;
  if(kills>=1)out.push('Первая победа');if(kills>=10)out.push('Охотник');if(kills>=50)out.push('Гроза Зоны');if(kills>=100)out.push('Легендарный боец');
  if(discoveries>=5)out.push('Следопыт');if(discoveries>=25)out.push('Исследователь');if(quests>=10)out.push('Надёжный исполнитель');if(travelled>=10)out.push('Странник');if(mutantHunts>=5)out.push('Охотник на мутантов');if(artifacts>=10)out.push('Искатель артефактов');if(xp>=1000)out.push('Закалённый');
  return out;
}
function addStalkerNews(text, name='Зона'){
  world.stalkerNews ||= [];world.stalkerNews.unshift({id:crypto.randomUUID(),text:clean(text,240),name,at:Date.now()});world.stalkerNews=world.stalkerNews.slice(0,40);
}
function archiveFallenStalkers(){
  world.stalkerLeaderboard ||= {};world.stalkerHallOfFame ||= [];
  for(const npc of Object.values(world.npcState||{})){
    if(npc.alive!==false||npc.leaderboardArchived)continue;
    const id=`npc:${npc.id}`,row=world.stalkerLeaderboard[id];
    const entry={id,name:npc.name||row?.name||'Неизвестный сталкер',faction:npc.faction||row?.faction||'Неизвестно',role:npc.role||'сталкер',kills:Number(npc.combatKills)||Number(row?.kills)||0,deaths:(Number(npc.combatDeaths)||0)+1,score:Number(row?.score)||100,location:npc.location||'Неизвестно',cause:npc.deathCause||'погиб в Зоне',diedAt:Number(npc.diedAt)||Date.now(),lastVictim:npc.lastVictim||null};
    world.stalkerHallOfFame.unshift(entry);world.stalkerHallOfFame=world.stalkerHallOfFame.slice(0,100);npc.leaderboardArchived=true;
    if(row){row.alive=false;row.deaths=entry.deaths;row.diedAt=entry.diedAt;row.deathCause=entry.cause;}
    addStalkerNews(`${entry.name} выбыл из рейтинга. ${entry.cause}.`,entry.name);
  }
}
function buildStalkerLeaderboard(){
  world.stalkerLeaderboard ||= {};archiveFallenStalkers();
  for(const npc of Object.values(world.npcState||{})){
    if(npc.alive===false)continue;
    const id=`npc:${npc.id}`;
    const row=world.stalkerLeaderboard[id] ||= {id,type:'npc',name:npc.name,faction:npc.faction||'Одиночки',role:npc.role||'сталкер',kills:0,deaths:0,score:100,location:npc.location||'Неизвестно',updatedAt:Date.now()};
    row.name=npc.name||row.name;row.faction=npc.faction||row.faction;row.role=npc.role||row.role;row.location=npc.location||row.location;row.alive=true;
    row.kills=Math.max(Number(row.kills)||0,Number(npc.combatKills)||0);row.deaths=Number(npc.combatDeaths)||Number(row.deaths)||0;
    row.score=Math.max(100,100+row.kills*125+Math.max(0,Number(npc.reputation)||0)*2);row.achievements=stalkerAchievements(row);row.updatedAt=Date.now();
  }
  for(const p of online.values()){
    const id=`player:${p.id}`,st=safeState(p.state).state,career=st.careerStats||{};
    const row=world.stalkerLeaderboard[id] ||= {id,type:'player',playerId:p.id,name:p.name,faction:p.faction||'Одиночки',role:'сталкер',kills:0,deaths:0,score:100,location:p.location||'Неизвестно',updatedAt:Date.now()};
    row.name=p.name||row.name;row.faction=p.faction||row.faction;row.location=p.location||row.location;row.alive=true;
    row.kills=Math.max(Number(row.kills)||0,Number(career.kills)||0);row.xp=Number(p.xp)||0;row.discoveries=Number(career.discoveries)||0;row.travelled=Number(career.travelled)||0;row.quests=(st.quests||[]).filter(q=>q.done).length;
    row.reputation=Number(st.rep)||0;row.mutantHunts=Number(career.mutantHunts)||0;row.artifacts=(st.items||[]).filter(x=>x.type==='Артефакт').reduce((sum,x)=>sum+(Number(x.qty)||0),0);row.score=100+row.kills*150+Math.min(800,Math.floor(row.xp/10))+row.discoveries*18+row.quests*25+row.travelled*8+row.mutantHunts*20+row.artifacts*12+Math.max(-100,Math.min(100,row.reputation));row.achievements=stalkerAchievements(row);row.updatedAt=Date.now();
  }
  const rows=Object.values(world.stalkerLeaderboard).filter(row=>row.alive!==false).map(row=>({...row,score:Math.max(0,Math.floor(Number(row.score)||0)),kills:Math.max(0,Math.floor(Number(row.kills)||0)),deaths:Math.max(0,Math.floor(Number(row.deaths)||0))}));
  return rows.sort((a,b)=>b.score-a.score||b.kills-a.kills||a.name.localeCompare(b.name,'ru')).slice(0,20).map((row,index)=>({...row,place:index+1}));
}
function leaderboardPayload(){return {updatedAt:Date.now(),entries:buildStalkerLeaderboard(),hallOfFame:(world.stalkerHallOfFame||[]).slice(0,100),news:(world.stalkerNews||[]).slice(0,40)};}
function recordStalkerKill(player,npc){
  world.stalkerLeaderboard ||= {};const id=`player:${player.id}`;
  const row=world.stalkerLeaderboard[id] ||= {id,type:'player',playerId:player.id,name:player.name,faction:player.faction,role:'сталкер',kills:0,deaths:0,score:100,location:player.location};
  row.name=player.name;row.faction=player.faction;row.location=player.location;row.kills=(Number(row.kills)||0)+1;row.score=100+row.kills*150+Math.min(800,Math.floor((Number(player.xp)||0)/10));row.lastKillAt=Date.now();row.lastVictim=npc.name;row.updatedAt=Date.now();
  addStalkerNews(`${player.name} одержал победу над ${npc.name}.`,player.name);
}

function publicNpcRoster(){
  const fields=['id','name','faction','role','location','x','y','alive','generated','supportSpecialist','icon','personality','mood','action','behavior','duty','guardPost','homeLocation','health','morale','supplies','biography','friends','rivals','squadId','squadName','squadType','dialogueVersion','relationships','equipment','destinationPoint','travelTo','direction'];
  return Object.fromEntries(Object.entries(world.npcState||{}).map(([id,n])=>[id,Object.fromEntries(fields.filter(k=>n[k]!==undefined).map(k=>[k,n[k]]))]));
}
function publicWorldSnapshot(){
  // The full world is already included in player:ready. Do not include the
  // event history or NPC roster here: they are synchronized separately.
  const {npcState,npcEvents,eventLog,stashes,stashIntel,stashSearchCooldown,pendingArtifactRewards,...snapshot}=world;
  return snapshot;
}
function initialWorldSync(sinceRevision){
  // player:ready already carries a current world snapshot. Only send the
  // revision cursor here; the normal world:sync endpoint retains full replay.
  return {mode:'delta',fromRevision:Number(sinceRevision)||0,revision:Number(world.revision)||1,events:[]};
}
function publicWorldSync(sinceRevision){
  const sync=buildWorldSync(world,sinceRevision);
  if(sync.mode==='snapshot'&&sync.snapshot){
    const {npcState,npcEvents,eventLog,stashes,stashIntel,stashSearchCooldown,pendingArtifactRewards,...snapshot}=sync.snapshot;
    return {...sync,snapshot};
  }
  return sync;
}
function emitNpcState(target=io){target.emit('world:npc-state',{npcs:publicNpcRoster(),events:(world.npcEvents||[]).slice(-20),squads:world.npcSquads||[],memorial:world.npcMemorial||[],corpses:(world.npcCorpses||[]).map(({loot,...c})=>c),factionNotices:(world.factionNotices||[]).slice(0,30),rescueOperations:(world.rescueOperations||[]).slice(0,20),battlefronts:world.battlefronts||[],convoys:world.convoys||[],factionBases:world.factionBases||[],frontlineOrders:world.frontlineOrders||[],keyPoints:world.keyPoints||{},factionObjectives:world.factionObjectives||{},factionResources:world.factionResources||{},factionCommand:world.factionCommand||{},factionWarHistory:(world.factionWarHistory||[]).slice(0,30),factionPacts:world.factionPacts||[],factionRecovery:world.factionRecovery||{}});}
function broadcastOnline(){ io.emit('world:players',onlineList()); }
function systemMessage(text){ const m={id:crypto.randomUUID(),system:true,name:'Система',text:clean(text,240),time:Date.now()}; recentChat.push(m); if(recentChat.length>80)recentChat.shift(); io.emit('world:chat',m); }
initDiplomacy(world, FACTIONS); initSharedWorld(world, NPC_HOME, LOCATIONS, COOP_TEMPLATES); initSouls(world); initFactionWar(world); initStashes(world); ensureFactionRadio(world); ensureOnlineWorld(world);
async function initDb(){
  if(!process.env.DATABASE_URL){ console.warn('DATABASE_URL missing: guest multiplayer is active in memory mode; server-side saves reset on restart.'); return; }
  try {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString:process.env.DATABASE_URL, ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}, max:10, idleTimeoutMillis:30000, connectionTimeoutMillis:8000, query_timeout:8000, statement_timeout:8000 });
    await pool.query(`CREATE TABLE IF NOT EXISTS zone_players (id TEXT PRIMARY KEY, state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS zone_world (id INTEGER PRIMARY KEY CHECK (id=1), state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS zone_chat (id BIGSERIAL PRIMARY KEY, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS zone_private_messages (id BIGSERIAL PRIMARY KEY, message_id TEXT UNIQUE NOT NULL, from_id TEXT NOT NULL, to_id TEXT NOT NULL, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS zone_trade_receipts (offer_id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL, item_id TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS zone_private_messages_pair_idx ON zone_private_messages(from_id,to_id,id DESC)`);
    const wr=await pool.query('SELECT state FROM zone_world WHERE id=1');
    if(wr.rows[0]) world={...world,...wr.rows[0].state}; else await pool.query('INSERT INTO zone_world(id,state) VALUES(1,$1)',[world]);
    const cr=await pool.query('SELECT payload FROM zone_chat ORDER BY id DESC LIMIT 60');
    recentChat.push(...cr.rows.reverse().map(x=>x.payload)); initDiplomacy(world, FACTIONS); initSharedWorld(world, NPC_HOME, LOCATIONS, COOP_TEMPLATES); initSouls(world); initFactionWar(world); initStashes(world); ensureFactionRadio(world); ensureOnlineWorld(world); dbReady=true;
    console.log('PostgreSQL connected; shared world persistence enabled.');
  } catch(e){ console.error('PostgreSQL initialization failed; server will continue in memory mode:',e.message); pool=null; dbReady=false; }
}
async function dbFallback(error, operation){
  console.error(`PostgreSQL ${operation} failed; continuing in memory mode:`, error.message);
  dbReady=false;
  if(pool){ try{ await pool.end(); }catch{} }
  pool=null;
}
async function persistPlayer(id,state){ if(!pool)return; try{await pool.query('INSERT INTO zone_players(id,state,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,updated_at=NOW()',[id,state]);}catch(e){await dbFallback(e,'player save');} }
async function loadPlayer(id){ if(!pool)return null; try{const r=await pool.query('SELECT state FROM zone_players WHERE id=$1',[id]);return r.rows[0]?.state||null;}catch(e){await dbFallback(e,'player load');return null;} }
async function persistWorld(){ if(!pool)return; try{await pool.query('INSERT INTO zone_world(id,state,updated_at) VALUES(1,$1,NOW()) ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,updated_at=NOW()',[world]);}catch(e){await dbFallback(e,'world save');} }
async function persistPrivateMessage(m){ if(!pool)return; try{await pool.query('INSERT INTO zone_private_messages(message_id,from_id,to_id,payload) VALUES($1,$2,$3,$4) ON CONFLICT(message_id) DO NOTHING',[m.id,m.fromId,m.toId,m]);}catch(e){await dbFallback(e,'private message save');} }
async function loadPrivateMessages(a,b){ if(!pool)return []; try{const r=await pool.query('SELECT payload FROM zone_private_messages WHERE (from_id=$1 AND to_id=$2) OR (from_id=$2 AND to_id=$1) ORDER BY id DESC LIMIT 80',[a,b]);return r.rows.reverse().map(x=>x.payload);}catch(e){await dbFallback(e,'private message load');return [];}}
async function persistChat(m){ if(!pool)return; try{await pool.query('INSERT INTO zone_chat(payload) VALUES($1)',[m]);await pool.query('DELETE FROM zone_chat WHERE id NOT IN (SELECT id FROM zone_chat ORDER BY id DESC LIMIT 300)');}catch(e){await dbFallback(e,'chat save');} }


const SQUAD_ROLES = new Set(['leader','scout','medic','rifleman','technician']);
function squadOf(playerId){ return Object.values(world.playerSquads||{}).find(q=>(q.members||[]).some(m=>m.id===playerId))||null; }
function squadJournal(q,type,text,extra={}){ q.journal ||= []; q.journal.unshift({id:crypto.randomUUID(),type,text:clean(text,220),at:Date.now(),...extra}); q.journal=q.journal.slice(0,40); }
function publishSquad(q){ if(!q)return; for(const m of q.members||[])io.to(m.id).emit('squad:state',{squad:q}); }
function publishSquadMove(q,from,to,leader){
  q.location=to; squadJournal(q,'move',`${leader} повёл отряд из сектора ${from} в сектор ${to}.`);
  const destinationPoint=SECTOR_COORDS[to]||SECTOR_COORDS.cordon;
  if(q.escortNpcId){const escort=world.npcState?.[q.escortNpcId];if(escort&&escort.alive!==false){escort.location=to;world.npcPositions ||= {};world.npcPositions[escort.id]=to;io.emit('world:npcs',world.npcPositions);emitNpcState();squadJournal(q,'escort_move',`${escort.name} продолжает идти вместе с отрядом.`);}else q.escortNpcId=null;}
  for(const m of q.members||[]){ const member=online.get(m.id); if(!member)continue; const old=member.location; member.location=to; member.x=destinationPoint[0]; member.y=destinationPoint[1]+24;
    const st=safeState(member.state); st.state.loc=to; st.state.worldPosition={x:member.x,y:member.y}; member.state=st.state; const memberSocket=member.socketId&&io.sockets.sockets.get(member.socketId); if(memberSocket){memberSocket.leave(`location:${old}`);memberSocket.join(`location:${to}`);memberSocket.emit('world:chat:history',recentChat.filter(m=>!m.location||m.location===to).slice(-60));} persistPlayer(member.id,member.state).catch(()=>{});
    io.to(member.id).emit('squad:travelled',{location:to,from:old,leader:leader,squad:q});
  }
  publishSquad(q); broadcastOnline();
  const rivals=Object.values(world.playerSquads||{}).filter(other=>other.id!==q.id&&other.location===to&&(other.members||[]).some(m=>online.has(m.id)));
  for(const other of rivals){ const last=Math.max(q.lastEncounterAt||0,other.lastEncounterAt||0); if(Date.now()-last<120000)continue; q.lastEncounterAt=other.lastEncounterAt=Date.now(); const hostile=(q.members[0]?.faction||'')!==(other.members[0]?.faction||'');
    const event={id:crypto.randomUUID(),location:to,at:Date.now(),hostile,groups:[q.name,other.name],text:hostile?`В секторе ${to} замечен чужой отряд «${other.name}». Бойцы держат оружие наготове.`:`В секторе ${to} встретился отряд «${other.name}». Сталкеры оценивают друг друга.`};
    squadJournal(q,'encounter',event.text); squadJournal(other,'encounter',event.text);
    for(const group of [q,other])for(const m of group.members||[])io.to(m.id).emit('squad:encounter',event);
    publishSquad(q);publishSquad(other);
  }
}

io.on('connection', socket=>{
  socket.use((packet, next)=>{
    const eventName=String(packet?.[0]||'');
    if(!allowSocketEvent(socket.id,eventName)){
      const error=new Error('Слишком много запросов. Подожди немного и повтори действие.');
      error.data={code:'RATE_LIMITED',event:eventName};
      return next(error);
    }
    next();
  });
  console.info(`[socket] connected id=${socket.id} transport=${socket.conn.transport.name} origin=${clean(socket.handshake.headers.origin||'unknown',180)}`);
  socket.conn.on('upgrade', transport=>console.info(`[socket] upgraded id=${socket.id} transport=${transport.name}`));
  socket.on('error', error=>console.warn(`[socket] error id=${socket.id}:`,clean(error?.message||error,240)));
  socket.on('player:hello', async (payload, ack)=>{
    const helloStartedAt=Date.now();
    console.info(`[socket] player:hello received id=${socket.id} transport=${socket.conn.transport.name}`);
    try {
      // The HTTP health endpoint is available immediately, but player profile
      // loading waits for the one-time DB bootstrap to finish (or fall back).
      const dbWaitStartedAt=Date.now();
      await dbInitialization;
      const dbWaitMs=Date.now()-dbWaitStartedAt;
      // guest profiles use signed sessions; identity uses a signed bearer session token after the first profile claim.
      // Legacy profiles without a session marker are migrated once on first return.
      const requestedId=validId(payload?.id)?String(payload.id):null;
      let id=requestedId || crypto.randomUUID();
      const profileLoadStartedAt=Date.now();
      let saved=requestedId ? await loadPlayer(requestedId) : null;
      const tokenValid=!!requestedId && guestAuth.verify(payload?.sessionToken, requestedId);
      if(saved && Number(saved.guestSessionVersion||0)>=1 && !tokenValid){
        const message='Сессия гостевого профиля недействительна или истекла. Для защиты профиля вход отклонён.';
        socket.emit('player:hello:error',{message,code:'GUEST_SESSION_INVALID'});
        if(typeof ack==='function')ack({ok:false,message,code:'GUEST_SESSION_INVALID'});
        return;
      }
      if(saved && Number(saved.guestSessionVersion||0)<1){
        // Legacy profiles predate signed sessions. Require proof of possession
        // of the old local save before assigning the first signed token.
        if(!verifyLegacyProfileClaim(saved,payload?.state)){
          const message='Старый профиль требует подтверждения сохранением с этого устройства. Импортируй прежнее локальное сохранение и повтори вход.';
          socket.emit('player:hello:error',{message,code:'LEGACY_PROFILE_CLAIM_REQUIRED'});
          if(typeof ack==='function')ack({ok:false,message,code:'LEGACY_PROFILE_CLAIM_REQUIRED'});
          return;
        }
        saved.guestSessionVersion=1;
      } else if(!saved){
        saved=payload?.state ? safeState(payload.state).state : safeState({}).state;
        saved.guestSessionVersion=1;
      }
      const sessionToken=guestAuth.issue(id);
      const profileLoadMs=Date.now()-profileLoadStartedAt;
      const stateValidationStartedAt=Date.now();
      const s=safeState(saved);
      // Server-owned offline survival catch-up, capped to the same three-hour
      // window as the client simulation. Never trust a client-provided delta.
      const previousTick=Number(s.state.survivalServerAt)||Number(s.state.survival?.lastTickAt)||Date.now();
      const offlineElapsed=Math.max(0,Math.min(3*60*60*1000,Date.now()-previousTick));
      if(offlineElapsed>=60000){ZoneSurvival.advanceNeeds(s.state,offlineElapsed,s.state.atmosphereState?.weather||'overcast');s.state.survival ||= {};s.state.survival.lastTickAt=Date.now();}
      s.state.survivalServerAt=Date.now();
      if(!Number.isFinite(Number(s.state.serverShelterUntil)))s.state.serverShelterUntil=Math.max(0,Number(s.state.survival?.shelterUntil)||0);
      s.state.survival ||= {};s.state.survival.shelterUntil=s.state.serverShelterUntil;
      s.state.guestSessionVersion=1;
      // Never reattach an unvalidated database record after normalizing it.
      await persistPlayer(id,s.state);
      const stateValidationMs=Date.now()-stateValidationStartedAt;
      const spawnPoint=SECTOR_COORDS[s.loc]||SECTOR_COORDS.cordon;const savedPos=s.state?.worldPosition;const p={ id, name:s.name, faction:s.faction, location:s.loc, x:Number.isFinite(Number(savedPos?.x))?Math.max(0,Math.min(1000,Number(savedPos.x))):spawnPoint[0], y:Number.isFinite(Number(savedPos?.y))?Math.max(0,Math.min(2000,Number(savedPos.y))):spawnPoint[1], hp:s.hp, xp:s.xp, joinedAt:Date.now(), lastSeen:Date.now(), lastSurvivalAt:Date.now(), state:s.state, moveOrder:null, travelEncounter:null };
      // Publish the new owner before closing an older tab/session. The old
      // disconnect handler checks socketId and must never remove the new session.
      const previous=online.get(id);
      socket.data.playerId=id; socket.data.name=p.name; p.socketId=socket.id; online.set(id,p);
      if(previous?.socketId&&previous.socketId!==socket.id){
        const oldSocket=io.sockets.sockets.get(previous.socketId);
        if(oldSocket){oldSocket.data.supersededBy=socket.id;oldSocket.disconnect(true);}
      }
      socket.join('zone-world'); socket.join(id); socket.join(`location:${p.location}`); socket.join(`faction:${p.faction}`);
      world.onlineMetrics ||= { totalJoins:0, totalMoves:0, lastTickAt:0 }; world.onlineMetrics.totalJoins += 1;
      const joinEvent = appendWorldEvent(world, 'player_joined', { player:publicPlayer(p) });
      // Acknowledge after registration but BEFORE the world snapshot, so clients
      // receive the small acknowledgement without waiting for a large NPC payload.
      if(typeof ack==='function'){ack({ok:true,accepted:true,persistent:dbReady,sessionToken});console.info(`[socket] player:hello ack sent id=${socket.id}`);}
      s.state.emission = { ...publicEmissionState(world), active: world.emission.phase === 'active', warning: world.emission.phase === 'warning' };
      world.pendingArtifactRewards ||= {};const pendingRewards=world.pendingArtifactRewards[id]||[];for(const reward of pendingRewards){s.state.items ||= [];const found=s.state.items.find(x=>x.id===reward.id);if(found)found.qty=(Number(found.qty)||0)+1;else s.state.items.push({...reward,qty:1});}if(pendingRewards.length){delete world.pendingArtifactRewards[id];p.state=s.state;await persistPlayer(id,s.state);}
      socket.emit('player:ready',{id, savedState:s.state, guest:true, sessionToken, world:publicWorldSnapshot(), worldSync:initialWorldSync(Number(payload?.lastRevision)||0), status:publicWorldStatus(world,online.size), chat:recentChat.filter(m=>!m.location||m.location===p.location).slice(-60), players:onlineList(), leaderboard:leaderboardPayload(), position:{x:p.x,y:p.y}, persistent:dbReady});
      for(const entry of (world.events||[])){const offer=entry?.type==='trade'?entry.offer:null;if(offer?.to===id&&offer.status==='pending'&&Number(offer.expiresAt)>Date.now())socket.emit('trade:incoming',offer); }
      console.log(`player:hello completed for ${id} in ${Date.now()-helloStartedAt}ms (dbWait=${dbWaitMs}ms profile=${profileLoadMs}ms state=${stateValidationMs}ms db=${dbReady?'postgres':'memory-fallback'})`);
      socket.to('zone-world').emit('world:event',joinEvent);
      socket.emit('world:npcs',world.npcPositions); emitNpcState(socket); socket.emit('world:ecosystem',world.ecosystem); socket.emit('radio:state',{faction:p.faction,messages:listFactionRadio(world,p.faction)}); socket.emit('world:coop',world.coOpQuests); socket.emit('war:state',{operations:world.warOperations||[],history:(world.warHistory||[]).slice(0,12),keyPoints:world.keyPoints||{},objectives:world.factionObjectives||{},resources:world.factionResources||{},commands:world.factionCommand||{},factionWarHistory:(world.factionWarHistory||[]).slice(0,30)});
      systemMessage(`${p.name} вошёл в Зону.`); broadcastOnline(); persistWorld().catch(e=>console.error('join persistence:',e.message));
    } catch(e){
      console.error(`[socket] player:hello failed id=${socket.id} after ${Date.now()-helloStartedAt}ms:`,e);
      const message='Сервер принял соединение, но не смог загрузить профиль. Проверь журнал Render.';
      socket.emit('player:hello:error',{message,detail:clean(e?.message||'unknown',180)});
      if(typeof ack==='function')ack({ok:false,message,detail:clean(e?.message||'unknown',180)});
    }
  });
  socket.on('player:character-death', async input=>{
    const id=socket.data.playerId,player=id&&online.get(id);if(!player)return;
    player.state ||= {};player.state.hp=0;player.state.dead=true;player.state.characterCreated=false;
    player.state.deathCause=clean(input?.cause,180)||'погиб в Зоне';player.state.diedAt=Date.now();player.hp=0;
    player.moveOrder=null;player.expedition=null;
    await persistPlayer(id,player.state);
    socket.emit('player:death',{cause:player.state.deathCause,at:player.state.diedAt});
  });
  socket.on('player:rest', async()=>{
    const id=socket.data.playerId,p=id&&online.get(id);if(!p)return;
    const st=safeState(p.state).state;const gain=Number(st.hunger)>85||Number(st.thirst)>85?12:35;
    st.stamina=Math.min(100,(Number(st.stamina)||0)+gain);st.hp=Math.min(100,(Number(st.hp)||0)+5);
    p.state=st;p.hp=st.hp;p.lastSurvivalAt=Date.now();st.survivalServerAt=p.lastSurvivalAt;await persistPlayer(id,st);
    socket.emit('player:survival:result',{ok:true,state:st,message:'Ты отдохнул. Сервер сохранил восстановление сил.'});
  });
  socket.on('player:survival:camp', async()=>{
    const id=socket.data.playerId,p=id&&online.get(id);if(!p)return;
    const st=safeState(p.state).state;st.items=Array.isArray(st.items)?st.items:[];st.survival ||= {};
    const now=Date.now();if(Number(st.serverShelterUntil)>now){socket.emit('player:survival:result',{ok:false,message:'Ты уже находишься в укрытии.'});return;}
    const supply=st.items.find(x=>['tea','water'].includes(x.id)&&Number(x.qty)>0);
    if(!supply){socket.emit('player:survival:result',{ok:false,message:'Для привала нужен термос чая или бутылка воды.'});return;}
    supply.qty=Number(supply.qty)-1;if(supply.qty<=0)st.items=st.items.filter(x=>x!==supply);
    st.stamina=Math.min(100,(Number(st.stamina)||0)+28);st.hunger=Math.max(0,(Number(st.hunger)||0)-7);st.thirst=Math.max(0,(Number(st.thirst)||0)-16);
    st.serverShelterUntil=now+5*60000;st.survival.shelterUntil=st.serverShelterUntil;
    p.state=st;p.hp=st.hp;p.lastSurvivalAt=now;st.survivalServerAt=now;await persistPlayer(id,st);
    socket.emit('player:survival:result',{ok:true,state:st,message:'Полевой привал сохранён сервером.'});
  });
  socket.on('player:contract:accept', async input=>{
    const id=socket.data.playerId,p=id&&online.get(id);if(!p)return;
    const st=safeState(p.state).state;st.contracts=Array.isArray(st.contracts)?st.contracts:[];
    const c=st.contracts.find(x=>x.id===String(input?.contractId||''));
    if(!c||c.done){socket.emit('player:contract:result',{ok:false,message:'Контракт недоступен.'});return;}
    c.accepted=true;p.state=st;await persistPlayer(id,st);socket.emit('player:contract:result',{ok:true,state:st,message:'Контракт принят.'});
  });
  socket.on('player:contract:complete', async input=>{
    const id=socket.data.playerId,p=id&&online.get(id);if(!p)return;
    const st=safeState(p.state).state;st.contracts=Array.isArray(st.contracts)?st.contracts:[];st.items=Array.isArray(st.items)?st.items:[];
    const c=st.contracts.find(x=>x.id===String(input?.contractId||''));
    if(!c||!c.accepted||c.done){socket.emit('player:contract:result',{ok:false,message:'Контракт не принят или уже завершён.'});return;}
    if(p.location!==c.loc){socket.emit('player:contract:result',{ok:false,message:'Вернись в сектор, указанный в контракте.'});return;}
    if(c.item){const item=st.items.find(x=>x.id===c.item);if(!item||Number(item.qty)<Math.max(1,Number(c.qty)||1)){socket.emit('player:contract:result',{ok:false,message:'Не хватает предметов для сдачи контракта.'});return;}
      item.qty=Number(item.qty)-Math.max(1,Number(c.qty)||1);st.items=st.items.filter(x=>Number(x.qty)>0);}
    c.done=true;st.money=Math.min(99999999,st.money+Math.max(0,Math.min(1000000,Number(c.reward)||0)));st.xp=Math.min(1e7,st.xp+Math.max(0,Math.min(100000,Number(c.xp)||0)));st.rep=Math.max(-1000,Math.min(1000,st.rep+Math.max(-100,Math.min(100,Number(c.rep)||0))));
    p.state=st;p.money=st.money;p.xp=st.xp;p.hp=st.hp;await persistPlayer(id,st);socket.emit('player:contract:result',{ok:true,state:st,message:'Контракт выполнен. Награда начислена сервером.'});
  });
  socket.on('player:quest:accept', async input=>{
    const id=socket.data.playerId,p=id&&online.get(id);if(!p)return;
    const st=safeState(p.state).state;const questId=String(input?.questId||'').slice(0,80);
    const q=(st.quests||[]).find(x=>x.id===questId);
    if(!q||q.done||(q.faction||'Одиночки')!==(p.faction||'Одиночки')){socket.emit('player:quest:result',{ok:false,message:'Задание недоступно.'});return;}
    q.accepted=true;p.state=st;await persistPlayer(id,st);socket.emit('player:quest:result',{ok:true,state:st,message:'Задание принято.'});
  });
  socket.on('player:quest:turnin', async input=>{
    const id=socket.data.playerId,p=id&&online.get(id);if(!p)return;
    const st=safeState(p.state).state;st.items=Array.isArray(st.items)?st.items:[];st.quests=Array.isArray(st.quests)?st.quests:[];
    const questId=String(input?.questId||'').slice(0,80),q=st.quests.find(x=>x.id===questId);
    if(!q||!q.accepted||q.done||(q.faction||'Одиночки')!==(p.faction||'Одиночки')){socket.emit('player:quest:result',{ok:false,message:'Задание не принято или уже завершено.'});return;}
    const countItem=itemId=>st.items.filter(x=>x.id===itemId).reduce((n,x)=>n+Math.max(0,Number(x.qty)||0),0);
    const hasPoint=(loc,point)=>!!st.keyPoints?.[loc]?.some(x=>x.id===point&&x.discovered);
    const storyFlags=st.storyFlags||{},flags=st.flags||{};let ok=false;
    const storyChecks={story_swamp_signal:()=>storyFlags.metLebedev&&hasPoint('swamps','swamps_extra_0'),story_swamp_relay:()=>storyFlags.metNovikov&&hasPoint('swamps','swamps_extra_3'),story_yantar_echo:()=>storyFlags.metSakharov&&hasPoint('yantar','yantar_extra_0'),story_north_route:()=>storyFlags.metBeard&&hasPoint('jupiter','jupiter_extra_3')&&hasPoint('radar','radar_extra_1'),story_pripyat_archive:()=>storyFlags.metArchivist&&hasPoint('pripyat','pripyat_extra_3')};
    if(storyChecks[questId])ok=storyChecks[questId]();
    if(q.requiredLocation){const required=q.requiredItemType?st.items.filter(x=>x.type===q.requiredItemType).reduce((n,x)=>n+Math.max(0,Number(x.qty)||0),0):countItem(q.requiredItem);ok=p.location===q.requiredLocation&&(!q.requiredItem&&!q.requiredItemType||required>=Math.max(1,Number(q.requiredQty)||1));}
    if(questId==='intro')ok=!!flags.metWolf;if(questId==='scrap')ok=countItem('scrap')>=3;if(questId==='bread')ok=countItem('bread')>=2;if(questId==='rumors')ok=!!(flags.metWolf&&flags.heardBar&&flags.metScout&&flags.metProf);if(questId==='research')ok=!!flags.foundArtifact;
    if(!ok){socket.emit('player:quest:result',{ok:false,message:'Условия задания ещё не выполнены.'});return;}
    const consume=(itemId,amount)=>{let left=amount;for(const item of st.items.filter(x=>x.id===itemId)){const n=Math.min(left,Math.max(0,Number(item.qty)||0));item.qty-=n;left-=n;if(left<=0)break;}st.items=st.items.filter(x=>Number(x.qty)>0);};
    if(questId==='scrap')consume('scrap',3);if(questId==='bread')consume('bread',2);if(q.requiredItem)consume(q.requiredItem,Math.max(1,Number(q.requiredQty)||1));
    if(q.requiredItemType){let left=Math.max(1,Number(q.requiredQty)||1);for(const item of st.items.filter(x=>x.type===q.requiredItemType)){const n=Math.min(left,Math.max(0,Number(item.qty)||0));item.qty-=n;left-=n;if(left<=0)break;}st.items=st.items.filter(x=>Number(x.qty)>0);}
    q.done=true;st.money=Math.min(99999999,st.money+Math.max(0,Math.min(1000000,Number(q.reward)||0)));st.xp=Math.min(1e7,st.xp+Math.max(0,Math.min(100000,Number(q.xp)||0)));st.rep=Math.max(-1000,Math.min(1000,st.rep+Math.max(-100,Math.min(100,Number(q.rep)||0))));st.completed=Math.min(1e6,(Number(st.completed)||0)+1);
    p.state=st;p.money=st.money;p.xp=st.xp;p.hp=st.hp;await persistPlayer(id,st);socket.emit('player:quest:result',{ok:true,state:st,message:'Задание выполнено. Награда начислена сервером.'});
  });
  socket.on('player:item:use', async input=>{
    const id=socket.data.playerId,p=id&&online.get(id);if(!p)return;
    const itemId=String(input?.itemId||'').slice(0,48);
    const st=safeState(p.state).state;st.items=Array.isArray(st.items)?st.items:[];
    const actionNow=Date.now(),actionElapsed=Math.max(0,Math.min(180*60000,actionNow-(Number(p.lastSurvivalAt)||Number(p.state?.survivalServerAt)||actionNow)));
    if(actionElapsed>=60000)ZoneSurvival.advanceNeeds(st,actionElapsed,p.state?.atmosphereState?.weather||'overcast');
    p.lastSurvivalAt=actionNow;st.survivalServerAt=actionNow;
    const item=st.items.find(x=>x.id===itemId&&Number(x.qty)>0);
    if(!item){socket.emit('player:item:result',{ok:false,message:'Предмет отсутствует в рюкзаке.'});return;}
    const foods={bread:[18,0,4],canned:[34,2,0],sausage:[24,0,2],condensed:[20,0,12],water:[0,42,2],tea:[2,30,8],ration:[42,8,5],energy_drink:[4,18,22],chocolate:[14,0,18],nuts:[22,0,10],smoked_meat:[38,0,3]};
    let used=false;
    if(foods[itemId]){const [satiety,hydration,stamina]=foods[itemId];st.hunger=Math.max(0,Number(st.hunger)||0);st.thirst=Math.max(0,Number(st.thirst)||0);st.stamina=Math.min(100,(Number(st.stamina)||0)+stamina);st.hunger=Math.max(0,st.hunger-satiety);st.thirst=Math.max(0,st.thirst-hydration);used=true;}
    else if(itemId==='med'&&Number(st.hp)<100){st.hp=Math.min(100,(Number(st.hp)||0)+35);used=true;}
    else if(itemId==='bandage'&&Number(st.hp)<100){st.hp=Math.min(100,(Number(st.hp)||0)+15);used=true;}
    else if(itemId==='trauma_kit'&&Number(st.hp)<100){st.hp=Math.min(100,(Number(st.hp)||0)+55);st.stamina=Math.max(0,(Number(st.stamina)||0)-5);used=true;}
    else if(itemId==='painkillers'&&Number(st.stamina)<100){st.stamina=Math.min(100,(Number(st.stamina)||0)+25);st.needs||={};st.needs.stress=Math.max(0,(Number(st.needs.stress)||0)-8);used=true;}
    else if(itemId==='anti_rad'&&Number(st.radiation)>0){st.radiation=Math.max(0,(Number(st.radiation)||0)-65);st.radiationProtectionUntil=Date.now()+12*60*1000;used=true;}
    if(!used){socket.emit('player:item:result',{ok:false,message:'Сейчас этот предмет нельзя использовать.'});return;}
    item.qty=Number(item.qty)-1;if(item.qty<=0)st.items=st.items.filter(x=>x!==item);
    p.state=st;p.hp=st.hp;p.xp=st.xp;p.money=st.money;await persistPlayer(id,st);
    socket.emit('player:item:result',{ok:true,state:st,itemId});
  });
  socket.on('player:save', async input=>{
    const id=socket.data.playerId, p=online.get(id); if(!id||!p)return;
    const clientState=safeState(input);
    const allowCharacterCreation=p.state?.characterCreated!==true&&clientState.state?.characterCreated===true;
    const mergedState=mergeClientSaveState(p.state,clientState.state,{allowCharacterCreation});
    const now=Date.now();
    const elapsed=Math.max(0,Math.min(180*60000,now-(Number(p.lastSurvivalAt)||Number(p.state?.survivalServerAt)||now)));
    mergedState.survivalServerAt=now;
    if(p.state?.characterCreated&&elapsed>=60000){ZoneSurvival.advanceNeeds(mergedState,elapsed,p.state.atmosphereState?.weather||'overcast');mergedState.survival ||= {};mergedState.survival.lastTickAt=now;}
    p.lastSurvivalAt=now;
    const s=safeState(mergedState);
    const authoritativeEmission = publicEmissionState(world);
    s.state.emission = { ...authoritativeEmission, active: authoritativeEmission.phase === 'active', warning: authoritativeEmission.phase === 'warning' };
    s.state.survival ||= {};
    s.state.serverShelterUntil = Math.max(0, Number(p.state?.serverShelterUntil)||0);
    s.state.survival ||= {};s.state.survival.shelterUntil=s.state.serverShelterUntil;
    const previousLocation=p.location, previousFaction=p.faction; const squad=squadOf(id); const firstCharacter=!p.state?.characterCreated&&s.state?.characterCreated===true;
    if(p.state?.characterCreated&&!firstCharacter){s.state.faction=p.faction;s.faction=p.faction;}
    const requestedSpawn=s.state?.startingLocation||s.state?.loc;const spawn=firstCharacter?resolveFactionSpawn(s.faction,requestedSpawn).location:null;
    if(firstCharacter){s.state.visitedLocations=[...new Set([...(s.state.visitedLocations||[]),spawn])];}
    const squadLocation=squad&&squad.leader!==id?squad.location:null;
    const authoritative=reconcilePlayerPosition(p,s.state,{firstCharacter,spawnLocation:spawn,spawnPoint:spawn?SECTOR_COORDS[spawn]||SECTOR_COORDS.cordon:null,squadLocation});
    s.state=authoritative.state;s.loc=authoritative.location;
    p.name=s.name;p.faction=s.faction;p.location=authoritative.location;p.x=authoritative.x;p.y=authoritative.y;p.hp=s.hp;p.xp=s.xp;p.lastSeen=Date.now();p.state=s.state;socket.data.name=s.name;
    if(previousLocation!==p.location){socket.leave(`location:${previousLocation}`);socket.join(`location:${p.location}`);socket.emit('world:chat:history',recentChat.filter(m=>!m.location||m.location===p.location).slice(-60));}
    if(previousFaction!==p.faction){socket.leave(`faction:${previousFaction}`);socket.join(`faction:${p.faction}`);}
    try{ await persistPlayer(id,s.state); }catch(e){socket.emit('server:error',{message:'Не удалось сохранить профиль на сервере.'});console.error(e);}
    if(previousLocation!==p.location){ world.onlineMetrics ||= {totalJoins:0,totalMoves:0,lastTickAt:0}; world.onlineMetrics.totalMoves+=1; const ev=appendWorldEvent(world,'player_moved',{playerId:id,name:p.name,faction:p.faction,from:previousLocation,to:p.location}); io.to('zone-world').emit('world:event',ev); if(squad&&squad.leader===id)publishSquadMove(squad,previousLocation,p.location,p.name); await persistWorld(); }
    if(firstCharacter)socket.emit('player:spawned',{state:p.state,location:p.location});
    socket.emit('player:save:ack',{state:p.state,position:{x:p.x,y:p.y},location:p.location});
    broadcastOnline();
  });
  socket.on('player:update', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const oldLocation=p.location, oldFaction=p.faction; const squad=squadOf(p.id);
    if(LOCATIONS.has(input?.location)&&input.location!==p.location){
      socket.emit('player:update:rejected',{message:'Сектор назначается сервером. Используй систему экспедиций или следуй за лидером отряда.'});
    }
    if(!p.state?.characterCreated&&FACTIONS.has(input?.faction))p.faction=input.faction;
    if(input?.name)p.name=clean(input.name,24)||p.name;
    if(oldLocation!==p.location){socket.leave(`location:${oldLocation}`);socket.join(`location:${p.location}`);socket.emit('world:chat:history',recentChat.filter(m=>!m.location||m.location===p.location).slice(-60));} if(oldFaction!==p.faction){socket.leave(`faction:${oldFaction}`);socket.join(`faction:${p.faction}`);}
    p.lastSeen=Date.now();
    if(oldLocation!==p.location || oldFaction!==p.faction){
      world.onlineMetrics ||= {totalJoins:0,totalMoves:0,lastTickAt:0};
      if(oldLocation!==p.location)world.onlineMetrics.totalMoves+=1;
      const ev=appendWorldEvent(world,'player_state_changed',{player:publicPlayer(p),from:{location:oldLocation,faction:oldFaction}});
      io.to('zone-world').emit('world:event',ev); if(oldLocation!==p.location&&squad&&squad.leader===p.id)publishSquadMove(squad,oldLocation,p.location,p.name); persistWorld().catch(e=>console.error('player state persistence:',e.message));
    }
    broadcastOnline();
  });
  socket.on('player:position', ()=>{ /* Position is server-authoritative in 4.22; legacy client writes are ignored. */ });
  socket.on('player:expedition-order', input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    if(!LOCATIONS.has(input?.destination)){socket.emit('player:expedition-result',{ok:false,message:'Неизвестная локация назначения.'});return;}
    const squad=squadOf(p.id);if(squad&&squad.leader!==p.id){socket.emit('player:expedition-result',{ok:false,message:'Маршрутом отряда управляет командир.'});return;}
    const result=createExpedition(p,input.destination,['safe','fast','balanced'].includes(input?.mode)?input.mode:'safe');
    if(!result.ok){socket.emit('player:expedition-result',result);return;}
    p.expeditionToken=(Number(p.expeditionToken)||0)+1;result.expedition.id=`exp_${p.id}_${p.expeditionToken}`;p.expedition=result.expedition;p.moveOrder=null;p.travelEncounter=null;
    socket.emit('player:expedition-result',{ok:true,message:'Экспедиция началась. КПК будет сообщать о переходах между секторами.',expedition:p.expedition});
  });
  socket.on('player:expedition-cancel',()=>{const p=online.get(socket.data.playerId);if(!p)return;p.expeditionToken=(Number(p.expeditionToken)||0)+1;p.expedition=null;p.moveOrder=null;p.travelEncounter=null;socket.emit('player:movement',{x:p.x,y:p.y,moving:false});socket.emit('player:expedition-result',{ok:true,message:'Экспедиция отменена. Дальнейшие переходы маршрута остановлены.',cancelled:true});broadcastOnline();});
  socket.on('player:move-order', input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    if(input?.location!==p.location){socket.emit('player:move-result',{ok:false,message:'Маршрут должен начинаться в текущем секторе.'});return;}
    const center=SECTOR_COORDS[p.location]||SECTOR_COORDS.cordon;
    const tx=Number(input?.x),ty=Number(input?.y);
    if(!Number.isFinite(tx)||!Number.isFinite(ty)||Math.abs(tx-center[0])>255||Math.abs(ty-center[1])>255){socket.emit('player:move-result',{ok:false,message:'Точка находится за пределами доступной части сектора.'});return;}
    const result=createMoveOrder(p,{x:tx,y:ty},Date.now(),2.5);
    if(!result.ok){socket.emit('player:move-result',{ok:false,message:result.error});return;}
    if(p.expedition){p.expeditionToken=(Number(p.expeditionToken)||0)+1;p.expedition=null;socket.emit('player:expedition-result',{ok:true,message:'Экспедиция заменена новым приказом движения.',cancelled:true});}
    p.moveOrder=result.order;p.travelEncounter=null;p.lastSeen=Date.now();
    const risk=({chaes:0.95,radar:0.85,pripyat:0.75,red:0.65,dark:0.6,dump:0.55,swamps:0.4,cordon:0.25,bar:0.2,yantar:0.3})[p.location]??0.35;
    p.moveOrder.encounterAt=Math.random()<(.04+risk*.13)?(.25+Math.random()*.5):null;
    socket.emit('player:move-result',{ok:true,message:'Приказ принят. Персонаж начал движение по маршруту.',order:{x:tx,y:ty,etaSeconds:Math.ceil(result.order.distance/result.order.speed)}});
  });
  socket.on('player:move-cancel',()=>{const p=online.get(socket.data.playerId);if(!p)return;p.moveOrder=null;p.travelEncounter=null;socket.emit('player:movement',{x:p.x,y:p.y,moving:false});socket.emit('player:move-result',{ok:true,message:'Приказ на движение отменён.'});});
  socket.on('player:travel-response',input=>{const p=online.get(socket.data.playerId);if(!p||(!p.travelEncounter&&p.expedition?.status!=='paused'))return;const action=['continue','fight'].includes(input?.action)?input.action:'retreat';p.travelEncounter=null;if(p.expedition?.status==='paused'){if(action==='continue')p.expedition.status='travelling';else p.expedition=null;}if(action!=='continue')p.moveOrder=null;else if(p.moveOrder)p.moveOrder.encounterChecked=true;socket.emit('player:move-result',{ok:true,message:action==='continue'?'Продолжаешь путь после опасной встречи.':action==='fight'?'Ты принимаешь бой. Маршрут приостановлен.':'Маршрут прерван. Персонаж отходит в безопасную точку.'});});
  socket.on('world:sync', input=>{
    if(!socket.data.playerId)return;
    socket.emit('world:sync',publicWorldSync(Number(input?.sinceRevision)||0));
    emitNpcState(socket);
  });
  socket.on('radio:state',()=>{const p=online.get(socket.data.playerId);if(!p)return;socket.emit('radio:state',{faction:p.faction,messages:listFactionRadio(world,p.faction)});});
  const artifactExpeditionSnapshot=(location)=>{const now=Date.now();for(const e of (world.artifactExpeditions||[])){if(e.status==='searching'&&now>=Number(e.readyAt||Infinity))e.status='ready';if(['searching','ready'].includes(e.status)&&now>=Number(e.expiresAt||Infinity))e.status='expired';}return {expeditions:(world.artifactExpeditions||[]).filter(e=>['searching','ready'].includes(e.status)&&(!location||e.location===location)).slice(-30)};};
  socket.on('artifact-expedition:state',()=>{const p=online.get(socket.data.playerId);if(!p)return;socket.emit('artifact-expedition:state',artifactExpeditionSnapshot(p.location));});
  socket.on('artifact-expedition:create',async()=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    world.artifactExpeditions ||= [];
    const existing=world.artifactExpeditions.find(e=>e.location===p.location&&['searching','ready'].includes(e.status));
    if(existing){socket.emit('artifact-expedition:result',{ok:false,message:'В этом секторе уже есть активный общий сигнал.',expeditions:artifactExpeditionSnapshot(p.location).expeditions});return;}
    const defs=[['artifact_spring','Пружина'],['artifact_battery','Батарейка'],['artifact_shell','Ракушка'],['artifact_bubble','Пузырь'],['artifact_firefly','Светляк'],['artifact_kolobok','Колобок'],['artifact_compass','Компас'],['artifact_medusa','Медуза'],['artifact_flower','Каменный цветок']];
    const chosen=defs[Math.floor(Math.random()*defs.length)],center=SECTOR_COORDS[p.location]||SECTOR_COORDS.cordon;
    const expedition={id:crypto.randomUUID(),location:p.location,artifactId:chosen[0],artifactName:chosen[1],x:Math.max(10,Math.min(990,center[0]+Math.round((Math.random()-.5)*110))),y:Math.max(10,Math.min(1990,center[1]+Math.round((Math.random()-.5)*110))),leaderId:p.id,leaderName:p.name,participants:[{id:p.id,name:p.name,faction:p.faction}],status:'searching',createdAt:Date.now(),readyAt:Date.now()+45000,expiresAt:Date.now()+20*60*1000};
    world.artifactExpeditions.push(expedition);world.artifactExpeditions=world.artifactExpeditions.slice(-80);await persistWorld();io.to(`location:${p.location}`).emit('artifact-expedition:update',{expeditions:artifactExpeditionSnapshot(p.location).expeditions,message:`${p.name} организовал совместный поиск артефакта в секторе ${p.location}.`});const readyTimer=setTimeout(async()=>{if(expedition.status==='searching'){expedition.status='ready';await persistWorld();io.to(`location:${expedition.location}`).emit('artifact-expedition:update',{expeditions:artifactExpeditionSnapshot(expedition.location).expeditions,message:`Сканирование завершено: группа может забрать «${expedition.artifactName}».`});}},45000);readyTimer.unref?.();socket.emit('artifact-expedition:result',{ok:true,message:'Общий сигнал создан. Подожди участников и следи за КПК.',expeditions:artifactExpeditionSnapshot(p.location).expeditions});
  });
  socket.on('artifact-expedition:join',async input=>{
    const p=online.get(socket.data.playerId),id=String(input?.id||'');if(!p)return;
    const e=(world.artifactExpeditions||[]).find(x=>x.id===id&&x.status==='searching'&&x.location===p.location&&x.expiresAt>Date.now());
    if(!e){socket.emit('artifact-expedition:result',{ok:false,message:'Экспедиция недоступна или находится в другом секторе.'});return;}
    if(!e.participants.some(x=>x.id===p.id)){if(e.participants.length>=4){socket.emit('artifact-expedition:result',{ok:false,message:'Группа уже заполнена.'});return;}e.participants.push({id:p.id,name:p.name,faction:p.faction});}
    await persistWorld();io.to(`location:${p.location}`).emit('artifact-expedition:update',{expeditions:artifactExpeditionSnapshot(p.location).expeditions,message:`${p.name} присоединился к поисковой группе (${e.participants.length}/4).`});socket.emit('artifact-expedition:result',{ok:true,message:'Ты присоединился к совместной экспедиции.',expeditions:artifactExpeditionSnapshot(p.location).expeditions});
  });
  socket.on('artifact-expedition:claim',async input=>{
    const p=online.get(socket.data.playerId),id=String(input?.id||'');if(!p)return;
    const e=(world.artifactExpeditions||[]).find(x=>x.id===id&&['searching','ready'].includes(x.status));
    if(!e||e.location!==p.location||!e.participants.some(x=>x.id===p.id)){socket.emit('artifact-expedition:result',{ok:false,message:'Ты не состоишь в этой экспедиции или находишься в другом секторе.'});return;}
    if(Date.now()<e.readyAt){socket.emit('artifact-expedition:result',{ok:false,message:'Сканирование ещё продолжается. Подожди завершения поиска.'});return;}
    if(e.status==='claimed'){socket.emit('artifact-expedition:result',{ok:false,message:'Эта находка уже получена.'});return;}
    e.status='claimed';e.claimedAt=Date.now();const reward={id:e.artifactId,name:e.artifactName,type:'Артефакт',desc:'Общая находка совместной экспедиции.',weight:.6,value:1400,condition:100};world.pendingArtifactRewards ||= {};
    for(const member of e.participants){const onlineMember=online.get(member.id);if(onlineMember&&onlineMember.location===e.location){const st=safeState(onlineMember.state).state;st.items ||= [];const owned=st.items.find(x=>x.id===reward.id);if(owned)owned.qty=(Number(owned.qty)||0)+1;else st.items.push({...reward,qty:1});onlineMember.state=st;await persistPlayer(member.id,st);io.to(member.id).emit('artifact-expedition:reward',{state:st,message:`Совместная экспедиция завершена: получен артефакт «${e.artifactName}».`});}else{world.pendingArtifactRewards[member.id] ||= [];world.pendingArtifactRewards[member.id].push(reward);}}
    await persistWorld();io.to(`location:${p.location}`).emit('artifact-expedition:update',{expeditions:artifactExpeditionSnapshot(p.location).expeditions,message:`Экспедиция завершена. Группа обнаружила «${e.artifactName}».`});socket.emit('artifact-expedition:result',{ok:true,message:`Группа получила артефакт «${e.artifactName}».`,expeditions:artifactExpeditionSnapshot(p.location).expeditions});
  });
  socket.on('world:chat:send', async input=>{
    if(!socket.data.playerId)return;
    const text=clean(input?.text,240);if(!text)return;
    const p=online.get(socket.data.playerId);
    if(!p)return; const m={id:crypto.randomUUID(),name:p.name,faction:p.faction,location:p.location,text,time:Date.now()};
    recentChat.push(m);if(recentChat.length>300)recentChat.shift();io.to(`location:${p.location}`).emit('world:chat',m);
    try{await persistChat(m);}catch(e){console.error('chat persistence:',e.message);}
  });
  socket.on('dm:history', async input=>{
    const me=online.get(socket.data.playerId), targetId=String(input?.targetId||'').slice(0,64), target=online.get(targetId);
    if(!me||!target||me.id===targetId||me.location!==target.location){socket.emit('dm:error',{message:'Личный канал доступен только игрокам, находящимся в одном секторе.'});return;}
    const history=await loadPrivateMessages(me.id,targetId);socket.emit('dm:history',{targetId,history});
  });
  socket.on('dm:send', async input=>{
    const me=online.get(socket.data.playerId), targetId=String(input?.targetId||'').slice(0,64), target=online.get(targetId), text=clean(input?.text,500);
    if(!me||!target||me.id===targetId||me.location!==target.location){socket.emit('dm:error',{message:'Игрок должен находиться с тобой в одной локации.'});return;}
    if(!text){socket.emit('dm:error',{message:'Сообщение пустое.'});return;}
    const now=Date.now(), rate=socket.data.dmRate||{at:0,count:0};if(now-rate.at>10000){rate.at=now;rate.count=0;}rate.count++;socket.data.dmRate=rate;
    if(rate.count>8){socket.emit('dm:error',{message:'Слишком часто. Подожди несколько секунд.'});return;}
    const m={id:crypto.randomUUID(),fromId:me.id,toId:target.id,fromName:me.name,toName:target.name,text,time:now};
    await persistPrivateMessage(m);socket.emit('dm:message',m);io.to(target.id).emit('dm:message',m);
  });
  socket.on('stash:state',()=>{const p=online.get(socket.data.playerId);if(!p)return;initStashes(world);socket.emit('stash:state',{stashes:publicStashes(world,p.id,p.location)});});
  socket.on('stash:search',async()=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const result=searchStashArea(world,p,SHOP,Date.now());
    if(result.state){p.state=result.state;await persistPlayer(p.id,p.state);}
    await persistWorld();socket.emit('stash:search:result',result);
  });
  socket.on('stash:loot',async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const result=lootStash(world,p,String(input?.stashId||''),SHOP,Date.now());
    if(result.ok){p.state=result.state;await persistPlayer(p.id,p.state);await persistWorld();}
    socket.emit('stash:loot:result',result);
    if(result.ok)socket.emit('stash:state',{stashes:publicStashes(world,p.id,p.location)});
  });
  socket.on('stash:buy-intel',async input=>{
    const p=online.get(socket.data.playerId),npc=world.npcState?.[String(input?.npcId||'').slice(0,48)];
    const intelBrokers=new Set(['sid','barman','beard','scout','prof','guide','wolfhound','scientist']);
    if(!p||!npc||npc.alive===false||npc.location!==p.location||!inRange(p,npcWorldPosition(npc),INTERACTION_RADIUS)||!(intelBrokers.has(npc.id)||String(npc.role||'').toLowerCase().includes('торгов'))){socket.emit('stash:buy-intel:result',{ok:false,message:'Этот сталкер не торгует информацией или находится слишком далеко.'});return;}
    const result=buyStashIntel(world,p,npc,Date.now());
    if(result.ok){p.state=result.state;await persistPlayer(p.id,p.state);await persistWorld();}
    socket.emit('stash:buy-intel:result',{...result,stashes:publicStashes(world,p.id,p.location)});
  });
  socket.on('npc:trade:buy', async input=>{
    const p=online.get(socket.data.playerId), npcId=String(input?.npcId||'').slice(0,48), itemId=String(input?.item||''), goods=SHOP[itemId];
    const npc=world.npcState?.[npcId], st=p?safeState(p.state):null;
    if(!p||!npc||npc.alive===false||npc.location!==p.location||!inRange(p,npcWorldPosition(npc),INTERACTION_RADIUS)||!npc.dialogue||!goods){
      socket.emit('npc:trade:result',{ok:false,message:'Этот сталкер сейчас не может торговать или находится не рядом.'});return;
    }
    const account=npcEconomyFor(npc);if(NPC_WEAPON_STOCK.has(itemId)&&!(NPC_RICH_TRADERS.has(String(npc.id))||String(npc.role||'').toLowerCase().includes('торгов'))){socket.emit('npc:trade:result',{ok:false,message:'Оружие продают только крупные торговцы Зоны.'});return;}account.stock[itemId]??=goods.qty*3;account.maxStock[itemId]??=goods.qty*10;const available=Math.max(0,Math.floor(Number(account.stock[itemId])||0));
    if(available<goods.qty){socket.emit('npc:trade:result',{ok:false,message:'У сталкера временно закончился этот товар. Запасы пополняются автоматически.',economy:{balance:account.balance,stock:account.stock}});return;}
    if(st.money<goods.price){socket.emit('npc:trade:result',{ok:false,message:'Недостаточно рублей.'});return;}
    // Buying transfers player money out of the player's wallet only.
    // The NPC's independent balance is intentionally not debited.
    st.state.money=st.money-goods.price;
    st.state.items ||= [];
    const existing=st.state.items.find(x=>x.id===itemId);
    if(existing)existing.qty+=goods.qty;
    else st.state.items.push({id:itemId,name:goods.name,type:goods.type,desc:goods.desc,weight:goods.weight,qty:goods.qty,value:goods.value});
    account.stock[itemId]=available-goods.qty;
    recordNpcTrade(account,{playerId:p.id,playerName:p.name,type:'buy_from_npc',item:itemId,qty:goods.qty,price:goods.price});
    p.state=st.state;await persistPlayer(p.id,p.state);await persistWorld();
    socket.emit('npc:trade:result',{ok:true,message:`${npc.name}: сделка состоялась. ${goods.name} передан тебе.`,state:p.state,economy:{balance:account.balance,stock:account.stock}});
  });
  socket.on('npc:trade:sell', async input=>{
    const p=online.get(socket.data.playerId),npcId=String(input?.npcId||'').slice(0,48),itemId=String(input?.item||''),qty=Math.max(1,Math.min(10,Math.floor(Number(input?.qty)||1)));
    const npc=world.npcState?.[npcId],st=p?safeState(p.state):null,base=SELL_VALUES[itemId];
    if(!p||!npc||npc.alive===false||npc.location!==p.location||!inRange(p,npcWorldPosition(npc),INTERACTION_RADIUS)||!npc.dialogue||!base){socket.emit('npc:trade:result',{ok:false,message:'Этот сталкер не принимает такой предмет.'});return;}
    st.state.items ||= [];const item=st.state.items.find(x=>x.id===itemId);
    if(!item||item.qty<qty){socket.emit('npc:trade:result',{ok:false,message:'Недостаточно предметов для продажи.'});return;}
    const account=npcEconomyFor(npc),payout=Math.floor(base*.5)*qty;
    if(account.balance<payout){socket.emit('npc:trade:result',{ok:false,message:`У ${npc.name} недостаточно денег для этой покупки.`,economy:{balance:account.balance}});return;}
    item.qty-=qty;if(item.qty<=0)st.state.items=st.state.items.filter(x=>x.id!==itemId);
    account.balance=Math.max(0,account.balance-payout);
    st.state.money=Math.min(99999999,st.money+payout);
    recordNpcTrade(account,{playerId:p.id,playerName:p.name,type:'sell_to_npc',item:itemId,qty,price:payout});
    p.state=st.state;await persistPlayer(p.id,p.state);await persistWorld();
    socket.emit('npc:trade:result',{ok:true,message:`${npc.name}: забираю. Получено ${payout} ₽.`,state:p.state,economy:{balance:account.balance,stock:account.stock}});
  });
  socket.on('market:buy', async input=>{
    const p=online.get(socket.data.playerId), itemId=String(input?.item||''), goods=SHOP[itemId];
    if(!p||!goods){socket.emit('market:result',{ok:false,message:'Товар недоступен.'});return;}
    const st=safeState(p.state);if(st.money<goods.price){socket.emit('market:result',{ok:false,message:'Недостаточно рублей.'});return;}
    st.state.money=st.money-goods.price;st.state.items ||= [];
    const existing=st.state.items.find(x=>x.id===itemId);
    if(existing){existing.qty+=goods.qty;if(goods.defense){existing.defense=goods.defense;existing.condition=existing.condition??100;}if(goods.capacity)existing.capacity=goods.capacity;if(goods.tier)existing.tier=goods.tier;if(goods.range)existing.range=goods.range;if(goods.effects)existing.effects=goods.effects;}else st.state.items.push({id:itemId,name:itemId==='bolt'?'Болт':goods.name,type:goods.type,desc:goods.desc,weight:goods.weight,qty:goods.qty,value:goods.value,...(goods.defense?{defense:goods.defense,condition:100}:{}),...(goods.capacity?{capacity:goods.capacity}:{}),...(goods.tier?{tier:goods.tier,range:goods.range}:{}),...(goods.effects?{effects:goods.effects}:{})});
    p.state=st.state;await persistPlayer(p.id,p.state);socket.emit('market:result',{ok:true,message:`Куплено: ${goods.name}.`,state:p.state});
  });
  socket.on('player:equipment:update', async input=>{
    const p=online.get(socket.data.playerId);
    if(!p){socket.emit('player:equipment:result',{ok:false,message:'Профиль не найден.'});return;}
    const slot=String(input?.slot||''),itemName=String(input?.itemName||'').slice(0,100);
    const slotTypes={weapon:['Оружие'],sidearm:['Оружие'],suit:['Броня'],helmet:['Шлем'],tool:['Детектор'],artifact:['Артефакт'],backpack:['Рюкзак']};
    if(!slotTypes[slot]){socket.emit('player:equipment:result',{ok:false,message:'Неизвестный слот экипировки.'});return;}
    const st=safeState(p.state);st.state.items ||= [];st.state.equipment ||= {};
    if(itemName){const item=st.state.items.find(x=>x.name===itemName&&slotTypes[slot].includes(x.type)&&Number(x.qty)>0);if(!item){socket.emit('player:equipment:result',{ok:false,message:'Предмет отсутствует в рюкзаке или не подходит к слоту.'});return;}}
    if(slot==='weapon'&&itemName&&itemName===st.state.equipment.sidearm){socket.emit('player:equipment:result',{ok:false,message:'Этот предмет уже установлен во второй слот.'});return;}
    if(slot==='sidearm'&&itemName&&itemName===st.state.equipment.weapon){socket.emit('player:equipment:result',{ok:false,message:'Этот предмет уже установлен в основной слот.'});return;}
    st.state.equipment[slot]=itemName;p.state=st.state;await persistPlayer(p.id,p.state);
    socket.emit('player:equipment:result',{ok:true,slot,itemName});
  });
  socket.on('market:sell', async input=>{
    const p=online.get(socket.data.playerId), itemId=String(input?.item||''), amount=Math.max(1,Math.min(99,Math.floor(Number(input?.qty)||1))), st=p?safeState(p.state):null;
    if(!p||!SELL_VALUES[itemId]){socket.emit('market:result',{ok:false,message:'Этот предмет нельзя продать.'});return;}
    st.state.items ||= [];const item=st.state.items.find(x=>x.id===itemId);
    if(!item||item.qty<amount){socket.emit('market:result',{ok:false,message:'Недостаточно предметов в рюкзаке.'});return;}
    item.qty-=amount;if(item.qty<=0)st.state.items=st.state.items.filter(x=>x.id!==itemId);
    const payout=Math.floor(SELL_VALUES[itemId]*.65)*amount;st.state.money=Math.min(99999999,(Number(st.state.money)||0)+payout);
    p.state=st.state;await persistPlayer(p.id,p.state);socket.emit('market:result',{ok:true,message:`Продано: ${item.name} ×${amount} · +${payout} ₽.`,state:p.state});
  });
  socket.on('market:deal', async input=>{
    const p=online.get(socket.data.playerId);
    if(!p){socket.emit('market:result',{ok:false,message:'Игрок не найден.'});return;}
    const rawBuy=Array.isArray(input?.buy)?input.buy:[], rawSell=Array.isArray(input?.sell)?input.sell:[];
    if(rawBuy.length>40||rawSell.length>40){socket.emit('market:result',{ok:false,message:'Слишком много позиций в сделке.'});return;}
    const combineRows=rows=>{const map=new Map();for(const row of rows){const id=String(row?.item||''),qty=Math.floor(Number(row?.qty)||0);map.set(id,(map.get(id)||0)+qty);}return [...map].map(([item,qty])=>({item,qty}));};
    const buy=combineRows(rawBuy),sell=combineRows(rawSell);
    const st=safeState(p.state);st.state.items ||= [];
    let cost=0,payout=0;
    const buyPlan=[],sellPlan=[];
    for(const row of buy){
      const id=String(row?.item||''),qty=Math.floor(Number(row?.qty)||0),goods=SHOP[id];
      if(!goods||qty<1||qty>20){socket.emit('market:result',{ok:false,message:'Некорректный товар в корзине.'});return;}
      cost+=goods.price*qty;buyPlan.push({id,qty,goods});
    }
    for(const row of sell){
      const id=String(row?.item||''),qty=Math.floor(Number(row?.qty)||0);
      if(!SELL_VALUES[id]||qty<1||qty>99){socket.emit('market:result',{ok:false,message:'Некорректный предмет для продажи.'});return;}
      const item=st.state.items.find(x=>x.id===id);
      if(!item||item.qty<qty){socket.emit('market:result',{ok:false,message:'Недостаточно предметов для продажи: '+id});return;}
      payout+=Math.floor(SELL_VALUES[id]*.65)*qty;sellPlan.push({id,qty});
    }
    if(st.money+ payout<cost){socket.emit('market:result',{ok:false,message:'Недостаточно рублей для сделки.'});return;}
    for(const row of sellPlan){
      const item=st.state.items.find(x=>x.id===row.id);item.qty-=row.qty;
      if(item.qty<=0)st.state.items=st.state.items.filter(x=>x.id!==row.id);
    }
    for(const row of buyPlan){
      const goods=row.goods,existing=st.state.items.find(x=>x.id===row.id);
      if(existing){existing.qty+=goods.qty*row.qty;if(goods.tier)existing.tier=goods.tier;if(goods.range)existing.range=goods.range;if(goods.effects)existing.effects=goods.effects;}
      else st.state.items.push({id:row.id,name:goods.name,type:goods.type,desc:goods.desc,weight:goods.weight,qty:goods.qty*row.qty,value:goods.value,...(goods.defense?{defense:goods.defense,condition:100}:{}),...(goods.capacity?{capacity:goods.capacity}:{}),...(goods.tier?{tier:goods.tier,range:goods.range}:{}),...(goods.effects?{effects:goods.effects}:{})});
    }
    st.state.money=Math.min(99999999,Math.max(0,st.money-cost+payout));
    p.state=st.state;await persistPlayer(p.id,p.state);
    socket.emit('market:result',{ok:true,message:`Сделка завершена. Покупка: ${cost} ₽, продажа: ${payout} ₽.`,state:p.state});
  });
  socket.on('trade:offer', async input=>{
    const fromId=socket.data.playerId, from=online.get(fromId), toId=String(input?.to||'');
    const to=online.get(toId), itemId=String(input?.item||''), qty=Math.floor(Number(input?.qty)||0), rawPrice=Number(input?.price), price=Number.isFinite(rawPrice)?Math.floor(rawPrice):-1;
    if(!from||!to||fromId===toId||!TRADE_ITEM_IDS.has(itemId)||qty<1||qty>99||price<0||price>1000000){socket.emit('trade:result',{ok:false,message:'Некорректное предложение обмена.'});return;}
    if(from.location!==to.location||!inRange(from,to,INTERACTION_RADIUS)){socket.emit('trade:result',{ok:false,message:'Для торговли подойди к игроку на расстояние не более 8 метров.'});return;}
    const pending=(world.events||[]).filter(x=>x.type==='trade'&&x.offer?.status!=='accepted'&&x.offer?.status!=='declined'&&x.offer?.expiresAt>Date.now()&&(x.offer?.from===fromId||x.offer?.to===fromId));
    if(pending.length>=5){socket.emit('trade:result',{ok:false,message:'Слишком много активных предложений. Заверши или дождись отмены старых.'});return;}
    const state=safeState(from.state).state, item=state.items?.find(x=>x.id===itemId);
    if(!item||item.qty<qty){socket.emit('trade:result',{ok:false,message:'Недостаточно предметов в рюкзаке.'});return;}
    const offer={id:crypto.randomUUID(),from:fromId,to:toId,fromName:from.name,toName:to.name,item:itemId,itemName:item.name,qty,price,createdAt:Date.now(),expiresAt:Date.now()+120000,status:'pending'};
    world.events ||= []; world.events.push({type:'trade',offer}); world.events=world.events.slice(-150);
    const syncEvent=appendWorldEvent(world,'trade_offer',{offerId:offer.id,from:from.name,to:to.name,item:offer.item,qty:offer.qty,price:offer.price});
    io.to(toId).emit('trade:incoming',offer);
    socket.emit('trade:result',{ok:true,message:'Предложение отправлено. Оно действует 2 минуты.',offer,offerId:offer.id});
    io.emit('world:event',syncEvent); await persistWorld();
  });
  socket.on('trade:respond', async input=>{
    const toId=socket.data.playerId, offerId=String(input?.offerId||''), accept=!!input?.accept;
    const event=(world.events||[]).find(x=>x.type==='trade'&&x.offer?.id===offerId), offer=event?.offer;
    if(!offer||offer.to!==toId||offer.status!=='pending'){socket.emit('trade:result',{ok:false,message:'Предложение уже недоступно.',offerId});return;}
    if(Number(offer.expiresAt||0)<=Date.now()){offer.status='expired';socket.emit('trade:result',{ok:false,message:'Время предложения истекло.',offerId});io.to(offer.from).emit('trade:result',{ok:false,message:'Время предложения обмена истекло.',offerId});persistWorld().catch(()=>{});return;}
    const from=online.get(offer.from), to=online.get(toId);
    if(!from||!to){socket.emit('trade:result',{ok:false,message:'Один из игроков отключился.',offerId});return;}
    if(from.location!==to.location||!inRange(from,to,INTERACTION_RADIUS)){offer.status='declined';socket.emit('trade:result',{ok:false,message:'Игроки должны находиться рядом — не дальше 8 метров.',offerId});io.to(offer.from).emit('trade:result',{ok:false,message:'Сделка отменена: игроки отошли дальше 8 метров.',offerId});persistWorld().catch(()=>{});return;}
    if(!accept){offer.status='declined';const syncEvent=appendWorldEvent(world,'trade_declined',{offerId:offer.id,by:to.name});io.emit('world:event',syncEvent);io.to(offer.from).emit('trade:result',{ok:true,message:`${to.name} отклонил обмен.`,offerId});socket.emit('trade:result',{ok:true,message:'Обмен отклонён.',offerId});await persistWorld();return;}
    offer.status='processing';
    try{
      let sellerState, buyerState, itemName;
      if(pool){
        const client=await pool.connect();
        try{
          await client.query('BEGIN');
          const receipt=await client.query('INSERT INTO zone_trade_receipts(offer_id,from_id,to_id,item_id,qty,price) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(offer_id) DO NOTHING RETURNING offer_id',[offer.id,offer.from,offer.to,offer.item,offer.qty,offer.price]);
          const rows=await client.query('SELECT id,state FROM zone_players WHERE id = ANY($1::text[]) FOR UPDATE',[[offer.from,offer.to]]);
          const states=new Map(rows.rows.map(r=>[r.id,r.state]));
          if(!receipt.rowCount){
            sellerState=states.get(offer.from);buyerState=states.get(offer.to);itemName=offer.itemName||offer.item;
          } else {
            const result=applyPlayerTrade({sellerState:states.get(offer.from),buyerState:states.get(offer.to),itemId:offer.item,qty:offer.qty,price:offer.price,allowedItemIds:TRADE_ITEM_IDS});
            if(!result.ok)throw new Error(result.message);
            sellerState=result.sellerState;buyerState=result.buyerState;itemName=result.itemName;
            await client.query('UPDATE zone_players SET state=$2,updated_at=NOW() WHERE id=$1',[offer.from,sellerState]);
            await client.query('UPDATE zone_players SET state=$2,updated_at=NOW() WHERE id=$1',[offer.to,buyerState]);
          }
          await client.query('COMMIT');
        }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
      }else{
        // Guest mode has no PostgreSQL. Keep both online profiles authoritative in memory
        // and perform the same all-or-nothing validation before changing either player.
        const result=applyPlayerTrade({sellerState:from.state,buyerState:to.state,itemId:offer.item,qty:offer.qty,price:offer.price,allowedItemIds:TRADE_ITEM_IDS});
        if(!result.ok)throw new Error(result.message);
        sellerState=result.sellerState;buyerState=result.buyerState;itemName=result.itemName;
      }
      from.state=sellerState;to.state=buyerState;from.money=sellerState.money;to.money=buyerState.money;
      offer.status='accepted';offer.completedAt=Date.now();
      await Promise.all([persistPlayer(from.id,from.state),persistPlayer(to.id,to.state)]);
      socket.emit('trade:result',{ok:true,message:`Обмен завершён: получено ${offer.qty} × ${itemName} за ${offer.price} ₽.`,state:buyerState,offerId});
      io.to(offer.from).emit('trade:result',{ok:true,message:`${to.name} принял обмен: ${offer.qty} × ${itemName} передано за ${offer.price} ₽.`,state:sellerState,offerId});
      const syncEvent=appendWorldEvent(world,'trade_completed',{offerId:offer.id,from:from.name,to:to.name,item:offer.item,qty:offer.qty,price:offer.price});
      io.emit('world:event',syncEvent);io.emit('world:trade',{offer,from:from.name,to:to.name});
      broadcastOnline();persistWorld().catch(e=>console.error('trade offer persistence:',e.message));
    }catch(e){offer.status='pending';socket.emit('trade:result',{ok:false,message:e.message||'Не удалось выполнить обмен.',offerId});}
  });
  socket.on('coop:join', async input=>{
    const p=online.get(socket.data.playerId); if(!p)return;
    const q=(world.coOpQuests||[]).find(x=>x.id===String(input?.questId||''));
    if(!q||q.done){socket.emit('coop:result',{ok:false,message:'Задание недоступно.'});return;}
    if(!q.participants.includes(p.id)){q.participants.push(p.id);q.participants=q.participants.slice(0,10);}
    const syncEvent=appendWorldEvent(world,'coop_joined',{questId:q.id,playerId:p.id,name:p.name});io.emit('world:event',syncEvent);await persistWorld();io.emit('world:coop',world.coOpQuests);socket.emit('coop:result',{ok:true,message:'Ты записан в группу задания.'});
  });
  socket.on('coop:contribute', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const q=(world.coOpQuests||[]).find(x=>x.id===String(input?.questId||''));
    if(!q||q.done||!q.participants.includes(p.id)||p.location!==q.location){socket.emit('coop:result',{ok:false,message:'Нужно вступить в группу и прибыть в указанный сектор.'});return;}
    q.arrivals ||= [];if(!q.arrivals.includes(p.id))q.arrivals.push(p.id);
    if(q.arrivals.length>=q.required&&!q.done&&!q.completing){
      q.completing=true; const winners=q.arrivals.slice();
      if(pool){
        const client=await pool.connect();
        const updated=[];
        try{await client.query('BEGIN');const rows=await client.query('SELECT id,state FROM zone_players WHERE id = ANY($1::text[]) FOR UPDATE',[winners]);
          for(const row of rows.rows){const st=safeState(row.state);st.state.money=Math.min(99999999,st.money+Math.max(0,Number(q.reward)||0));st.state.xp=Math.min(1e7,st.xp+Math.max(0,Number(q.xp)||0));await client.query('UPDATE zone_players SET state=$2,updated_at=NOW() WHERE id=$1',[row.id,st.state]);updated.push({id:row.id,state:st.state});}
          await client.query('COMMIT');
          for(const item of updated){const pl=online.get(item.id);if(pl){pl.state=item.state;pl.money=item.state.money;pl.xp=item.state.xp;pl.hp=item.state.hp;}}
        }catch(err){await client.query('ROLLBACK');q.completing=false;throw err;}finally{client.release();}
      }else{for(const id of winners){const pl=online.get(id);if(pl){const st=safeState(pl.state);st.state.money=Math.min(99999999,st.state.money+q.reward);st.state.xp=Math.min(1e7,st.state.xp+Math.max(0,Number(q.xp)||0));pl.state=st.state;pl.money=st.state.money;pl.xp=st.state.xp;pl.hp=st.state.hp;await persistPlayer(id,st.state);}}}
      q.done=true;q.completing=false;q.rewardedPlayers=winners.slice();
      for(const id of winners){const pl=online.get(id);if(pl)io.to(id).emit('coop:reward',{questId:q.id,reward:q.reward,xp:q.xp,state:pl.state});}
      systemMessage(`Совместное задание «${q.title}» выполнено.`);
    }
    const syncEvent=appendWorldEvent(world,'coop_progress',{questId:q.id,playerId:p.id,arrivals:q.arrivals.length,done:q.done});io.emit('world:event',syncEvent);await persistWorld();io.emit('world:coop',world.coOpQuests);socket.emit('coop:result',{ok:true,message:q.done?'Группа выполнила задание!':'Твоё прибытие отмечено.'});
  });
  socket.on('world:poi:discover', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const location=String(input?.location||'');const id=clean(input?.id,80);const name=clean(input?.name,80);
    if(!LOCATIONS.has(location)||p.location!==location||!new RegExp('^'+location+'_poi_[0-9]+$').test(id))return;
    world.discoveredPoints ||= {};world.discoveredPoints[location] ||= [];
    if(!world.discoveredPoints[location].includes(id)){world.discoveredPoints[location].push(id);const st=safeState(p.state).state;st.xp=Math.min(1e7,st.xp+12);st.stamina=Math.max(0,(Number(st.stamina)||0)-5);st.careerStats ||= {};st.careerStats.discoveries=(Number(st.careerStats.discoveries)||0)+1;p.state=st;p.xp=st.xp;await persistPlayer(p.id,st);const syncEvent=appendWorldEvent(world,'poi_discovered',{playerId:p.id,location,id,name});await persistWorld();io.emit('world:event',syncEvent);io.emit('world:poi',world.discoveredPoints);socket.emit('player:progression:result',{state:st,message:`Точка обнаружена: +12 опыта.`});systemMessage(`${p.name} обнаружил новую точку интереса: ${name} (${location}).`);}
  });
  socket.on('war:operation:create', async input=>{
    const p=online.get(socket.data.playerId); if(!p)return;
    const location=String(input?.location||'');
    if(!LOCATIONS.has(location)||p.location!==location){socket.emit('war:result',{ok:false,message:'Нужно находиться в секторе, где начинается операция.'});return;}
    world.territoryOwners ||= Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.owner]));
    world.territoryControl ||= Object.fromEntries(Object.entries(TERRITORY_START).map(([id,v])=>[id,v.control]));
    const owner=world.territoryOwners[location];
    if(!FACTIONS.has(owner)){socket.emit('war:result',{ok:false,message:'В секторе пока не определён владелец территории.'});return;}
    const sectorPoints=Object.values(world.keyPoints||{}).filter(point=>point.location===location);
    const requestedPoint=String(input?.pointId||'');
    const targetPoint=sectorPoints.find(point=>point.id===requestedPoint&&point.owner!==p.faction)||sectorPoints.filter(point=>point.owner!==p.faction).sort((a,b)=>(Number(a.control)||0)-(Number(b.control)||0))[0];
    if(!targetPoint){socket.emit('war:result',{ok:false,message:'В этом секторе нет доступного объекта для операции твоей группировки.'});return;}
    if(targetPoint.contestedBySquadId){socket.emit('war:result',{ok:false,message:'Этот объект уже является целью NPC-отряда. Дождись завершения их операции.'});return;}
    world.warOperations ||= [];
    if(world.warOperations.some(x=>x.pointId===targetPoint.id&&x.status==='active')){socket.emit('war:result',{ok:false,message:'За этот объект уже идёт операция.'});return;}
    if(world.warOperations.filter(x=>x.status==='active').length>=WAR_CONFIG.maxActiveOperations){socket.emit('war:result',{ok:false,message:'Слишком много активных операций. Дождись завершения одной из них.'});return;}
    const st=safeState(p.state); if(st.money<WAR_CONFIG.operationCost){socket.emit('war:result',{ok:false,message:`Для организации операции нужно ${WAR_CONFIG.operationCost} ₽.`});return;}
    st.state.money=st.money-WAR_CONFIG.operationCost;p.state=st.state;await persistPlayer(p.id,p.state);
    world.factionCommandRequests ||= {};world.factionCommandRequests[p.faction] ||= [];
    world.factionCommandRequests[p.faction].unshift({id:crypto.randomUUID(),pointId:targetPoint.id,playerId:p.id,playerName:p.name,trust:Math.max(0,Math.min(100,Number(p.state?.rep)||0)),at:Date.now(),expiresAt:Date.now()+30*60*1000});
    world.factionCommandRequests[p.faction]=world.factionCommandRequests[p.faction].slice(0,12);
    const op=createOperation({id:crypto.randomUUID(),location,pointId:targetPoint.id,pointName:targetPoint.name,attacker:p.faction,defender:targetPoint.owner,createdBy:p.id,territoryControl:targetPoint.control||50});
    world.warOperations.unshift(op);world.warOperations=world.warOperations.slice(0,20);const syncEvent=appendWorldEvent(world,'war_started',{operationId:op.id,location,pointId:targetPoint.id,pointName:targetPoint.name,attacker:p.faction,defender:targetPoint.owner,commander:p.name});
    await persistWorld();io.emit('world:event',syncEvent);io.emit('war:state',{operations:world.warOperations,history:world.warHistory||[],keyPoints:world.keyPoints||{},objectives:world.factionObjectives||{},resources:world.factionResources||{},commands:world.factionCommand||{},factionWarHistory:(world.factionWarHistory||[]).slice(0,30)});io.emit('world:update',{world:publicWorldSnapshot(),notice:`В секторе ${location} группировка «${p.faction}» начала операцию за объект «${targetPoint.name}» против «${targetPoint.owner}».`});
    socket.emit('war:result',{ok:true,message:'Операция объявлена. Собирай бойцов и отдавай приказы.',state:p.state});
  });
  socket.on('war:operation:deploy', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const op=(world.warOperations||[]).find(x=>x.id===String(input?.operationId||''));
    if(!op||op.status!=='active'||p.location!==op.location){socket.emit('war:result',{ok:false,message:'Операция недоступна или ты находишься в другом секторе.'});return;}
    const action=String(input?.action||'');
    if((action==='attack'&&p.faction!==op.attacker)||(action==='defend'&&p.faction!==op.defender)){socket.emit('war:result',{ok:false,message:'Твоя группировка не может выполнить этот приказ в данной операции.'});return;}
    const st=safeState(p.state);if(st.money<WAR_CONFIG.deploymentCost){socket.emit('war:result',{ok:false,message:`Для снабжения бойца нужно ${WAR_CONFIG.deploymentCost} ₽.`});return;}
    const power=deploymentPower({xp:st.xp,rep:st.rep,action});
    const result=addDeployment(op,{id:p.id,name:p.name,faction:p.faction},action,power);
    if(!result.ok){socket.emit('war:result',{ok:false,message:result.reason});return;}
    st.state.money=st.money-WAR_CONFIG.deploymentCost;p.state=st.state;await persistPlayer(p.id,p.state);
    const syncEvent=appendWorldEvent(world,'war_deployment',{operationId:op.id,playerId:p.id,action,power});await persistWorld();io.emit('world:event',syncEvent);io.emit('war:state',{operations:world.warOperations,history:world.warHistory||[],keyPoints:world.keyPoints||{},objectives:world.factionObjectives||{},resources:world.factionResources||{},commands:world.factionCommand||{},factionWarHistory:(world.factionWarHistory||[]).slice(0,30)});socket.emit('war:result',{ok:true,message:`Приказ выполнен. Боевая сила отряда: +${power}.`,state:p.state});
  });
  socket.on('war:operation:resolve', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const op=(world.warOperations||[]).find(x=>x.id===String(input?.operationId||''));
    if(!op||op.status!=='active'||op.createdBy!==p.id){socket.emit('war:result',{ok:false,message:'Завершить операцию может только её командир.'});return;}
    const result=resolveOperation(op);if(!result.ok){socket.emit('war:result',{ok:false,message:result.reason});return;}
    if(result.captured){
      const point=world.keyPoints?.[op.pointId]||Object.values(world.keyPoints||{}).find(x=>x.location===op.location&&x.owner===op.defender);
      if(point){point.owner=op.attacker;point.control=55;point.captureProgress=0;point.updatedAt=Date.now();aggregateTerritories(world);}
    }
    const record={id:op.id,location:op.location,pointId:op.pointId||null,pointName:op.pointName||world.keyPoints?.[op.pointId]?.name||null,attacker:op.attacker,defender:op.defender,winner:result.winner,captured:result.captured,at:Date.now()};
    world.warHistory ||= [];world.warHistory.unshift(record);world.warHistory=world.warHistory.slice(0,30);const syncEvent=appendWorldEvent(world,'war_resolved',record);
    for(const participant of op.participants){const pl=online.get(participant.playerId);if(!pl)continue;const st=safeState(pl.state);st.state.xp=Math.min(1e7,st.xp+35);st.state.rep=Math.max(-1000,Math.min(1000,st.rep+(participant.side===result.winner?5:-2)));if(participant.side===result.winner)st.state.money=Math.min(99999999,st.money+180);pl.state=st.state;await persistPlayer(pl.id,pl.state);io.to(pl.id).emit('war:reward',{state:pl.state,winner:result.winner,won:participant.side===result.winner});}
    await persistWorld();io.emit('world:event',syncEvent);io.emit('war:state',{operations:world.warOperations,history:world.warHistory,keyPoints:world.keyPoints||{},objectives:world.factionObjectives||{},resources:world.factionResources||{},commands:world.factionCommand||{},factionWarHistory:(world.factionWarHistory||[]).slice(0,30)});io.emit('world:update',{world:publicWorldSnapshot(),notice:result.captured?`«${op.attacker}» захватили объект «${record.pointName||op.location}» в секторе ${op.location}.`:`«${op.defender}» удержали объект «${record.pointName||op.location}» в секторе ${op.location}.`});socket.emit('war:result',{ok:true,message:result.captured?'Победа! Объект перешёл под контроль твоей группировки.':'Оборона удержала объект.',world:publicWorldSnapshot()});
  });
  socket.on('friend:request',async input=>{const p=online.get(socket.data.playerId),target=online.get(String(input?.targetId||''));if(!p||!target||p.id===target.id){socket.emit('friend:result',{ok:false,message:'Игрок не найден.'});return;}world.playerFriends ||= {};world.playerFriendRequests ||= {};const friends=world.playerFriends[p.id]||[];if(friends.some(f=>f.id===target.id)){socket.emit('friend:result',{ok:false,message:'Этот игрок уже в друзьях.'});return;}world.playerFriendRequests[target.id] ||= [];if(!world.playerFriendRequests[target.id].some(x=>x.fromId===p.id))world.playerFriendRequests[target.id].push({fromId:p.id,name:p.name,faction:p.faction,at:Date.now()});io.to(target.id).emit('friend:invite',{fromId:p.id,name:p.name,faction:p.faction});await persistWorld();socket.emit('friend:result',{ok:true,message:`Запрос дружбы отправлен игроку ${target.name}.`});});
  socket.on('friend:respond',async input=>{const p=online.get(socket.data.playerId),fromId=String(input?.fromId||'');if(!p)return;world.playerFriends ||= {};world.playerFriendRequests ||= {};const requests=world.playerFriendRequests[p.id]||[],request=requests.find(x=>x.fromId===fromId);if(!request){socket.emit('friend:result',{ok:false,message:'Запрос больше недоступен.'});return;}world.playerFriendRequests[p.id]=requests.filter(x=>x.fromId!==fromId);if(input?.accept){const from=online.get(fromId);world.playerFriends[p.id] ||= [];world.playerFriends[fromId] ||= [];if(!world.playerFriends[p.id].some(x=>x.id===fromId))world.playerFriends[p.id].push({id:fromId,name:request.name,faction:request.faction});if(from&&!world.playerFriends[fromId].some(x=>x.id===p.id))world.playerFriends[fromId].push({id:p.id,name:p.name,faction:p.faction});io.to(fromId).emit('friend:state',{friends:world.playerFriends[fromId]});}await persistWorld();socket.emit('friend:state',{friends:world.playerFriends[p.id]||[]});socket.emit('friend:result',{ok:true,message:input?.accept?'Игрок добавлен в друзья.':'Запрос отклонён.'});});
  socket.on('squad:create', async()=>{const p=online.get(socket.data.playerId);if(!p)return;world.playerSquads ||= {};if(squadOf(p.id)){socket.emit('squad:state',{squad:squadOf(p.id)});return;}const id=crypto.randomUUID(),squad={id,name:`${p.name} и группа`,leader:p.id,location:p.location,members:[{id:p.id,name:p.name,faction:p.faction,role:'leader'}],invites:[],journal:[],escortNpcId:null,createdAt:Date.now()};squadJournal(squad,'formed',`${p.name} собрал отряд.`);world.playerSquads[id]=squad;await persistWorld();publishSquad(squad);});
  socket.on('squad:invite', async input=>{const p=online.get(socket.data.playerId),target=online.get(String(input?.targetId||''));if(!p||!target||p.location!==target.location){socket.emit('squad:result',{ok:false,message:'Приглашать можно только игрока в той же локации.'});return;}world.playerSquads ||= {};let squad=squadOf(p.id);if(squad&&squad.leader!==p.id){socket.emit('squad:result',{ok:false,message:'Только лидер может приглашать в отряд.'});return;}if(!squad){const id=crypto.randomUUID();squad=world.playerSquads[id]={id,name:`Отряд ${p.name}`,leader:p.id,location:p.location,members:[{id:p.id,name:p.name,faction:p.faction,role:'leader'}],invites:[],journal:[],escortNpcId:null,createdAt:Date.now()};}if(squad.members.length>=4){socket.emit('squad:result',{ok:false,message:'В отряде не может быть больше четырёх сталкеров.'});return;}if(squad.members.some(m=>m.id===target.id)){socket.emit('squad:result',{ok:false,message:'Игрок уже в твоём отряде.'});return;}squad.invites ||= [];if(!squad.invites.includes(target.id))squad.invites.push(target.id);io.to(target.id).emit('squad:invite',{squadId:squad.id,name:squad.name,leader:p.name,location:p.location});await persistWorld();socket.emit('squad:result',{ok:true,message:`Приглашение отправлено: ${target.name}.`});});
  socket.on('squad:respond', async input=>{const p=online.get(socket.data.playerId);if(!p)return;const squad=world.playerSquads?.[String(input?.squadId||'')];if(!squad||!squad.invites?.includes(p.id)||squad.location!==p.location){socket.emit('squad:result',{ok:false,message:'Приглашение недействительно или отряд уже ушёл.'});return;}squad.invites=squad.invites.filter(id=>id!==p.id);if(input?.accept){const previous=squadOf(p.id);if(previous){previous.members=previous.members.filter(m=>m.id!==p.id);if(!previous.members.length)delete world.playerSquads[previous.id];}squad.members.push({id:p.id,name:p.name,faction:p.faction,role:'rifleman'});squadJournal(squad,'joined',`${p.name} присоединился к отряду.`);}await persistWorld();publishSquad(squad);socket.emit('squad:state',{squad:input?.accept?squad:null});socket.emit('squad:result',{ok:true,message:input?.accept?'Ты вступил в отряд.':'Приглашение отклонено.'});});
  socket.on('squad:leave', async()=>{const p=online.get(socket.data.playerId);if(!p)return;const squad=squadOf(p.id);if(squad){squad.members=squad.members.filter(m=>m.id!==p.id);squadJournal(squad,'left',`${p.name} покинул отряд.`);if(!squad.members.length)delete world.playerSquads[squad.id];else if(squad.leader===p.id){squad.leader=squad.members[0].id;squad.members[0].role='leader';squadJournal(squad,'leader',`${squad.members[0].name} принял командование.`);}publishSquad(squad);}await persistWorld();socket.emit('squad:state',{squad:null});});
  socket.on('squad:role',async input=>{const p=online.get(socket.data.playerId),squad=p&&squadOf(p.id),member=squad?.members.find(m=>m.id===String(input?.memberId||'')),role=String(input?.role||'');if(!p||!squad||squad.leader!==p.id||!member||!SQUAD_ROLES.has(role)||member.id===squad.leader){socket.emit('squad:result',{ok:false,message:'Нельзя назначить эту роль.'});return;}member.role=role;squadJournal(squad,'role',`${member.name} назначен: ${role}.`);await persistWorld();publishSquad(squad);socket.emit('squad:result',{ok:true,message:'Роль бойца обновлена.'});});
  socket.on('squad:escort',async input=>{const p=online.get(socket.data.playerId),squad=p&&squadOf(p.id),npcId=String(input?.npcId||''),npc=world.npcState?.[npcId];if(!p||!squad||squad.leader!==p.id||!npc||npc.alive===false||npc.location!==squad.location){socket.emit('squad:result',{ok:false,message:'Нужен живой NPC в вашем секторе; приказ отдаёт лидер.'});return;}const friendly=npc.faction===p.faction||Number(npc.relationships?.[p.id]||npc.relationship||0)>=15;if(!friendly){socket.emit('squad:result',{ok:false,message:'Этот сталкер не доверяет вашему отряду.'});return;}squad.escortNpcId=npcId;npc.escortSquadId=squad.id;squadJournal(squad,'escort',`${npc.name} согласился сопровождать отряд.`);await persistWorld();publishSquad(squad);socket.emit('squad:result',{ok:true,message:`${npc.name} присоединился к сопровождению.`});});
  socket.on('npc:corpse:loot', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const result=lootCorpse(world,p,String(input?.corpseId||''),Date.now());
    if(!result.ok){socket.emit('npc:corpse:loot:result',{ok:false,message:result.reason});return;}
    p.state=result.state;await persistPlayer(p.id,p.state);await persistWorld();
    const message=`Ты обыскал тело и нашёл ${result.money} ₽${result.items.length?` и предметов: ${result.items.map(x=>x.name).join(', ')}`:''}.`;
    io.emit('world:npc-state',{npcs:publicNpcRoster(),events:(world.npcEvents||[]).slice(-20),squads:world.npcSquads||[],memorial:world.npcMemorial||[],corpses:(world.npcCorpses||[]).map(({loot,...c})=>c),factionNotices:(world.factionNotices||[]).slice(0,30),rescueOperations:(world.rescueOperations||[]).slice(0,20),battlefronts:world.battlefronts||[],convoys:world.convoys||[],factionBases:world.factionBases||[],frontlineOrders:world.frontlineOrders||[],keyPoints:world.keyPoints||{},factionObjectives:world.factionObjectives||{},factionResources:world.factionResources||{},factionCommand:world.factionCommand||{},factionWarHistory:(world.factionWarHistory||[]).slice(0,30)});
    socket.emit('npc:corpse:loot:result',{ok:true,message,state:p.state,money:result.money,items:result.items});
  });
  socket.on('npc:combat:start', input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const npcId=String(input?.npcId||'').slice(0,48),npc=world.npcState?.[npcId];
    if(!npc||npc.alive===false||npc.location!==p.location||!isHostileFaction(p.faction,npc.faction,world.diplomacy)||!inRange(p,npcWorldPosition(npc),COMBAT_RADIUS)){
      socket.emit('npc:combat:result',{ok:false,message:'Нельзя начать бой: цель недоступна или находится вне радиуса.'});return;
    }
    socket.data.activeCombat={npcId,startedAt:Date.now(),lastActionAt:0,playerId:p.id,guard:false};
    socket.emit('npc:combat:started',{npcId,startedAt:socket.data.activeCombat.startedAt,enemyHp:Math.max(35,Number(npc.health)||80),playerHp:Number(p.state?.hp)||100});
  });
  socket.on('npc:combat:action', async input=>{
    const p=online.get(socket.data.playerId),combat=socket.data.activeCombat;if(!p||!combat||combat.playerId!==p.id)return;
    const npc=world.npcState?.[combat.npcId],action=String(input?.action||'');
    if(!['attack','guard','med','retreat'].includes(action)||!npc||npc.alive===false||npc.location!==p.location||!isHostileFaction(p.faction,npc.faction,world.diplomacy)||!inRange(p,npcWorldPosition(npc),COMBAT_RADIUS)){
      socket.emit('npc:combat:result',{ok:false,message:'Боевой контакт недействителен.'});socket.data.activeCombat=null;return;
    }
    const now=Date.now();if(now-combat.startedAt<400||now-combat.lastActionAt<650){socket.emit('npc:combat:result',{ok:false,message:'Слишком быстрое действие. Дождись следующего хода.'});return;}combat.lastActionAt=now;
    const st=safeState(p.state).state;st.items=Array.isArray(st.items)?st.items:[];let playerMessage='';
    if(action==='retreat'){
      if(Math.random()<.68){st.stamina=Math.max(0,(Number(st.stamina)||0)-8);p.state=st;socket.data.activeCombat=null;await persistPlayer(p.id,st);socket.emit('npc:combat:result',{ok:true,outcome:'escaped',state:st,npcId:npc.id,message:'Отступление удалось.'});return;}
      playerMessage='Отступление не удалось.';
    } else if(action==='guard'){
      combat.guard=true;playerMessage='Ты занял защитную позицию.';
    } else if(action==='med'){
      const med=st.items.find(x=>['med','bandage','trauma_kit'].includes(x.id)&&Number(x.qty)>0);
      if(!med||Number(st.hp)>=100){socket.emit('npc:combat:result',{ok:false,message:'Нет подходящего лекарства или здоровье уже полное.'});return;}
      const restore=med.id==='trauma_kit'?50:med.id==='bandage'?12:32;st.hp=Math.min(100,(Number(st.hp)||0)+restore);med.qty=Number(med.qty)-1;if(med.qty<=0)st.items=st.items.filter(x=>x!==med);playerMessage=`Использовано средство: ${med.name}.`;
    } else {
      const weapon=st.items.find(x=>x.type==='Оружие'&&x.name===st.equipment?.weapon)||st.items.find(x=>x.type==='Оружие'&&Number(x.qty)>0);
      let power=Math.max(8,Number(weapon?.power)||12);if(weapon){power=Math.round(power*Math.max(25,Number(weapon.condition??75))/100);if(weapon.condition!=null)weapon.condition=Math.max(0,Number(weapon.condition)-1);}
      const damage=Math.max(4,power+Math.floor(Math.random()*9)-3);npc.health=Math.max(0,(Number(npc.health)||80)-damage);playerMessage=`Атака подтверждена сервером: противник потерял ${damage} здоровья.`;
    }
    if(npc.health<=0){
      npc.alive=false;npc.health=0;npc.action='dead';npc.deathCause=`погиб в столкновении со сталкером ${p.name}`;npc.diedAt=now;socket.data.activeCombat=null;
      world.npcMemorial||=[];world.npcMemorial.unshift({id:`mem_${npc.id}_${npc.diedAt}`,name:npc.name,faction:npc.faction,role:npc.role,location:npc.location,cause:npc.deathCause,diedAt:npc.diedAt});world.npcMemorial=world.npcMemorial.slice(0,100);
      world.npcPositions[npc.id]=npc.location;const ev=appendWorldEvent(world,'npc_killed',{npcId:npc.id,name:npc.name,faction:npc.faction,playerId:p.id,playerName:p.name,location:p.location});recordStalkerKill(p,npc);
      st.money=Math.min(99999999,(Number(st.money)||0)+60+Math.floor(Math.random()*100));st.xp=Math.min(1e7,(Number(st.xp)||0)+18+Math.floor(Math.random()*16));st.careerStats||={};st.careerStats.kills=(Number(st.careerStats.kills)||0)+1;
      p.state=st;p.money=st.money;p.xp=st.xp;p.hp=st.hp;await persistPlayer(p.id,st);await persistWorld();io.emit('world:event',ev);io.emit('world:leaderboard',leaderboardPayload());emitNpcState();socket.emit('npc:combat:result',{ok:true,outcome:'win',npcId:npc.id,state:st,message:`Победа над ${npc.name}. Награда начислена сервером.`});return;
    }
    const armor=st.items.find(x=>x.name===st.equipment?.suit&&x.type==='Броня'),helmet=st.items.find(x=>x.name===st.equipment?.helmet&&x.type==='Шлем');
    const defense=(armor?Math.round((Number(armor.condition??70)/100)*(Number(armor.defense)||4)):0)+(helmet?Math.round((Number(helmet.condition??100)/100)*(Number(helmet.defense)||1)):0);
    const baseDamage=8+Math.floor(Math.random()*6),damage=Math.max(2,baseDamage-defense-(combat.guard?Math.round(baseDamage*.65):0));combat.guard=false;st.hp=Math.max(0,(Number(st.hp)||0)-damage);
    if(armor)armor.condition=Math.max(0,Number(armor.condition??100)-Math.max(1,Math.ceil(damage/12)));if(helmet)helmet.condition=Math.max(0,Number(helmet.condition??100)-Math.max(1,Math.ceil(damage/28)));
    p.state=st;p.hp=st.hp;p.xp=st.xp;p.money=st.money;await persistPlayer(p.id,st);
    if(st.hp<=0){st.dead=true;st.characterCreated=false;st.deathCause=`погиб в бою с ${npc.name}`;st.diedAt=now;socket.data.activeCombat=null;await persistPlayer(p.id,st);socket.emit('npc:combat:result',{ok:true,outcome:'defeat',state:st,npcId:npc.id,message:'Персонаж погиб в бою.'});return;}
    await persistWorld();emitNpcState();socket.emit('npc:combat:turn',{npcId:npc.id,enemyHp:npc.health,playerHp:st.hp,state:st,message:playerMessage||`Противник наносит ${damage} урона.`});
  });
  // Direct client kill requests are deliberately disabled. NPC deaths are
  // committed only by the server-side combat action resolver above.
  socket.on('npc:combat:kill', ()=>socket.emit('npc:combat:result',{ok:false,message:'Прямая фиксация победы отключена. Заверши бой через боевые ходы.'}));
  socket.on('npc:specialist', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const npc=world.npcState?.[String(input?.npcId||'').slice(0,48)];
    if(!npc||npc.alive===false||npc.location!==p.location||!inRange(p,npcWorldPosition(npc),INTERACTION_RADIUS)||!npc.supportSpecialist){socket.emit('npc:specialist:result',{ok:false,message:'Специалист должен быть жив и находиться рядом.'});return;}
    const state=safeState(p.state),medic=npc.role==='медик',technician=npc.role==='техник';
    if(!medic&&!technician){socket.emit('npc:specialist:result',{ok:false,message:'Этот сталкер не оказывает такую услугу.'});return;}
    const cost=medic?75:100;
    if(state.money<cost){socket.emit('npc:specialist:result',{ok:false,message:`Нужно ${cost} ₽ за услугу.`});return;}
    if(medic){if(state.hp>=100){socket.emit('npc:specialist:result',{ok:false,message:'Здоровье уже в порядке.'});return;}state.state.hp=Math.min(100,state.hp+35);}
    else{
      const armor=(state.state.items||[]).find(x=>x.name===state.state.equipment?.suit&&x.type==='Броня');
      if(!armor){socket.emit('npc:specialist:result',{ok:false,message:'Сначала надень броню, которую нужно отремонтировать.'});return;}
      if(Number(armor.condition??100)>=100){socket.emit('npc:specialist:result',{ok:false,message:'Броня уже полностью исправна.'});return;}
      armor.condition=Math.min(100,Number(armor.condition??70)+35);
    }
    state.state.money=state.money-cost;p.state=state.state;p.hp=state.state.hp;await persistPlayer(p.id,p.state);
    const message=medic?`${npc.name} оказал медицинскую помощь. Здоровье восстановлено на 35 пунктов.`:`${npc.name} отремонтировал броню. Состояние улучшено на 35 пунктов.`;
    socket.emit('npc:specialist:result',{ok:true,state:p.state,message});
  });
  socket.on('npc:interact', async input=>{
    const p=online.get(socket.data.playerId); if(!p)return;
    const npcId=String(input?.npcId||'').slice(0,48), action=String(input?.action||'');
    const npc=world.npcState?.[npcId];
    const result=interactWithNpc(npc,{id:p.id,location:p.location,x:p.x,y:p.y,position:{x:p.x,y:p.y}},action,Date.now(),{recentWorldEvent:world.zoneEvents?.at(-1)?.title||'',locationName:npc?.location,topicIndex:input?.topicIndex,friendName:world.npcState?.[npc?.friends?.[0]]?.name||'',rivalName:world.npcState?.[npc?.rivals?.[0]]?.name||''});
    socket.emit('npc:interaction-result',result);
    if(result.ok){ const syncEvent=appendWorldEvent(world,'npc_interaction',{npcId,playerId:p.id,action,relationship:result.relationship}); await persistWorld(); io.emit('world:event',syncEvent); emitNpcState(); }
  });
  socket.on('survival:hunt', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;const eco=initEcosystem(world),pack=eco.mutantPacks.find(x=>x.id===String(input?.packId||'')&&x.location===p.location&&x.count>0);
    if(!pack){socket.emit('survival:hunt:result',{ok:false,message:'В этом секторе больше нет доступной группы мутантов.'});return;}
    const st=safeState(p.state);st.state.items ||= [];st.state.survival ||= {lastHuntAt:0,events:[]};const now=Date.now();
    if(now-Number(st.state.survival.lastHuntAt||0)<60000){socket.emit('survival:hunt:result',{ok:false,message:'После предыдущей охоты нужно восстановиться.'});return;}
    if(Number(st.state.stamina||0)<18){socket.emit('survival:hunt:result',{ok:false,message:'Для охоты нужно минимум 18 выносливости.'});return;}
    const weapon=String(st.state.equipment?.weapon||'');if(!weapon){socket.emit('survival:hunt:result',{ok:false,message:'Нет экипированного оружия.'});return;}
    const quality=/АК|винтов|руж|СВД|Гроза/i.test(weapon)?75:45;const chance=Math.max(.18,Math.min(.82,.72-(Number(pack.aggression)||50)*.003+quality*.001-Math.max(0,100-Number(st.state.stamina||0))*.002));
    st.state.stamina=Math.max(0,Number(st.state.stamina||0)-18);st.state.survival.lastHuntAt=now;const success=Math.random()<chance;let message;
    if(success){pack.count=Math.max(0,pack.count-1);st.state.careerStats ||= {};st.state.careerStats.mutantHunts=(Number(st.state.careerStats.mutantHunts)||0)+1;const trophy=st.state.items.find(x=>x.id==='mutant_trophy');if(trophy)trophy.qty=(Number(trophy.qty)||0)+1;else st.state.items.push({id:'mutant_trophy',name:'Трофей мутанта',type:'Материал',desc:'Добыча после охоты на мутанта.',weight:.8,qty:1,value:110});st.state.xp=Math.min(1e7,(Number(st.state.xp)||0)+18);st.state.money=Math.min(99999999,(Number(st.state.money)||0)+35);message=`Охота успешна: ${pack.species}. Получен трофей, +18 опыта и 35 ₽.`;}
    else{const damage=Math.max(2,Math.round((Number(pack.aggression)||40)/12));st.state.hp=Math.max(1,(Number(st.state.hp)||100)-damage);message=`Мутанты контратаковали. Потеряно ${damage} здоровья. Следует отступить и перевязаться.`;}
    p.state=st.state;p.hp=st.state.hp;p.xp=st.state.xp;await persistPlayer(p.id,p.state);eco.revision=(eco.revision||0)+1;addEcoEvent(world,success?'mutant_hunt':'mutant_attack',`${p.name}: ${message}`,now);await persistWorld();io.emit('world:ecosystem',eco);socket.emit('survival:hunt:result',{ok:success,message,state:p.state,ecosystem:eco});
  });
  socket.on('base:upgrade', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;const cost=500,st=safeState(p.state);
    if(st.money<cost){socket.emit('ecosystem:result',{ok:false,message:`Нужно ${cost} ₽ на материалы.`});return;}
    const result=upgradeBase(world,String(input?.location||''),p.faction,cost);if(!result.ok){socket.emit('ecosystem:result',{ok:false,message:result.reason});return;}
    st.state.money=st.money-cost;p.state=st.state;await persistPlayer(p.id,p.state);const ev=appendWorldEvent(world,'base_upgraded',{location:result.base.location,faction:p.faction,level:result.base.level});await persistWorld();io.emit('world:event',ev);io.emit('world:ecosystem',world.ecosystem);socket.emit('ecosystem:result',{ok:true,message:`База улучшена до уровня ${result.base.level}.`,state:p.state});
  });
  socket.on('clan:create', async input=>{const p=online.get(socket.data.playerId);if(!p)return;const result=createClan(world,{id:p.id,name:p.name,faction:p.faction},input?.name);if(!result.ok){socket.emit('ecosystem:result',{ok:false,message:result.reason});return;}const ev=appendWorldEvent(world,'clan_created',{clanId:result.clan.id,name:result.clan.name,faction:p.faction});await persistWorld();io.emit('world:event',ev);io.emit('world:ecosystem',world.ecosystem);socket.emit('ecosystem:result',{ok:true,message:`Клан «${result.clan.name}» создан.`,clan:result.clan});});
  socket.on('clan:join', async input=>{const p=online.get(socket.data.playerId);if(!p)return;const result=joinClan(world,{id:p.id,name:p.name,faction:p.faction},input?.clanId);if(!result.ok){socket.emit('ecosystem:result',{ok:false,message:result.reason});return;}await persistWorld();io.emit('world:ecosystem',world.ecosystem);socket.emit('ecosystem:result',{ok:true,message:`Ты вступил в клан «${result.clan.name}».`});});
  socket.on('diplomacy:action', async input=>{
    const p=online.get(socket.data.playerId);if(!p)return;
    const target=clean(input?.target,32), action=input?.action;
    if(!FACTIONS.has(target)||target===p.faction||!['mediator','intel','treaty'].includes(action))return;
    const costs={mediator:120,intel:80,treaty:250},delta={mediator:4,intel:7,treaty:12};
    const state=safeState(p.state);if(state.money<costs[action]){socket.emit('diplomacy:result',{ok:false,message:'Недостаточно рублей.'});return;}
    state.state.money=state.money-costs[action];state.state.rep=(Number(state.state.rep)||0)+1;
    world.diplomacy[p.faction] ||= {};world.diplomacy[target] ||= {};
    if (p.faction === 'Монолит' || target === 'Монолит') { socket.emit('diplomacy:result',{ok:false,message:'Отношения с Монолитом не поддаются дипломатическому изменению.'}); return; }
    const updated=Math.min(60,(world.diplomacy[p.faction][target]||0)+delta[action]);
    world.diplomacy[p.faction][target]=updated;
    world.diplomacy[target][p.faction]=updated;
    const syncEvent=appendWorldEvent(world,'diplomacy_changed',{from:p.faction,to:target,action,delta:delta[action]});
    p.state=state.state;await persistPlayer(p.id,p.state);await persistWorld(); io.emit('world:event',syncEvent);
    io.emit('world:update',{world:publicWorldSnapshot(),notice:`${p.name} провёл дипломатическую миссию между «${p.faction}» и «${target}».`});
    socket.emit('diplomacy:result',{ok:true,state:p.state,world});
  });
  socket.on('disconnect',(reason)=>{
    console.info(`[socket] disconnected id=${socket.id} player=${socket.data.playerId||'unidentified'} reason=${reason}${socket.data.supersededBy?` supersededBy=${socket.data.supersededBy}`:''}`);
    allowSocketEvent.clear(socket.id);
    const id=socket.data.playerId,p=online.get(id);if(!p||p.socketId!==socket.id)return;
    // Persist the last authoritative state on a real disconnect as well as on
    // explicit client saves. Superseded sockets are filtered by the socketId guard above.
    persistPlayer(id,p.state).catch(e=>console.error('disconnect player persistence:',e.message));
    online.delete(id);const ev=appendWorldEvent(world,'player_left',{playerId:id,name:p.name,faction:p.faction,location:p.location});io.to('zone-world').emit('world:event',ev);persistWorld().catch(e=>console.error('leave persistence:',e.message));systemMessage(`${p.name} покинул Зону.`);broadcastOnline();
  });
});

function applyEmissionExposure(player, emission, now) {
  if (!player?.state || emission?.phase !== 'active') return false;
  const state = player.state;
  state.survival ||= {};
  const survival = state.survival;
  if (survival.emissionCycle !== emission.cycle) {
    survival.emissionCycle = emission.cycle;
    survival.lastEmissionDamageAt = 0;
  }
  if (now - Number(survival.lastEmissionDamageAt || 0) < 55_000) return false;
  const sheltered = Number(state.serverShelterUntil || 0) > now;
  const suit = (state.items || []).find(item => item?.name === state.equipment?.suit && item.type === 'Броня');
  const artifact = (state.items || []).find(item => item?.name === state.equipment?.artifact && item.type === 'Артефакт');
  const artifactProtection = Math.max(0, Math.min(0.3, Number(artifact?.effects?.radiationProtection || 0)));
  const damage = emissionDamage(sheltered, Number(suit?.defense || 0) * 5 + artifactProtection * 100);
  const currentHp = Number.isFinite(Number(state.hp)) ? Math.max(0, Number(state.hp)) : 100;
  if (currentHp <= 0) return false;
  state.hp = Math.max(1, currentHp - damage.hp);
  state.radiation = Math.min(100, (Number(state.radiation) || 0) + Math.max(0, damage.radiation - artifactProtection * 12));
  state.stamina = Math.max(0, (Number(state.stamina) || 0) - damage.stamina);
  survival.lastEmissionDamageAt = now;
  state.emission = { ...publicEmissionState({ emission }), active: true, warning: false };
  socketSafeEmit(player.id, 'player:survival:update', { state, message: sheltered ? 'Укрытие защитило от основной волны.' : 'Выброс воздействует на организм. Найди укрытие.' });
  persistPlayer(player.id, state).catch(error => console.error('emission player save:', error.message));
  return true;
}

function socketSafeEmit(playerId,event,payload){io.to(playerId).emit(event,payload);}
let playerMovementTickRunning=false;
setInterval(async()=>{
  if(playerMovementTickRunning)return;playerMovementTickRunning=true;
  try{
    let movedAny=false;
    for(const p of online.values()){
      if(p.expedition?.status==='travelling'){
        const activeExpeditionId=p.expedition.id,activeExpeditionToken=p.expeditionToken;
        const step=advanceExpedition(p,Date.now());
        if(step.advanced){if(!p.expedition||p.expedition.id!==activeExpeditionId||p.expeditionToken!==activeExpeditionToken)continue;p.lastSeen=Date.now();p.state ||= {};const arrivalPoint=SECTOR_COORDS[step.location]||SECTOR_COORDS.cordon;p.x=arrivalPoint[0];p.y=arrivalPoint[1]+24;p.state.worldPosition={x:p.x,y:p.y};const hopRisk=require('./src/systems/expedition').RISK[step.location]||30;const hopCost=require('./public/js/survival').expeditionCost(hopRisk,'overcast',!!p.state.emission?.active);const kit=p.state.survival?.kit;if(kit?.rations>0&&kit?.water>0){p.state.hunger=Math.max(0,(Number(p.state.hunger)||0)-8);p.state.thirst=Math.max(0,(Number(p.state.thirst)||0)-18);p.state.survival.kit=null;}else{hopCost.stamina+=8;hopCost.hunger+=5;hopCost.thirst+=7;}p.state.stamina=Math.max(0,(Number(p.state.stamina)||0)-hopCost.stamina);p.state.hunger=Math.min(100,(Number(p.state.hunger)||0)+hopCost.hunger);p.state.thirst=Math.min(100,(Number(p.state.thirst)||0)+hopCost.thirst);p.state.radiation=Math.min(100,(Number(p.state.radiation)||0)+hopCost.radiation);if(p.state.stamina<=0)p.state.hp=Math.max(1,(Number(p.state.hp)||100)-4);p.state.loc=step.location;await persistPlayer(p.id,p.state);if(!p.expedition||p.expedition.id!==activeExpeditionId||p.expeditionToken!==activeExpeditionToken)continue;const old=p.expedition.path[p.expedition.index-1];const sock=[...io.sockets.sockets.values()].find(x=>x.data.playerId===p.id);if(sock){sock.leave(`location:${old}`);sock.join(`location:${p.location}`);sock.emit('world:chat:history',recentChat.filter(m=>!m.location||m.location===p.location).slice(-60));}socketSafeEmit(p.id,'player:expedition-step',{location:step.location,arrived:step.arrived,route:p.expedition.path,index:p.expedition.index,state:p.state});
          if(!step.arrived&&Math.random()<Math.min(.42,(require('./src/systems/expedition').RISK[step.location]||30)/260)){p.expedition.status='paused';p.travelEncounter={type:'route_contact',at:Date.now()};io.to(p.id).emit('player:travel-event',{type:'mutants',message:`На подходе к сектору ${step.location} обнаружена опасность: мутанты или неизвестный отряд. Экспедиция остановлена. Продолжить скрытно или отступить?`});}
          const squad=squadOf(p.id);if(squad&&squad.leader===p.id){squad.location=p.location;for(const member of squad.members||[]){const follower=online.get(member.id);if(follower&&follower.id!==p.id){const fsock=[...io.sockets.sockets.values()].find(x=>x.data.playerId===follower.id);if(fsock){fsock.leave(`location:${old}`);fsock.join(`location:${p.location}`);}follower.location=p.location;follower.x=p.x;follower.y=p.y;follower.state ||= {};follower.state.loc=p.location;follower.state.worldPosition={x:p.x,y:p.y};follower.expedition={...p.expedition};persistPlayer(follower.id,follower.state).catch(()=>{});io.to(follower.id).emit('player:expedition-step',{location:p.location,arrived:step.arrived,route:p.expedition.path,index:p.expedition.index});}}}
          io.to(p.id).emit('player:expedition-result',{ok:true,message:step.arrived?'Экспедиция завершена. Ты прибыл в пункт назначения.':`Переход выполнен: ${p.location}.`,expedition:p.expedition});broadcastOnline();persistWorld().catch(()=>{});
          if(step.arrived)p.expedition=null;
        }
        continue;
      }
      if(!p.moveOrder||p.travelEncounter)continue;
      const order=p.moveOrder;const before=Math.hypot(order.x-p.x,order.y-p.y);
      const result=advanceMoveOrder(p,1);
      if(result.moved){movedAny=true;p.lastSeen=Date.now();p.state ||= {};const previousSector=p.location;const resolved=resolveSectorAtPosition(p.location,{x:p.x,y:p.y});if(resolved!==p.location){p.location=resolved;const moverSocket=p.socketId&&io.sockets.sockets.get(p.socketId);if(moverSocket){for(const room of [...moverSocket.rooms])if(room.startsWith('location:'))moverSocket.leave(room);moverSocket.join(`location:${resolved}`);moverSocket.emit('world:chat:history',recentChat.filter(m=>!m.location||m.location===resolved).slice(-60));}io.to(p.id).emit('player:sector-entered',{location:resolved,previousLocation:previousSector,x:p.x,y:p.y});}p.state.worldPosition={x:p.x,y:p.y};p.state.loc=p.location;if(Date.now()-(p.lastMovePersistAt||0)>10000){p.lastMovePersistAt=Date.now();persistPlayer(p.id,p.state).catch(e=>console.error('movement save:',e.message));}io.to(p.id).emit('player:movement',{x:p.x,y:p.y,location:p.location,moving:!result.arrived,remaining:Math.hypot(order.x-p.x,order.y-p.y)});}
      if(order.encounterAt&&!order.encounterChecked&&before>0&&Math.hypot(order.x-p.x,order.y-p.y)<=order.distance*(1-order.encounterAt)){
        order.encounterChecked=true;
        const groups=(world.npcGroups||[]).filter(g=>g.location===p.location&&g.faction!==p.faction&&g.members?.length>=2);
        const hostile=groups.find(g=>isHostileFaction(p.faction,g.faction,world.diplomacy));
        const type=hostile?'hostile_squad':'mutants';const label=hostile?`замечен отряд «${hostile.name}» (${hostile.faction})`:'обнаружены следы мутантов и движение в кустах';
        p.travelEncounter={type,groupId:hostile?.id||null,at:Date.now()};io.to(p.id).emit('player:travel-event',{type,npcId:hostile?.members?.[0]||null,groupId:hostile?.id||null,message:`На маршруте: ${label}. Движение остановлено. Продолжить путь или отступить?`});
      }
      if(result.arrived){p.state.worldPosition={x:p.x,y:p.y};await persistPlayer(p.id,p.state);io.to(p.id).emit('player:move-result',{ok:true,message:'Ты достиг отмеченной точки.'});}
    }
    if(movedAny)broadcastOnline();
  }catch(e){console.error('Player movement tick:',e.message);}finally{playerMovementTickRunning=false;}
},1000).unref();

// A-Life routine scheduler: individual NPCs visit camps, traders and search areas.
// Runs independently of the 60-second strategic faction planner.
let npcLifeTickRunning=false;
setInterval(()=>{
  if(npcLifeTickRunning)return;npcLifeTickRunning=true;
  try{
    const now=Date.now();
    const events=tickNpcLife(world,now,Math.random);let traderStockChanged=false;
    for(const event of events){
      io.emit('world:npc-event',event);
      if(event.type==='npc_artifact_found'||event.type==='npc_social_encounter'||event.type==='npc_squad_formed'||event.type==='npc_rumor_shared'||event.type==='npc_road_encounter'||event.type==='npc_goods_delivered'){
        const synced=appendWorldEvent(world,event.type,event,now);io.emit('world:event',synced);
      }
      if(event.type==='npc_goods_delivered'){
        const trader=world.npcState?.[event.npcIds?.[1]],pending=trader?.stock?.items||[];
        if(trader&&pending.length){const account=npcEconomyFor(trader),remaining=[];
          for(const item of pending){const match=Object.entries(SHOP).find(([,goods])=>goods.name===item.name);if(!match){remaining.push(item);continue;}const [itemId,goods]=match;account.stock[itemId]=Math.min(Number(account.maxStock[itemId])||99,(Number(account.stock[itemId])||0)+Math.max(1,Number(item.qty)||1));recordNpcTrade(account,{type:'npc_delivery',item:itemId,qty:Math.max(1,Number(item.qty)||1),sourceNpcId:event.npcIds?.[0],sourceNpcName:world.npcState?.[event.npcIds?.[0]]?.name||'сталкер',price:0});traderStockChanged=true;}
          trader.stock.items=remaining;
        }
      }
    }
    if(traderStockChanged)persistWorld().catch(error=>console.error('NPC trader stock save:',error.message));
  }catch(e){console.error('NPC A-Life tick:',e.message);}finally{npcLifeTickRunning=false;}
},15000).unref();

// Real-time NPC locomotion is deliberately separated from strategic AI decisions.
// It advances only existing movement targets and broadcasts compact position deltas.
setInterval(()=>{
  try{
    const moving=tickNpcMovement(world,Date.now(),2.5);
    if(moving.length)io.emit('world:npc-motion',{at:Date.now(),npcs:moving});
  }catch(e){console.error('NPC movement tick:',e.message);}
},1000).unref();

setInterval(()=>{try{const updates=tickMutantMovement(world,Date.now(),2.5);if(updates.length)io.emit('world:mutant-motion',{at:Date.now(),packs:updates});}catch(e){console.error('Mutant movement tick:',e.message);}},1000).unref();

let proximityCombatRunning=false;
setInterval(()=>{
  if(proximityCombatRunning)return;proximityCombatRunning=true;
  try{
    const now=Date.now();
    for(const event of tickNpcProximityCombat(world,now,Math.random)){const ev=appendWorldEvent(world,event.type,event,now);io.emit('world:event',ev);io.emit('world:npc-event',event);}
    // Build one location-aware spatial index per tick instead of scanning every NPC
    // for every connected player (the old O(players × NPCs) hot path).
    const combatCell=Math.max(1,COMBAT_RADIUS),hostilesByCell=new Map();
    for(const npc of Object.values(world.npcState||{})){
      if(!npc||npc.alive===false||!npc.location)continue;
      const pos=npcWorldPosition(npc),key=`${npc.location}|${Math.floor(pos.x/combatCell)}|${Math.floor(pos.y/combatCell)}`;
      if(!hostilesByCell.has(key))hostilesByCell.set(key,[]);hostilesByCell.get(key).push({npc,pos});
    }
    for(const player of online.values()){
      if(!player.location||!Number.isFinite(Number(player.x))||!Number.isFinite(Number(player.y)))continue;
      player.state ||= {};if(player.state.dead||Number(player.state.hp)<=0)continue;
      const cx=Math.floor(player.x/combatCell),cy=Math.floor(player.y/combatCell),nearby=[];
      for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)nearby.push(...(hostilesByCell.get(`${player.location}|${cx+ox}|${cy+oy}`)||[]));
      for(const {npc, pos:position} of nearby){
        if(!isHostileFaction(player.faction,npc.faction,world.diplomacy)||!inRange({x:player.x,y:player.y},position,COMBAT_RADIUS))continue;
        npc.playerCombatAt ||= {};if(now-(Number(npc.playerCombatAt[player.id])||0)<2500)continue;npc.playerCombatAt[player.id]=now;
        const playerDamage=2+Math.floor(Math.random()*4),npcDamage=3+Math.floor(Math.random()*5);
        player.state.hp=Math.max(0,(Number(player.state.hp)||Number(player.hp)||100)-playerDamage);player.hp=player.state.hp;
        npc.health=Math.max(0,(Number(npc.health)||100)-npcDamage);npc.action='combat';npc.behavior='combat';npc.mood='в бою';npc.lastPlayerCombatAt=now;
        if(npc.health<=0){npc.alive=false;npc.action='dead';npc.deathCause=`выведен из строя в столкновении с игроком ${player.name}`;npc.diedAt=now;npc.combatDeaths=(Number(npc.combatDeaths)||0)+1;}
        if(player.state.hp<=0){player.state.dead=true;player.state.characterCreated=false;player.state.diedAt=now;player.state.deathCause=`погиб в перестрелке со сталкером ${npc.name}`;player.moveOrder=null;player.expedition=null;}
        io.to(player.id).emit('npc:combat-engaged',{npcId:npc.id,name:npc.name,faction:npc.faction,playerDamage,npcDamage,playerHp:player.state.hp,npcHp:npc.health,npcDown:npc.alive===false,distance:Math.round(Math.hypot(player.x-position.x,player.y-position.y))});
        if(player.state.dead)io.to(player.id).emit('player:death',{cause:player.state.deathCause,at:now});
        persistPlayer(player.id,player.state).catch(()=>{});
        if(player.state.dead)break;
      }
    }
  }catch(e){console.error('Proximity combat tick:',e.message);}finally{proximityCombatRunning=false;}
},1500).unref();

setInterval(async()=>{
  if(npcTickRunning)return; npcTickRunning=true;
  try {
    initSharedWorld(world, NPC_HOME, LOCATIONS, COOP_TEMPLATES);initSouls(world);initFactionWar(world);
    const now=Date.now(), events=tickNpcWorld(world,LOCATIONS,Math.random,now);
    const emissionEvent = tickEmission(world, now);
    if (emissionEvent) {
      const syncEvent = appendWorldEvent(world, 'emission_phase', emissionEvent, now);
      io.emit('world:emission', publicEmissionState(world));
      io.emit('world:event', syncEvent);
      io.emit('world:zoneEvent', emissionEvent);
      systemMessage(`${emissionEvent.title}: ${emissionEvent.body}`);
    }
    const emissionState = publicEmissionState(world);
    for (const player of online.values()) {
      player.state ||= {};
      player.state.emission = { ...emissionState, active: emissionState.phase === 'active', warning: emissionState.phase === 'warning' };
      if (emissionState.phase === 'active') applyEmissionExposure(player, world.emission, now);
    }
    const leaderboard=buildStalkerLeaderboard();
    if(leaderboard.length&&now-(world.stalkerRumorAt||0)>30*60*1000){const star=leaderboard[0];addStalkerNews(`По стоянкам расходится слух: ${star.name} (${star.faction}) сейчас возглавляет рейтинг Зоны с ${star.score} очками.`,star.name);world.stalkerRumorAt=now;}
    for(const p of online.values()){for(const npc of Object.values(world.npcState||{})){if(!npc.alive||npc.location!==p.location)continue;const near=inRange(p,npcWorldPosition(npc),COMBAT_RADIUS),hostile=isHostileFaction(p.faction,npc.faction,world.diplomacy);if(near&&hostile){npc.playerThreatAt ||= {};if(now-(npc.playerThreatAt[p.id]||0)>45000){npc.playerThreatAt[p.id]=now;io.to(p.id).emit('npc:threat',{npcId:npc.id,name:npc.name,faction:npc.faction,distance:Math.round(Math.hypot(p.x-npcWorldPosition(npc).x,p.y-npcWorldPosition(npc).y))});}}else if(!hostile&&near){npc.lastApproachAt ||= 0;if(now-npc.lastApproachAt>8*60*1000&&Math.random()<.12){npc.lastApproachAt=now;io.to(p.id).emit('npc:approach',{npcId:npc.id,text:`${npc.name} замечает тебя и подходит поговорить. «Эй, сталкер. Есть минутка?»`});}}}}
    const ecoEvents=tickEcosystem(world,Math.random,now);
    const soulEvents=tickSouls(world,LOCATIONS,Math.random,now);
    const factionWarEvents=tickFactionWar(world,now,Math.random);
    const rescueEvents=tickNpcRescue(world,now,Math.random);
    const aftermathEvents=tickNpcAftermath(world,now);
    world.onlineMetrics ||= {totalJoins:0,totalMoves:0,lastTickAt:0}; world.onlineMetrics.lastTickAt=now;
    const tickEvent=appendWorldEvent(world,'world_tick',{npcEvents:events.length,activeNpcs:Object.values(world.npcState||{}).filter(n=>n.alive).length},now);
    io.emit('world:event',tickEvent);
    for(const event of [...events,...ecoEvents,...soulEvents,...factionWarEvents,...rescueEvents,...aftermathEvents]){const ev=appendWorldEvent(world,event.type,{...event},now);io.emit('world:event',ev);io.emit('world:npc-event',event);if(['npc_skirmish','npc_casualty_report','npc_companion_mourning','npc_injury_recovery','npc_field_treatment','npc_medical_evacuation','npc_rescue_dispatched','npc_rescue_pickup','npc_rescue_completed','mutant_npc_combat','mutant_squad_encounter','mutant_squad_retreat','mutant_squad_rescue','mutant_pack_defeated','mutant_migration','anomaly_migration','convoy_ambush','convoy_started','key_point_captured','faction_squad_deployed','faction_objective_secured','faction_command_decision','faction_reinforcements','faction_supply_disrupted','faction_headquarters_reaction','faction_truce_formed','faction_alliance_formed','faction_pact_expired'].includes(event.type))systemMessage(event.text);if(event.type==='faction_command_decision'){const msg={id:crypto.randomUUID(),faction:event.faction,name:event.leader||'Командование',text:event.text,kind:'command',title:'Приказ штаба',at:now,location:world.factionCommand?.[event.faction]?.headquarters||null,source:'command'};ensureFactionRadio(world)[event.faction] ||= [];ensureFactionRadio(world)[event.faction].push(msg);ensureFactionRadio(world)[event.faction]=ensureFactionRadio(world)[event.faction].slice(-100);io.to(`faction:${event.faction}`).emit('radio:message',msg);}}
    await persistWorld(); io.emit('world:npcs',world.npcPositions);
    emitNpcState();io.emit('world:leaderboard',leaderboardPayload());io.emit('world:ecosystem',world.ecosystem);
    io.emit('world:status',publicWorldStatus(world,online.size));
  }catch(e){console.error('NPC AI schedule:',e.message);} finally {npcTickRunning=false;}
},60*1000).unref();
setInterval(async()=>{
  const event={...ZONE_EVENTS[Math.floor(Math.random()*ZONE_EVENTS.length)],id:crypto.randomUUID(),at:Date.now()};
  world.zoneEvents ||= [];world.zoneEvents.push(event);world.zoneEvents=world.zoneEvents.slice(-30);const syncEvent=appendWorldEvent(world,'zone_event',event,event.at);
  try{await persistWorld();io.emit('world:zoneEvent',event);io.emit('world:event',syncEvent);io.emit('world:status',publicWorldStatus(world,online.size));}catch(e){console.error('Zone event:',e.message);}
},4*60*1000).unref();
const FACTION_INCIDENTS=[
 (a,b,loc)=>({title:'Переговоры на нейтральной территории',body:`По радиоперехвату: представители «${a}» и «${b}» замечены возле сектора «${loc}». Сталкеры сообщают о коротких переговорах. Итог встречи пока неизвестен.`,factions:[a,b]}),
 (a,b,loc)=>({title:'Напряжённость на блокпосте',body:`На подступах к сектору «${loc}» произошёл спор между патрулями «${a}» и «${b}». Стрельбы не подтверждают, но проход временно осложнён.`,factions:[a,b]}),
 (a,b,loc)=>({title:'Слухи о пропавшем патруле',body:`В районе «${loc}» не вышел на связь патруль группировки «${a}». «${b}» усилили наблюдение за соседними маршрутами. Причина неизвестна.`,factions:[a,b]}),
 (a,b,loc)=>({title:'Обмен припасами',body:`Торговцы сообщают о караване «${a}», который доставил медикаменты в район «${loc}». По слухам, часть груза обменяли на оборудование у представителей «${b}».`,factions:[a,b]})
];
setInterval(async()=>{
 const factions=FACTIONS.filter(x=>x!=='Монолит');if(factions.length<2)return;
 const a=factions[Math.floor(Math.random()*factions.length)];let b=factions[Math.floor(Math.random()*factions.length)];if(a===b)b=factions[(factions.indexOf(a)+1)%factions.length];
 const loc=Object.keys(world.territoryOwners||{})[Math.floor(Math.random()*Math.max(1,Object.keys(world.territoryOwners||{}).length))]||'cordon';
 const template=FACTION_INCIDENTS[Math.floor(Math.random()*FACTION_INCIDENTS.length)];const incident={...template(a,b,loc),id:crypto.randomUUID(),at:Date.now(),type:'faction_incident'};
 world.zoneEvents ||= [];world.zoneEvents.push(incident);world.zoneEvents=world.zoneEvents.slice(-50);
 const ev=appendWorldEvent(world,'faction_incident',incident,incident.at);await persistWorld();io.emit('world:zoneEvent',incident);io.emit('world:event',ev);
 for(const faction of incident.factions){const msg={id:crypto.randomUUID(),faction,name:'Дежурный радист',text:`Сводка: ${incident.title}. ${incident.body}`,kind:'incident',title:incident.title,at:incident.at,location:loc,source:'npc'};ensureFactionRadio(world)[faction] ||= [];ensureFactionRadio(world)[faction].push(msg);ensureFactionRadio(world)[faction]=ensureFactionRadio(world)[faction].slice(-100);io.to(`faction:${faction}`).emit('radio:message',msg);}
 await persistWorld();
},6*60*1000).unref();

setInterval(async()=>{
 for(const faction of FACTIONS){
  const message=createNpcRadioMessage(world,faction,Date.now(),Math.random);
  io.to(`faction:${faction}`).emit('radio:message',message);
 }
 try{await persistWorld();}catch(error){console.error('Faction radio persistence:',error.message);}
},95*1000).unref();

dbInitialization = initDb().catch(e=>{console.error('Database bootstrap error:',e);});
server.listen(PORT,'0.0.0.0',()=>console.log(`ZONE ONLINE listening on ${PORT} node=${process.version} bootMs=${Date.now()-SERVER_PROCESS_STARTED_AT} npcCount=${Object.keys(world.npcState||{}).length} socketTransports=websocket,polling`));
server.on('error',error=>{console.error('HTTP server failed to start:',error);process.exitCode=1;});
let shutdownStarted=false;
async function gracefulShutdown(signal){
  if(shutdownStarted)return;
  shutdownStarted=true;
  console.info(`[shutdown] ${signal}: saving ${online.size} online player(s) and shared world`);
  const forceExit=setTimeout(()=>{console.error('[shutdown] graceful shutdown timed out');process.exit(1);},25000);
  forceExit.unref();
  try{
    await Promise.all([...online.values()].map(p=>persistPlayer(p.id,p.state).catch(e=>console.error(`[shutdown] player ${p.id} save failed:`,e.message))));
    await persistWorld();
    await new Promise(resolve=>io.close(()=>resolve()));
    if(pool){try{await pool.end();}catch(e){console.error('[shutdown] database close failed:',e.message);}}
    clearTimeout(forceExit);
    console.info('[shutdown] state saved; server closed');
    process.exit(0);
  }catch(error){console.error('[shutdown] failed:',error);process.exit(1);}
}
process.on('SIGTERM',()=>gracefulShutdown('SIGTERM'));
process.on('SIGINT',()=>gracefulShutdown('SIGINT'));
process.on('unhandledRejection',error=>console.error('Unhandled promise rejection:',error));
