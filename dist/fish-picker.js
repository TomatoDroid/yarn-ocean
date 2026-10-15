import * as THREE from 'three';

const kindName=d=>d.kindLabel??(d.large?'大型游鱼':d.kind==='round'?'圆脸小鱼':d.kind==='fan'?'扇形小鱼':d.kind==='whale'?'小鲸模样':'长身小鱼');

// Render the actual yarn geometry once per portrait, sharing the ocean's GPU
// context and materials. Cards never run an extra animation or WebGL context.
function makePortraits(renderer,creatures){
  const width=256,height=144;
  const target=new THREE.WebGLRenderTarget(width,height);
  target.texture.colorSpace=THREE.SRGBColorSpace;
  const portraitScene=new THREE.Scene();
  portraitScene.add(new THREE.HemisphereLight('#fff7df','#597b79',2.8));
  const key=new THREE.DirectionalLight('#fff6e1',3.0);key.position.set(-3,5,7);portraitScene.add(key);
  const fill=new THREE.DirectionalLight('#c4eeed',1.4);fill.position.set(4,0,4);portraitScene.add(fill);
  const camera=new THREE.OrthographicCamera(-2,2,1,-1,.1,30);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  const pixels=new Uint8Array(width*height*4),image=context.createImageData(width,height);
  const oldTarget=renderer.getRenderTarget(),oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
  const urls=[];
  try{
    renderer.setClearColor(0,0);renderer.setRenderTarget(target);
    for(const fish of creatures){
      const model=new THREE.Group();
      for(const part of fish.children)model.add(part.clone());
      // Rays are tilted to show their back; from the side they are only a thin line.
      if(fish.userData.kind==='ray')model.rotation.set(.8,0,-.1);else model.rotation.set(.06,fish.userData.kind==='round'?-.18:.25,-.04);
      portraitScene.add(model);
      const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
      const halfHeight=Math.max(size.y,size.x/(width/height))*0.61;
      camera.left=-halfHeight*width/height;camera.right=halfHeight*width/height;camera.top=halfHeight;camera.bottom=-halfHeight;
      camera.position.copy(center).add(new THREE.Vector3(0,.10,8));camera.lookAt(center);camera.updateProjectionMatrix();
      renderer.render(portraitScene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
      for(let y=0;y<height;y++)image.data.set(pixels.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);
      context.putImageData(image,0,0);urls.push(canvas.toDataURL('image/png'));
      portraitScene.remove(model);
    }
  }finally{
    renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldClear,oldAlpha);target.dispose();
  }
  return urls;
}

const customLabel=d=>d.custom==='mine'?'我织的':d.from?`${d.from}织的`:'朋友织的';

export function createFishPicker({definitions,creatures,renderer,onSelect,reduced}){
  const picker=document.querySelector('#fish-picker');
  const portraits=makePortraits(renderer,creatures);
  const entries=[];
  function fillCard(button,fish,portraitUrl,number){
    const d=fish.userData;
    button.style.setProperty('--fish-accent',d.colors[0]);
    button.setAttribute('aria-label',`近看${d.name}，${d.custom?customLabel(d)+kindName(d):kindName(d)}`);
    const portrait=document.createElement('img');portrait.src=portraitUrl;portrait.alt='';portrait.width=256;portrait.height=144;portrait.draggable=false;
    const label=document.createElement('span');label.className='fish-card-number';label.textContent=number;label.setAttribute('aria-hidden','true');
    const name=document.createElement('span');name.className='fish-card-name';name.textContent=d.name;
    const kind=document.createElement('span');kind.className='fish-card-kind';kind.textContent=d.custom?customLabel(d):kindName(d);
    button.replaceChildren(label,portrait,name,kind);
  }
  function makeButton(entry){
    const button=document.createElement('button');button.type='button';button.className='fish-card';
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>onSelect(entry.fish));
    return button;
  }
  definitions.forEach((d,i)=>{
    const entry={fish:creatures[i]};entry.button=makeButton(entry);entry.button.disabled=true;
    if(d.large)entry.button.classList.add('large-fish');
    fillCard(entry.button,creatures[i],portraits[i],String(i+1).padStart(2,'0'));
    picker.append(entry.button);entries.push(entry);
  });
  const previous=document.querySelector('#picker-previous'),next=document.querySelector('#picker-next');
  const updateArrows=()=>{previous.disabled=picker.scrollLeft<2;next.disabled=picker.scrollLeft>=picker.scrollWidth-picker.clientWidth-2;};
  const slide=direction=>picker.scrollBy({left:direction*picker.clientWidth*.78,behavior:reduced.matches?'instant':'smooth'});
  previous.addEventListener('click',()=>slide(-1));next.addEventListener('click',()=>slide(1));picker.addEventListener('scroll',updateArrows,{passive:true});
  new ResizeObserver(updateArrows).observe(picker);
  picker.addEventListener('keydown',event=>{
    const buttons=entries.map(e=>e.button);
    const current=buttons.indexOf(document.activeElement);if(current<0)return;
    let index;if(event.key==='ArrowRight')index=(current+1)%buttons.length;else if(event.key==='ArrowLeft')index=(current-1+buttons.length)%buttons.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=buttons.length-1;else return;
    event.preventDefault();buttons[index].focus({preventScroll:true});reveal(buttons[index]);
  });
  function reveal(button){
    const item=button.getBoundingClientRect(),rail=picker.getBoundingClientRect();
    const delta=item.left<rail.left?item.left-rail.left-8:item.right>rail.right?item.right-rail.right+8:0;
    if(delta)picker.scrollBy({left:delta,behavior:reduced.matches?'instant':'smooth'});
  }
  // Knitted fish sit after the catalogue: friends' gifts in arrival order, then your own.
  function setCustom(slot,fish,{portrait=true}={}){
    let entry=entries.find(e=>e.slot===slot);
    if(!fish){if(entry){entry.button.remove();entries.splice(entries.indexOf(entry),1);}updateArrows();return;}
    if(!entry){
      entry={slot,fish};entry.button=makeButton(entry);entry.button.classList.add('custom-fish');
      const mine=entries.find(e=>e.slot==='mine');
      const after=slot!=='mine'&&mine?entries[entries.indexOf(mine)-1]:entries.at(-1);
      after.button.after(entry.button);entries.splice(entries.indexOf(after)+1,0,entry);
    }
    entry.fish=fish;
    const url=portrait||!entry.portrait?makePortraits(renderer,[fish])[0]:entry.portrait;entry.portrait=url;
    fillCard(entry.button,fish,url,slot==='mine'?'我':'赠');
    updateArrows();
  }
  return {
    setCustom,
    sync(selected){let active=null;for(const e of entries){const on=e.fish===selected;e.button.setAttribute('aria-pressed',String(on));if(on)active=e.button;}if(active)reveal(active);updateArrows();},
  };
}
