function canComplete(contract,player){if(!contract||!contract.accepted||contract.done)return false;if(player.location!==contract.location)return false;return !contract.item||(player.items||[]).some(x=>x.id===contract.item&&x.qty>=contract.qty);}
module.exports={canComplete};
