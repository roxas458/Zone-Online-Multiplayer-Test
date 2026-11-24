function clamp(value,min=-100,max=100){return Math.max(min,Math.min(max,Number(value)||0));}
function changeReputation(current,delta){return clamp((Number(current)||0)+delta,-1000,1000);}
module.exports={clamp,changeReputation};
