// Inventory presentation layer. Rendering is injected with the current game state and UI helpers.
(function (global) {
 "use strict";

function itemGlyph(x){
 const kind=x.type==='Оружие'?'weapon':x.type==='Броня'?'armor':x.type==='Шлем'?'helmet':x.type==='Рюкзак'?'backpack':x.type==='Медицина'?'med':x.type==='Еда'?'food':x.type==='Артефакт'?'artifact':x.type==='Детектор'?'detector':'tool';
 const shapes={weapon:'<path d="M9 25h40v-7H34l-4-7H18l-2 7H9z"/><path d="M23 25v13h9V25M39 18v-5h7v5"/>',armor:'<path d="M18 8l12 5 12-5 9 10-7 7-4-4v20H20V21l-4 4-7-7z"/>',med:'<rect x="10" y="14" width="40" height="26" rx="3"/><path d="M27 18h7v7h7v7h-7v7h-7v-7h-7v-7h7z"/>',food:'<path d="M12 28c0-10 8-17 18-17s18 7 18 17-8 13-18 13-18-3-18-13z"/><path d="M20 26h20M22 33h16"/>',artifact:'<path d="M30 5l8 12 12 7-8 13-12 8-12-8-8-13 12-7z"/><circle cx="30" cy="27" r="6"/>',helmet:'<path d="M9 33a21 21 0 0 1 42 0v5H9z"/><path d="M16 28h28M22 13l8-5 8 5"/>',backpack:'<rect x="15" y="12" width="30" height="38" rx="7"/><path d="M21 12V8h18v4M15 25H9v14h6M45 25h6v14h-6M22 24h16v12H22z"/>',detector:'<rect x="14" y="10" width="32" height="38" rx="4"/><circle cx="30" cy="25" r="9"/><path d="M30 25l7-5M22 40h16"/>',tool:'<path d="M12 15l9-9 10 10-9 9zM26 24l20 20-6 6-20-20M35 11l9-5 8 8-5 9"/>'};
 return `<svg viewBox="0 0 60 56" width="42" height="40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${shapes[kind]}</svg>`;
}

function renderInventory(ctx){
 const {g,$,playerDisplayName,rankForXpClient,escapeHtml}=ctx;
 const query=($("invSearch")?.value||"").toLowerCase(),filter=$("invFilter")?.value||"all",sort=$("invSort")?.value||"name";
 const items=window.ZoneInventory.filterAndSort(g.items,{filter,query,sort});
 const equipped=x=>Object.values(g.equipment||{}).includes(x.name);
 const itemCard=x=>`<button class="backpack-item ${equipped(x)?'is-equipped':''}" onclick="inspectInventoryItem('${x.id}')" title="${escapeHtml(x.name)} · ${escapeHtml(x.type)}"><span class="backpack-qty">${x.qty>1?'×'+x.qty:''}</span><span class="backpack-art">${itemGlyph(x)}</span><span class="backpack-name">${escapeHtml(x.name)}</span>${x.condition!=null?`<span class="backpack-condition"><i style="width:${x.condition}%"></i></span>`:''}</button>`;
 const cells=items.map(itemCard);while(cells.length<48)cells.push('<div class="backpack-empty" aria-hidden="true"></div>');
 $("items").innerHTML=cells.join("")||'<div class="mutedbox">Рюкзак пуст.</div>';
 const inventorySummary=window.ZoneInventory.summarize(g.items,g.equipment),{weight,quantity:count,capacity}=inventorySummary;
 $("weight").textContent=weight.toFixed(1)+" / "+capacity.toFixed(1)+" кг";$("itemCount").textContent=count;
 $("inventoryMoney").textContent=(g.money||0).toLocaleString('ru-RU')+' RU';
 $("inventoryOwner").textContent=playerDisplayName();$("gearCallsign").textContent=playerDisplayName().toUpperCase();$("inventoryRank").textContent=rankForXpClient(g.xp).toUpperCase();$("inventoryFaction").textContent=(g.faction||'ОДИНОЧКИ').toUpperCase();
 $("gearWeapon").textContent=g.equipment.weapon||'НЕ УСТАНОВЛЕНО';$("gearTool").textContent=g.equipment.tool||'НЕТ';$("gearSuit").textContent=(g.equipment.suit||'КОСТЮМ НЕ УСТАНОВЛЕН').toUpperCase();$("gearHelmet").textContent=g.equipment.helmet||'ПУСТО';$("gearBackpack").textContent=g.equipment.backpack||'СТАНДАРТНЫЙ';
 $("gearSidearm").textContent=g.equipment.sidearm||'ПУСТО';
 $("gearArtifact").textContent=g.equipment.artifact||'ПУСТО';
 $("gearLoadMeter").style.width=inventorySummary.loadPercent+'%';$("gearWeight").textContent=weight.toFixed(1)+' / '+capacity.toFixed(1)+' KG';
 const suit=g.items.find(x=>x.name===g.equipment?.suit&&x.type==='Броня');
 const helmet=g.items.find(x=>x.name===g.equipment?.helmet&&x.type==='Шлем');
 const weapon=g.items.find(x=>x.name===g.equipment?.weapon&&x.type==='Оружие');
 const stat=(label,value)=>`<div><span>${label}</span><b>${value}</b></div>`;
 $("gearStats").innerHTML=stat('Защита костюма',suit?.defense||0)+stat('Защита шлема',helmet?.defense||0)+stat('Состояние',suit?(suit.condition??100)+'%':'—')+stat('Урон оружия',weapon?.damage||'—')+stat('Вес комплекта',weight.toFixed(1)+' кг')+stat('Вместимость рюкзака',capacity.toFixed(0)+' кг');
 $("equipment").innerHTML=`<div>Костюм · ${escapeHtml(g.equipment.suit||"Не установлено")}</div><div>Шлем · ${escapeHtml(g.equipment.helmet||"Не установлен")}</div><div>Оружие · ${escapeHtml(g.equipment.weapon||"Не установлено")}</div><div>Детектор · ${escapeHtml(g.equipment.tool||"Не установлено")}</div><div>Рюкзак · ${escapeHtml(g.equipment.backpack||"Не установлен")}</div>`;
}

function inspectInventoryItem(ctx,id){
 const {g,escapeHtml,document}=ctx;const x=g.items.find(i=>i.id===id);if(!x)return;const actions=[];if(['Медицина','Еда'].includes(x.type))actions.push(`<button onclick="useItem('${x.id}')">Применить</button>`);if(['Оружие','Броня','Детектор','Шлем','Рюкзак','Артефакт'].includes(x.type))actions.push(`<button onclick="equipItem('${x.id}')">${Object.values(g.equipment||{}).includes(x.name)?'Экипировано':'Экипировать'}</button>`);actions.push(`<button class="quiet-action" onclick="sell('${x.id}')">Продать · ${window.ZoneEconomy.saleUnitPrice(x)} ₽</button>`);const panel=document.createElement('div');panel.className='inventory-inspect';panel.innerHTML=`<div class="inventory-inspect-card"><button class="inspect-close" onclick="this.closest('.inventory-inspect').remove()">×</button><div class="inspect-art">${itemGlyph(x)}</div><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.type)} · ${x.weight} кг · ×${x.qty}</small>${x.condition!=null?`<div class="inspect-condition"><span>Прочность</span><b>${Math.round(x.condition)}%</b><i><em style="width:${Math.max(0,Math.min(100,Number(x.condition)||0))}%"></em></i></div>`:''}<p>${escapeHtml(x.desc||'Полевой предмет.')}</p>${x.effects?`<div class="inspect-effects"><b>Эффекты при экипировке</b><small>${Object.entries(x.effects).map(([k,v])=>`${escapeHtml(k)}: ${escapeHtml(String(v))}`).join(' · ')}</small></div>`:''}<strong>${x.value} ₽</strong><div class="rightbuttons">${actions.join('')}</div></div>`;panel.addEventListener('click',e=>{if(e.target===panel)panel.remove()});document.body.append(panel)}

global.ZoneInventoryView = Object.freeze({ itemGlyph, renderInventory, inspectInventoryItem });
})(window);
