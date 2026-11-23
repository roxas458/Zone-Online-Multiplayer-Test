'use strict';
// Canonical inter-sector travel graph for the 17-zone world map.
const ROUTES = Object.freeze({
  chaes:['pripyat','radar'], zaton:['jupiter','pripyat'], pripyat:['chaes','zaton','jupiter','radar'],
  jupiter:['zaton','pripyat','red','wild'], limansk:['red','wild'], red:['limansk','jupiter','radar','army'],
  radar:['chaes','pripyat','red','army'], army:['radar','red','wild','bar'], wild:['limansk','jupiter','army','bar','yantar'],
  bar:['wild','army','dump'], yantar:['wild','dump','agro'], dump:['bar','yantar','dark','agro','cordon'],
  agro:['yantar','dump','dark','cordon'], dark:['dump','agro','darkhollow'], cordon:['dump','agro','swamps'],
  swamps:['cordon','darkhollow'], darkhollow:['swamps','dark']
});
const RISK = Object.freeze({chaes:95,radar:88,pripyat:78,red:68,dark:65,darkhollow:62,dump:58,limansk:55,army:48,wild:45,swamps:42,jupiter:38,zaton:35,agro:32,yantar:28,bar:18,cordon:22});
function findRoute(from,to,mode='safe') {
  if(!ROUTES[from]||!ROUTES[to]) return null;
  const dist=new Map([[from,0]]),prev=new Map(),open=new Set([from]);
  while(open.size){let cur=null,best=Infinity;for(const n of open){const d=dist.get(n);if(d<best){best=d;cur=n;}}open.delete(cur);if(cur===to)break;
    for(const next of ROUTES[cur]){const cost=1+(mode==='safe'?RISK[next]/35:mode==='fast'?0.2:0.55);const nd=best+cost;if(nd<(dist.get(next)??Infinity)){dist.set(next,nd);prev.set(next,cur);open.add(next);}}
  }
  if(!dist.has(to))return null;const path=[to];while(path[0]!==from)path.unshift(prev.get(path[0]));
  return {from,to,mode,path,sectorCount:path.length-1,risk:path.slice(1).reduce((s,id)=>s+(RISK[id]||30),0)/Math.max(1,path.length-1)};
}
function createExpedition(player,to,mode='safe',now=Date.now()) {const route=findRoute(player?.location,to,mode);if(!route)return {ok:false,error:'Маршрут между этими локациями не найден.'};if(route.sectorCount===0)return {ok:false,error:'Ты уже находишься в этой локации.'};return {ok:true,expedition:{...route,index:0,status:'travelling',startedAt:now,nextHopAt:now+Math.max(30000,90000+route.risk*1200),encounters:0}};}
function advanceExpedition(player,now=Date.now()){const e=player?.expedition;if(!e||e.status!=='travelling'||now<e.nextHopAt)return {advanced:false,arrived:false};e.index++;player.location=e.path[e.index];if(e.index>=e.path.length-1){e.status='arrived';return {advanced:true,arrived:true,location:player.location};}e.nextHopAt=now+90000+((RISK[e.path[e.index+1]]||30)*1200);return {advanced:true,arrived:false,location:player.location};}
module.exports={ROUTES,RISK,findRoute,createExpedition,advanceExpedition};
