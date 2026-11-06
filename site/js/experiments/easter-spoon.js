const section=document.querySelector('#projects');
const button=section.querySelector('.spoon-trigger');
const line=section.querySelector('.spoon-line');
const story=section.querySelector('.spoon-story');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const touch=matchMedia('(hover:none), (pointer:coarse)');
const letters=[...line.textContent].map(char=>{const span=document.createElement('span');span.textContent=char===' '?'\u00a0':char;return span});
line.replaceChildren(...letters);
let open=false,dragging=false;
function bend(amount){
 letters.forEach((letter,i)=>{
  const t=i/(letters.length-1),arc=Math.sin(t*Math.PI);
  letter.style.transform=`translateY(${-amount*arc}px) rotate(${-amount*.07*Math.cos(t*Math.PI)}deg)`;
 });
}
function activate(){open=true;section.classList.add('spoon-open');button.setAttribute('aria-expanded','true');story.hidden=false;bend(reduced.matches?0:55)}
function close(){open=false;dragging=false;section.classList.remove('spoon-open','spoon-revealed');button.setAttribute('aria-expanded','false');story.hidden=true;bend(0);button.focus({preventScroll:true})}
button.addEventListener('click',()=>{
 if(touch.matches&&!section.classList.contains('spoon-revealed')){section.classList.add('spoon-revealed');return}
 if(!open)activate();
});
button.addEventListener('pointerdown',e=>{if(!open)return;dragging=true;button.setPointerCapture(e.pointerId)});
button.addEventListener('pointermove',e=>{
 if(!open||reduced.matches||touch.matches&&!dragging)return;
 const box=button.getBoundingClientRect();
 bend(Math.max(20,Math.min(100,55+(box.top+box.height/2-e.clientY)*.5)));
});
button.addEventListener('pointerup',()=>dragging=false);
button.addEventListener('pointercancel',()=>dragging=false);
section.querySelector('.spoon-close').addEventListener('click',close);
addEventListener('keydown',e=>{if(open&&e.key==='Escape'){e.preventDefault();close()}});
