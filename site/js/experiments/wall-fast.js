import {clamp,ease,reduced,tomorrow,setDay,mountFall,mountGaps,watchEdit,updateTeasers} from './shared.js';
import {mountMark} from '../mark.js';
// The wall, fast. The camera is a 2D zoom applied to each chapter on its own layer,
// tied straight to the scroll position (no smoothing, no easing between chapters).
// Past the last chapter the camera moves straight back and rises to look at the first
// screen again: still a zoom and a pan, so still flat. Nothing is written unless it changed.
const $=s=>document.querySelector(s),body=document.body,viewport=$('#viewport');
const panels=[...document.querySelectorAll('[data-panel]')];
// Each chapter is printed at less than half the physical size of the previous one.
// wall-zoom is only that pull-back, played backwards: it opens on the whole wall seen
// from afar, and scrolling down walks in until you stand at the last screen.
const zoomMode=document.body.classList.contains('wall-zoom');
// In wall-zoom the chapters shrink faster (ratio .34 instead of .44): the near one larger,
// the far ones smaller. It starts a little way into the walk, and the whole composition
// sits lower in the window.
const RATIO=zoomMode?.34:.44,scales=[0,1,2,3,4,5].map(i=>RATIO**i),centres=[0],BACK=1.6,START=zoomMode?BACK*.78:BACK,TAIL=zoomMode?0:BACK;
let floor=0,origins=[],lastKey='',lastMark='',lastFall=-1;
const surface=$('#wall-surface');
function placeWall(){
  const spacing=innerWidth<650?1280:830;
  for(let i=1;i<6;i++)centres[i]=centres[i-1]+spacing*scales[i-1];
  floor=centres[5]+6;
  origins=panels.map(p=>{const o=getComputedStyle(p).transformOrigin.split(' ').map(parseFloat);return [surface.offsetLeft+p.offsetLeft+o[0],surface.offsetTop+p.offsetTop+o[1],p.offsetHeight,o[1]]});
}
const mark=mountMark($('#wall-rabbit')),fall=mountFall($('[data-fall]'),{center:zoomMode});
let warming=zoomMode&&!reduced,roomEntering=false,roomFlight=null,reading=false,roomOpen=false,hoverLast=false,step=0;
let fit=1,segment=1100;
function layout(){placeWall();fit=Math.max(.3,Math.min((innerWidth-(innerWidth<650?40:100))/(innerWidth<650?700:1100),(innerHeight-60)/650));segment=Math.max(850,innerHeight*1.3);$('#scroll-track').style.height=(segment*(zoomMode?START:5+TAIL)+innerHeight)+'px';lastKey=''}
function reset(){scrollTo(0,0);leaveRoom()}
function go(i){if(reading){panels[i].scrollIntoView({behavior:reduced?'instant':'smooth'});return}if(zoomMode){scrollTo({top:segment*BACK,behavior:reduced?'instant':'smooth'});return}scrollTo({top:i*segment,behavior:reduced?'instant':'smooth'})}
document.querySelectorAll('[data-stop]').forEach(b=>b.onclick=e=>{e.preventDefault();go(+b.dataset.stop)});
$('#little-door').onclick=()=>scrollTo({top:zoomMode?0:segment*(5+TAIL),behavior:reduced?'instant':'smooth'});
$('#reset-wall').onclick=()=>{setDay(0);$('#help').close();reset()};
function toggleReading(force){reading=typeof force==='boolean'?force:!reading;body.classList.toggle('reading',reading);if(reading){viewport.removeAttribute('inert');scrollTo(0,0)}else{layout();reset()}}
async function enterRoom(){if(roomOpen||roomEntering||reading)return;roomEntering=true;const r=$('#last-heading').getBoundingClientRect();viewport.style.transformOrigin=`${r.left+r.width*.18}px ${r.top+r.height*.3}px`;roomFlight=viewport.animate([{transform:'scale(1)'},{transform:'scale(34)'}],{duration:reduced?1:950,fill:'forwards',easing:'cubic-bezier(.6,0,.8,.4)'});await roomFlight.finished;roomOpen=true;roomEntering=false;$('#room').hidden=false;viewport.inert=true;$('.site-header').inert=true;$('.page-tools').inert=true;$('#leave-room').focus();roomFlight.cancel()}
function leaveRoom(){if(!roomOpen)return;roomOpen=false;$('#room').hidden=true;viewport.inert=false;$('.site-header').inert=false;$('.page-tools').inert=false;$('#last-heading').focus({preventScroll:true})}
$('#leave-room').onclick=leaveRoom;$('#room-tomorrow').onclick=()=>tomorrow(reset);heading();
function heading(){const h=$('#last-heading');h.onpointerenter=()=>hoverLast=true;h.onpointerleave=()=>hoverLast=false;h.onclick=enterRoom;h.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();enterRoom()}}}
addEventListener('wheel',e=>{if(reading||e.ctrlKey||document.querySelector('dialog[open]'))return;if(roomOpen||roomEntering){e.preventDefault();return}if(hoverLast&&step>4.7&&step<5.3&&e.deltaY<0){e.preventDefault();enterRoom()}},{passive:false});
addEventListener('keydown',e=>{if(roomOpen){if(e.key==='Escape'){leaveRoom();e.preventDefault()}if(e.key==='Tab'){e.preventDefault();(document.activeElement===$('#leave-room')?$('#room-tomorrow'):$('#leave-room')).focus()}}});
mountGaps((x,y)=>{if(reading){tomorrow();return}viewport.style.transformOrigin=`${x}px ${y}px`;const a=viewport.animate([{transform:'scale(1)'},{transform:'scale(20)',opacity:0}],{duration:reduced?1:650,fill:'forwards',easing:'cubic-bezier(.6,0,1,1)'});a.onfinish=()=>{tomorrow(()=>{a.cancel()})}});
const overview=()=>Math.min(fit*.3,innerHeight*.4/(floor+300));
function camera(s){
  if(s<=5){const i=Math.min(4,Math.floor(s)),t=s-i;const scale=Math.exp(Math.log(scales[i])*(1-t)+Math.log(scales[i+1])*t);return [fit/scale,centres[i]+(centres[i+1]-centres[i])*t]}
  // Straight back (distance grows linearly) while rising to the first screen.
  const u=ease((s-5)/BACK),Z5=fit/scales[5],Zend=overview();
  return [1/((1-u)/Z5+u/Zend),centres[5]+(centres[0]-centres[5])*u];
}
function frame(){
if(warming){requestAnimationFrame(frame);return}
if(!reading&&!roomOpen){
  const s=zoomMode?5+START-clamp(scrollY/segment,0,START):clamp(scrollY/segment,0,5+TAIL);step=Math.min(5,s);
  const key=`${s}|${innerWidth}|${innerHeight}`;
  if(key!==lastKey){lastKey=key;
    const [Z,cy]=camera(s),half=innerHeight/2+80,lower=zoomMode?innerHeight*.1:0;
    panels.forEach((p,j)=>{const [ox,oy,h,oyo]=origins[j],k=Z*scales[j],y=Z*(oy+centres[j]-cy)+lower;const top=y-oyo*k,bottom=y+(h-oyo)*k;
      const far=k<.004||bottom<-half||top>half;if(far!==p.hasAttribute('hidden-far'))far?p.setAttribute('hidden-far',''):p.removeAttribute('hidden-far');
      if(!far)p.style.transform=`translate3d(${Z*ox-ox}px,${y-oy}px,0) scale(${k})`;
      const off=s<=5?Math.abs(j-step)>1.15:false;if(p.inert!==off)p.inert=off});
    // Chapter work only near its chapter, and only when its value changes.
    if(step<1.1){const m=`${ease(step/.7).toFixed(4)}|${(ease((step-.45)/.3)*.98).toFixed(4)}`;if(m!==lastMark){lastMark=m;mark.set(ease(step/.7),ease((step-.45)/.3)*.98,1)}}
    const f=Math.round(clamp((step-.72)/.62)*1000)/1000;if(f!==lastFall){lastFall=f;fall(f)}
  }
  if(Math.abs(step-2)<1.3){watchEdit();updateTeasers()}
}else if(reading){watchEdit();updateTeasers();panels.forEach(p=>{p.inert=false;p.removeAttribute('hidden-far')})}requestAnimationFrame(frame)}
addEventListener('resize',layout);body.classList.remove('reading');body.classList.add('flat');layout();if(reduced)toggleReading(true);requestAnimationFrame(frame);
// Safari rasters a layer at the scale it is first shown and redraws it every time that
// scale grows. Opening on the far view and walking in therefore redrew the chapters on
// every scroll step. So: draw every chapter once at full size, invisibly, then show the
// far view; zooming in after that only scales tiles that already exist.
if(warming){viewport.style.opacity='.01';panels.forEach(p=>{p.removeAttribute('hidden-far');p.style.transform=`scale(${fit})`});let n=0;const tick=()=>{if(++n<4)requestAnimationFrame(tick);else{warming=false;lastKey='';requestAnimationFrame(()=>viewport.style.opacity='')}};requestAnimationFrame(tick)}
if(location.hash){const target=document.querySelector(location.hash);if(target?.dataset.panel)setTimeout(()=>go(+target.dataset.panel),50)}
$('.skip-link').onclick=e=>{e.preventDefault();go(5);setTimeout(()=>$('.contact-link').focus({preventScroll:true}),400)};
