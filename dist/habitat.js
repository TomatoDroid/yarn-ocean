import * as THREE from 'three';
import {createYarnTools,knitTexture} from './yarn.js?v=20261005-surround';

// A small handmade reef: geometry, textile textures and light, all generated locally.
export function createHabitat(scene,woolTexture){
  let reef=new THREE.Group();reef.name='手作海底';scene.add(reef);const centerReef=reef;
  let seed=812;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const clock={value:0},yarn=createYarnTools(woolTexture,{compact:innerWidth<700,clock});
  const cloth=(color,sway=false)=>yarn.material(color,sway);
  function add(geometry,mat,pos,scale){const m=new THREE.Mesh(geometry,mat);if(pos)m.position.set(...pos);if(scale)m.scale.set(...scale);reef.add(m);return m;}
  const ground=(x,z)=>-3.65+.08*Math.sin(x*.75+z*.4)+.05*Math.cos(z*1.3);
  const sand=knitTexture();sand.repeat.set(120,120);
  // A continuous seabed extends beyond the orbit and fades into water fog.
  const floorGeo=new THREE.PlaneGeometry(180,180,120,120);floorGeo.rotateX(-Math.PI/2);
  const p=floorGeo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,ground(p.getX(i),p.getZ(i)));floorGeo.computeVertexNormals();
  const floorMat=new THREE.MeshStandardMaterial({color:'#ccb992',map:sand,bumpMap:sand,bumpScale:.12,roughness:1});
  const floor=new THREE.Mesh(floorGeo,floorMat);floor.name='环绕针织海床';scene.add(floor);
  // An inward-facing fabric sphere has no back or exposed rectangular edge.
  const backdropMap=knitTexture();backdropMap.repeat.set(64,32);
  const backdrop=new THREE.Mesh(new THREE.SphereGeometry(64,64,32),new THREE.MeshBasicMaterial({color:'#4a9daa',map:backdropMap,side:THREE.BackSide,transparent:true,opacity:.16,depthWrite:false,fog:false}));backdrop.name='360度绒线海水';scene.add(backdrop);
  function tube(points,r,color,sway=false,options={}){return yarn.cord(reef,points,r,color,{moving:sway,...options});}
  for(let row=0;row<14;row++)for(let col=0;col<32;col++){
    const x=-7.15+col*.46+(row%2)*.04,z=-1.9+row*.46;
    for(const side of [-1,1]){const points=[[x+side*.16,ground(x,z)+.025,z],[x+side*.14,ground(x,z)+.072,z+.14],[x+side*.025,ground(x,z)+.045,z+.35]];tube(points,.022,row%3===0?'#d6c59b':'#b9ad89',false,{density:12,fur:.018});}
  }
  const currents=new THREE.Group();reef.add(currents);
  for(let j=0;j<7;j++)yarn.cord(currents,Array.from({length:100},(_,i)=>{const a=i/100*Math.PI*2;return[Math.sin(a)*43,-2+j*2.2+Math.sin(a*5+j)*.4,Math.cos(a)*43];}),.075,'#367d8d',{closed:true,density:0});
  function rock(x,z,size,color){
    // Soft skeins replace hard faceted rock surfaces.
    const y=ground(x,z)+size*.25;
    add(new THREE.SphereGeometry(1,18,12),cloth(color),[x,y,z],[size*.88,size*.40,size*.66]);
    yarn.coil(reef,[x,y,z],[size,size*.45,size*.73],color,{rows:12,r:size*.042});
    for(let j=0;j<5;j++){const px=x+(j-2)*size*.28;const pts=Array.from({length:19},(_,i)=>{const a=.18+i/18*Math.PI*.82;return[px+.02*Math.sin(a*4),y+Math.sin(a)*size*.45,z+Math.cos(a)*size*.70];});tube(pts,.025,'#88aaa1',false,{density:30});}
  }
  [[-6,1.1,1.5,'#577f7c'],[5.8,.8,1.5,'#537e90'],[-4.2,-3.1,1.1,'#598e8e'],[3.8,-3.2,1.3,'#447d81'],[-7,-5,1.8,'#427d87'],[7,-5,2,'#48798b'],[-1.6,-5,1.15,'#5f9492']].forEach(r=>rock(...r));
  function kelp(x,z,height,color){
    const y=-3.61;const lean=(rand()-.5)*.85;
    const pts=Array.from({length:8},(_,i)=>{const t=i/7;return[x+Math.sin(t*5)*.18+lean*t,y+height*t,z+Math.sin(t*3)*.12];});
    tube(pts,.055,color,true);
    // Every leaf is a filled stack of crochet loops, edged with loose fibres.
    for(let j=1;j<7;j++){
      const t=j/7,side=j%2?1:-1,bx=x+Math.sin(t*5)*.18+lean*t,by=y+height*t;
      for(let k=0;k<4;k++){
        const w=.23-k*.045,h=.55-k*.05;
        const pts=Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2,u=(1-Math.cos(a))*.5;return[bx+side*(u*.38+Math.sin(a)*w),by+u*h,z+Math.sin(a)*.055];});
        tube(pts,.035,k===3?'#9ccda1':color,true,{closed:true,density:125,fur:.05});
      }
    }
  }

  for(const [x,z,h,c]of [[-6.4,-.1,3.8,'#578f80'],[-5.7,-.8,3.1,'#6b9c89'],[-7.2,-2.8,4.6,'#377d79'],[-4.8,-4,2.8,'#4a9286'],[5.7,-.5,3.7,'#669f8c'],[6.8,-2,4.7,'#3d817e'],[4.7,-3.3,3.1,'#4c8d83'],[7.6,.4,3.1,'#81a58c']])kelp(x,z,h,c);
  function coral(x,z,size,color){
    const base=-3.57;
    for(let i=0;i<5;i++){const a=(i/4-.5)*1.5,dx=Math.sin(a)*size*.65,h=size*(.65+rand()*.45);
      tube([[x,base,z],[x+dx*.3,base+h*.4,z+.03],[x+dx,base+h*.85,z-.08],[x+dx*1.12,base+h,z]],.095,color,true);
      const bx=x+dx*.68,by=base+h*.6;
      tube([[bx,by,z],[bx+(i%2?1:-1)*.23*size,by+.12*size,z+.06],[bx+(i%2?1:-1)*.27*size,by+.35*size,z+.08]],.067,color,true);
    }
  }
  coral(-4.6,1.0,1.3,'#c58e82');coral(4.8,1.1,1.45,'#c99c78');coral(-3.0,-3.2,.85,'#b8b18b');coral(3.25,-2.4,.9,'#aa889e');
  // Soft coiled anemones and a pair of small starfish anchor the foreground.
  for(const [x,z,c]of [[-5.7,2.4,'#c6ab89'],[5.7,2.2,'#9c9bba']])for(let j=0;j<5;j++){const px=x+(j-2)*.2;const pts=Array.from({length:35},(_,i)=>{const t=i/34,a=t*Math.PI*6;return[px+Math.cos(a)*.13*(1-t*.6),-3.52+t*(.4+j*.06),z+Math.sin(a)*.13];});tube(pts,.055,c,true);}
  for(const [x,z,c]of [[-2.8,2.8,'#c79771'],[3.25,2.4,'#bd8e7d']]){for(let j=0;j<5;j++){const a=j*Math.PI*.4;tube([[x,-3.47,z],[x+Math.cos(a)*.23,-3.45,z+Math.sin(a)*.23],[x+Math.cos(a)*.45,-3.54,z+Math.sin(a)*.45]],.09,c);}}
  for(let i=0;i<34;i++){const x=(rand()-.5)*16,z=(rand()-.5)*10;add(new THREE.SphereGeometry(1,8,5),cloth(i%2?'#96aaa0':'#b9b89a'),[x,-3.55,z],[.08+rand()*.12,.045+rand()*.035,.08+rand()*.12]);}
  // Both the raised cords and their fibres receive the same sway deformation.
  yarn.finish(reef);
  // Shared reef clusters surround the camera orbit. Geometry is instanced rather
  // than rebuilding the heavy yarn fibres for every direction.
  reef=new THREE.Group();
  rock(-1.1,0,1.6,'#537e90');rock(1.3,-.7,1.15,'#598e8e');
  kelp(-1.5,-.4,3.5,'#578f80');kelp(.9,-1,4.3,'#377d79');
  coral(.2,.4,1.2,'#c58e82');yarn.finish(reef);
  const placements=[];
  for(let ring=0;ring<2;ring++)for(let i=0;i<10;i++){
    const a=(i+.23+ring*.5)/10*Math.PI*2,r=ring?30:13.5;
    placements.push({x:Math.sin(a)*r,z:Math.cos(a)*r,a,scale:ring?1.15:.80+rand()*.3});
  }
  const transform=new THREE.Object3D();
  for(const part of reef.children){
    if(part.isMesh){const batch=new THREE.InstancedMesh(part.geometry,part.material,placements.length);
      placements.forEach((q,i)=>{transform.position.set(q.x,3.65*(q.scale-1),q.z);transform.rotation.set(0,q.a,0);transform.scale.setScalar(q.scale);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);});batch.computeBoundingSphere();batch.boundingSphere.radius+=2;scene.add(batch);
    }else if(part.isLineSegments){
      // Fibres are most visible in the near ring. Distant silhouettes use cords.
      for(const q of placements.slice(0,10)){const copy=new THREE.LineSegments(part.geometry,part.material);copy.position.set(q.x,3.65*(q.scale-1),q.z);copy.rotation.y=q.a;copy.scale.setScalar(q.scale);scene.add(copy);}
    }
  }
  reef=centerReef;
  // Diffuse shafts of light distributed around the whole water volume.
  const beams=new THREE.Group();scene.add(beams);
  for(let i=0;i<10;i++){const geo=new THREE.PlaneGeometry(2.6+(i%4)*.35,18);const mat=new THREE.ShaderMaterial({uniforms:{uTime:clock,uPhase:{value:i*1.7}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float uTime;uniform float uPhase;void main(){float edge=pow(sin(vUv.x*3.14159),3.);float fade=sin(vUv.y*3.14159);float pulse=.82+.18*sin(uTime*.23+uPhase);gl_FragColor=vec4(.55,.92,.90,edge*fade*.045*pulse);}',transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});const beam=new THREE.Mesh(geo,mat);const a=i/10*Math.PI*2;beam.position.set(Math.sin(a)*24,3,Math.cos(a)*24);beam.rotation.set(0,a,-.21);beams.add(beam);}
  // Bubbles use a ring sprite rather than opaque dots.
  const sprite=document.createElement('canvas');sprite.width=sprite.height=64;const b=sprite.getContext('2d');const glow=b.createRadialGradient(32,32,20,32,32,31);glow.addColorStop(0,'rgba(195,243,235,0)');glow.addColorStop(.68,'rgba(195,243,235,.05)');glow.addColorStop(.88,'rgba(211,253,247,.55)');glow.addColorStop(1,'rgba(211,253,247,0)');b.fillStyle=glow;b.fillRect(0,0,64,64);b.fillStyle='rgba(255,255,255,.7)';b.beginPath();b.ellipse(22,19,3,5,.6,0,Math.PI*2);b.fill();
  const count=28,coords=new Float32Array(count*3),bubbleSeeds=[];for(let i=0;i<count;i++)bubbleSeeds.push({x:Math.sin(i/count*Math.PI*2)*(5+rand()*20),z:Math.cos(i/count*Math.PI*2)*(5+rand()*20),phase:rand()*8,speed:.28+rand()*.23});const bubblesGeo=new THREE.BufferGeometry();bubblesGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));const bubbles=new THREE.Points(bubblesGeo,new THREE.PointsMaterial({map:new THREE.CanvasTexture(sprite),size:.13,transparent:true,opacity:.60,depthWrite:false}));scene.add(bubbles);
  function resize(){}
  function update(time){clock.value=time;for(let i=0;i<count;i++){const s=bubbleSeeds[i];coords[i*3]=s.x+Math.sin(time*.6+s.phase)*.13;coords[i*3+1]=-3.4+(s.phase+time*s.speed)%8;coords[i*3+2]=s.z;}bubblesGeo.attributes.position.needsUpdate=true;}
  update(0);return{resize,update,setDetail(){},coverage:{radius:64,floorWidth:180,reefClusters:placements.length+1}};
}
