const help=document.querySelector('#help');
const toggle=document.querySelector('#help-toggle');
toggle.addEventListener('click',()=>{help.hidden=!help.hidden;toggle.setAttribute('aria-expanded',String(!help.hidden));});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!help.hidden){help.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
document.querySelector('#retry-scene').addEventListener('click',()=>location.reload());
function unavailable(error){document.querySelector('#loading')?.remove();document.querySelector('#error').hidden=false;document.querySelector('#stage').classList.add('scene-unavailable');console.error('Ocean unavailable',error);}
requestAnimationFrame(()=>requestAnimationFrame(()=>import('./scene.js?v=20261010-feeding').catch(unavailable)));
