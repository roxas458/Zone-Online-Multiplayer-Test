const RANKS=[{xp:0,name:'Рекрут'},{xp:100,name:'Новобранец'},{xp:250,name:'Боец'},{xp:500,name:'Старший боец'},{xp:900,name:'Ветеран'}];
function rankForXp(xp){return RANKS.filter(r=>xp>=r.xp).at(-1)||RANKS[0];}
module.exports={RANKS,rankForXp};
