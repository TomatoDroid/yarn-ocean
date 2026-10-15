// A window onto passing fish: one-way crossings, then a quiet offscreen interval.
// Each pass keeps its own world-space heading. Turning the camera never moves fish.
export const toLane=(s,p)=>({x:p.x*s.heading.x+p.z*s.heading.z,y:p.y,z:-p.x*s.heading.z+p.z*s.heading.x});
export const fromLane=(s,p)=>({x:p.x*s.heading.x-p.z*s.heading.z,y:p.y,z:p.x*s.heading.z+p.z*s.heading.x});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const random=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
// Cruising speeds by body: round and spiky shapes potter, long ones glide.
const KIND_SPEED={round:.60,fan:.73,puffer:.50,angler:.62,ray:.72,eel:.84};
export function createSwimmer(position,index,kind,seed=37){
  const s={heading:{x:1,z:0},passEdges:null,position:{...position},velocity:{x:0,y:0,z:0},seed:(seed^Math.imul(index+1,0x9e3779b9))>>>0,phase:0,speed:KIND_SPEED[kind]??.94,beat:index*1.73,power:0,distance:0,clearance:.6,radius:1.2,large:false,direction:index%2?1:-1,mode:'crossing',wait:0,passes:0,entries:0,exits:0,reaction:0,touches:0,canRecycle:false,inspect:false,anchor:null,laneY:position.y,laneZ:position.z};
  s.seed=Math.imul(s.seed^(s.seed>>>16),0x85ebca6b)>>>0;s.seed^=s.seed>>>13;
  s.phase=random(s)*Math.PI*2;s.pace=.86+random(s)*.30;s.velocity.x=s.direction*s.speed*s.pace;return s;
}
function edges(s,b){const e=s.passEdges??b;return{left:(e.left??-b.x)-s.radius-.6,right:(e.right??b.x)+s.radius+.6};}
function enter(s,b,school){
  if(b.heading){s.heading={...b.heading};s.passEdges={left:b.left,right:b.right};}
  s.direction=random(s)<.5?-1:1;s.phase=random(s)*Math.PI*2;s.pace=.85+random(s)*.34;
  let best=null,bestScore=Infinity;
  for(let lane=0;lane<5;lane++){
    const low=s.large?.25:b.minY+.25,high=s.large?2.1:b.maxY-.25;
    const y=low+(lane+.15+random(s)*.7)/5*(high-low),z=s.large?-.6+random(s)*1.4:b.minZ+.2+random(s)*(b.maxZ-b.minZ-.4);
    let score=random(s)*.55;
    for(const other of school)if(other!==s&&other.mode==='crossing'){const p=toLane(s,other.position);score+=Math.exp(-(((y-p.y)/.65)**2+((z-p.z)/1.5)**2));}
    if(score<bestScore){best={y,z};bestScore=score;}
  }
  s.laneY=best.y;s.laneZ=best.z;
  const edge=edges(s,b);s.position=fromLane(s,{x:s.direction>0?edge.left:edge.right,y:s.laneY,z:s.laneZ});
  s.velocity=fromLane(s,{x:s.direction*s.speed*s.pace,y:0,z:0});s.mode='crossing';s.entries++;s.passes++;s.reaction=0;s.anchor=null;
}
export function touchSwimmer(s,point){
  if(s.mode!=='crossing')return false;
  s.reaction=1;s.touches++;
  // A short forward dart, plus a small recoil away from the touched side.
  const position=toLane(s,s.position),hit=toLane(s,point),velocity=toLane(s,s.velocity);
  velocity.x+=s.direction*(s.large?.36:.62);
  velocity.y+=clamp((position.y-hit.y)*.65,-.28,.28);
  velocity.z+=clamp((position.z-hit.z)*.55,-.34,.34);
  s.velocity=fromLane(s,velocity);
  return true;
}
export function stepSchool(school,dt,time,bounds){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);
  const next=[];
  for(const s of school){
    if(s.mode==='waiting'&&!s.inspect){s.wait-=dt;if(s.wait<=0)enter(s,bounds,school);next.push(null);continue;}
    if(s.inspect&&!s.anchor)s.anchor={...s.position};if(!s.inspect)s.anchor=null;
    s.reaction=Math.max(0,s.reaction-dt*.66);
    const position=toLane(s,s.position),velocity=toLane(s,s.velocity),anchor=s.anchor?toLane(s,s.anchor):null;
    const bob=s.large?.13:.22,depthWave=s.large?.12:.23;
    const targetY=(anchor?.y??s.laneY)+Math.sin(time*.53+s.phase)*bob;
    const targetZ=(anchor?.z??s.laneZ)+Math.sin(time*.37+s.phase)*depthWave;
    const cruise=s.speed*s.pace*(1+.10*Math.sin(time*.72+s.phase)+s.reaction*.70);
    const desiredX=s.inspect?(anchor.x-position.x)*1.6:s.direction*cruise;
    const force={x:(desiredX-velocity.x)*1.8,y:(targetY-position.y)*.95-velocity.y*1.8,z:(targetZ-position.z)*.85-velocity.z*1.6};
    // Yield vertically/in depth without steering everyone back towards a centre.
    if(!s.inspect)for(const other of school){if(other===s||other.mode!=='crossing'||other.inspect)continue;
      const op=toLane(s,other.position),dx=position.x-op.x,dy=position.y-op.y,dz=position.z-op.z,d=Math.max(.01,Math.hypot(dx,dy,dz)),radius=(s.clearance+other.clearance)*.8;
      if(d<radius){const k=(1-d/radius)*.45;force.y+=(Math.abs(dy)>.05?dy/d:(s.phase>other.phase?1:-1)) * k;force.z+=dz/d*k;}
    }
    let vx=velocity.x+force.x*dt;if(!s.inspect)vx=s.direction*clamp(vx*s.direction,s.speed*.64,s.speed*2.1);
    next.push(fromLane(s,{x:vx,y:clamp(velocity.y+force.y*dt,-.27,.27),z:clamp(velocity.z+force.z*dt,-.26,.26)}));
  }
  school.forEach((s,i)=>{if(!next[i])return;s.velocity=next[i];const speed=Math.hypot(...Object.values(s.velocity));s.distance+=speed*dt;
    for(const axis of ['x','y','z'])s.position[axis]+=s.velocity[axis]*dt;
    s.power+=(clamp(speed/s.speed,.35,1.7)-s.power)*(1-Math.exp(-dt*4));s.beat+=dt*(5+4*s.power+9*s.reaction);
    const edge=edges(s,bounds),along=toLane(s,s.position).x,past=s.direction>0?along>edge.right:along<edge.left;
    // The renderer also confirms the entire bounding sphere is outside the camera.
    if(!s.inspect&&past&&s.canRecycle){s.mode='waiting';s.wait=2.0+random(s)*5.5;s.exits++;s.velocity={x:0,y:0,z:0};s.reaction=0;}
  });
}
