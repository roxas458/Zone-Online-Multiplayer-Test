const CAMP_EVENTS=['У костра спорят о безопасной тропе.','Сталкеры делятся припасами и новостями.','Незнакомец предлагает обменяться сведениями.'];
function campEvent(random=Math.random){return CAMP_EVENTS[Math.floor(random()*CAMP_EVENTS.length)];}
module.exports={CAMP_EVENTS,campEvent};
