const RUMORS=['На Свалке видели усиленный патруль.','Торговцы ждут караван с медикаментами.','Учёные отмечают рост аномальной активности.','На севере ищут проводника.'];
function pickRumor(random=Math.random){return RUMORS[Math.floor(random()*RUMORS.length)];}
module.exports={RUMORS,pickRumor};
