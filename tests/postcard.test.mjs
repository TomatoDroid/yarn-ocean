import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD, wrapText, postcardFileName} from '../dist/fish-postcard.js';

// One unit per code point keeps the expectations readable.
const measure = text => Array.from(text).length;

test('the card is a 3:4 portrait with a square photo inside its margins', () => {
  assert.equal(CARD.width * 4, CARD.height * 3);
  assert.equal(CARD.photo + CARD.margin * 2, CARD.width);
});

test('quotes wrap Chinese text without spaces and keep short lines intact', () => {
  assert.deepEqual(wrapText(measure, '有人一针一线', 10, 2), ['有人一针一线']);
  assert.deepEqual(wrapText(measure, '一二三四五六七', 4, 2), ['一二三四', '五六七']);
  assert.deepEqual(wrapText(measure, '', 4, 2), []);
});

test('overflowing quotes end with an ellipsis that still fits the line', () => {
  const lines = wrapText(measure, '一二三四五六七八九十', 4, 2);
  assert.equal(lines.length, 2);
  assert.equal(lines[0], '一二三四');
  assert.equal(lines[1], '五六七…');
  assert.ok(lines.every(line => measure(line) <= 4));
});

test('a wrapped line never starts with the space it broke on', () => {
  assert.deepEqual(wrapText(measure, 'abcd efgh', 4, 3), ['abcd', 'efgh']);
});

test('file names are dated, keep Chinese names and drop path or control characters', () => {
  const day = new Date(2026, 9, 4);
  assert.equal(postcardFileName('小绒球', day), '小绒球-线织海洋明信片-20261004.png');
  assert.equal(postcardFileName('a/b:c*?"<>|\u0000‮', day), 'abc-线织海洋明信片-20261004.png');
  assert.equal(postcardFileName('  ', day), '毛线鱼-线织海洋明信片-20261004.png');
  assert.equal(postcardFileName(undefined, day), '毛线鱼-线织海洋明信片-20261004.png');
});
