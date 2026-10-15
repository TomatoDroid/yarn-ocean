import test from 'node:test';
import assert from 'node:assert/strict';
import {designToHash, designFromHash, shareFromHash, shareUrl} from '../dist/fish-design.js';
import {FRIEND_LIMIT, addFriend, removeFriend, parseFriends, makeFriendId} from '../dist/fish-friends.js';

const design = {kind: 'fan', back: 2, belly: 14, fin: 7, accent: 13, name: '海边的风'};
const gift = (name, from = '小满') => ({design: {...design, name}, from});

test('share links carry an optional, cleaned sender name', () => {
  const hash = designToHash(design, {from: '  小满‮ '});
  assert.deepEqual(shareFromHash(hash), {design, from: '小满'});
  assert.deepEqual(designFromHash(hash), design);
  assert.ok(!designToHash(design).includes('from='));
  assert.ok(!designToHash(design, {from: '   '}).includes('from='));
  assert.deepEqual(shareFromHash(designToHash(design)), {design, from: ''});
  assert.equal(shareFromHash('#from=小满'), null);
  const url = shareUrl('https://example.com/sea/?x=1', design, {from: '阿南'});
  assert.equal(shareFromHash(new URL(url).hash).from, '阿南');
});

test('a gift is kept once; the same fish from the same knitter is not duplicated', () => {
  let {list, existing} = addFriend([], gift('海边的风'), 'aaaa1');
  assert.equal(existing, false);
  const again = addFriend(list, gift('海边的风'), 'bbbb2');
  assert.equal(again.existing, true);
  assert.equal(again.entry.id, 'aaaa1');
  assert.equal(again.list, list);
  // Same yarn, different knitter or name: a different gift.
  assert.equal(addFriend(list, gift('海边的风', '阿南'), 'cccc3').existing, false);
  assert.equal(addFriend(list, gift('山里的风'), 'dddd4').existing, false);
});

test('the oldest gift swims off when the sea is full', () => {
  let list = [];
  for (let i = 0; i < FRIEND_LIMIT; i++) list = addFriend(list, gift(`鱼${i}`), `id00${i}`).list;
  const result = addFriend(list, gift('新来的'), 'idnew');
  assert.equal(result.list.length, FRIEND_LIMIT);
  assert.deepEqual(result.dropped.map(e => e.id), ['id000']);
  assert.equal(result.list.at(-1).id, 'idnew');
  assert.deepEqual(removeFriend(result.list, 'id003').map(e => e.id), ['id001', 'id002', 'id004', 'id005', 'idnew']);
});

test('stored friends are validated, cleaned, de-duplicated and capped', () => {
  assert.deepEqual(parseFriends(null), []);
  assert.deepEqual(parseFriends('not json'), []);
  assert.deepEqual(parseFriends('{"id":"x"}'), []);
  const stored = [
    {id: 'good1', design: {...design, name: '  海边的风  ', extra: '<b>'}, from: '小满\u0000'},
    {id: 'good1', design, from: '重复的编号'},
    {id: 'twin1', design, from: '小满'},
    {id: 'BAD!', design, from: ''},
    {id: 'bad22', design: {...design, back: 99}, from: ''},
    {id: 'bad33', design: {...design, kind: 'whale'}, from: ''},
    null,
  ];
  const list = parseFriends(JSON.stringify(stored));
  assert.deepEqual(list, [{id: 'good1', design: {...design, name: '海边的风'}, from: '小满'}]);
  const many = Array.from({length: 10}, (_, i) => ({id: `many${i}`, design: {...design, name: `鱼${i}`}, from: ''}));
  assert.deepEqual(parseFriends(JSON.stringify(many)).map(e => e.id), ['many4', 'many5', 'many6', 'many7', 'many8', 'many9']);
});

test('friend ids are short, lowercase and accepted by the parser', () => {
  const id = makeFriendId(1_800_000_000_000, () => .5);
  assert.match(id, /^[a-z0-9]{4,24}$/);
  assert.equal(parseFriends(JSON.stringify([{id, design, from: ''}])).length, 1);
});
