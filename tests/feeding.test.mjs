import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createFishFeeding, FEED_INTERVAL_MS, FOOD_LIMIT, HEART_LIMIT} from '../dist/fish-feeding.js';

// Only canvas drawing is stubbed. Transform maths, objects, textures, materials,
// geometry and disposal events all use the same Three.js shipped to browsers.
const canvasDocument = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    return {width: 0, height: 0, getContext(type) {
      assert.equal(type, '2d');
      return {
        beginPath() {}, arc() {}, fill() {}, stroke() {}, moveTo() {},
        bezierCurveTo() {}, setLineDash() {},
      };
    }};
  },
};

function setup(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {value: canvasDocument, configurable: true});
  const scene = new THREE.Scene();
  const woolTexture = new THREE.Texture();
  const fish = new THREE.Group();
  fish.userData = {
    name: '测试小鱼', mouthPoint: new THREE.Vector3(.6, .1, 0),
    swim: {mode: 'crossing'}, uniforms: {uJoy: {value: 0}},
  };
  scene.add(fish);
  const eaten = [];
  let onEat = () => {};
  const feeding = createFishFeeding({THREE, scene, woolTexture, onEat: target => {
    eaten.push(target);
    onEat(target);
  }});
  const layer = scene.getObjectByName('fish-feeding');
  let disposed = false;
  const dispose = () => {if (!disposed) {feeding.dispose(); disposed = true;}};
  t.after(() => {
    dispose();
    woolTexture.dispose();
    if (original) Object.defineProperty(globalThis, 'document', original);
    else delete globalThis.document;
  });
  return {
    scene, fish, woolTexture, feeding, layer, eaten, dispose,
    foods: () => layer.children.filter(item => item.isGroup && item.visible),
    hearts: () => layer.children.filter(item => item.isSprite && item.visible),
    onEat(callback) {onEat = callback;},
  };
}

function advance(feeding, seconds, {now = 0, ...options} = {}) {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += .02) {
    feeding.update(.02, {now: now + (elapsed + .02) * 1000, ...options});
  }
}

function appearance(objects) {
  return objects.map(item => ({
    position: item.position.toArray(), scale: item.scale.toArray(),
    rotation: item.rotation.toArray(), opacity: item.material?.opacity,
  }));
}

test('rapid taps are throttled and each accepted snack is eaten exactly once', t => {
  const {feeding, fish, eaten} = setup(t);
  const point = new THREE.Vector3(-3, 2, 0);
  assert.equal(feeding.feed(fish, point, {now: 0}), true);
  for (const now of [1, 50, 200, FEED_INTERVAL_MS - 1]) {
    assert.equal(feeding.feed(fish, point, {now}), false);
  }
  assert.equal(feeding.feed(fish, point, {now: FEED_INTERVAL_MS}), true);
  assert.equal(eaten.length, 0, 'a tap alone must not show the successful eating response');
  advance(feeding, 6, {now: 500});
  assert.deepEqual(eaten, [fish, fish]);
  assert.deepEqual(feeding.getState(), {fed: 2, eaten: 2, foods: 0, hearts: 0, happy: 0});
  assert.equal(fish.userData.feedingJoy, 0);
});

test('food meets the current mouth after the fish moves, rotates and changes scale', t => {
  const fixture = setup(t);
  const {feeding, fish, eaten} = fixture;
  feeding.feed(fish, new THREE.Vector3(-5, 1, 0), {now: 0});
  advance(feeding, .3);
  fish.position.set(4, 2, -3);
  fish.rotation.y = Math.PI / 2;
  fish.scale.setScalar(1.8);
  const expected = fish.localToWorld(fish.userData.mouthPoint.clone());
  fixture.onEat(target => {
    assert.equal(target, fish);
    assert.equal(fixture.foods().length, 1);
    assert.ok(fixture.foods()[0].position.distanceTo(expected) < 1e-8,
      'the snack must reach the transformed mouth, not the old target position');
    assert.ok(fixture.hearts().every(heart => heart.position.distanceTo(expected) < 1e-8));
  });
  advance(feeding, 2, {now: 300});
  assert.equal(eaten.length, 1);
});

test('full food and heart pools bound a burst and remain reusable without adding objects', t => {
  const fixture = setup(t);
  const {feeding, fish, layer, eaten} = fixture;
  const originalChildren = [...layer.children];
  const point = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < FOOD_LIMIT; i++) {
    assert.equal(feeding.feed(fish, point, {now: i * FEED_INTERVAL_MS}), true);
  }
  assert.equal(feeding.feed(fish, point, {now: FOOD_LIMIT * FEED_INTERVAL_MS}), false);
  assert.equal(fixture.foods().length, FOOD_LIMIT);
  assert.equal(feeding.getState().fed, FOOD_LIMIT);
  for (let i = 0; i < 100 && eaten.length < FOOD_LIMIT; i++) {
    feeding.update(.02, {now: 2500 + i * 20});
  }
  assert.equal(eaten.length, FOOD_LIMIT);
  assert.equal(feeding.getState().foods, 0);
  assert.equal(fixture.hearts().length, HEART_LIMIT);
  assert.equal(feeding.feed(fish, point, {now: 6000, instant: true}), true);
  assert.equal(eaten.length, FOOD_LIMIT + 1, 'a full effect pool must not lose an eating event');
  assert.equal(fixture.hearts().length, HEART_LIMIT);
  advance(feeding, 5, {now: 6000});
  assert.equal(fixture.hearts().length, 0);
  for (let i = 0; i < 40; i++) {
    assert.equal(feeding.feed(fish, point, {now: 12000 + i * 2000}), true);
    advance(feeding, 2, {now: 12000 + i * 2000});
    assert.ok(fixture.hearts().length <= HEART_LIMIT);
  }
  advance(feeding, 5, {now: 100000});
  assert.equal(feeding.getState().foods, 0);
  assert.equal(feeding.getState().hearts, 0);
  assert.equal(eaten.length, FOOD_LIMIT + 41);
  assert.deepEqual(layer.children, originalChildren, 'repeated feeding must reuse the original scene objects');
});

test('pause freezes snacks, floating hearts and joy despite wall-clock time passing', t => {
  const fixture = setup(t);
  const {feeding, fish, eaten} = fixture;
  feeding.feed(fish, new THREE.Vector3(-2, 2, 0), {now: 0});
  advance(feeding, .2);
  const foodBefore = appearance(fixture.foods());
  const before = feeding.getState();
  advance(feeding, 4, {now: 5000, moving: false});
  assert.deepEqual(appearance(fixture.foods()), foodBefore);
  assert.deepEqual(feeding.getState(), before);
  assert.equal(eaten.length, 0);
  for (let i = 0; i < 100 && !eaten.length; i++) feeding.update(.02, {now: 10000 + i * 20});
  assert.equal(eaten.length, 1);
  advance(feeding, .25, {now: 12000});
  const heartsBefore = appearance(fixture.hearts());
  const joyBefore = fish.userData.feedingJoy;
  advance(feeding, 4, {now: 20000, moving: false});
  assert.deepEqual(appearance(fixture.hearts()), heartsBefore);
  assert.equal(fish.userData.feedingJoy, joyBefore);
  advance(feeding, 5, {now: 30000});
  assert.equal(feeding.getState().hearts, 0);
  assert.equal(fish.userData.feedingJoy, 0);
});

test('hidden or waiting targets abandon uneaten food and release its pool slot even while paused', t => {
  const {feeding, fish, eaten, foods} = setup(t);
  const point = new THREE.Vector3(-2, 1, 0);
  feeding.feed(fish, point, {now: 0});
  fish.visible = false;
  assert.equal(feeding.update(.02, {now: 100, moving: false}), true);
  assert.equal(foods().length, 0);
  assert.equal(feeding.feed(fish, point, {now: 500}), false);
  fish.visible = true;
  assert.equal(feeding.feed(fish, point, {now: 500}), true);
  fish.userData.swim.mode = 'waiting';
  feeding.update(.02, {now: 600, moving: false});
  assert.equal(feeding.getState().foods, 0);
  assert.equal(feeding.feed(fish, point, {now: 1000}), false);
  advance(feeding, 3, {now: 1000});
  assert.equal(eaten.length, 0, 'food cleared for a lost target must never announce a successful meal');
});

test('reduced motion eats immediately with a stationary heart that expires by wall clock', t => {
  const fixture = setup(t);
  const {feeding, fish, eaten} = fixture;
  assert.equal(feeding.feed(fish, new THREE.Vector3(-5, 2, 0), {now: 1000, instant: true}), true);
  assert.deepEqual(eaten, [fish]);
  assert.equal(feeding.getState().foods, 0);
  assert.equal(fixture.hearts().length, 1);
  assert.equal(fish.userData.feedingJoy, 0);
  const before = appearance(fixture.hearts());
  feeding.update(.05, {now: 2000, moving: true, reduced: true});
  assert.deepEqual(appearance(fixture.hearts()), before);
  feeding.update(0, {now: 2499, moving: false, reduced: true});
  assert.equal(fixture.hearts().length, 1);
  assert.equal(feeding.update(0, {now: 2500, moving: false, reduced: true}), true);
  assert.equal(fixture.hearts().length, 0, 'no animation time is required to expire static feedback');
  assert.equal(feeding.getState().happy, 0);
});

test('clear removes current feedback, resets joy and lets the same pool serve a new view', t => {
  const fixture = setup(t);
  const {feeding, fish, layer} = fixture;
  feeding.feed(fish, new THREE.Vector3(), {now: 0});
  for (let i = 0; i < 100 && !fixture.eaten.length; i++) feeding.update(.02, {now: i * 20});
  assert.ok(fish.userData.feedingJoy > 0);
  fish.userData.uniforms.uJoy.value = fish.userData.feedingJoy;
  feeding.feed(fish, new THREE.Vector3(-3, 0, 0), {now: 2000});
  feeding.clear();
  assert.equal(layer.children.some(child => child.visible), false);
  assert.equal(feeding.getState().foods, 0);
  assert.equal(feeding.getState().hearts, 0);
  assert.equal(feeding.getState().happy, 0);
  assert.equal(fish.userData.feedingJoy, 0);
  assert.equal(fish.userData.uniforms.uJoy.value, 0);
  assert.equal(feeding.feed(fish, new THREE.Vector3(), {now: 3000}), true);
  advance(feeding, 2, {now: 3000});
  assert.equal(fixture.eaten.length, 2);
});

test('dispose detaches the layer and frees owned GPU resources once without disposing shared wool', t => {
  const fixture = setup(t);
  const {feeding, fish, layer, scene, woolTexture} = fixture;
  const resources = new Set();
  layer.traverse(object => {
    // Sprite geometry belongs to Three.js and is shared across all sprites.
    if (object.isMesh) resources.add(object.geometry);
    if (object.material) {
      resources.add(object.material);
      if (object.isSprite) resources.add(object.material.map);
    }
  });
  const disposed = new Map([...resources].map(resource => [resource, 0]));
  for (const resource of resources) resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));
  let woolDisposals = 0;
  woolTexture.addEventListener('dispose', () => woolDisposals++);
  feeding.feed(fish, new THREE.Vector3(), {now: 0, instant: true});
  feeding.feed(fish, new THREE.Vector3(-5, 0, 0), {now: 500});
  fixture.dispose();
  assert.equal(scene.getObjectByName('fish-feeding'), undefined);
  assert.equal(layer.parent, null);
  assert.equal(layer.children.some(child => child.visible), false);
  assert.ok(resources.size > 3);
  for (const count of disposed.values()) assert.equal(count, 1);
  assert.equal(woolDisposals, 0, 'the rest of the ocean still owns its wool texture');
  assert.equal(feeding.getState().foods, 0);
  assert.equal(feeding.getState().hearts, 0);
  assert.equal(feeding.getState().happy, 0);
});
