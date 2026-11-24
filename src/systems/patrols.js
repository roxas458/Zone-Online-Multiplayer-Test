function createPatrol(faction,location,random=Math.random){return {faction,location,strength:2+Math.floor(random()*7),createdAt:Date.now()};}
function movePatrol(patrol,locations,random=Math.random){const options=locations.filter(x=>x!==patrol.location);return {...patrol,location:options[Math.floor(random()*options.length)]||patrol.location};}
module.exports={createPatrol,movePatrol};
