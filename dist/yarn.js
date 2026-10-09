import * as THREE from 'three';

// Raised yarn, not a smooth shape with a noise map: each cord has a soft fibre edge.
export function createYarnTools(texture,{compact=false,clock=null}={}){
  const palette=new Map();let seed=9821;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function sway(material){if(!clock)return;material.onBeforeCompile=s=>{s.uniforms.uYarnTime=clock;s.vertexShader='uniform float uYarnTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=vec3(position);float h=max(0.,position.y+3.65);transformed.x+=sin(uYarnTime*.62+position.x*.9+position.z)*h*h*.027;transformed.z+=cos(uYarnTime*.44+position.x)*h*.025;`);};material.customProgramCacheKey=()=> 'yarn-reef-sway-v2';}
  function material(color,moving=false){const key=color+moving;if(!palette.has(key)){const m=new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,map:texture,bumpMap:texture,bumpScale:.045});if(moving)sway(m);palette.set(key,m);}return palette.get(key);}
  function cord(parent,points,r,color,{closed=false,moving=false,density=90,fur=.045}={}){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?new THREE.Vector3(...p):p),closed,'centripetal');
    const length=curve.getLength(),geo=new THREE.TubeGeometry(curve,Math.max(10,Math.ceil(length*19)),r,7,closed);
    const mesh=new THREE.Mesh(geo,material(color,moving));parent.add(mesh);
    const key=moving?'movingYarn':'stillYarn';const fibers=parent.userData[key]??={positions:[],colors:[]};
    const base=new THREE.Color(color),count=Math.ceil(length*density*(compact?.65:1));
    for(let i=0;i<count;i++){
      const t=rand(),p=curve.getPointAt(t),tangent=curve.getTangentAt(t),n=new THREE.Vector3().crossVectors(tangent,Math.abs(tangent.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize(),b=new THREE.Vector3().crossVectors(tangent,n),a=rand()*Math.PI*2;
      const direction=n.multiplyScalar(Math.cos(a)).addScaledVector(b,Math.sin(a));
      const start=p.clone().addScaledVector(direction,r*.88),end=p.clone().addScaledVector(direction,r+fur*(.35+rand()*.65)).addScaledVector(tangent,(rand()-.5)*fur);
      fibers.positions.push(...start.toArray(),...end.toArray());const c=base.clone().multiplyScalar(1.1+rand()*.45);fibers.colors.push(c.r,c.g,c.b,c.r,c.g,c.b);
    }
    return mesh;
  }
  function coil(parent,center,radii,color,{rows=8,r=.045,moving=false}={}){
    for(let j=0;j<rows;j++){const t=(j+.5)/rows*2-1,section=Math.sqrt(1-t*t);const points=Array.from({length:32},(_,i)=>{const a=i/32*Math.PI*2;return[center[0]+Math.cos(a)*radii[0]*section,center[1]+t*radii[1]+.009*Math.sin(a*3+j),center[2]+Math.sin(a)*radii[2]*section];});cord(parent,points,r,color,{closed:true,moving});}
  }
  function finish(parent){
    for(const child of [...parent.children])if(child.isGroup)finish(child);
    const batches=new Map();for(const m of [...parent.children]){if(!m.isMesh)continue;if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(m);}
    for(const [mat,list]of batches){const p=[],n=[],uv=[],idx=[];let offset=0;for(const m of list){m.updateMatrix();const geo=m.geometry.clone().applyMatrix4(m.matrix);for(const x of geo.attributes.position.array)p.push(x);for(const x of geo.attributes.normal.array)n.push(x);for(const x of geo.attributes.uv.array)uv.push(x);if(geo.index)for(const i of geo.index.array)idx.push(i+offset);else for(let i=0;i<geo.attributes.position.count;i++)idx.push(i+offset);offset+=geo.attributes.position.count;geo.dispose();m.geometry.dispose();parent.remove(m);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeBoundingSphere();geo.boundingSphere.radius+=.8;parent.add(new THREE.Mesh(geo,mat));}
    for(const key of ['stillYarn','movingYarn']){const f=parent.userData[key];if(!f?.positions.length)continue;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(f.positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(f.colors,3));const mat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.7,depthWrite:false});if(key==='movingYarn')sway(mat);geo.computeBoundingSphere();geo.boundingSphere.radius+=.8;parent.add(new THREE.LineSegments(geo,mat));delete parent.userData[key];}
  }
  return{cord,coil,material,finish};
}

// A repeatable stockinette swatch for the distant fabric sea and floor.
export function knitTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#8d9290';c.fillRect(0,0,256,256);c.lineCap='round';
  for(let row=-1;row<9;row++)for(let col=-1;col<9;col++){
    const x=col*32+16,y=row*32;
    for(const side of [-1,1]){c.beginPath();c.moveTo(x+side*11,y+3);c.bezierCurveTo(x+side*14,y+15,x+side*4,y+22,x,y+30);c.strokeStyle='#646e6b';c.lineWidth=11;c.stroke();c.strokeStyle='#d6d8ce';c.lineWidth=7;c.stroke();c.strokeStyle='#eef0e5';c.lineWidth=1.5;c.stroke();}
  }
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}
