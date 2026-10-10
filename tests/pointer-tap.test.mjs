import test from 'node:test';
import assert from 'node:assert/strict';
import {createTapGesture} from '../dist/pointer-tap.js';

const pointer = (id = 1, x = 20, y = 30, extra = {}) => ({
  pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: true, ...extra,
});

test('a short primary mouse click or touch accepts small jitter exactly once', () => {
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    const tap = createTapGesture();
    tap.down(pointer(1, 20, 30, {pointerType}), 100);
    tap.move(pointer(1, 23, 34, {pointerType}));
    assert.equal(tap.up(pointer(1, 23, 34, {pointerType}), 350), true);
    assert.equal(tap.up(pointer(), 351), false);
  }
});

test('orbit drags never become taps when the pointer returns to its starting point', () => {
  const tap = createTapGesture();
  tap.down(pointer(), 0);
  tap.move(pointer(1, 60, 30));
  tap.move(pointer());
  assert.equal(tap.up(pointer(), 200), false);
  tap.down(pointer(), 300);
  assert.equal(tap.up(pointer(1, 28, 30), 450), false, 'up also checks movement without a move event');
  tap.down(pointer(), 500);
  assert.equal(tap.up(pointer(1, 27, 30), 650), true, 'seven pixels of touch jitter is allowed');
});

test('long presses, nonprimary buttons and invalid clocks cannot feed', () => {
  const tap = createTapGesture();
  tap.down(pointer(), 100);
  assert.equal(tap.up(pointer(), 751), false);
  tap.down(pointer(), 1000);
  assert.equal(tap.up(pointer(), 1650), true);
  for (const button of [1, 2]) {
    tap.down(pointer(1, 20, 30, {button}), 2000);
    assert.equal(tap.up(pointer(1, 20, 30, {button}), 2100), false);
  }
  tap.down(pointer(1, 20, 30, {isPrimary: false}), 3000);
  assert.equal(tap.up(pointer(), 3100), false);
  for (const end of [NaN, Infinity, 3999]) {
    tap.down(pointer(), 4000);
    assert.equal(tap.up(pointer(), end), false);
  }
  tap.down(pointer(), NaN);
  assert.equal(tap.up(pointer(), 5000), false);
});

test('pinch gestures suppress all releases, in either order, until every finger leaves', () => {
  for (const order of [[1, 2], [2, 1]]) {
    const tap = createTapGesture();
    tap.down(pointer(1), 0);
    tap.down(pointer(2, 40, 30, {isPrimary: false}), 20);
    assert.equal(tap.up(pointer(order[0]), 50), false);
    assert.equal(tap.up(pointer(order[1]), 80), false);
    tap.down(pointer(3), 100);
    assert.equal(tap.up(pointer(3), 150), true);
  }
});

test('replacing a finger during a pinch still cannot become a tap', () => {
  const tap = createTapGesture();
  tap.down(pointer(1), 0);
  tap.down(pointer(2), 10);
  assert.equal(tap.up(pointer(2), 20), false);
  tap.down(pointer(3), 30);
  assert.equal(tap.up(pointer(1), 40), false);
  assert.equal(tap.up(pointer(3), 50), false);
});

test('cancellation and wheel/reset discard pending taps and permit the next fresh gesture', () => {
  const tap = createTapGesture();
  tap.down(pointer(1), 0);
  tap.cancel(pointer(1));
  assert.equal(tap.up(pointer(1), 10), false);
  tap.down(pointer(2), 20);
  tap.down(pointer(3), 30);
  tap.cancel(pointer(3));
  assert.equal(tap.up(pointer(2), 40), false);
  tap.down(pointer(4), 50);
  tap.reset();
  assert.equal(tap.up(pointer(4), 60), false);
  tap.down(pointer(5), 70);
  assert.equal(tap.up(pointer(5), 80), true);
});

test('duplicate downs and unrelated releases do not reset a gesture', () => {
  const tap = createTapGesture();
  tap.down(pointer(1), 0);
  tap.down(pointer(1), 600);
  assert.equal(tap.up(pointer(2), 610), false);
  assert.equal(tap.up(pointer(1), 700), false, 'duplicate down cannot extend the long-press deadline');
  tap.down(pointer(1), 1000);
  tap.move(pointer(1, 60, 30));
  tap.down(pointer(1), 1100);
  assert.equal(tap.up(pointer(1), 1150), false, 'duplicate down cannot erase a drag');
});

test('invalid pointer coordinates are rejected without poisoning the next tap', () => {
  const tap = createTapGesture();
  tap.down(pointer(1, NaN, 30), 0);
  assert.equal(tap.up(pointer(), 10), false);
  tap.down(pointer(), 20);
  tap.move(pointer(1, 20, Infinity));
  assert.equal(tap.up(pointer(), 30), false);
  tap.down(pointer(), 40);
  assert.equal(tap.up(pointer(), 50), true);
});
