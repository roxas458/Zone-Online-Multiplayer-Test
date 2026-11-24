'use strict';
const MAP_BOUNDS={width:1000,height:2000};
const { resolveSectorAtPosition } = require('./sector-position');
function createMoveOrder(player,target,now=Date.now(),speed=7){
  if(!player||!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))return {ok:false,error:'Некорректная точка маршрута.'};
  const x=Math.max(0,Math.min(MAP_BOUNDS.width,target.x)),y=Math.max(0,Math.min(MAP_BOUNDS.height,target.y));
  const distance=Math.hypot(x-(Number(player.x)||0),y-(Number(player.y)||0));
  if(distance<5)return {ok:false,error:'Ты уже находишься рядом с этой точкой.'};
  return {ok:true,order:{x,y,originX:Number(player.x)||0,originY:Number(player.y)||0,distance,speed:Math.max(2,Math.min(12,speed)),startedAt:now,encounterChecked:false}};
}
function advanceMoveOrder(player,dt=1){
  const order=player?.moveOrder;if(!order||player.travelEncounter)return {moved:false,arrived:false};
  const dx=order.x-player.x,dy=order.y-player.y,d=Math.hypot(dx,dy);
  if(d<=Math.max(2,order.speed*dt)){player.x=order.x;player.y=order.y;const previousLocation=player.location;const nextLocation=resolveSectorAtPosition(previousLocation,{x:player.x,y:player.y});if(nextLocation!==previousLocation)player.location=nextLocation;player.moveOrder=null;return {moved:true,arrived:true,previousLocation,location:player.location,sectorChanged:nextLocation!==previousLocation};}
  player.x+=dx/d*order.speed*dt;player.y+=dy/d*order.speed*dt;
  const previousLocation=player.location;const nextLocation=resolveSectorAtPosition(previousLocation,{x:player.x,y:player.y});
  if(nextLocation!==previousLocation)player.location=nextLocation;
  return {moved:true,arrived:false,previousLocation,location:player.location,sectorChanged:nextLocation!==previousLocation};
}
module.exports={createMoveOrder,advanceMoveOrder,MAP_BOUNDS};
