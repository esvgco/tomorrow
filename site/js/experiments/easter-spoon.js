const section=document.querySelector('#projects');
const button=section.querySelector('.spoon-trigger');
const copy=section.querySelector('.spoon-copy');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const touch=matchMedia('(hover:none), (pointer:coarse)');
let open=false,busy=false;
function setLetters(text){
 copy.replaceChildren(...[...text].map(char=>{
  if(char==='\n')return document.createElement('br');
  const span=document.createElement('span');span.textContent=char===' '?'\u00a0':char;return span;
 }));
}
setLetters('Not everything\nfits a category');
async function transform(){
 if(busy)return;busy=true;open=!open;
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
 if(touch.matches&&!open&&!section.classList.contains('spoon-revealed')){section.classList.add('spoon-revealed');return}
 transform();
});
