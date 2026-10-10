import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createFishSpeech} from '../dist/fish-speech.js';

const rect = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});

function showSpeech(blockers, message = '好喜欢这一口！') {
  const doc = {createElement: () => ({
    hidden: true, style: {setProperty() {}}, dataset: {},
    classList: {add() {}, remove() {}}, setAttribute() {}, append() {},
    getBoundingClientRect: () => rect(0, 0, 240, 80),
  })};
  let bubble;
  const stage = {
    ownerDocument: doc, appendChild(node) {bubble = node;},
    getBoundingClientRect: () => rect(0, 0, 390, 844),
    querySelector: selector => blockers[selector] && {getBoundingClientRect: () => blockers[selector]},
  };
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 100);
  camera.position.z = 10;
  camera.updateMatrixWorld();
  const fish = new THREE.Group();
  fish.position.y = .5;
  fish.userData = {name: '测试鱼', ry: .8, swim: {mode: 'crossing'}};
  const speech = createFishSpeech({THREE, stage, host: stage});
  speech.show(fish, message);
  speech.update(camera);
  const top = new THREE.Vector3(0, 1.3, 0).project(camera);
  const bottom = new THREE.Vector3(0, -.3, 0).project(camera);
  return {
    bubble, top: Number.parseFloat(bubble.style.top),
    bottom: Number.parseFloat(bubble.style.top) + 80,
    fishTop: (1 - top.y) * 422, fishBottom: (1 - bottom.y) * 422,
  };
}

test('feeding replies stay below the fish when that space is available', () => {
  const result = showSpeech({});
  assert.equal(result.bubble.hidden, false);
  assert.equal(result.bubble.dataset.placement, 'below');
  assert.ok(result.top > result.fishBottom);
});

test('an info card below the fish sends its reply above the upper edge, outside its body', () => {
  const result = showSpeech({'.object-info': rect(23, 500, 344, 96)});
  assert.equal(result.bubble.hidden, false);
  assert.equal(result.bubble.dataset.placement, 'above');
  assert.ok(result.bottom < result.fishTop,
    `reply bottom ${result.bottom} must remain above fish top ${result.fishTop}`);
});

test('a header above the fish sends an ordinary greeting below the lower edge', () => {
  const result = showSpeech({'.header': rect(0, 0, 390, 280)}, null);
  assert.equal(result.bubble.hidden, false);
  assert.equal(result.bubble.dataset.placement, 'below');
  assert.ok(result.top > result.fishBottom);
});

test('when both outer bands are blocked the bubble hides instead of filling the fish body', () => {
  const result = showSpeech({
    '.header': rect(0, 0, 390, 280),
    '.object-info': rect(0, 460, 390, 384),
  });
  assert.equal(result.bubble.hidden, true);
});
