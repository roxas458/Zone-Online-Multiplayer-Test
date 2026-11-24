'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {findRoute,ROUTES}=require('../src/systems/expedition');
const {resolveFactionSpawn,SPAWN_OPTIONS_BY_FACTION}=require('../src/systems/faction-spawns');
const fs=require('node:fs');
const client=fs.readFileSync(require.resolve('../public/js/game.js'),'utf8');

test('Cordon to Bar requires the intermediate Dump sector',()=>{
  const route=findRoute('cordon','bar','safe');
  assert.deepEqual(route.path,['cordon','dump','bar']);
});
test('every inter-sector hop follows a real graph edge',()=>{
  for(const from of Object.keys(ROUTES))for(const to of Object.keys(ROUTES)){
    const route=findRoute(from,to,'safe');assert.ok(route);
    for(let i=0;i<route.path.length-1;i++)assert.ok(ROUTES[route.path[i]].includes(route.path[i+1]),`${route.path[i]} -> ${route.path[i+1]} is not a gate`);
  }
});
test('fresh character can choose only their faction start sectors',()=>{
  assert.equal(resolveFactionSpawn('Бандиты','dark').location,'dark');
  assert.equal(resolveFactionSpawn('Бандиты','bar').location,'dump');
  assert.equal(resolveFactionSpawn('Ренегаты','darkhollow').location,'darkhollow');
  for(const [faction,locations] of Object.entries(SPAWN_OPTIONS_BY_FACTION))assert.ok(locations.length>0,faction);
});
test('map movement and expedition orders ask for confirmation',()=>{
  assert.match(client,/confirm\(`Проложен маршрут:/);
  assert.match(client,/Отправиться к выбранной точке на карте\?/);
});
test('character setup exposes faction-limited starting location selector',()=>{
  const html=fs.readFileSync(require.resolve('../public/index.html'),'utf8');
  assert.match(html,/id="setupSpawnSelect"/);
  assert.match(client,/setupSpawnOptions\(setupFaction\)/);
});
