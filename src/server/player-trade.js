'use strict';

const MAX_MONEY = 99999999;

function applyPlayerTrade({ sellerState, buyerState, itemId, qty, price, allowedItemIds }) {
  const amount = Math.floor(Number(qty));
  const cost = Math.floor(Number(price));
  if (!sellerState || !buyerState || !Array.isArray(sellerState.items) || !Array.isArray(buyerState.items)) {
    return { ok: false, message: 'Не удалось загрузить рюкзаки игроков.' };
  }
  if (!allowedItemIds?.has(String(itemId)) || !Number.isSafeInteger(amount) || amount < 1 || amount > 99 || !Number.isSafeInteger(cost) || cost < 0 || cost > 1000000) {
    return { ok: false, message: 'Некорректные параметры обмена.' };
  }

  const seller = { ...sellerState, items: sellerState.items.map(item => ({ ...item })) };
  const buyer = { ...buyerState, items: buyerState.items.map(item => ({ ...item })) };
  const source = seller.items.find(item => item.id === itemId);
  if (!source || Number(source.qty) < amount) return { ok: false, message: 'У отправителя больше нет нужного количества предметов.' };
  const sellerMoney = Math.max(0, Math.floor(Number(seller.money) || 0));
  const buyerMoney = Math.max(0, Math.floor(Number(buyer.money) || 0));
  if (buyerMoney < cost) return { ok: false, message: 'У покупателя недостаточно рублей.' };
  if (sellerMoney + cost > MAX_MONEY) return { ok: false, message: 'У продавца слишком много рублей для получения этой суммы.' };

  const movedItem = { ...source, qty: amount };
  source.qty = Number(source.qty) - amount;
  if (source.qty <= 0) seller.items = seller.items.filter(item => item !== source);
  const destination = buyer.items.find(item => item.id === itemId);
  if (destination && Number(destination.qty || 0) + amount > 9999) return { ok: false, message: 'В рюкзаке покупателя недостаточно места для этого количества.' };
  if (destination) destination.qty = Number(destination.qty || 0) + amount;
  else buyer.items.push(movedItem);
  seller.money = sellerMoney + cost;
  buyer.money = buyerMoney - cost;
  return { ok: true, sellerState: seller, buyerState: buyer, itemName: source.name || movedItem.name || itemId };
}

module.exports = { applyPlayerTrade, MAX_MONEY };
