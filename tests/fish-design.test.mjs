import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YARNS, KINDS, PARTS, NAME_LIMIT, DEFAULT_NAME, cleanName, isDesign, sameDesign, sameLook,
  randomDesign, encodeDesign, decodeDesign, designToHash, designFromHash, shareUrl, designToDefinition,
} from '../dist/fish-design.js';

const design = {kind: 'round', back: 7, belly: 14, fin: 1, accent: 2, name: '小绒球'};

test('a design round-trips through the share hash, including Chinese names', () => {
  const hash = designToHash(design);
  assert.match(hash, /^#knit=1r7e12&name=/);
  assert.deepEqual(designFromHash(hash), design);
  assert.deepEqual(designFromHash(hash.slice(1)), design);
});

test('every kind and every yarn colour encodes losslessly', () => {
  for (const kind of Object.keys(KINDS)) {
    for (let yarn = 0; yarn < YARNS.length; yarn++) {
      const d = {kind, back: yarn, belly: (yarn + 1) % YARNS.length, fin: (yarn + 2) % YARNS.length, accent: (yarn + 3) % YARNS.length, name: '鱼'};
      assert.deepEqual(decodeDesign(encodeDesign(d), d.name), d);
    }
  }
});

test('malformed or hostile share codes are rejected rather than guessed', () => {
  for (const code of ['', '1', '1x1234', '2r1234', '1r123', '1r12345', '1R1234', '1r12g4', ' 1r1234', null, undefined]) {
    assert.equal(decodeDesign(code, 'x'), null, String(code));
  }
  assert.equal(designFromHash(''), null);
  assert.equal(designFromHash('#name=只有名字'), null);
  // Broken percent-encoding in the name must not throw or invalidate the fish.
  assert.ok(isDesign(designFromHash('#knit=1r1234&name=%E0%A4%A')));
  assert.throws(() => encodeDesign({...design, back: 16}), TypeError);
  assert.throws(() => encodeDesign({...design, kind: 'whale'}), TypeError);
});

test('names are trimmed, stripped of control and bidi characters, and capped by code point', () => {
  assert.equal(cleanName('  小  鱼  '), '小 鱼');
  assert.equal(cleanName('a‮b\u0000c\n'), 'abc');
  assert.equal(cleanName('一二三四五六七八九十'), '一二三四五六七八');
  assert.equal(Array.from(cleanName('🐟🐟🐟🐟🐟🐟🐟🐟🐟')).length, NAME_LIMIT);
  assert.equal(cleanName(''), DEFAULT_NAME);
  assert.equal(cleanName('​​'), DEFAULT_NAME);
  assert.equal(decodeDesign('1l0000', '<img src=x>').name, '<img src');
});

test('share links keep the page path and replace any query or old hash', () => {
  const url = shareUrl('https://tomatodroid.github.io/yarn-ocean/?utm=x#knit=1l0000&name=old', design);
  assert.ok(url.startsWith('https://tomatodroid.github.io/yarn-ocean/#knit=1r7e12&name='));
  assert.deepEqual(designFromHash(new URL(url).hash), design);
});

test('random designs are always valid and keep back, belly and fin distinct', () => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) {
    const d = randomDesign(random);
    assert.ok(isDesign(d));
    assert.notEqual(d.back, d.belly);
    assert.notEqual(d.back, d.fin);
  }
  assert.ok(isDesign(randomDesign(() => .999999)));
  assert.ok(isDesign(randomDesign(() => 0)));
});

test('a design becomes a scene definition with the chosen yarns in place', () => {
  const d = designToDefinition({...design, name: '  小绒球  '}, {origin: 'guest'});
  assert.equal(d.name, '小绒球');
  assert.equal(d.kind, 'round');
  assert.equal(d.custom, 'guest');
  assert.deepEqual(d.body, [YARNS[14].hex, YARNS[7].hex, YARNS[7].hex]);
  assert.equal(d.fin, YARNS[1].hex);
  assert.equal(d.lip, YARNS[2].hex);
  assert.deepEqual(d.colors, PARTS.map(({key}) => YARNS[design[key]].hex));
  assert.match(d.desc, /海蓝的背、奶油白的肚皮/);
  assert.ok(sameDesign(d.design, design));
  assert.ok(sameLook(d.design, {...design, name: '别的名字'}));
  assert.ok(!sameLook(d.design, {...design, accent: 3}));
});
