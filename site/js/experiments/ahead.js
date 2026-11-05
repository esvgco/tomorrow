import {clamp,ease,reduced,onDay,tomorrow,mountGaps,watchEdit,updateTeasers} from './shared.js';
import {mountMark} from '../mark.js';
const $=s=>document.querySelector(s),mark=mountMark($('#ahead-rabbit'));
let peekTimer=null;
const showPeek=()=>$('#margin-peek').classList.add('open');
$('#period').onclick=showPeek;$('#period').onpointerenter=()=>peekTimer=setTimeout(showPeek,1300);$('#period').onpointerleave=()=>clearTimeout(peekTimer);
$('#peek-close').onclick=()=>$('#margin-peek').classList.remove('open');
function next(){tomorrow(()=>{$('#margin-peek').classList.remove('open');scrollTo({top:0,behavior:'instant'})})}
$('#peek-enter').onclick=next;$('#tomorrow-door').onclick=next;
$('#rabbit-follow').onclick=()=>$('#possibility').scrollIntoView({behavior:reduced?'instant':'smooth'});
mountGaps((x,y)=>{if(reduced){tomorrow();return}const main=$('main');main.style.transformOrigin=`${x}px ${y+scrollY}px`;const flight=main.animate([{transform:'scale(1)'},{transform:'scale(20)',opacity:0}],{duration:700,easing:'cubic-bezier(.6,0,1,1)',fill:'forwards'});flight.onfinish=()=>tomorrow(()=>flight.cancel())});
onDay(n=>{$('[data-footer-day]').textContent=n?`That was ${n===1?'tomorrow':`day +${n}`}.`:'That was today.';$('.door-ellipse').style.width=`${Math.min(65,27+n)}vw`});
let pending=false;function draw(){pending=false;const hero=$('.ahead-hero').getBoundingClientRect();mark.set(ease(-hero.top/(hero.height*.55)),0,1);if(!reduced){const r=$('.moving-sentence').getBoundingClientRect();const t=clamp((innerHeight-r.top)/innerHeight);$('.moving-sentence').style.transform=`translateX(${Math.sin(t*Math.PI)*-12}px)`}watchEdit();updateTeasers()}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(draw)}},{passive:true});addEventListener('resize',draw);draw();
