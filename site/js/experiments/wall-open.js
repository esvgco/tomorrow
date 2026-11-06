import {clamp,ease,reduced,tomorrow,setDay,mountFall,mountGaps,watchEdit} from './shared.js';
import {mountMark} from '../mark.js';
import {mountDoor} from './door-ink.js';
// Room for tomorrow: a separate wall-zoom study. The logo sinks before the journey;
// each readable chapter gets equal native scroll distance and a stationary interval.
const $=s=>document.querySelector(s),body=document.body,viewport=$('#viewport');
const panels=[...document.querySelectorAll('[data-panel]')],N=panels.length,LAST=5;
// 04.7 (body.rabbit-top): the rabbit is fixed just above the first heading instead, and the
// hole is simply on the wall after the last screen; it dives as the hole passes under it.
const TOP=body.classList.contains('rabbit-top');
// In 04.7 the camera stops at the hole's chapter (HOLD): the rabbit dives, then the projects come.
const RATIO=.34,scales=panels.map((_,i)=>RATIO**i),centres=[0],INTRO=.75,START=INTRO+5,SINK=0,HOLD=0,TOTAL=START+2;
const surface=$('#wall-surface'),dock=$('#rabbit-dock'),hole6=$('.burrow-hole'),cards=[...document.querySelectorAll('.burrow-card')];
let Yr=0,tStar=0,dockX=0,dockY=0,dockDepth=0,floor=0,origins=[],lastKey='',lastMark='',lastFall=-1,fit=1,segment=1100,mobile=false,lower=0,spacing=830;
let up=0,warming=!reduced,roomEntering=false,roomFlight=null,reading=false,roomOpen=false,hoverLast=false,u=0,cardBase=[];
const mark=mountMark($('#wall-rabbit')),fall=mountFall($('[data-fall]'),{center:true});
const hb=mark.holeBox,bb=mark.bunBox,depth=hb.y+hb.height-bb.y;
hole6.setAttribute('viewBox',`${hb.x} ${hb.y} ${hb.width} ${hb.height}`);

function layout(){
  const iw=innerWidth,ih=innerHeight;mobile=iw<650;
  fit=Math.max(.3,Math.min((iw-(mobile?40:100))/(mobile?700:1100),(ih-60)/650));
  segment=Math.max(680,ih*1.05);$('#scroll-track').style.height=(segment*TOTAL+ih)+'px';
  lower=ih*.1;spacing=(mobile?1280:830)*.8;
  for(let i=1;i<=LAST;i++)centres[i]=centres[i-1]+spacing*scales[i-1];
  floor=centres[LAST]+6;
  origins=panels.map(p=>{const o=getComputedStyle(p).transformOrigin.split(' ').map(parseFloat);return [surface.offsetLeft+p.offsetLeft+o[0],surface.offsetTop+p.offsetTop+o[1],p.offsetHeight,o[1],p.offsetWidth,o[0]]});
  if(TOP)layoutTop(iw,ih);else{
  // The dock: the rabbit and its hole, sized by the hole, sitting at the foot of the window.
  const wH=mobile?Math.min(iw*.24,100):Math.min(iw*.11,150),sc=wH/hb.width;
  // The mark lifts its hole over the head; the dock moves down by as much, so the hole stays
  // where it is and the rabbit is seen going down into it.
  const y0=ih-Math.max(90,ih*.12)-hb.height/2*sc,yEnd=y0;
  dockX=iw/2-(hb.x+hb.width/2-882)*sc;dockY=y0-(hb.y+hb.height/2-264)*sc;dockDepth=depth*sc;
  Object.assign(dock.style,{width:932*sc+'px',height:1251*sc+'px'});
  // The hole as a chapter: the size and place that project exactly onto the dock's hole
  // when the camera stands at the last screen.
  const [,oy,PH,oyo,PW]=origins[6],k6=fit*RATIO,Z5=fit/scales[LAST],W6=wH/k6,H6=W6*hb.height/hb.width,hy=PH*(mobile?.26:.3);
  Object.assign(hole6.style,{width:W6+'px',height:H6+'px',left:PW/2-W6/2+'px',top:hy-H6/2+'px'});
  centres[6]=centres[LAST]-oy+((yEnd-ih/2)-lower-(hy-oyo)*k6)/Z5;
  centres[7]=centres[6]+spacing*scales[6];
  }
  const [,,PH6,,PW6]=origins[6],hb6=parseFloat(hole6.style.top)+parseFloat(hole6.style.height);
  cardBase=cards.map((c,k)=>{c.style.top=hb6+(mobile?90:60)+k*(mobile?150:95)+'px';return {w:c.offsetWidth,dx:parseFloat(c.style.getPropertyValue('--dx'))*PW6}});
  lastKey='';lastMark='';
}

// 04.7: the rabbit sits just above the first heading as the page opens, and stays there.
// The hole is placed on the wall so that, walking on past the last screen, it rises under
// the rabbit and keeps rising until the rabbit is gone; it is sized to the rabbit there.
function layoutTop(iw,ih){
  const wR=mobile?Math.min(iw*.2,80):Math.min(iw*.07,100),sc=wR/932;
  const [Z0,cy0]=camera(0),[,oy0,,oyo0]=origins[0],h1=panels[0].querySelector('h1');
  const titleY=ih/2+Z0*(oy0+centres[0]-cy0)+lower+(h1.offsetTop-oyo0)*Z0*scales[0];
  Yr=titleY-(mobile?10:16);
  dockX=iw/2-(hb.x+hb.width/2-882)*sc;dockY=Yr-(hb.y+hb.height/2-264)*sc;dockDepth=depth*sc;
  Object.assign(dock.style,{width:wR+'px',height:1251*sc+'px',transform:`translate(${dockX}px,${dockY}px)`});
  const [,oy,,oyo,PW]=origins[6];
  // The hole's chapter is placed as usual after the last screen; inside it, the hole sits
  // where it ends up exactly under the rabbit once the camera stands at that chapter.
  centres[6]=centres[LAST]+spacing*scales[LAST];centres[7]=centres[6]+spacing*scales[6];
  const hy=oyo+(Yr-ih/2-lower)/fit,W6=hb.width*sc*1.25/fit,H6=W6*hb.height/hb.width;
  Object.assign(hole6.style,{width:W6+'px',height:H6+'px',left:PW/2-W6/2+'px',top:hy-H6/2+'px'});
}
function reset(){scrollTo(0,0);leaveRoom()}
const at=v=>v*segment;
function go(i){$('#contents').close();if(reading){panels[i].scrollIntoView({behavior:reduced?'instant':'smooth'});return}scrollTo({top:at(i===0?0:INTRO+i),behavior:reduced?'instant':'smooth'})}
document.querySelectorAll('[data-stop]').forEach(b=>b.onclick=e=>{e.preventDefault();go(+b.dataset.stop)});
$('#contents-button').onclick=()=>$('#contents').showModal();
$('#read-button').onclick=()=>toggleReading();
$('#little-door').onclick=()=>scrollTo({top:at(START+SINK),behavior:reduced?'instant':'smooth'});
$('#about-link').onclick=()=>$('#about-dialog').showModal();
$('#reset-wall').onclick=()=>{setDay(0);$('#help').close();reset()};
function toggleReading(force){reading=typeof force==='boolean'?force:!reading;body.classList.toggle('reading',reading);$('#read-button').textContent=reading?'Explore the space':'Read normally';dock.hidden=reading;if(reading){viewport.removeAttribute('inert');scrollTo(0,0)}else{layout();reset()}}
async function enterRoom(){if(roomOpen||roomEntering||reading)return;roomEntering=true;const r=$('#last-heading').getBoundingClientRect();viewport.style.transformOrigin=`${r.left+r.width*.18}px ${r.top+r.height*.3}px`;roomFlight=viewport.animate([{transform:'scale(1)'},{transform:'scale(34)'}],{duration:reduced?1:950,fill:'forwards',easing:'cubic-bezier(.6,0,.8,.4)'});await roomFlight.finished;roomOpen=true;roomEntering=false;$('#room').hidden=false;viewport.inert=true;$('#leave-room').focus();roomFlight.cancel()}
function leaveRoom(){if(!roomOpen)return;roomOpen=false;$('#room').hidden=true;viewport.inert=false;$('#last-heading').focus({preventScroll:true})}
$('#leave-room').onclick=leaveRoom;$('#room-tomorrow').onclick=()=>tomorrow(reset);
{const h=$('#last-heading');h.onpointerenter=()=>hoverLast=true;h.onpointerleave=()=>hoverLast=false;h.onclick=enterRoom;h.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();enterRoom()}}}
addEventListener('wheel',e=>{if(reading||e.ctrlKey||document.querySelector('dialog[open]'))return;if(roomOpen||roomEntering){e.preventDefault();return}if(hoverLast&&u>START-.3&&u<START+SINK&&e.deltaY<0){e.preventDefault();enterRoom()}},{passive:false});
addEventListener('keydown',e=>{if(roomOpen){if(e.key==='Escape'){leaveRoom();e.preventDefault()}if(e.key==='Tab'){e.preventDefault();(document.activeElement===$('#leave-room')?$('#room-tomorrow'):$('#leave-room')).focus()}}});
mountGaps((x,y)=>{if(reading){tomorrow();return}viewport.style.transformOrigin=`${x}px ${y}px`;const a=viewport.animate([{transform:'scale(1)'},{transform:'scale(20)',opacity:0}],{duration:reduced?1:650,fill:'forwards',easing:'cubic-bezier(.6,0,1,1)'});a.onfinish=()=>{tomorrow(()=>{a.cancel()})}});


// ---------- Looking up ----------
// From the first screen you can also scroll up. Then the hole stays where it is, the
// rabbit drops into it, and the wall slides down in perspective: we did not move, we
// raised our head. Above the wall is a white screen with one word, and a door to find.
const above=$('#above'),TILT=62*Math.PI/180;
const door=mountDoor(above,{reduced,onEnter:done=>tomorrow(()=>{done();up=0;scrollTo(0,0);lastKey='';lastMark=''})});
function lookUp(){
  const a=TILT*ease(clamp((up-.2)/.8)),P=innerHeight*1.1;
  viewport.style.transform=a?`perspective(${P}px) translateZ(${P}px) rotateX(${a}rad) translateZ(${-P}px)`:'';
  if(TOP)dock.style.opacity=(1-ease(clamp(up/.3))).toFixed(3);
  above.classList.toggle('shown',a>0);above.classList.toggle('drawable',up>=1);
  above.style.transform=up>=1?'':`perspective(${P}px) translateZ(${P}px) rotateX(${a-TILT}rad) translateZ(${-P}px)`;
}
function lift(d){const before=up;up=clamp(up+d,0,1);if(up!==before)lastKey=''}
addEventListener('wheel',e=>{if(reading||roomOpen||document.querySelector('dialog[open]'))return;
  if(up>0||(scrollY<=0&&e.deltaY<0)){e.preventDefault();lift(-e.deltaY*(e.deltaMode===1?16:1)/(innerHeight*1.4))}},{passive:false});
let touchY=null;
addEventListener('touchstart',e=>{touchY=e.target.closest('.above-ink')&&up>=1?null:e.touches[0].clientY},{passive:true});
addEventListener('touchmove',e=>{if(touchY==null||reading||roomOpen||document.querySelector('dialog[open]'))return;const y=e.touches[0].clientY,dy=y-touchY;touchY=y;
  if(up>0||(scrollY<=0&&dy>0)){e.preventDefault();lift(dy/(innerHeight*1.1))}},{passive:false});
addEventListener('keydown',e=>{if(reading||roomOpen||document.querySelector('dialog[open]'))return;
  if((e.key==='ArrowUp'||e.key==='PageUp')&&scrollY<=0&&up<1){e.preventDefault();lift(e.key==='PageUp'?.5:.15)}
  else if((e.key==='ArrowDown'||e.key==='PageDown'||e.key===' ')&&up>0){e.preventDefault();lift(e.key==='ArrowDown'?-.15:-.5)}});
$('#above-back').onclick=()=>{const from=up,t0=performance.now();const step=now=>{const k=clamp((now-t0)/900);up=from*(1-ease(k));lastKey='';if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)};
function camera(){
  const travel=clamp(u-INTRO,0,7),i=Math.min(6,Math.floor(travel));
  // Pause over the first 28% of each chapter, then move on. No scroll interception.
  const f=ease(clamp((travel-i-.28)/.72));
  const Z=fit/(scales[i]*(1-f)+scales[i+1]*f);
  const v=(1/(fit/scales[i])-1/Z)/(1/(fit/scales[i])-1/(fit/scales[i+1]));
  return [Z,centres[i]+(centres[i+1]-centres[i])*v];
}
function frame(){
if(warming){requestAnimationFrame(frame);return}
if(!reading&&!roomOpen){
  u=clamp(scrollY/segment,0,TOTAL);window.__u=u;
  const key=`${u}|${up}|${innerWidth}|${innerHeight}`;
  if(key!==lastKey){lastKey=key;
    const [Z,cy]=camera(),half=innerHeight/2+80,inHole=TOP||u>=START+SINK;
    panels.forEach((p,j)=>{const [ox,oy,h,oyo]=origins[j],k=Z*scales[j],y=Z*(oy+centres[j]-cy)+lower;const top=y-oyo*k,bottom=y+(h-oyo)*k;
      const far=k<.03||bottom<-half||top>half||(j>0&&u<INTRO)||(j>LAST&&u<START);
      p.style.opacity=j>0?clamp((u-INTRO)/.2).toFixed(3):'1';if(far!==p.hasAttribute('hidden-far'))far?p.setAttribute('hidden-far',''):p.removeAttribute('hidden-far');
      if(!far)p.style.transform=`translate3d(${Z*ox-ox}px,${y-oy}px,0) scale(${k})`;if(p.inert!==far)p.inert=far});
    // The dock until the rabbit is gone; from then on, the hole belongs to the wall.
    if(!TOP){dock.style.visibility=u>=INTRO?'hidden':'';dock.style.opacity=(1-ease(clamp((u-.5)/.25))).toFixed(3);}
    lookUp();
    const sink=u>0?ease(clamp(u/.5)):ease(clamp(up/.35)),m=sink.toFixed(4);if(m!==lastMark){lastMark=m;mark.set(sink,0,1);dock.style.transform=`translate(${dockX}px,${dockY+dockDepth*sink}px)`}
    $('#position-label').textContent=u<INTRO?'Scroll to look closer ↓':`${Math.min(8,Math.floor(u-INTRO+.001)+1)} / 8`;
    const fa=Math.round(clamp((u-INTRO-1)/.8)*1000)/1000;if(fa!==lastFall){lastFall=fa;fall(fa)}
    // Projects come up from below and out of nothing, one after another, once the rabbit is in.
    const t=u-START-SINK;
    cards.forEach((c,k)=>{const l=ease(clamp((t-(TOP?1.5:.12)-k*.17)/.45)),dy=(1-l)*(mobile?260:170);c.style.transform=`translate(${-cardBase[k].w/2+cardBase[k].dx}px,${dy}px)`;c.style.opacity=l.toFixed(3)});
  }
  watchEdit();
}else if(reading){watchEdit();panels.forEach(p=>{p.inert=false;p.style.opacity='1';p.removeAttribute('hidden-far')})}requestAnimationFrame(frame)}
document.fonts.ready.then(layout);addEventListener("resize",layout);body.classList.remove('reading');body.classList.add('flat');layout();if(reduced)toggleReading(true);requestAnimationFrame(frame);
// Safari rasters a layer at the scale it is first shown and redraws it each time that scale
// grows; draw every chapter once at full size, invisibly, before showing the far view.
if(warming){viewport.style.opacity='0';panels.forEach(p=>{p.removeAttribute('hidden-far');p.style.transform=`scale(${fit})`});let n=0;const tick=()=>{if(++n<4)requestAnimationFrame(tick);else{warming=false;lastKey='';requestAnimationFrame(()=>viewport.style.opacity='')}};requestAnimationFrame(tick)}
if(location.hash){const target=document.getElementById(location.hash.slice(1));if(target?.dataset.panel)setTimeout(()=>go(+target.dataset.panel),50)}
$('.skip-link').onclick=e=>{e.preventDefault();go(7)};

