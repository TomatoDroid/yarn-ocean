import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwimmer,stepSchool,touchSwimmer} from '../dist/swimming.js';
const bounds={x:6.25,left:-10,right:10,minY:-2.35,maxY:3.25,minZ:-3.6,maxZ:1.3};
function school(){return Array.from({length:20},(_,i)=>{const s=createSwimmer({x:(i%5-2)*2.4,y:-1.8+Math.floor(i/5)*1.2,z:-1.5+(i%3)},i,['long','round','fan'][i%3],891);if(i>=18){s.large=true;s.radius=3.4;s.speed=.60;s.clearance=1.65;}s.canRecycle=true;return s;});}
for(const [label,b] of [['desktop',bounds],['mobile',{...bounds,x:2.8,left:-4.2,right:4.2}]])for(const hz of [30,60,120]){
 test(`${label} ${hz}Hz: both directions cross, wait offscreen, and re-enter without a visible wrap`,()=>{
  const fish=school();let hiddenFrames=0;const directions=new Set();
  for(let i=0;i<hz*180;i++){
   const before=fish.map(s=>({x:s.position.x,entries:s.entries,mode:s.mode,direction:s.direction}));stepSchool(fish,1/hz,i/hz,b);
   fish.forEach((s,j)=>{
    assert.ok([...Object.values(s.position),...Object.values(s.velocity)].every(Number.isFinite));
    if(s.mode==='waiting'){hiddenFrames++;assert.ok(s.wait>0);assert.ok(s.position.x<b.left-s.radius||s.position.x>b.right+s.radius);}
    else directions.add(s.direction);
    if(s.entries>before[j].entries){assert.equal(before[j].mode,'waiting');assert.ok(s.direction>0?s.position.x<b.left-s.radius:s.position.x>b.right+s.radius);}
    else if(s.mode==='crossing'&&before[j].mode==='crossing'){assert.ok((s.position.x-before[j].x)*before[j].direction>0,'visible pass must make steady horizontal progress');assert.ok(Math.abs(s.position.x-before[j].x)<.1,'no teleport within a visible pass');}
   });
  }
  assert.ok(hiddenFrames>0);assert.equal(directions.size,2);for(const s of fish){assert.ok(s.entries>=2);assert.ok(s.exits>=2);}
 });
}
test('visible fish cannot recycle, and pause freezes crossing/wait/reaction state',()=>{
 const fish=school();const s=fish[0];s.position.x=-20;s.canRecycle=false;stepSchool(fish,.02,0,bounds);assert.equal(s.mode,'crossing');
 s.canRecycle=true;stepSchool(fish,.02,.02,bounds);assert.equal(s.mode,'waiting');
 touchSwimmer(fish[1],{...fish[1].position,z:fish[1].position.z+.4});const before=JSON.stringify(fish);stepSchool(fish,0,20,bounds);assert.equal(JSON.stringify(fish),before);
});
test('touch produces a bounded dart and settles back into the same crossing',()=>{
 const s=createSwimmer({x:0,y:0,z:0},1,'long',37);const initialSpeed=s.velocity.x;assert.equal(touchSwimmer(s,{x:0,y:.1,z:.35}),true);assert.ok(s.velocity.x>initialSpeed);assert.equal(s.reaction,1);
 for(let i=0;i<180;i++)stepSchool([s],1/60,i/60,bounds);
 assert.equal(s.reaction,0);assert.equal(s.touches,1);assert.equal(s.direction,1);assert.equal(s.mode,'crossing');assert.ok(Math.abs(s.position.y)<.6&&Math.abs(s.position.z)<.6);
});
test('detail inspection holds the selected fish and resumes its crossing on release',()=>{
 const s=createSwimmer({x:0,y:.5,z:0},0,'long',37);s.inspect=true;s.canRecycle=true;
 for(let i=0;i<6000;i++)stepSchool([s],.02,i*.02,bounds);
 assert.equal(s.mode,'crossing');assert.equal(s.exits,0);assert.ok(Math.abs(s.position.x)<.1);s.inspect=false;
 for(let i=0;i<3000;i++)stepSchool([s],.02,120+i*.02,bounds);assert.ok(s.exits>=1);
});
test('camera turns only change future pass headings; visible paths stay continuous',()=>{
 const s=createSwimmer({x:0,y:.5,z:0},1,'long',37);s.canRecycle=true;
 const side={...bounds,heading:{x:0,z:-1}};
 for(let i=0;i<240;i++){const before={...s.position};stepSchool([s],1/60,i/60,side);assert.deepEqual(s.heading,{x:1,z:0});assert.ok(Math.hypot(s.position.x-before.x,s.position.z-before.z)<.05);}
 for(let i=240;i<1800&&s.entries===0;i++)stepSchool([s],1/60,i/60,side);
 assert.ok(s.entries>0);assert.deepEqual(s.heading,side.heading);const sign=s.direction;
 const before={...s.position};stepSchool([s],1/60,31,{...bounds,heading:{x:-1,z:0}});
 assert.deepEqual(s.heading,side.heading);assert.ok((s.position.z-before.z)*-sign>0);
});
test('oblique 3D lanes preserve touch recoil, pause, inspection and offscreen re-entry',()=>{
 const s=createSwimmer({x:0,y:0,z:0},1,'long',891);s.mode='waiting';s.wait=.01;s.canRecycle=true;
 const a=Math.PI*.73,b={...bounds,heading:{x:Math.cos(a),z:Math.sin(a)}};
 stepSchool([s],.02,0,b);const h=s.heading,along=()=>s.position.x*h.x+s.position.z*h.z;
 assert.ok(Math.abs(along())>10+s.radius);const v=s.velocity.x*h.x+s.velocity.z*h.z;
 touchSwimmer(s,{...s.position,y:s.position.y+.2});assert.ok((s.velocity.x*h.x+s.velocity.z*h.z-v)*s.direction>0);
 const frozen=JSON.stringify(s);stepSchool([s],0,1,b);assert.equal(JSON.stringify(s),frozen);
 s.inspect=true;const anchor={...s.position};for(let i=0;i<300;i++)stepSchool([s],.02,i*.02,b);
 assert.ok(Math.hypot(s.position.x-anchor.x,s.position.z-anchor.z)<.7);assert.equal(s.mode,'crossing');
 s.inspect=false;for(let i=0;i<6000;i++){stepSchool([s],.02,6+i*.02,b);assert.ok(Object.values(s.position).every(Number.isFinite));}
 assert.ok(s.exits>=2&&s.entries>=3);
});
