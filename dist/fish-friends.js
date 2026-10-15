import {isDesign, cleanName, sameDesign} from './fish-design.js?v=20261015-friends';

// Fish received through links stay in this browser. A small, ordered list:
// the oldest gift swims off when a new one arrives and the sea is full.
export const FRIEND_LIMIT = 6;
const ID = /^[a-z0-9]{4,24}$/;

export function sameGift(a, b) {
  return sameDesign(a.design, b.design) && a.from === b.from;
}

export function makeFriendId(now = Date.now(), random = Math.random) {
  return now.toString(36) + Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0');
}

export function parseFriends(raw) {
  let value;
  try { value = JSON.parse(raw ?? '[]'); } catch { return []; }
  if (!Array.isArray(value)) return [];
  const list = [];
  for (const item of value) {
    if (!item || typeof item.id !== 'string' || !ID.test(item.id) || !isDesign(item.design)) continue;
    const entry = {id: item.id, design: {...pickDesign(item.design), name: cleanName(item.design.name)}, from: cleanName(item.from, '')};
    if (list.some(e => e.id === entry.id || sameGift(e, entry))) continue;
    list.push(entry);
  }
  return list.slice(-FRIEND_LIMIT);
}

// Only the known fields survive, so stored junk never reaches the scene.
function pickDesign({kind, back, belly, fin, accent}) {
  return {kind, back, belly, fin, accent};
}

export function addFriend(list, gift, id = makeFriendId()) {
  const entry = {id, design: {...pickDesign(gift.design), name: cleanName(gift.design.name)}, from: cleanName(gift.from, '')};
  const found = list.find(e => sameGift(e, entry));
  if (found) return {list, entry: found, existing: true, dropped: []};
  const next = [...list, entry];
  const dropped = next.splice(0, Math.max(0, next.length - FRIEND_LIMIT));
  return {list: next, entry, existing: false, dropped};
}

export function removeFriend(list, id) {
  return list.filter(e => e.id !== id);
}
