const section=document.querySelector('#projects');
const button=section.querySelector('.spoon-trigger');
const copy=section.querySelector('.spoon-copy');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const touch=matchMedia('(hover:none), (pointer:coarse)');
let open=false,busy=false;
function setLetters(text){
 copy.replaceChildren(...[...text].map(char=>{
  if(char==='\n')return document.createElement('br');
  const span=document.createElement('span');span.textContent=char===' '?'\u00a0':char;
  if(char==='.')span.classList.add('spoon-period');
  return span;
 }));
}
setLetters('Not everything\nfits a category');
// Measure the original text independently so the hole stays put after rewriting.
const heading=copy.parentElement;
const reference=document.createElement('span');
reference.className='spoon-reference';reference.setAttribute('aria-hidden','true');
reference.innerHTML='Not everything<br>fits a category';heading.append(reference);
const positionSpoon=()=>heading.style.setProperty('--spoon-text-width',reference.offsetWidth+'px');
new ResizeObserver(positionSpoon).observe(reference);
document.fonts.ready.then(positionSpoon);positionSpoon();
async function transform(){
 if(busy)return;busy=true;open=!open;
 section.classList.add('spoon-hover-locked');
 section.classList.toggle('spoon-open',open);
 section.classList.remove('spoon-revealed');
 button.setAttribute('aria-pressed',String(open));
 const spin=button.querySelector('svg').animate([{transform:'rotate(0deg)'},{transform:'rotate(180deg)'},{transform:'rotate(360deg)'}],{duration:reduced.matches?1:850,easing:'ease-in-out'});
 await Promise.all([...copy.querySelectorAll('span')].map((letter,i)=>letter.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-14px) scale(.8)'}],{duration:reduced.matches?1:240,delay:reduced.matches?0:i*12,fill:'forwards'}).finished));
 setLetters(open?'There is\nno spoon.':'Not everything\nfits a category');
 await Promise.all([...copy.querySelectorAll('span')].map((letter,i)=>letter.animate([{opacity:0,transform:'translateY(14px) scale(.8)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:reduced.matches?1:340,delay:reduced.matches?0:i*22,fill:'both'}).finished));
 await spin.finished;busy=false;
}
button.addEventListener('click',()=>{
 if(touch.matches&&!open&&!section.classList.contains('spoon-revealed')){section.classList.remove('spoon-hover-locked');section.classList.add('spoon-revealed');return}
 transform();
});

button.addEventListener('pointerleave',()=>{if(!busy)section.classList.remove('spoon-hover-locked')});
button.addEventListener('pointerenter',()=>{if(!busy)section.classList.remove('spoon-hover-locked')});
button.addEventListener('blur',()=>{if(!busy)section.classList.remove('spoon-hover-locked')});

let paintUntil=0,painting=false;
function refresh(){paintUntil=performance.now()+1800;if(painting)return;painting=true;requestAnimationFrame(function frame(){dispatchEvent(new CustomEvent('wall-effect-frame',{detail:section}));if(performance.now()<paintUntil)requestAnimationFrame(frame);else painting=false})}
for(const type of ['pointerenter','pointerleave','focus','blur','click'])button.addEventListener(type,refresh);
