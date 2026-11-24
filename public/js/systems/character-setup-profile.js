/* ZONE ONLINE character setup profile rules.
 * Keeps portrait selection, background validation, identity checks and
 * faction spawn eligibility independent from the DOM-driven setup screen.
 */
(function(root){
  'use strict';
  const PORTRAIT_COUNT=16;
  const DEFAULT_PORTRAIT='stalker-01.webp';
  const PORTRAIT_PATTERN=/^stalker-(0[1-9]|1[0-6])\.webp$/;

  function portraitFiles(){
    return Array.from({length:PORTRAIT_COUNT},(_,index)=>`stalker-${String(index+1).padStart(2,'0')}.webp`);
  }
  function isPortrait(file){return typeof file==='string'&&PORTRAIT_PATTERN.test(file);}
  function normalizePortrait(file,fallback=DEFAULT_PORTRAIT){
    return isPortrait(file)?file:(isPortrait(fallback)?fallback:DEFAULT_PORTRAIT);
  }
  function normalizeBackground(id,backgrounds,fallback='wanderer'){
    if(id&&backgrounds&&Object.prototype.hasOwnProperty.call(backgrounds,id))return id;
    if(backgrounds&&Object.prototype.hasOwnProperty.call(backgrounds,fallback))return fallback;
    return Object.keys(backgrounds||{})[0]||null;
  }
  function validateIdentity({callsign,realName,faction,factions}={}){
    if(String(callsign||'').trim().length<2)return {ok:false,reason:'callsign'};
    if(String(realName||'').trim().length<2)return {ok:false,reason:'real-name'};
    if(!Array.isArray(factions)||!factions.some(item=>item&&item.name===faction))return {ok:false,reason:'faction'};
    return {ok:true,reason:null};
  }
  function createPortraitPicker({getElement,onChange=()=>{},initialPortrait=DEFAULT_PORTRAIT}={}){
    let selected=normalizePortrait(initialPortrait);
    const get=typeof getElement==='function'?getElement:()=>null;
    function render(){
      const host=get('setupPortraits');
      if(host)host.innerHTML=portraitFiles().map((file,index)=>`<button type=\"button\" class=\"setup-portrait-choice ${selected===file?'selected':''}\" onclick=\"chooseSetupPortrait('${file}')\" aria-label=\"Выбрать портрет ${index+1}\"><img src=\"/assets/portraits/${file}\" alt=\"Портрет сталкера ${index+1}\" loading=\"lazy\"></button>`).join('');
      const avatar=get('setupAvatar');
      if(avatar)avatar.innerHTML=`<img src=\"/assets/portraits/${selected}\" alt=\"Выбранный портрет\">`;
      return selected;
    }
    function open(){render();const modal=get('setupPortraitModal');if(modal)modal.hidden=false;}
    function close(){const modal=get('setupPortraitModal');if(modal)modal.hidden=true;}
    function choose(file){if(!isPortrait(file))return false;selected=normalizePortrait(file);render();close();onChange(selected);return true;}
    function set(file){selected=normalizePortrait(file);render();return selected;}
    return Object.freeze({render,open,close,choose,set,getSelected:()=>selected});
  }
  function spawnOptions(faction,locations,factionSpawn){
    const rows=Array.isArray(locations)?locations:[];
    const base=(factionSpawn&&factionSpawn[faction])||'cordon';
    const owned=rows.filter(location=>location&&location.owner===faction).map(location=>location.id);
    const allowed=new Set([base,...owned]);
    return rows.filter(location=>location&&allowed.has(location.id));
  }
  function resolveSpawn(preferred,options,fallback){
    const rows=Array.isArray(options)?options:[];
    if(rows.some(location=>location.id===preferred))return preferred;
    if(rows.some(location=>location.id===fallback))return fallback;
    return rows[0]?.id||fallback||'cordon';
  }

  const api=Object.freeze({PORTRAIT_COUNT,DEFAULT_PORTRAIT,portraitFiles,isPortrait,normalizePortrait,createPortraitPicker,normalizeBackground,validateIdentity,spawnOptions,resolveSpawn});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ZoneCharacterSetupProfile=api;
})(typeof window!=='undefined'?window:globalThis);
