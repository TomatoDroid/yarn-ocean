// Small, reusable pools: feeding never builds geometry or adds DOM per tap.
export const FEED_INTERVAL_MS = 420;
export const FOOD_LIMIT = 5;
export const HEART_LIMIT = 15;

export function createFishFeeding({THREE, scene, woolTexture, onEat}) {
  const layer = new THREE.Group();
  layer.name = 'fish-feeding';
  scene.add(layer);
  const ballGeometry = new THREE.SphereGeometry(.075, 12, 8);
  const threadGeometry = new THREE.TorusGeometry(.073, .013, 5, 16);
  const foodMaterial = new THREE.MeshStandardMaterial({color:'#e9b458', roughness:1, map:woolTexture});
  const threadMaterial = new THREE.MeshStandardMaterial({color:'#fff0b5', roughness:1, map:woolTexture});
  const foods = Array.from({length:FOOD_LIMIT}, () => {
    const mesh = new THREE.Group();
    mesh.add(new THREE.Mesh(ballGeometry, foodMaterial));
    for (let i=0; i<3; i++) {
      const thread = new THREE.Mesh(threadGeometry, threadMaterial);
      thread.rotation.set(i*Math.PI/3, i*Math.PI/3, 0);
      mesh.add(thread);
    }
    mesh.visible = false;
    layer.add(mesh);
    return {mesh, fish:null, origin:new THREE.Vector3(), age:0, duration:1};
  });

  // A locally drawn stitched heart in a translucent bubble, shared by all sprites.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.beginPath(); ctx.arc(64,64,55,0,Math.PI*2);
  ctx.fillStyle = '#fbe9d925'; ctx.fill();
  ctx.strokeStyle = '#ffedcbcc'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(64,64,47,3.6,4.3);
  ctx.strokeStyle = '#fff8e6'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(64,94);
  ctx.bezierCurveTo(10,61,36,28,64,48);
  ctx.bezierCurveTo(92,28,118,61,64,94);
  ctx.fillStyle = '#ef879b'; ctx.fill();
  ctx.strokeStyle = '#ffc1c1'; ctx.lineWidth = 3; ctx.setLineDash([3,4]); ctx.stroke();
  ctx.setLineDash([]);
  const heartTexture = new THREE.CanvasTexture(canvas);
  heartTexture.colorSpace = THREE.SRGBColorSpace;
  const hearts = Array.from({length:HEART_LIMIT}, () => {
    const mesh = new THREE.Sprite(new THREE.SpriteMaterial({map:heartTexture, transparent:true, depthWrite:false, depthTest:false, toneMapped:false}));
    mesh.visible = false;
    mesh.renderOrder = 5;
    layer.add(mesh);
    return {mesh, origin:new THREE.Vector3(), age:0, life:2.2, drift:0, delay:0, static:false, expires:0};
  });
  const mouth = new THREE.Vector3();
  const happy = new Map();
  let lastFeed = -Infinity, fed = 0, eaten = 0;

  function mouthPosition(fish) {
    fish.updateWorldMatrix(true, false);
    mouth.copy(fish.userData.mouthPoint);
    return fish.localToWorld(mouth);
  }

  function eat(fish, now, instant) {
    eaten++;
    mouthPosition(fish);
    happy.set(fish, instant ? 0 : 1.35);
    fish.userData.feedingJoy = instant ? 0 : 1;
    const count = instant ? 1 : 3;
    for (let i=0; i<count; i++) {
      const heart = hearts.find(h => !h.mesh.visible);
      if (!heart) break;
      heart.origin.copy(mouth);
      heart.age = 0; heart.delay = i*.13; heart.drift = (i-1)*.24;
      heart.life = 2.2+i*.15; heart.static = instant; heart.expires = now+1500;
      heart.mesh.position.copy(mouth);
      if (instant) heart.mesh.position.y += .26;
      heart.mesh.scale.setScalar(instant ? .48 : .16);
      heart.mesh.material.opacity = instant ? 1 : 0;
      heart.mesh.visible = true;
    }
    onEat(fish);
  }

  function feed(fish, point, {now=performance.now(), instant=false}={}) {
    if (!fish?.visible || fish.userData.swim.mode !== 'crossing' || now-lastFeed < FEED_INTERVAL_MS) return false;
    const food = foods.find(item => !item.fish);
    if (!food) return false;
    lastFeed = now; fed++;
    if (instant) { eat(fish, now, true); return true; }
    food.fish = fish;
    food.origin.copy(point);
    food.mesh.position.copy(point);
    food.mesh.scale.setScalar(1);
    food.mesh.visible = true;
    food.age = 0;
    food.duration = Math.min(1.5, .75+point.distanceTo(mouthPosition(fish))*.08);
    return true;
  }

  function update(dt, {now=performance.now(), moving=true, reduced=false}={}) {
    const step = moving && !reduced ? Math.max(0, Math.min(dt, .05)) : 0;
    let changed = false;
    for (const [fish, left] of happy) {
      const remaining = Math.max(0, left-step);
      fish.userData.feedingJoy = remaining/1.35;
      if (!remaining) happy.delete(fish); else happy.set(fish, remaining);
    }
    for (const food of foods) {
      if (!food.fish) continue;
      if (!food.fish.visible || food.fish.userData.swim.mode !== 'crossing') {
        food.fish = null; food.mesh.visible = false; changed = true; continue;
      }
      if (!step) continue;
      changed = true;
      food.age += step;
      const t = Math.min(1, food.age/food.duration), ease = t*t*(3-2*t);
      food.mesh.position.copy(food.origin).lerp(mouthPosition(food.fish), ease);
      food.mesh.position.y += Math.sin(t*Math.PI)*.28;
      food.mesh.rotation.z += step*2;
      food.mesh.scale.setScalar(1-Math.max(0,t-.8)*3);
      if (t === 1) {
        eat(food.fish, now, false);
        food.fish = null; food.mesh.visible = false;
      }
    }
    for (const heart of hearts) {
      if (!heart.mesh.visible) continue;
      if (heart.static) {
        if (now >= heart.expires) { heart.mesh.visible = false; changed = true; }
        continue;
      }
      if (!step) continue;
      changed = true;
      heart.age += step;
      const age = Math.max(0, heart.age-heart.delay), t = age/heart.life;
      if (t >= 1) { heart.mesh.visible = false; continue; }
      heart.mesh.position.copy(heart.origin);
      heart.mesh.position.y += age*.65;
      heart.mesh.position.x += heart.drift*age+Math.sin(age*3)*.05;
      heart.mesh.scale.setScalar(.2+Math.min(1,age*4)*.32);
      heart.mesh.material.opacity = Math.min(1,age*7)*Math.min(1,(1-t)*2);
    }
    return changed;
  }

  function clear() {
    for (const food of foods) { food.fish = null; food.mesh.visible = false; }
    for (const heart of hearts) heart.mesh.visible = false;
    for (const fish of happy.keys()) { fish.userData.feedingJoy = 0; fish.userData.uniforms.uJoy.value = 0; }
    happy.clear();
  }

  function dispose() {
    clear(); layer.removeFromParent();
    for (const resource of [ballGeometry, threadGeometry, foodMaterial, threadMaterial, heartTexture]) resource.dispose();
    for (const heart of hearts) heart.mesh.material.dispose();
  }

  return {feed, update, clear, dispose, getState:() => ({fed, eaten, foods:foods.filter(f=>f.fish).length, hearts:hearts.filter(h=>h.mesh.visible).length, happy:happy.size})};
}
