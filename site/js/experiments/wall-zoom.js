import {clamp,ease,reduced,tomorrow,setDay,mountFall,mountGaps,watchEdit} from './shared.js';
import {mountMark} from '../mark.js';
import {mountDoor} from './door-ink.js';
// The wall, from afar (04.6). Built on 04.1's flat camera: every chapter is its own layer,
// zoomed and moved directly from the scroll position.
//
// The walk, in scroll segments:
//   1. START  the 04.1 pull-back played backwards: from the whole wall to the last screen.
//             The rabbit waits at the foot of the window the whole way.
//   2. SINK   standing at the last screen, the rabbit goes into its hole.
//   3. +1     the hole is now a chapter of the wall: it rises and grows like the others did,
//             and the projects the studio backs arrive from below, one after another.
//   4. +1     on to the last chapter: About and Contact.
// The hole in the dock and the hole on the wall are placed so that, at the moment the
// rabbit is gone, they are the same pixels; one is swapped for the other there.
const $=s=>document.querySelector(s),body=document.body,viewport=$('#viewport');
const panels=[...document.querySelectorAll('[data-panel]')],N=panels.length,LAST=5;
// 04.7 (body.rabbit-top): the rabbit is fixed just above the first heading instead, and the
// hole is simply on the wall after the last screen; it dives as the hole passes under it.
const TOP=body.classList.contains('rabbit-top');
const FLIP=body.hasAttribute('data-burrow-flip');
let flipScreen,projectFlight,tunnelLines=[],bootFontsReady=!FLIP;
let tunnelTravel=0,tunnelSpeed=170,tunnelLastTime=performance.now(),tunnelLastScroll=scrollY;
if(FLIP)document.fonts.ready.then(()=>{bootFontsReady=true;scrollTo(0,0);layout();lastKey=''});
if(FLIP){
 flipScreen=document.createElement('div');flipScreen.className='burrow-flip-screen';
 body.append(flipScreen);
 const tunnel=document.createElement('div');tunnel.className='burrow-tunnel';tunnel.setAttribute('aria-hidden','true');
 for(let i=0;i<60;i++){
  const line=document.createElement('i');line.style.left=((i+.5)/16*100)+'%';
  line.style.height=(45+(i*47)%150)+'px';line.style.opacity=(.12+(i%4)*.07).toString();
  tunnel.append(line);tunnelLines.push(line);
 }
 body.append(tunnel);
 projectFlight=document.createElement('div');projectFlight.className='project-flight';projectFlight.hidden=true;projectFlight.setAttribute('aria-label','Selected projects');
 const projects=[
  ['rainmaker','Rainmaker','Water for farms, watersheds, and ecosystems.','https://www.rainmaker.com/'],
  ['truemed','TrueMed','A marketplace for HSA/FSA health spending.','https://www.truemed.com/'],
  ['vultron','Vultron','AI for federal proposal development.','https://www.vultron.ai/'],
  ['abel','Abel','Automated police report generation.','https://abelpolice.com/'],
  ['flair','Flair','An end-to-end clothing manufacturing platform.','https://www.melengo.com/'],
  ['numeric','Numeric','AI-powered accounting automation.','https://www.numeric.io/']
 ];
 projectFlight.innerHTML=projects.map(([id,name,description,url],i)=>`<article class="project-flyby"><img src="assets/projects/${id}.svg?v=icon-only" alt="${name} logo"><div class="project-copy"><h2>${name}</h2><p>${description}</p><a href="${url}" target="_blank" rel="noopener">Explore ${name} ↗</a></div></article>`).join('');
 body.append(projectFlight);
 for(const element of [$('#viewport'),$('#rabbit-dock'),$('#above')])flipScreen.append(element);
}

// In 04.7 the camera stops at the hole's chapter (HOLD): the rabbit dives, then the projects come.
const RATIO=.34,scales=panels.map((_,i)=>RATIO**i),centres=[0],BACK=1.6,START=BACK*.7,SINK=TOP?0:.7,HOLD=TOP?1.1:0,TOTAL=START+SINK+2+HOLD+(FLIP?7.25:0);
const surface=$('#wall-surface'),dock=$('#rabbit-dock'),hole6=$('.burrow-hole'),cards=[...document.querySelectorAll('.burrow-card')];
let Yr=0,tStar=0,dockX=0,dockY=0,dockDepth=0,floor=0,origins=[],lastKey='',lastMark='',lastFall=-1,fit=1,segment=1100,mobile=false,lower=0,spacing=830;
let up=0,warming=!reduced,roomEntering=false,roomFlight=null,reading=false,roomOpen=false,hoverLast=false,u=0,cardBase=[];
const mark=mountMark($('#wall-rabbit')),fall=mountFall($('[data-fall]'),{center:true});
const hb=mark.holeBox,bb=mark.bunBox,depth=hb.y+hb.height-bb.y;
hole6.setAttribute('viewBox',`${hb.x} ${hb.y} ${hb.width} ${hb.height}`);

let finalHole=null,returningHome=false,finalSettledAt=0;
if(FLIP){
  finalHole=document.createElement('button');
  finalHole.className='final-return-hole';finalHole.hidden=true;
  finalHole.setAttribute('aria-label','Return to Tomorrow');
  finalHole.innerHTML=`<svg viewBox="${hb.x} ${hb.y} ${hb.width} ${hb.height}" fill="currentColor" aria-hidden="true"><use href="#tc-holeshape"/></svg>`;
  body.append(finalHole);
  finalHole.onclick=async()=>{
    if(returningHome)return;returningHome=true;
    const rabbit=$('.final-rabbit'),r=rabbit.getBoundingClientRect(),h=finalHole.getBoundingClientRect();
    const clip=document.createElement('div');
    Object.assign(clip.style,{position:'fixed',inset:`0 0 ${innerHeight-h.top-h.height/2}px`,overflow:'hidden',pointerEvents:'none',zIndex:101});
    const clone=rabbit.cloneNode(true);
    Object.assign(clone.style,{position:'absolute',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',color:'#fff'});
    clip.append(clone);body.append(clip);rabbit.style.visibility='hidden';
    await clone.animate([{transform:'translateY(0)'},{transform:`translateY(${h.top+h.height-r.top}px)`}],{duration:reduced?1:850,easing:'cubic-bezier(.55,0,.9,.5)',fill:'forwards'}).finished;
    flipScreen.style.transition='none';
    up=0;scrollTo({top:0,behavior:'instant'});lastKey='';lastMark='';
    clip.remove();rabbit.style.visibility='';finalHole.hidden=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{flipScreen.style.transition='';returningHome=false}));
  };
}

function layout(){
  const iw=innerWidth,ih=innerHeight;mobile=iw<650;
  if(finalHole){const w=mobile?Math.min(iw*.24,100):Math.min(iw*.11,150);Object.assign(finalHole.style,{width:w+'px',height:(w*hb.height/hb.width)+'px',bottom:'5vh'})}
  fit=Math.max(.3,Math.min((iw-(mobile?40:100))/(mobile?700:1100),(ih-60)/650));
  if(FLIP){const heroHoleWidth=mobile?Math.min(iw*.24,100):Math.min(iw*.11,150);$('.final-rabbit').style.width=(840*heroHoleWidth/hb.width/fit)+'px'}
  segment=Math.max(850,ih*1.3);$('#scroll-track').style.height=(segment*TOTAL+ih)+'px';
  lower=ih*.1;spacing=(mobile?1280:830)*.8;
  for(let i=1;i<=LAST;i++)centres[i]=centres[i-1]+spacing*scales[i-1];
  floor=centres[LAST]+6;
  origins=panels.map(p=>{const o=getComputedStyle(p).transformOrigin.split(' ').map(parseFloat);return [surface.offsetLeft+p.offsetLeft+o[0],surface.offsetTop+p.offsetTop+o[1],p.offsetHeight,o[1],p.offsetWidth,o[0]]});
  if(TOP)layoutTop(iw,ih);else{
  // The dock: the rabbit and its hole, sized by the hole, sitting at the foot of the window.
  const wH=mobile?Math.min(iw*.24,100):Math.min(iw*.11,150),sc=wH/hb.width;
  // The mark lifts its hole over the head; the dock moves down by as much, so the hole stays
  // where it is and the rabbit is seen going down into it.
  const y0=ih-ih*.05-hb.height/2*sc,yEnd=y0;
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
function go(i){if(reading){panels[i].scrollIntoView({behavior:reduced?'instant':'smooth'});return}scrollTo({top:at(i<=LAST?START:i===6?START+SINK+1+HOLD:TOTAL),behavior:reduced?'instant':'smooth'})}
document.querySelectorAll('[data-stop]').forEach(b=>b.onclick=e=>{e.preventDefault();go(+b.dataset.stop)});
$('#little-door').onclick=()=>scrollTo({top:at(START+SINK),behavior:reduced?'instant':'smooth'});
$('#about-link').onclick=()=>$('#about-dialog').showModal();
$('#reset-wall').onclick=()=>{setDay(0);$('#help').close();reset()};
function toggleReading(force){reading=typeof force==='boolean'?force:!reading;body.classList.toggle('reading',reading);dock.hidden=reading;if(reading){viewport.removeAttribute('inert');scrollTo(0,0)}else{layout();reset()}}
async function enterRoom(){if($('#last-heading').hasAttribute('data-letter-portals')||roomOpen||roomEntering||reading)return;roomEntering=true;const r=$('#last-heading').getBoundingClientRect();viewport.style.transformOrigin=`${r.left+r.width*.18}px ${r.top+r.height*.3}px`;roomFlight=viewport.animate([{transform:'scale(1)'},{transform:'scale(34)'}],{duration:reduced?1:950,fill:'forwards',easing:'cubic-bezier(.6,0,.8,.4)'});await roomFlight.finished;roomOpen=true;roomEntering=false;$('#room').hidden=false;viewport.inert=true;$('#leave-room').focus();roomFlight.cancel()}
function leaveRoom(){if(!roomOpen)return;roomOpen=false;$('#room').hidden=true;viewport.inert=false;$('#last-heading').focus({preventScroll:true})}
$('#leave-room').onclick=leaveRoom;$('#room-tomorrow').onclick=()=>tomorrow(reset);
{const h=$('#last-heading');h.onpointerenter=()=>hoverLast=!h.hasAttribute('data-letter-portals');h.onpointerleave=()=>hoverLast=false;h.onclick=()=>{if(!h.hasAttribute('data-letter-portals'))enterRoom()};h.onkeydown=e=>{if(!h.hasAttribute('data-letter-portals')&&e.key==='Enter'){e.preventDefault();enterRoom()}}}
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
addEventListener('touchmove',e=>{if(touchY==null||reading)return;const y=e.touches[0].clientY,dy=y-touchY;touchY=y;
  if(up>0||(scrollY<=0&&dy>0)){e.preventDefault();lift(dy/(innerHeight*1.1))}},{passive:false});
addEventListener('keydown',e=>{if(reading||roomOpen||document.querySelector('dialog[open]'))return;
  if((e.key==='ArrowUp'||e.key==='PageUp')&&scrollY<=0&&up<1){e.preventDefault();lift(e.key==='PageUp'?.5:.15)}
  else if((e.key==='ArrowDown'||e.key==='PageDown'||e.key===' ')&&up>0){e.preventDefault();lift(e.key==='ArrowDown'?-.15:-.5)}});
$('#above-back').onclick=()=>{const from=up,t0=performance.now();const step=now=>{const k=clamp((now-t0)/900);up=from*(1-ease(k));lastKey='';if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)};
const overview=()=>Math.min(fit*.3,innerHeight*.4/(floor+300));
function camera(u=window.__u??0){
  if(u<START){// the pull-back of 04.1, backwards: distance shrinks linearly while descending
    const v=ease((START-u)/BACK),Z5=fit/scales[LAST],Zend=overview();
    return [1/((1-v)/Z5+v/Zend),centres[LAST]+(centres[0]-centres[LAST])*v];
  }
  let t=Math.max(0,u-START-SINK);if(t<=0)return [fit/scales[LAST],centres[LAST]];
  if(FLIP)t=t<=8.25?t/8.25:t-7.25;
  if(HOLD)t=t<=1?t:t<=1+HOLD?1:t-HOLD;
  const i=Math.min(6,LAST+Math.floor(t)),f=LAST+t-i;
  const scale=Math.exp(Math.log(scales[i])*(1-f)+Math.log(scales[i+1])*f);return [fit/scale,centres[i]+(centres[i+1]-centres[i])*f];
}
function frame(){
if(warming||!bootFontsReady){requestAnimationFrame(frame);return}
if(!reading&&!roomOpen){
  u=clamp(scrollY/segment,0,TOTAL);window.__u=u;
  if(finalHole){
    const settled=u>=TOTAL-.015&&up===0;
    if(!settled){finalSettledAt=0;finalHole.hidden=true}
    else{
      if(!finalSettledAt)finalSettledAt=performance.now();
      if(finalHole.hidden&&!returningHome&&performance.now()-finalSettledAt>=3000){
        finalHole.hidden=false;
        finalHole.animate([
          {transform:'translate(-50%,calc(5vh + 100%))',opacity:0},
          {transform:'translate(-50%,0)',opacity:1}
        ],{duration:reduced?1:650,easing:'cubic-bezier(.22,1,.36,1)'});
      }
    }
  }
  const key=`${u}|${up}|${innerWidth}|${innerHeight}`;
  if(key!==lastKey){lastKey=key;
    const [Z,cy]=camera(),half=innerHeight/2+80,inHole=TOP||u>=START+SINK;
    panels.forEach((p,j)=>{const [ox,oy,h,oyo]=origins[j],k=Z*scales[j],y=Z*(oy+(FLIP&&j===7?cy-centres[j]:centres[j]-cy))+lower;const top=y-oyo*k,bottom=y+(h-oyo)*k;
      const far=k<.004||bottom<-half||top>half||(j>LAST&&!inHole);if(far!==p.hasAttribute('hidden-far'))far?p.setAttribute('hidden-far',''):p.removeAttribute('hidden-far');
      if(!far&&j===LAST&&p.querySelector('[data-letter-portals]'))p.querySelectorAll('[data-letter-portals], .contact-link').forEach(element=>{element.style.transform=`translateY(${-60/k}px)`});
      if(!far)p.style.transform=`translate3d(${Z*ox-ox}px,${y-oy-(FLIP&&j===LAST?clamp((u-START-SINK)/.65)*innerHeight*.95:0)}px,0) scale(${k})${FLIP&&inHole&&j>LAST?' rotate(180deg)':''}`;if(p.inert!==far)p.inert=far});
    // The dock until the rabbit is gone; from then on, the hole belongs to the wall.
    if(!TOP)dock.style.visibility=inHole&&!FLIP?'hidden':'';
    if(FLIP){
      const inside=inHole&&up===0;
      hole6.style.visibility='hidden';flipScreen.classList.toggle('flipped',inside);body.classList.toggle('inside-burrow',inside);
      const flightTime=u-START-SINK;
      panels[LAST].style.opacity=1-ease(clamp((flightTime-.25)/.4));
      projectFlight.hidden=!inside;
      [...projectFlight.children].forEach((card,i)=>{
        const phase=flightTime-.65-i*1.05;
        const active=inside&&phase>=0&&phase<1.8;
        card.hidden=!active;card.inert=!active;
        if(active){
          // Arrive at the centre over 1.2 units, then leave in half that time.
          const entry=clamp(phase/1.2),exit=clamp((phase-1.2)/.6);
          const centreY=(innerHeight-card.offsetHeight)/2;
          const y=phase<=1.2
            ?innerHeight*.98+(centreY-innerHeight*.98)*entry
            :centreY+(-card.offsetHeight*1.9-centreY)*exit;
          const scale=phase<=1.2?.4+.6*entry:1+.65*exit;
          card.style.left='50%';
          card.style.transform=`translate(-50%,${y}px) scale(${scale})`;
          card.style.opacity=(.12+.88*ease(entry))*(1-ease(exit));
        }
      });

    }
    lookUp();
    const sink=TOP?ease(clamp((u-START-1)/.45)):u>0?ease(clamp((u-START)/SINK)):ease(clamp(up/.35)),m=sink.toFixed(4);if(m!==lastMark){lastMark=m;mark.set(sink,0,1);if(TOP){dock.style.visibility=sink>=1?'hidden':''}else dock.style.transform=`translate(${dockX}px,${dockY+dockDepth*sink}px)`}
    const fa=Math.round(clamp((u/START-.15)/.4)*1000)/1000;if(fa!==lastFall){lastFall=fa;fall(fa)}
    // Projects come up from below and out of nothing, one after another, once the rabbit is in.
    const t=u-START-SINK;
    cards.forEach((c,k)=>{const l=ease(clamp((t-(TOP?1.5:.12)-k*.17)/.45)),dy=(1-l)*(mobile?260:170);c.style.transform=`translate(${-cardBase[k].w/2+cardBase[k].dx}px,${dy}px)`;c.style.opacity=l.toFixed(3)});
  }
  if(FLIP&&!reduced&&u>=START+SINK&&up===0){
      const now=performance.now(),dt=Math.min(.05,(now-tunnelLastTime)/1000);
      const scrollSpeed=Math.abs(scrollY-tunnelLastScroll)/Math.max(.001,dt);
      tunnelSpeed+=(170+Math.min(1800,scrollSpeed*.75)-tunnelSpeed)*(1-Math.exp(-dt*8));
      tunnelTravel+=tunnelSpeed*dt;
      const distance=tunnelTravel;
      const speedStretch=Math.pow(clamp((tunnelSpeed-170)/1500),.8);
      tunnelLines.forEach((line,i)=>{
        // Shared vanishing point: streaks travel upwards along the tunnel walls.
        const laneX=((i*.61803398875+.025)%1)*.94+.03;
        const wallDepth=.35+.65*Math.abs(laneX-.5)*2;
        // Converge below the viewport; central streaks remain almost vertical.
        const slope=(.5-laneX)*innerWidth/(innerHeight*4);
        const density=i<24?1:clamp((speedStretch-(i-24)/48)*3);
        const span=innerHeight*1.45;
        const y=((i*173-distance*(.45+wallDepth*.9))%span+span)%span-innerHeight*.18;
        const x=innerWidth*laneX+slope*(y-innerHeight*.5);
        const depth=clamp((y+innerHeight*.18)/span);
        line.style.left='0';line.style.transformOrigin='top center';
        line.style.height=(45+depth*180*wallDepth+speedStretch*innerHeight*.95*(.6+wallDepth*.4))+'px';
        line.style.opacity=((.08+depth*.28*wallDepth)*density).toFixed(3);
        line.style.transform=`translate(${x}px,${y}px) rotate(${-Math.atan(slope)}rad)`;
      });
  }
  tunnelLastTime=performance.now();tunnelLastScroll=scrollY;
  watchEdit();
}else if(reading){watchEdit();panels.forEach(p=>{p.inert=false;p.removeAttribute('hidden-far')})}document.documentElement.classList.remove('hero-loading');requestAnimationFrame(frame)}
document.fonts.ready.then(layout);addEventListener("resize",layout);body.classList.remove('reading');body.classList.add('flat');layout();if(reduced)toggleReading(true);requestAnimationFrame(frame);
// Safari rasters a layer at the scale it is first shown and redraws it each time that scale
// grows; draw every chapter once at full size, invisibly, before showing the far view.
if(warming){viewport.style.opacity=FLIP?'0':'.01';panels.forEach(p=>{p.removeAttribute('hidden-far');p.style.transform=`scale(${fit})`});let n=0;const tick=()=>{if(++n<4)requestAnimationFrame(tick);else{warming=false;lastKey='';requestAnimationFrame(()=>viewport.style.opacity='')}};requestAnimationFrame(tick)}
if(location.hash){const target=document.querySelector(location.hash);if(target?.dataset.panel)setTimeout(()=>go(+target.dataset.panel),50)}
$('.skip-link').onclick=e=>{e.preventDefault();go(7)};
