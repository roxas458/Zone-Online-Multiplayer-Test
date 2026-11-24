function changeRelationship(current,delta){return Math.max(-100,Math.min(100,(Number(current)||0)+delta));}
function relationshipLabel(value){return value>=60?'Доверие':value>=20?'Расположение':value<=-40?'Враждебность':value<0?'Недоверие':'Нейтралитет';}
module.exports={changeRelationship,relationshipLabel};
