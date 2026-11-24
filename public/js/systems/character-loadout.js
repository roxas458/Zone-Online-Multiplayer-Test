/* ZONE ONLINE character setup loadout rules. UI rendering stays in the client adapter. */
(function(root){
  'use strict';
  function createCharacterLoadoutSystem({getLoadout,setLoadout,getGear,budget=0}){
    const validSlots=new Set(['weapon','suit','tool','backpack']);
    function selectedItems(){
      const loadout=getLoadout()||{};
      return [loadout.weapon,loadout.suit,loadout.tool,loadout.backpack,...(Array.isArray(loadout.supplies)?loadout.supplies:[])]
        .filter(id=>id&&id!=='weapon_none'&&id!=='armor_none'&&id!=='detector_none');
    }
    function spent(){const gear=getGear()||{};return selectedItems().reduce((sum,id)=>sum+(Number(gear[id]?.points)||0),0);}
    function setSlot(slot,id){
      if(!validSlots.has(slot))return {ok:false,reason:'invalid-slot'};
      const gear=getGear()||{};if(!Object.prototype.hasOwnProperty.call(gear,id))return {ok:false,reason:'unknown-item'};
      const loadout={...(getLoadout()||{}),supplies:[...((getLoadout()||{}).supplies||[])]};
      const previous=loadout[slot];loadout[slot]=id;setLoadout(loadout);
      if(spent()>budget){loadout[slot]=previous;setLoadout(loadout);return {ok:false,reason:'over-budget',spent:spent(),budget};}
      return {ok:true,spent:spent(),remaining:budget-spent()};
    }
    function changeSupply(id,delta){
      const gear=getGear()||{};if(!Object.prototype.hasOwnProperty.call(gear,id))return {ok:false,reason:'unknown-item'};
      const loadout={...(getLoadout()||{}),supplies:[...((getLoadout()||{}).supplies||[])]};
      const count=loadout.supplies.filter(item=>item===id).length;
      if(delta>0){if(count>=5)return {ok:false,reason:'quantity-limit'};loadout.supplies.push(id);setLoadout(loadout);if(spent()>budget){loadout.supplies.pop();setLoadout(loadout);return {ok:false,reason:'over-budget',spent:spent(),budget};}}
      else if(delta<0){const index=loadout.supplies.lastIndexOf(id);if(index<0)return {ok:false,reason:'not-selected'};loadout.supplies.splice(index,1);setLoadout(loadout);}
      else return {ok:false,reason:'invalid-delta'};
      return {ok:true,count:loadout.supplies.filter(item=>item===id).length,spent:spent(),remaining:budget-spent()};
    }
    function reset(factionSuit={}){setLoadout({weapon:'weapon_pm',suit:factionSuit.suit||'armor_leather',tool:'detector_echo',backpack:'backpack_standard',supplies:['med','bread','bandage']});return spent();}
    function validate(){const total=spent();return {ok:total<=budget,spent:total,budget,remaining:budget-total,items:selectedItems()};}
    return Object.freeze({selectedItems,spent,setSlot,changeSupply,reset,validate});
  }
  const api=Object.freeze({createCharacterLoadoutSystem});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ZoneCharacterLoadout=api;
})(typeof window!=='undefined'?window:globalThis);
