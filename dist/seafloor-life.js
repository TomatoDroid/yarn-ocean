import * as THREE from 'three';
import {createYarnTools} from './yarn.js?v=20261005-surround';

export function createSeafloorLife(scene,texture){
  const shells=[],crabs=[],yarn=createYarnTools(texture,{compact:innerWidth<700});
  const ground=(x,z)=>-3.65+.08*Math.sin(x*.75+z*.4)+.05*Math.cos(z*1.3);
  function ball(g,color,pos,scale){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),yarn.material(color));m.position.set(...pos);m.scale.set(...scale);g.add(m);return m;}
  function rope(g,points,color,r=.04){return yarn.cord(g,points,r,color,{fur:.028,density:120});}
  function shell(x,z,size,color,edge,angle){
    const g=new THREE.Group();
    const surface=(r,a)=>[Math.sin(a)*r*.68,r*.42+Math.sin(r*Math.PI)*.14,-Math.cos(a)*r*.70];
    // Crochet fan: every visible part of the shell is a thick scalloped yarn row.
    for(let row=1;row<=13;row++){
      const r=row/13;const pts=Array.from({length:45},(_,j)=>{const a=-1.32+j/44*2.64,p=surface(r,a);p[1]+=.018*Math.cos(a*13+row*Math.PI);return p;});
      rope(g,pts,row%4===0?edge:color,.036);
    }
    for(let j=0;j<11;j++){
      const a=-1.25+j/10*2.5;
      rope(g,Array.from({length:10},(_,i)=>{const p=surface(.15+i/9*.84,a);p[1]+=.035;return p;}),edge,.022);
    }
    rope(g,Array.from({length:45},(_,j)=>{const a=-1.32+j/44*2.64,p=surface(1,a);p[1]+=.035*Math.sin(j*Math.PI*.5);return p;}),edge,.046);
    yarn.coil(g,[0,.08,-.07],[.16,.07,.12],edge,{rows:4,r:.035});
    yarn.finish(g);g.rotation.y=angle;g.userData={homeX:x,homeZ:z,size};scene.add(g);shells.push(g);
  }
  [[-3.45,.65,1.35,'#db817e','#f2c3a2',.25],[2.45,.65,1.32,'#a58ac5','#e1c2e1',-.25],[.15,2.5,1.45,'#e0b25e','#ffe0a0',.10],[-1.6,2.4,1.05,'#d9859c','#f6bac7',.3],[4.45,2,1.18,'#caae64','#f4dfa4',-.3],[-4.55,2.5,1.16,'#b888ae','#e8bad8',.3],[1.05,-.6,.92,'#84b9b1','#d3e7c9',-.5]].forEach(d=>shell(...d));
  // Repeat the existing crochet pieces around the reef with shared geometry.
  for(let i=0;i<14;i++){const source=shells[i%7],g=source.clone(),a=i/14*Math.PI*2,r=7.2+(i%3)*1.3;g.rotation.y=-a;g.userData={homeX:Math.sin(a)*r,homeZ:Math.cos(a)*r,size:.95+(i%3)*.16};scene.add(g);shells.push(g);}
  function crab(x,z,color,accent,phase,size){
    const g=new THREE.Group(),body=new THREE.Group();g.add(body);
    ball(body,color,[0,.22,0],[.40,.20,.30]);ball(body,accent,[0,.10,.055],[.33,.08,.24]);
    yarn.coil(body,[0,.23,0],[.42,.23,.32],color,{rows:9,r:.044});
    for(let j=0;j<3;j++)rope(body,Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return[Math.cos(a)*(.29-j*.085),.415+j*.023,Math.sin(a)*(.21-j*.055)];}),accent,.03);
    for(const side of [-1,1]){rope(body,[[side*.17,.32,.17],[side*.18,.48,.22],[side*.18,.55,.24]],color,.034);ball(body,'#fff1d6',[side*.18,.55,.25],[.088,.095,.084]);ball(body,'#243d3c',[side*.18,.554,.313],[.048,.052,.031]);}
    const legs=[],claws=[];
    for(const side of [-1,1]){
      for(let j=0;j<4;j++){const leg=new THREE.Group();leg.position.set(side*.28,.16,(j-1.5)*.13);g.add(leg);rope(leg,[[0,0,0],[side*.22,.08,(j-1.5)*.075],[side*.48,-.11,(j-1.5)*.13]],color,.047);legs.push({leg,side,index:j});}
      const claw=new THREE.Group();claw.position.set(side*.31,.22,.25);g.add(claw);
      rope(claw,[[0,0,0],[side*.12,.12,.13],[side*.17,.18,.29]],color,.054);yarn.coil(claw,[side*.17,.19,.31],[.135,.13,.125],color,{rows:5,r:.035});
      rope(claw,[[side*.14,.24,.35],[side*.04,.30,.42],[side*.08,.33,.49]],accent,.045);rope(claw,[[side*.22,.19,.35],[side*.29,.26,.42],[side*.24,.29,.50]],color,.045);claws.push({claw,side});
    }
    yarn.finish(g);g.scale.setScalar(size);scene.add(g);crabs.push({g,legs,claws,x,z,phase,size});
  }
  crab(-1.75,.95,'#db6841','#f8b578',0,1.15);crab(3.20,-3.45,'#c55683','#f3a4be',8,.98);crab(-3.20,-4.15,'#e4a040','#ffe19b',17,.84);
  let compact=false;function resize(narrow){compact=narrow;for(const s of shells){const x=s.userData.homeX,z=s.userData.homeZ;s.position.set(x,ground(x,z)+.035,z);s.scale.setScalar(s.userData.size*(narrow?.76:1));}for(const c of crabs)c.g.scale.setScalar(c.size*(narrow?.78:1));}
  function update(time){for(const c of crabs){const t=(time+c.phase)/23,k=Math.floor(t),f=t-k,u=Math.max(0,Math.min(1,(f-.10)/.76)),smooth=u*u*(3-2*u);
    const a=Math.sin(k*2.39+c.phase)*1.15,b=Math.sin((k+1)*2.39+c.phase)*1.15;
    const x=c.x+a+(b-a)*smooth,z=c.z+Math.sin((time+c.phase)*.085)*.16;
    c.g.position.set(x,ground(x,z)+.035,z);c.g.rotation.y=Math.sin((time+c.phase)*.16)*.12;
    const walking=(u>0&&u<1)?Math.sin(u*Math.PI):0;
    for(const l of c.legs){l.leg.rotation.y=Math.sin(time*4.2+c.phase+l.index*Math.PI*.8)*.20*walking*l.side;l.leg.rotation.z=Math.cos(time*4.2+c.phase+l.index*Math.PI*.8)*.12*walking*l.side;}
    for(const p of c.claws)p.claw.rotation.z=Math.sin(time*1.6+c.phase+p.side)*.12*p.side;
  }}
  resize(false);update(0);return{resize,update,counts:{shells:shells.length,crabs:crabs.length},positions:()=>crabs.map(c=>c.g.position.toArray())};
}
