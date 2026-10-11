import * as THREE from 'three';
import {showSceneFallback,hideSceneFallback} from './app.js?v=20261011-experience';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createFishPicker} from './fish-picker.js?v=20261009-fish-talk';
import {createFishSpeech} from './fish-speech.js?v=20261011-experience';
import {createFishFeeding} from './fish-feeding.js?v=20261011-experience';
import {createTapGesture} from './pointer-tap.js?v=20261010-feeding';
import {createSwimmer,stepSchool,touchSwimmer,toLane} from './swimming.js?v=20261005-surround';
import {createHabitat} from './habitat.js?v=20261005-surround';
import {createSeafloorLife} from './seafloor-life.js?v=20261005-surround';
const host=document.querySelector('#viewport'),stage=document.querySelector('#stage');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=()=>host.clientWidth<700;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
let seed=37;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function fail(error){showSceneFallback(error);}
try{
const scene=new THREE.Scene();
const waterCanvas=document.createElement('canvas');waterCanvas.width=32;waterCanvas.height=512;
const waterContext=waterCanvas.getContext('2d'),waterGradient=waterContext.createLinearGradient(0,0,0,512);
waterGradient.addColorStop(0,'#12475b');waterGradient.addColorStop(.28,'#197687');waterGradient.addColorStop(.68,'#10566b');waterGradient.addColorStop(1,'#082e42');
waterContext.fillStyle=waterGradient;waterContext.fillRect(0,0,32,512);
const waterTexture=new THREE.CanvasTexture(waterCanvas);waterTexture.colorSpace=THREE.SRGBColorSpace;scene.background=waterTexture;
scene.fog=new THREE.FogExp2('#155366',.025);
const camera=new THREE.PerspectiveCamera(34,host.clientWidth/host.clientHeight,.1,180);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.6:2));renderer.setSize(host.clientWidth,host.clientHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=false;host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.minDistance=2.5;controls.maxDistance=30;controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.26;
scene.add(new THREE.HemisphereLight('#c8f5ee','#45656b',2.0));
const light=new THREE.DirectionalLight('#fff3d8',3.0);light.position.set(-5,7,9);light.castShadow=false;scene.add(light);
const fill=new THREE.DirectionalLight('#edf7ff',1.1);fill.position.set(7,1,5);scene.add(fill);
const rim=new THREE.DirectionalLight('#a5f1e4',1.7);rim.position.set(0,5,-4);scene.add(rim);
// Fish remain separate from the environment so selection never removes their habitat.
const root=new THREE.Group();scene.add(root);const creatures=[],clickable=[];
const textureCanvas=document.createElement('canvas');textureCanvas.width=256;textureCanvas.height=256;
const tc=textureCanvas.getContext('2d');const pixels=tc.createImageData(256,256);
for(let i=0;i<pixels.data.length;i+=4){const value=175+Math.floor(random()*80);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}
tc.putImageData(pixels,0,0);
tc.lineCap='round';for(let i=0;i<2400;i++){const x=random()*256,y=random()*256;tc.beginPath();tc.moveTo(x,y);tc.quadraticCurveTo(x+3,y-2,x+6+random()*9,y+(random()-.5)*6);tc.strokeStyle=i%3?'rgba(255,255,246,.30)':'rgba(95,100,95,.2)';tc.lineWidth=.4+random()*.7;tc.stroke();}
const woolTexture=new THREE.CanvasTexture(textureCanvas);woolTexture.wrapS=woolTexture.wrapT=THREE.RepeatWrapping;woolTexture.repeat.set(9,2);woolTexture.colorSpace=THREE.SRGBColorSpace;
const palette=new Map();
function material(color){if(!palette.has(color))palette.set(color,new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,map:woolTexture,bumpMap:woolTexture,bumpScale:.032}));return palette.get(color);}
const eyeWhite=new THREE.MeshStandardMaterial({color:'#fffbed',roughness:.83});
const pupil=new THREE.MeshStandardMaterial({color:'#191b19',roughness:.72});
// Each pipe cleaner is a thick, slightly irregular core plus thousands of short fibres.
// Build fibres once and share a vertex-coloured draw call per fish.
function strand(parent,points,r,color,{closed=false,density=145,fur=.045}={}){
  const curve=new THREE.CatmullRomCurve3(points,closed,'centripetal');
  const length=curve.getLength(),segments=Math.max(20,Math.ceil(length*28));
  const geometry=new THREE.TubeGeometry(curve,segments,r,10,closed);
  const mesh=new THREE.Mesh(geometry,material(color));mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  const owner=parent.userData.fur?parent:parent.userData.owner;
  if(!owner||density===0)return mesh;
  const baseColor=new THREE.Color(color),positions=owner.userData.fur,colors=owner.userData.furColors;
  const samples=Math.ceil(length*density*(mobile()?4:6));
  for(let i=0;i<samples;i++){
    const t=random(),center=curve.getPointAt(t),tangent=curve.getTangentAt(t);
    const n=new THREE.Vector3().crossVectors(tangent,Math.abs(tangent.y)>.9?V(1,0,0):V(0,1,0)).normalize();
    const b=new THREE.Vector3().crossVectors(tangent,n).normalize(),angle=random()*Math.PI*2;
    const dir=n.multiplyScalar(Math.cos(angle)).addScaledVector(b,Math.sin(angle));
    const start=center.clone().addScaledVector(dir,r*.88);
    const end=center.clone().addScaledVector(dir,r+fur*(.25+random()*.75)).addScaledVector(tangent,(random()-.5)*fur*.75);
    const mid=start.clone().lerp(end,.6).addScaledVector(tangent,fur*.1);
    positions.push(...start.toArray(),...mid.toArray(),...mid.toArray(),...end.toArray());
    const c=baseColor.clone().multiplyScalar(1.05+random()*.70);
    for(let j=0;j<4;j++)colors.push(c.r,c.g,c.b);
  }
  return mesh;
}
function mesh(parent,geometry,mat,pos,scale){const m=new THREE.Mesh(geometry,mat);if(pos)m.position.copy(pos);if(scale)m.scale.copy(scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
// Horizontal coils follow the actual handmade construction: broad ridges, not fine lathe rings.
function body(g,rx,ry,rz,colors,rings=8,pinch=0){
  const core=mesh(g,new THREE.SphereGeometry(1,32,20),material(colors[0]),V(),V(rx*.88,ry*.96,rz*.84));
  const radius=ry*1.88/rings*.54;
  for(let i=0;i<rings;i++){
    const t=(i+.48)/rings,y=(t*2-1)*ry;
    const section=Math.pow(Math.max(.03,1-((y/ry)*.96)**2),.45);
    const points=[];
    for(let j=0;j<64;j++){
      const a=j/64*Math.PI*2,noise=1+.016*Math.sin(a*5+i*.7)+.008*Math.cos(a*9+i);
      const sx=rx*section*(1+pinch*Math.cos(a));
      points.push(V(Math.cos(a)*sx*noise,y+Math.sin(a*2+i*.8)*.019,Math.sin(a)*rz*section*noise));
    }
    const color=colors[Math.min(colors.length-1,Math.floor(t*colors.length))];
    strand(g,points,radius,color,{closed:true,density:mobile()?140:205,fur:.043});
  }
  return core;
}
function loop(g,pts,color,r=.065){return strand(g,pts.map(p=>V(...p)),r,color,{closed:true,fur:.045,density:160});}
function fin(g,origin,w,h,color,angle=0){
  const transform=(x,y,z=.0)=>[origin[0]+x*Math.cos(angle)-y*Math.sin(angle),origin[1]+x*Math.sin(angle)+y*Math.cos(angle),origin[2]+z];
  for(let i=0;i<3;i++){
    const s=1-i*.20;
    loop(g,[transform(0,0),transform(w*.55*s,-h*.54*s,.015),transform(w*s,-h*.3*s),transform(w*.89*s,h*.5*s,.02),transform(w*.4*s,h*.45*s)],color,.063-i*.004);
  }
}
function tail(g,x,y,color,w=.47,h=.42){
  loop(g,[[x,y,0],[x+w*.25,y+h*.3,.025],[x+w,y+h*.65,0],[x+w*.83,y+.025,.02],[x+w,y-h*.62,0],[x+w*.3,y-h*.26,.015]],color,.082);
  loop(g,[[x+.07,y,0],[x+w*.73,y+h*.4,.015],[x+w*.64,y,0],[x+w*.75,y-h*.4,.015]],color,.060);
}
function sideEyes(g,x,y,z,{size=.17,tint='#fffbed',offset=.02}={}){
  for(const side of [-1,1]){
    const s=side===1?size:size*.93,yy=y+(side===1?0:offset);
    mesh(g,new THREE.SphereGeometry(s,24,18),(tint==='#fffbed'?eyeWhite:new THREE.MeshStandardMaterial({color:tint,roughness:.85})),V(x,yy,z*side),V(1,1,1.04));
    mesh(g,new THREE.SphereGeometry(s*.55,20,14),pupil,V(x-.032,yy-.012,(z+s*.80)*side),V(.86,.94,.40));
  }
}
function frontEyes(g,color='#fffbed',sep=.25,y=.12,size=.18,z=.36){
  for(let i=0;i<2;i++){
    const x=(i?1:-1)*sep,yy=y+(i?.025:-.035),s=size*(i?.93:1.04);
    mesh(g,new THREE.SphereGeometry(s,24,18),eyeWhite,V(x,yy,z),V(1,1,1));
    mesh(g,new THREE.SphereGeometry(s*.55,20,14),pupil,V(x-.013,yy-.019,z+s*.82),V(.92,1,.40));
  }
}
function mouth(g,x,y,z,color,w=.19,h=.055,front=false){
  g.userData.mouthPoint=V(x,y,z);
  const points=Array.from({length:34},(_,i)=>{const a=i/34*Math.PI*2;return front?V(x+Math.cos(a)*w,y+Math.sin(a)*h,z):V(x,y+Math.sin(a)*h,z+Math.cos(a)*w);});
  strand(g,points,.052,color,{closed:true,fur:.012,density:65});
}
const definitions=[
 {name:'柠檬潜水员',desc:'绿背、蓝肚皮，顶着一枚柠檬黄的背鳍。',colors:['#159e54','#239eba','#ffe235'],kind:'long',rx:.82,ry:.38,rz:.31,body:['#38a9ca','#1fa880','#18b45c'],fin:'#f8d322',tail:'#efe894',pos:[-1.55,2.40,.2],scale:1.0,angle:-.1},
 {name:'可可泡泡',desc:'方圆的棕色脸，紫色嘟嘴，还有不一样高的眼睛。',colors:['#75412b','#184e35','#9866c5'],kind:'round',rx:.49,ry:.50,rz:.34,body:['#673921','#84432b'],fin:'#15593f',lip:'#9161b7',pos:[1.10,2.55,-.3],scale:1.03,angle:-.25},
 {name:'柠檬小舟',desc:'亮黄色的长身体，奶油色鱼腹与一对柔软的叉尾。',colors:['#edd812','#f1e897'],kind:'long',rx:.70,ry:.32,rz:.26,body:['#e5e599','#eee025','#f3db0c'],fin:'#e9e688',tail:'#e9e688',pos:[3.50,2.35,-.5],scale:.92,angle:.25},
 {name:'莓果汽水',desc:'玫红叠着淡紫，长长的身体接一条卷曲小尾巴。',colors:['#df1856','#9d76c3','#dc6076'],kind:'long',rx:.82,ry:.32,rz:.26,body:['#776099','#ad7bc5','#e32068','#df1d4e'],fin:'#a581c3',tail:'#ae90d1',pos:[-3.55,.15,.15],scale:.98,angle:.20},
 {name:'橘子扇',desc:'像一枚蓬松的橘色贝壳，睁着薄荷绿的大眼睛。',colors:['#fa8b0e','#d9f1b0'],kind:'fan',rx:.38,ry:.57,rz:.19,body:['#f48b12'],fin:'#ef8d12',eye:'#e5f0b2',pos:[-1.25,.10,.55],scale:1.06,angle:-.32},
 {name:'蓝色蝴蝶',desc:'宽宽的扇形身体和浅蓝尾鳍，像慢慢展开的翅膀。',colors:['#1383b7','#7bbfd0','#d5e9b1'],kind:'fan',rx:.51,ry:.65,rz:.18,body:['#178abe'],fin:'#7cbac9',eye:'#d4eaae',pos:[1.25,.10,-.10],scale:1.08,angle:.18},
 {name:'蓝莓嘟嘟',desc:'海蓝色圆脑袋，配一张忍不住想笑的珊瑚红大嘴。',colors:['#078cca','#c7e6df','#e84e42'],kind:'round',rx:.49,ry:.40,rz:.36,body:['#bbe2d9','#47acc9','#0489bf'],fin:'#8faf55',lip:'#ed5442',pos:[3.60,-.10,.4],scale:.97,angle:-.25},
 {name:'黑白小鲸',desc:'黑背、白肚皮，两道白色绒条跨过身体，橙色背鳍轻轻翘起。',colors:['#242520','#e9e8e0','#e39119'],kind:'whale',rx:.94,ry:.30,rz:.30,body:['#e6e6df','#efeee5','#242520','#1c211d'],fin:'#eb991b',tail:'#242620',pos:[-2.50,-2.08,.05],scale:1.08,angle:-.15},
 {name:'玫瑰团子',desc:'玫红色线圈叠成小团子，橙色短鳍伸向四周。',colors:['#d81959','#ef9317'],kind:'round',rx:.42,ry:.46,rz:.31,body:['#c51c57','#de1c60'],fin:'#eb961f',lip:'#e96a49',pos:[.0,-2.12,.35],scale:.85,angle:.35},
 {name:'海草精灵',desc:'绿色圆脸，深绿耳朵一样的鱼鳍，一张小小的紫色嘴。',colors:['#169153','#184f3a','#9c64ba'],kind:'round',rx:.44,ry:.49,rz:.32,body:['#13905a','#1bb566','#159650'],fin:'#16573e',lip:'#9b64b4',pos:[2.20,-2.12,-.15],scale:.93,angle:-.12},
 {name:'樱花小扇',desc:'轻轻压扁的粉色鱼身，黑色尾鳍让温柔多一点俏皮。',colors:['#dea3ab','#262927'],kind:'fan',rx:.42,ry:.56,rz:.16,body:['#d99da4'],fin:'#303631',eye:'#fff8e8',pos:[-3.85,-1.64,-.6],scale:.71,angle:.40},
 {name:'橙蓝小箭',desc:'橙色与湖蓝一上一下，短短的尾巴，红红的小嘴。',colors:['#ed9b20','#319fc6','#df4a49'],kind:'long',rx:.60,ry:.28,rz:.23,body:['#218fb8','#49abce','#f0a324','#ec9714'],fin:'#69afd0',tail:'#65b3d4',pos:[3.9,-1.95,-.6],scale:.84,angle:-.18},
 {name:'琥珀小梭',desc:'细长的琥珀色鱼身，深青肚皮和奶油尾巴，轻快地穿过鱼群。',colors:['#c78424','#346c68','#eee0b9'],kind:'long',rx:.88,ry:.25,rz:.22,body:['#346c68','#ba6c29','#d59732'],fin:'#dfc17f',tail:'#eee0b9',pos:[-3.3,1.25,-1.0],scale:.76,speed:.90,angle:.12},
 {name:'葡萄小游侠',desc:'梅紫色长身体，蜜桃色腹部，薄荷绿的小鳍在水里轻轻摆动。',colors:['#745083','#e5ad9c','#94c7ac'],kind:'long',rx:.78,ry:.25,rz:.21,body:['#e5ad9c','#9467a3','#674479'],fin:'#94c7ac',tail:'#a3d3b7',pos:[2.8,1.25,1.0],scale:.73,speed:.84,angle:-.18},
 {name:'雾银泡泡',desc:'象牙白与鼠尾草绿绕成软软的小圆球，铜橙色短鳍慢悠悠地划水。',colors:['#e8e5d3','#91a991','#b8754d'],kind:'round',rx:.39,ry:.42,rz:.31,body:['#e8e5d3','#91a991','#e8e5d3'],fin:'#b8754d',lip:'#9e7061',pos:[-.2,1.25,-1.15],scale:.83,speed:.40,angle:.2},
 {name:'赤陶团团',desc:'圆滚滚的赤陶红小鱼，奶油黄鱼腹，深紫色鱼鳍像两片小叶子。',colors:['#bd644b','#e9cd91','#655170'],kind:'round',rx:.47,ry:.40,rz:.33,body:['#e9cd91','#bc624c','#cc755a'],fin:'#655170',lip:'#e3a88b',pos:[-3.5,-.95,.95],scale:.76,speed:.50,angle:-.1},
 {name:'孔雀小扇',desc:'孔雀青与珊瑚橙交叠，奶白色尾鳍托着一片小小的扇形身体。',colors:['#287e80','#dc8c74','#e7dfc6'],kind:'fan',rx:.49,ry:.56,rz:.17,body:['#dc8c74','#3a9591','#287e80'],fin:'#e7dfc6',eye:'#fbefd5',pos:[.8,-1.1,-1.05],scale:.76,speed:.62,angle:.2},
 {name:'姜饼小扇',desc:'姜黄色绒圈叠着灰青色鱼腹，短短的奶白尾巴让它看起来格外俏皮。',colors:['#c89c43','#8daba7','#f0e1bd'],kind:'fan',rx:.41,ry:.46,rz:.20,body:['#8daba7','#b58538','#d1a74e'],fin:'#f0e1bd',eye:'#fff4da',pos:[3.3,-1.0,.85],scale:.72,speed:.67,angle:-.15},
 {name:'斑点巡游鱼',desc:'宽厚的靛蓝色大鱼，奶白绒点缀满鱼背。它摆动大尾鳍，从小鱼身边缓缓游过。',colors:['#396999','#a8d1cf','#e5e5c9'],kind:'long',large:true,rx:1.65,ry:.72,rz:.65,body:['#b0d3cc','#528db0','#396999'],fin:'#689eb9',tail:'#5489ac',pos:[-4.4,.8,-2.8],scale:1.50,speed:.52,angle:.2},
 {name:'金色领航鱼',desc:'金色与奶油色交织的宽厚鱼身，舒展着大鱼鳍，在鱼群外侧悠然转弯。',colors:['#c49441','#e5ca86','#8da78e'],kind:'long',large:true,rx:1.45,ry:.65,rz:.57,body:['#e4d4a1','#d4b065','#b98a3b'],fin:'#92ac92',tail:'#b3c3a0',pos:[4.1,1.6,-2.4],scale:1.40,speed:.58,angle:-.2}
];
function buildFish(d,index){
  const g=new THREE.Group();g.userData={...d,index,fur:[],furColors:[],phase:random()*6.28};
  root.add(g);creatures.push(g);clickable.push(g);
  body(g,d.rx,d.ry,d.rz,d.body,d.large?10:d.kind==='fan'?9:d.kind==='round'?8:7);
  if(d.kind==='round'){
    frontEyes(g,'#fffbed',d.rx*.55,.11,.173,d.rz*.92);
    fin(g,[-d.rx+.025,.015,.01],-.32,.34,d.fin,-.2);
    fin(g,[d.rx-.01,-.03,.02],.32,.32,d.fin,.2);
    fin(g,[-.025,d.ry-.03,0],.23,.24,d.fin,1.52);
    mouth(g,.0,-.20,d.rz+.055,d.lip,d.name==='蓝莓嘟嘟'?.25:.19,.062,true);
  }else if(d.kind==='fan'){
    // Head is at the pinched right edge; a broad body fans toward the left.
    sideEyes(g,d.rx*.77,.04,d.rz+.025,{size:.163,tint:d.eye});
    tail(g,-d.rx-.04,-.04,d.fin,-.35,.39);
    if(d.name==='橘子扇'){fin(g,[.03,-.04,d.rz+.07],-.23,.17,d.fin,-.4);}
    mouth(g,d.rx+.09,-.12,.0,d.body[0],.055,.027);
  }else{
    sideEyes(g,-d.rx*.79,.075,d.rz*.88,{size:d.large?.205:d.kind==='whale'?.142:.164});
    tail(g,d.rx*.93,-.015,d.tail,d.large?.78:d.kind==='whale'?.48:.40,d.large?.60:.37);
    fin(g,[.08,d.ry-.01,0],d.large?.63:.36,d.large?.44:.25,d.fin,1.2);
    mouth(g,-d.rx-.075,-.115,0,d.kind==='whale'?'#9e6ab2':'#ed6063',.074,.028);
    if(d.kind==='whale'){
      for(const x of [-.40,.22]){
        const pts=[];for(let i=0;i<=24;i++){const a=-Math.PI*.16+i/24*Math.PI*1.35;pts.push(V(x,Math.cos(a)*d.ry*.95,Math.sin(a)*d.rz*1.05));}
        strand(g,pts,.045,'#eeeee6',{fur:.022,density:130});
      }
    }
  }
  if(d.large){
    for(const side of [-1,1])fin(g,[-.38,-.1,side*d.rz*.85],.80,.63,d.fin,side*.45);
    if(d.name==='斑点巡游鱼')for(let j=0;j<14;j++){
      const x=-1.02+(j%7)*.32,y=.20+Math.floor(j/7)*.22,z=d.rz*Math.sqrt(Math.max(.05,1-(x/d.rx)**2-(y/d.ry)**2));
      for(const side of [-1,1])mesh(g,new THREE.SphereGeometry(.068,10,7),material('#e6ead5'),V(x,y,side*(z+.015)),V(1,1,.65));
    }
  }
  // Consolidate the fibre layer. It keeps a soft silhouette even at close range.
  const furGeo=new THREE.BufferGeometry();furGeo.setAttribute('position',new THREE.Float32BufferAttribute(g.userData.fur,3));furGeo.setAttribute('color',new THREE.Float32BufferAttribute(g.userData.furColors,3));
  const fur=new THREE.LineSegments(furGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.58,depthWrite:false}));g.add(fur);
  delete g.userData.fur;delete g.userData.furColors;
  // Merge static core meshes by material without destroying individual fish selection.
  const batches=new Map();g.updateMatrixWorld(true);const inverse=g.matrixWorld.clone().invert();
  g.traverse(o=>{if(o.isMesh){if(!batches.has(o.material.uuid))batches.set(o.material.uuid,[]);batches.get(o.material.uuid).push(o);}});
  for(const objects of batches.values()){
    const pos=[],norm=[],uv=[],indices=[];let offset=0;
    for(const o of objects){const geo=o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));pos.push(...geo.attributes.position.array);norm.push(...geo.attributes.normal.array);uv.push(...geo.attributes.uv.array);for(const i of geo.index.array)indices.push(i+offset);offset+=geo.attributes.position.count;geo.dispose();o.geometry.dispose();o.removeFromParent();}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);mesh(g,geo,objects[0].material);
  }
  g.scale.setScalar(d.scale);g.rotation.y=d.angle;
  return g;
}
const swimShader=`
uniform float uBeat;
uniform float uPower;
uniform float uRadius;
uniform float uRound;
uniform float uTailSign;
uniform float uTouch;
uniform float uJoy;
vec3 swimDeform(vec3 p){
  p.y*=1.0+sin(uBeat*1.3)*.045*uJoy;
  p.z*=1.0+cos(uBeat*1.3)*.035*uJoy;
  p.y*=1.0-.055*uTouch; p.z*=1.0+.035*uTouch;
  if(uRound>.5){
    float fin=smoothstep(uRadius*.76,uRadius*1.52,abs(p.x));
    float stroke=sin(uBeat+p.x*2.2);
    p.z+=stroke*fin*.20*uPower;
    p.y+=cos(uBeat+p.x*2.2)*fin*.035*uPower;
    p.x*=1.0+sin(uBeat*.5)*.012*uPower;
  }else{
    float rear=smoothstep(-uRadius*.55,uRadius*1.5,p.x*uTailSign);
    float wave=sin(uBeat-p.x*uTailSign*3.5);
    p.z+=wave*(.008+.20*rear*rear)*uPower;
    p.y+=cos(uBeat-p.x*uTailSign*2.5)*rear*.018*uPower;
  }
  return p;
}`;
function addSwimmingSkin(g){
  const d=g.userData;
  d.uniforms={uBeat:{value:d.phase},uPower:{value:0},uRadius:{value:d.rx},uRound:{value:d.kind==='round'?1:0},uTailSign:{value:d.kind==='fan'?-1:1},uTouch:{value:0},uJoy:{value:0}};
  g.traverse(o=>{
    if(!o.isMesh&&!o.isLineSegments)return;
    o.material=o.material.clone();
    o.material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,d.uniforms);
      shader.vertexShader=swimShader+'\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=swimDeform(position);');
      if(o.isMesh)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`
        vec3 objectNormal=vec3(normal);
        vec3 axis=abs(objectNormal.y)<.95?vec3(0.,1.,0.):vec3(1.,0.,0.);
        vec3 t1=normalize(cross(objectNormal,axis));
        vec3 t2=cross(objectNormal,t1);
        vec3 p0=swimDeform(position);
        objectNormal=normalize(cross(swimDeform(position+t1*.002)-p0,swimDeform(position+t2*.002)-p0));
      `);
    };
    o.material.customProgramCacheKey=()=>o.isMesh?'swim-mesh-v1':'swim-fur-v1';
    o.geometry.computeBoundingSphere();o.geometry.boundingSphere.radius+=.3;
  });
  // Map each model's nose into a shared +Z-forward swimming frame.
  d.forward=d.kind==='round'?V(0,0,1):d.kind==='fan'?V(1,0,0):V(-1,0,0);
  d.alignment=new THREE.Quaternion().setFromUnitVectors(d.forward,V(0,0,1));
}
definitions.forEach(d=>{const g=buildFish(d,creatures.length);addSwimmingSkin(g);});
const habitat=createHabitat(scene,woolTexture);
const seafloorLife=createSeafloorLife(scene,woolTexture);
const swimSeed=crypto.getRandomValues(new Uint32Array(1))[0];
let swimBounds,layoutNarrow=null;
const up=V(0,1,0),orientationMatrix=new THREE.Matrix4(),bankQ=new THREE.Quaternion();
function orientFish(g,dt,snap=false){
  const swim=g.userData.swim,forward=V(swim.inspect?swim.direction*swim.heading.x*.8:swim.velocity.x,swim.velocity.y,swim.inspect?swim.direction*swim.heading.z*.8:swim.velocity.z).normalize();
  if(forward.lengthSq()<.01)return;
  if(g.userData.large){const horizontal=Math.hypot(forward.x,forward.z);forward.y=THREE.MathUtils.clamp(forward.y,-horizontal*.24,horizontal*.24);forward.normalize();}
  const right=new THREE.Vector3().crossVectors(Math.abs(forward.y)>.99?V(1,0,0):up,forward).normalize();
  const vertical=new THREE.Vector3().crossVectors(forward,right).normalize();
  orientationMatrix.makeBasis(right,vertical,forward);
  const q=new THREE.Quaternion().setFromRotationMatrix(orientationMatrix);
  const oldForward=g.userData.forward.clone().applyQuaternion(g.quaternion);
  const banking=THREE.MathUtils.clamp(new THREE.Vector3().crossVectors(oldForward,forward).y*.22,-.13,.13);
  bankQ.setFromAxisAngle(V(0,0,1),banking);
  q.multiply(bankQ).multiply(g.userData.alignment);
  if(snap)g.quaternion.copy(q);else g.quaternion.slerp(q,1-Math.exp(-dt*5));
}
function arrange(){
  const narrow=mobile();if(layoutNarrow===narrow)return;
  const oldBounds=swimBounds;layoutNarrow=narrow;
  swimBounds={x:6.25,minY:-2.35,maxY:3.25,minZ:-6.0,maxZ:6.0};
  habitat.resize(narrow);seafloorLife.resize(narrow);
  creatures.forEach((g,i)=>{
    g.scale.setScalar(definitions[i].scale*(narrow?(definitions[i].large?.69:.72):.88));
    if(!g.userData.swim){
      const columns=narrow?4:5,rows=Math.ceil(definitions.length/columns);
      const x=((i%columns+.22+random()*.56)/columns*2-1)*swimBounds.x*.95;
      const y=swimBounds.minY+(.18+(Math.floor(i/columns)+random()*.5)/rows*.75)*(swimBounds.maxY-swimBounds.minY);
      const z=swimBounds.minZ+(.15+random()*.7)*(swimBounds.maxZ-swimBounds.minZ);
      const pos=definitions[i].large?V(i%2?-swimBounds.x*.36:swimBounds.x*.20,i%2?2.0:.65,i%2?-.8:.85):V(x,y,z);
      g.userData.swim=createSwimmer(pos,i,g.userData.kind,swimSeed);
      if(definitions[i].speed)g.userData.swim.speed=definitions[i].speed*(definitions[i].large?1.15:1.20);
      g.userData.swim.large=Boolean(definitions[i].large);
      g.userData.swim.velocity={x:g.userData.swim.direction*g.userData.swim.speed,y:0,z:0};
      g.userData.swim.clearance=definitions[i].large?(narrow?1.22:1.65):(narrow?.50:.65);
    }else{
      const state=g.userData.swim;
      state.position.x*=swimBounds.x/oldBounds.x;
      state.position.y=swimBounds.minY+(state.position.y-oldBounds.minY)/(oldBounds.maxY-oldBounds.minY)*(swimBounds.maxY-swimBounds.minY);
      state.position.z=swimBounds.minZ+(state.position.z-oldBounds.minZ)/(oldBounds.maxZ-oldBounds.minZ)*(swimBounds.maxZ-swimBounds.minZ);state.laneY=state.position.y;state.laneZ=toLane(state,state.position).z;state.anchor=null;
    }
    g.userData.swim.radius=(g.userData.rx+.95)*g.scale.x;
    const p=g.userData.swim.position;g.position.set(p.x,p.y,p.z);orientFish(g,0,true);
  });
}
arrange();
// A sparse layer of drifting particles provides depth without hiding the fish.
const particleCount=80,particlePositions=new Float32Array(particleCount*3),particleSpeeds=[];
for(let i=0;i<particleCount;i++){particlePositions.set([(random()-.5)*65,(random()-.5)*16,(random()-.5)*65],i*3);particleSpeeds.push(.045+random()*.10);}
const particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
const particleMaterial=new THREE.PointsMaterial({color:'#ffffff',size:.030,transparent:true,opacity:.62,depthWrite:false});
const particles=new THREE.Points(particleGeometry,particleMaterial);scene.add(particles);
const fishPicker=createFishPicker({definitions,creatures,renderer,onSelect:g=>focusFish(g),reduced});
const fishSpeech=createFishSpeech({THREE,host,stage,status:document.querySelector('#interaction-status'),reduced});
const feedingNote=document.querySelector('#feeding-note');
const feedButton=document.querySelector('#feed-selected'),feedState=document.querySelector('#feed-state');
let feedButtonState='';
const feeding=createFishFeeding({THREE,scene,woolTexture,onEat:g=>{fishSpeech.show(g,'好喜欢这一口！送你一颗小爱心。');feedingNote.textContent=`${g.userData.name}吃到啦，开心地吐出爱心。`;needsRender=true;}});
const frustum=new THREE.Frustum(),viewProjection=new THREE.Matrix4(),fishSphere=new THREE.Sphere();
function updateWindowBounds(){
  camera.updateMatrixWorld();frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  if(selected)return;
  // Only future passes use the current horizontal viewing frame. Fish already
  // swimming retain their world-space paths when the viewer turns around.
  const forward=controls.target.clone().sub(camera.position);forward.y=0;forward.normalize();
  const right=new THREE.Vector3().crossVectors(forward,up).normalize();
  swimBounds.heading={x:right.x,z:right.z};
  const halfWidth=(camera.position.distanceTo(controls.target)+7)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect;
  swimBounds.left=-Math.max(swimBounds.x,halfWidth);swimBounds.right=Math.max(swimBounds.x,halfWidth);
  for(const g of creatures)g.userData.swim.passEdges??={left:swimBounds.left,right:swimBounds.right};
}
const contact=new THREE.Group();scene.add(contact);contact.visible=false;
for(let i=0;i<2;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.009,6,36),new THREE.MeshBasicMaterial({color:'#eae8be',transparent:true,opacity:0,depthWrite:false}));contact.add(ring);}
let contactAge=2,lastTouched=null,touchCount=0;
function touchFish(g,point){
  if(moving&&!reduced.matches)touchSwimmer(g.userData.swim,point);
  contact.position.copy(point);contact.quaternion.copy(camera.quaternion);contactAge=reduced.matches?2:0;contact.visible=!reduced.matches;lastTouched=g.userData.name;touchCount++;
  fishSpeech.show(g);needsRender=true;
}
let selected=null,moving=!reduced.matches,tween=null,time=0,motionBlend=0,previous=performance.now(),needsRender=true,running=false,lost=false,inView=true;
function setView(position,target){if(reduced.matches){camera.position.copy(position);controls.target.copy(target);tween=null;}else tween={position,target};needsRender=true;}
function syncInfo(){const d=selected?.userData;document.querySelector('#fish-count').textContent=d?`${String(d.index+1).padStart(2,'0')} / ${definitions.length} · ${d.large?'大型游鱼':d.kind==='round'?'圆脸小鱼':d.kind==='fan'?'扇形小鱼':'长身小鱼'}`:`${definitions.length} 种模样 · 一片海`;document.querySelector('#school-count').textContent=`${definitions.length} 条游鱼 · 3 只小蟹`;document.querySelector('#name').textContent=d?d.name:'绒绒浅海';document.querySelector('#description').textContent=d?d.desc:'在珊瑚与海草之间，遇见柔软的海洋居民。';document.querySelector('#swatches').replaceChildren();if(d)for(const color of d.colors){const dot=document.createElement('i');dot.style.background=color;document.querySelector('#swatches').appendChild(dot);}fishPicker.sync(selected);syncFeedButton();}
function overview(){
  feeding.clear();
  fishSpeech.clear();
  if(selected){selected.userData.swim.inspect=false;selected.userData.swim.anchor=null;}
  selected=null;feedingNote.textContent='轻点海水喂一口，收下一颗小爱心。';stage.dataset.view='overview';habitat.setDetail(false);root.children.forEach(c=>c.visible=c.userData.swim.mode==='crossing');particles.visible=true;
  const center=mobile()?V(0,-.15,0):V(0,-.20,0);
  const distance=mobile()?Math.max(14.2,7.3/(2*Math.tan(THREE.MathUtils.degToRad(17))*camera.aspect)):Math.max(14.8,15.2/(2*Math.tan(THREE.MathUtils.degToRad(17))*camera.aspect));
  setView(center.clone().add(V(.15,1.15,distance)),center);syncInfo();
}
function focusFish(g){
  feeding.clear();
  fishSpeech.clear();
  if(selected&&selected!==g){selected.userData.swim.inspect=false;selected.userData.swim.anchor=null;}
  const swim=g.userData.swim;
  if(swim.mode==='waiting'||!g.visible){swim.mode='crossing';swim.position={x:0,y:.7,z:0};swim.laneY=.7;swim.laneZ=0;g.position.set(0,.7,0);}
  swim.inspect=true;swim.anchor={...swim.position};swim.velocity={x:0,y:0,z:0};
  selected=g;feedingNote.textContent='点「喂它一口」，或轻点海水投喂。';stage.dataset.view='detail';habitat.setDetail(true);root.children.forEach(c=>c.visible=c===g);particles.visible=true;
  // Track the fish instead of pinning it in place. A generous spherical fit allows it to turn.
  const extent=(g.userData.kind==='round'?1.6:2*g.userData.rx+.6)*g.scale.x;
  const tangent=Math.tan(THREE.MathUtils.degToRad(17));
  const distance=Math.max(3.6,extent/(2*tangent*Math.min(1,camera.aspect))*(g.userData.large?1.43:1.25));
  const target=g.position.clone(),offset=V(.1,.1,distance).applyQuaternion(g.quaternion);
  const position=target.clone().add(offset);position.y=Math.max(-2.6,position.y);
  setView(position,target);syncInfo();
}
function cycle(dir){const current=selected?creatures.indexOf(selected):(dir>0?-1:0);focusFish(creatures[(current+dir+creatures.length)%creatures.length]);}
document.querySelector('#previous-fish').onclick=()=>cycle(-1);document.querySelector('#next-fish').onclick=()=>cycle(1);document.querySelector('#reset').onclick=overview;
const motion=document.querySelector('#motion');function label(){motion.textContent=moving?'暂停':'播放';motion.setAttribute('aria-pressed',String(moving));syncFeedButton();}label();motion.onclick=()=>{moving=!moving;if(moving)motionBlend=0;label();needsRender=true;};reduced.addEventListener('change',()=>{feeding.clear();moving=!reduced.matches;motionBlend=0;label();needsRender=true;});
controls.addEventListener('start',()=>{tween=null;});controls.addEventListener('change',()=>needsRender=true);
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),tap=createTapGesture();
const feedPlane=new THREE.Plane(),feedPoint=V(),projectedFish=V(),viewNormal=V();
function syncFeedButton(now=performance.now()){
  const unavailable=lost||!selected?.visible||selected.userData.swim.mode!=='crossing';
  const paused=!moving&&!reduced.matches;
  const state=unavailable?'unavailable':paused?'paused':feeding.canFeed(selected,now)?'ready':'cooldown';
  const key=`${selected?.userData.name}:${state}`;
  if(key===feedButtonState)return;
  feedButtonState=key;
  const labels={ready:'喂它一口',cooldown:'稍等一下',paused:'先点播放',unavailable:'暂不能投喂'};
  feedButton.textContent=labels[state];
  feedButton.setAttribute('aria-disabled',String(state!=='ready'));
  feedButton.setAttribute('aria-label',state==='ready'?`喂它一口，给${selected.userData.name}一颗点心`:labels[state]);
  feedState.textContent=state==='paused'?'小鱼在休息，点播放后可以投喂。':state==='cooldown'?'点心正在准备，很快可以再喂。':state==='ready'?'可以投喂这条小鱼。':'选中一条小鱼后可以投喂。';
}
function offerFood(target,point){
  if(lost||!target)return false;
  if(!moving&&!reduced.matches){
    feedingNote.textContent='小鱼在休息，点「播放」后再喂一口。';
    fishSpeech.show(target,'先点「播放」，我就来吃点心。');
    return false;
  }
  const accepted=feeding.feed(target,point,{instant:reduced.matches});
  if(accepted){
    if(!reduced.matches)feedingNote.textContent=`给${target.userData.name}的一颗毛线点心…`;
    needsRender=true;
  }
  syncFeedButton();
  return accepted;
}
// A native button keeps Enter/Space and touch on the same feeding path as water taps.
feedButton.addEventListener('click',()=>{
  if(!selected||feedButton.getAttribute('aria-disabled')==='true')return;
  selected.updateWorldMatrix(true,false);
  const point=selected.localToWorld(selected.userData.mouthPoint.clone());
  point.add(V(.15,.6,.45).applyQuaternion(camera.quaternion));
  offerFood(selected,point);
});
function feedAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(clickable.filter(g=>g.visible),true).filter(h=>h.object.isMesh);
  let target=null;
  if(hits.length){
    let g=hits[0].object;while(g.parent&&!g.userData.name)g=g.parent;
    if(g.userData.name){target=g;touchFish(g,hits[0].point);}
  }
  // Empty water feeds the nearest fish currently on screen, even after orbiting.
  if(!target){
    let nearest=Infinity;
    for(const g of creatures){
      if(!g.visible||g.userData.swim.mode!=='crossing')continue;
      projectedFish.copy(g.position).project(camera);
      if(Math.abs(projectedFish.x)>1||Math.abs(projectedFish.y)>1||Math.abs(projectedFish.z)>1)continue;
      const distance=((projectedFish.x-pointer.x)*rect.width)**2+((projectedFish.y-pointer.y)*rect.height)**2;
      if(distance<nearest){nearest=distance;target=g;}
    }
  }
  if(!target){feedingNote.textContent='等小鱼游近一点，再喂一口吧。';return;}
  camera.getWorldDirection(viewNormal);
  feedPlane.setFromNormalAndCoplanarPoint(viewNormal,target.position);
  if(!ray.ray.intersectPlane(feedPlane,feedPoint))return;
  offerFood(target,feedPoint);
}
renderer.domElement.addEventListener('pointerdown',e=>tap.down(e,performance.now()));
renderer.domElement.addEventListener('pointermove',e=>tap.move(e));
renderer.domElement.addEventListener('pointerup',e=>{if(tap.up(e,performance.now()))feedAtPointer(e);});
renderer.domElement.addEventListener('pointercancel',e=>tap.cancel(e));
renderer.domElement.addEventListener('lostpointercapture',e=>tap.cancel(e));
renderer.domElement.addEventListener('wheel',()=>tap.reset(),{passive:true});
window.addEventListener('blur',()=>tap.reset());
document.addEventListener('visibilitychange',()=>{if(document.hidden)tap.reset();});
host.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','Escape'].includes(e.key)){e.preventDefault();if(e.key==='Home'||e.key==='Escape')overview();else cycle(e.key==='ArrowRight'?1:-1);}});
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);arrange();if(selected)focusFish(selected);else overview();needsRender=true;}).observe(host);
let diagnosticAt=0;
function animate(now){
  // A newly started RAF loop can receive a timestamp older than performance.now().
  // Never feed a negative step into the easing or steering integrator.
  const dt=Math.max(0,Math.min((now-previous)/1000,.05));previous=now;
  updateWindowBounds();
  for(const g of creatures){fishSphere.center.copy(g.position);fishSphere.radius=g.userData.swim.radius;g.userData.swim.canRecycle=!!selected||!frustum.intersectsSphere(fishSphere);}
  if(moving){
    motionBlend+=(1-motionBlend)*(1-Math.exp(-dt*5));
    const step=dt*motionBlend;time+=step;habitat.update(time);seafloorLife.update(time);
    const before=selected?.position.clone();
    stepSchool(creatures.map(g=>g.userData.swim),step,time,swimBounds);
    for(const g of creatures){
      const state=g.userData.swim;g.position.set(state.position.x,state.position.y,state.position.z);
      g.visible=selected?g===selected:state.mode==='crossing';
      const freshPass=g.userData.renderedPass!==state.passes;orientFish(g,step,freshPass);g.userData.renderedPass=state.passes;
      g.userData.uniforms.uBeat.value=state.beat;
      g.userData.uniforms.uPower.value=(state.inspect?.5+state.reaction*.8:state.power+state.reaction*.5)+(g.userData.feedingJoy||0)*.75;
      g.userData.uniforms.uTouch.value=state.reaction;
    }
    if(selected&&before){
      const delta=selected.position.clone().sub(before);camera.position.add(delta);controls.target.add(delta);
      if(tween){tween.position.add(delta);tween.target.add(delta);}
    }
    for(let i=0;i<particleCount;i++){particlePositions[i*3+1]+=step*particleSpeeds[i];if(particlePositions[i*3+1]>5)particlePositions[i*3+1]=-5;}
    particleGeometry.attributes.position.needsUpdate=true;
  }
  if(contactAge<1){if(moving)contactAge+=dt;contact.visible=contactAge<1;contact.children.forEach((ring,i)=>{const age=Math.max(0,contactAge-i*.10);ring.scale.setScalar(1+age*3.5);ring.material.opacity=Math.max(0,(1-age)*.62);});needsRender=needsRender||moving;}
  if(tween){
    const s=1-Math.exp(-6*dt);camera.position.lerp(tween.position,s);controls.target.lerp(tween.target,s);needsRender=true;
    if(camera.position.distanceTo(tween.position)<.005){camera.position.copy(tween.position);controls.target.copy(tween.target);tween=null;}
  }
  controls.update();
  needsRender=feeding.update(dt,{now,moving,reduced:reduced.matches})||needsRender;
  syncFeedButton(now);
  for(const g of creatures)g.userData.uniforms.uJoy.value=g.userData.feedingJoy||0;
  fishSpeech.update(camera,now);if(moving||needsRender){renderer.render(scene,camera);needsRender=false;}
  // Local verification data only; no telemetry or diagnostics UI is shipped to visitors.
  if((location.hostname==='localhost'||location.hostname==='127.0.0.1')&&now-diagnosticAt>250){
    diagnosticAt=now;renderer.domElement.dataset.swim=JSON.stringify({time,dt,motionBlend,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,habitat:true,seafloor:seafloorLife.counts,coverage:habitat.coverage,camera:camera.position.toArray(),azimuth:controls.getAzimuthalAngle(),polar:controls.getPolarAngle(),crabPositions:seafloorLife.positions(),bounds:swimBounds,moving,touchCount,lastTouched,selected:selected?.userData.name||null,fish:creatures.map(g=>({name:g.userData.name,mode:g.userData.swim.mode,visible:g.visible,direction:g.userData.swim.direction,heading:g.userData.swim.heading,entries:g.userData.swim.entries,exits:g.userData.swim.exits,wait:g.userData.swim.wait,reaction:g.userData.swim.reaction,screen:(()=>{const p=g.position.clone().project(camera);return[(p.x+1)*host.clientWidth/2,(1-p.y)*host.clientHeight/2,p.z];})(),large:!!g.userData.large,scale:g.scale.x,position:g.position.toArray(),forward:g.userData.forward.clone().applyQuaternion(g.quaternion).toArray(),velocity:Object.values(g.userData.swim.velocity),beat:g.userData.uniforms.uBeat.value,distance:g.userData.swim.distance}))});
  }
}
function updateLoop(){const active=inView&&!document.hidden&&!lost;if(active!==running){running=active;previous=performance.now();needsRender=true;renderer.setAnimationLoop(active?animate:null);stage.dataset.rendering=active?'active':'paused';}}
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;updateLoop();}).observe(stage);document.addEventListener('visibilitychange',updateLoop);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();tap.reset();feeding.clear();lost=true;syncFeedButton();updateLoop();fail('Graphics context lost');});
renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;hideSceneFallback();syncFeedButton();needsRender=true;updateLoop();});
overview();if(tween){camera.position.copy(tween.position);controls.target.copy(tween.target);tween=null;}controls.update();renderer.render(scene,camera);document.querySelector('#loading')?.remove();document.querySelectorAll('.scene-controls button,.creature-nav button,.fish-picker button').forEach(b=>b.disabled=false);stage.dataset.ready='true';feedButton.disabled=false;hideSceneFallback();syncFeedButton();updateLoop();
window.addEventListener('pagehide',e=>{if(!e.persisted)feeding.dispose();});
if(location.hostname==='localhost'||location.hostname==='127.0.0.1')window.__ocean={renderer,scene,camera,creatures,controls,feeding,getState:()=>({selected:selected?.userData.name,moving,running,feeding:feeding.getState(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles})};
}catch(error){fail(error);}
