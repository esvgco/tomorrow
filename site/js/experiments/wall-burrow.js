import {clamp,ease,reduced,tomorrow,setDay,mountFall,mountGaps,watchEdit} from './shared.js';
import {mountMark} from '../mark.js';
import {mountDoor} from './door-ink.js';
import {mountWallGL} from './wall-gl.js';
// The wall, and what is under it (04.11). 04.10 taken further; drawn in WebGL (wall-gl.js),
// and without WebGL the same page moves its chapters directly and is simply not bent.
//
// The walk, in scroll segments:
//   1. START  from the whole wall, seen from afar, to the last screen. The rabbit waits at
//             the foot of the window.
//   2. SINK   the rabbit goes into its hole. It starts going before the camera has arrived
//             and the camera leaves again as it disappears, so the walk never stands still:
//             it slows down, and picks up.
//   3. +1     the hole is now a chapter of the wall and rises. What the rabbit found comes
//             out of it: three projects, squeezed through the hole one after another, each
//             with its own page under it in very small print.
//   4. +1     on to the last chapter: About and Contact.
//
// A project opens where it is: the camera goes into the small print until it is a page. It
// is the same move as the whole walk, only by a click, and the rest of the wall fades. Any
// scroll, Back or Escape comes out again.
//
// Above the first screen is a white screen to draw on; the door found there leads to a few
// lines that are walked through, forward, and out into the next day.
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],body=document.body,viewport=$('#viewport');
const panels=$$('[data-panel]'),LAST=5,HOLE=6;
const RATIO=.34,scales=panels.map((_,i)=>RATIO**i),centres=[0],BACK=1.6,START=BACK*.7,LEAD=.42,SINK=.22,TOTAL=START+SINK+2;
const surface=$('#wall-surface'),dock=$('#rabbit-dock'),hole6=$('.burrow-hole'),cards=$$('.burrow-card'),pages=$$('.project-page');
let dockX=0,dockY=0,dockDepth=0,floor=0,origins=[],lastKey='',lastMark='',lastFall=-1,fit=1,segment=1100,mobile=false,lower=0,spacing=830,stableH=0,wide=0;
let up=0,warming=!reduced,roomEntering=false,roomFlight=null,reading=false,roomOpen=false,hoverLast=false,u=0;
const mark=mountMark($('#wall-rabbit'));
const hb=mark.holeBox,bb=mark.bunBox,depth=hb.y+hb.height-bb.y;
hole6.setAttribute('viewBox',`${hb.x} ${hb.y} ${hb.width} ${hb.height}`);
const LENS=reduced?0:Math.max(0,parseFloat(new URLSearchParams(location.search).get('lens')??1)||0);
// While the rabbit waits at the foot of the window, the wall comes up to it out of nothing:
// a white mist lies over the foot of the wall, under the rabbit, and lifts as it goes down.
const mist=document.createElement('div');mist.className='foot-mist';dock.before(mist);
const glw=LENS?mountWallGL(viewport,panels,{flare:.9*LENS}):null;
if(!glw)body.classList.remove('wall-gl');
// Sprites: the cards and their pages move by themselves inside the hole's chapter.
const cardSprite=cards.map(c=>glw?.sprite(c,HOLE,{funnel:true})),pageSprite=pages.map(p=>glw?.sprite(p,HOLE,{rest:.12,funnel:true}));
const fallHost=$('[data-fall]'),fallLayer=glw?.paint(fallHost,1,170),fall=mountFall(fallHost,{center:true,paint:fallLayer?list=>fallLayer.set(list):null});
// Where the page's own elements should be. In WebGL they are only there for the pointer, so
// they are moved once the camera has come to rest, not on every frame.
let settle=new Map();
const move=(el,t)=>{if(glw)settle.set(el,t);else el.style.transform=t};

// Written only when it differs: a write inside a chapter makes WebGL read the chapter again.
const put=(el,o)=>{for(const k in o)if(el.style[k]!==o[k])el.style[k]=o[k]};
// Places inside the hole's chapter, in its own pixels.
let holeAt=[0,0],rest=[],pageSize=[1100,650],S0=.1,pageFit=1;
function layout(){
  const iw=innerWidth,ih=innerHeight;mobile=iw<650;
  // A phone's toolbar comes and goes while scrolling and changes the height of the window;
  // the length of the walk must not change with it, or the page jumps under the finger.
  if(iw!==wide||Math.abs(ih-stableH)>160){wide=iw;stableH=ih}
  fit=Math.max(.3,Math.min((iw-(mobile?40:100))/(mobile?700:1100),(stableH-60)/650));
  segment=Math.max(850,stableH*1.3);$('#scroll-track').style.height=(segment*TOTAL+stableH)+'px';
  lower=ih*.1;spacing=(mobile?1280:830)*.8*1.36;
  for(let i=1;i<=LAST;i++)centres[i]=centres[i-1]+spacing*scales[i-1];
  floor=centres[LAST]+6;
  origins=panels.map(p=>{const o=getComputedStyle(p).transformOrigin.split(' ').map(parseFloat);return [surface.offsetLeft+p.offsetLeft+o[0],surface.offsetTop+p.offsetTop+o[1],p.offsetHeight,o[1],p.offsetWidth,o[0]]});
  // The dock: the rabbit and its hole, sized by the hole, sitting at the foot of the window.
  // The mark lifts its hole over the head; the dock moves down by as much, so the hole stays
  // where it is and the rabbit is seen going down into it.
  const wH=(mobile?Math.min(iw*.24,100):Math.min(iw*.11,150))*.84,sc=wH/hb.width,y0=ih-ih*.05-hb.height/2*sc;
  dockX=iw/2-(hb.x+hb.width/2-882)*sc;dockY=y0-(hb.y+hb.height/2-264)*sc;dockDepth=depth*sc;
  Object.assign(dock.style,{width:932*sc+'px',height:1251*sc+'px'});
  mist.style.height=ih-(y0+hb.height/2*sc-depth*sc)+(mobile?70:110)+'px';
  // The hole as a chapter: the size and place that project exactly onto the dock's hole
  // when the camera stands at the last screen.
  const [,oy,PH,oyo,PW]=origins[HOLE],k6=fit*RATIO,Z5=fit/scales[LAST],W6=wH/k6,H6=W6*hb.height/hb.width,hy=PH*(mobile?.14:.07);
  put(hole6,{width:W6+'px',height:H6+'px',left:PW/2-W6/2+'px',top:hy-H6/2+'px'});
  centres[HOLE]=centres[LAST]-oy+((y0-ih/2)-lower-(hy-oyo)*k6)/Z5;
  centres[HOLE+1]=centres[HOLE]+spacing*scales[HOLE];
  // Where the projects come to lie: scattered under the hole on a wide screen, one under
  // another on a phone. Under each, its page, very small.
  holeAt=[PW/2,hy];pageSize=[pages[0].offsetWidth,pages[0].offsetHeight];S0=mobile?.13:.1;
  pageFit=Math.min(1.1,(iw-(mobile?32:120))/pageSize[0],(ih-(mobile?50:90))/pageSize[1]);
  const below=hy+H6/2+(mobile?80:70),spots=mobile?[[0,0],[0,262],[0,524]]:[[-.3,0],[.02,118],[.31,30]];
  rest=cards.map((c,k)=>{const w=c.offsetWidth,h=c.offsetHeight,cx=PW/2+spots[k][0]*PW,top=below+spots[k][1];
    return {w,h,cx,top,page:[cx-pageSize[0]*S0/2,top+h+(mobile?20:16)]}});
  pageSprite.forEach(s=>s?.sharpen(0));
  glw?.rest(fit);glw?.layout();lastKey='';lastMark='';
}
function reset(){scrollTo(0,0);leaveRoom()}
const at=v=>v*segment;
function go(i){if(reading){panels[i].scrollIntoView({behavior:reduced?'instant':'smooth'});return}scrollTo({top:at(i<=LAST?START:i===HOLE?START+SINK+1:TOTAL),behavior:reduced?'instant':'smooth'})}
$$('[data-stop]').forEach(b=>b.onclick=e=>{e.preventDefault();go(+b.dataset.stop)});
$('#about-link').onclick=()=>$('#about-dialog').showModal();
$('#reset-wall').onclick=()=>{setDay(0);$('#help').close();reset()};
function toggleReading(force){reading=typeof force==='boolean'?force:!reading;body.classList.toggle('reading',reading);dock.hidden=reading;if(reading){viewport.removeAttribute('inert');scrollTo(0,0)}else{layout();reset()}}
async function enterRoom(){if(roomOpen||roomEntering||reading||open>=0)return;roomEntering=true;const r=$('#last-heading').getBoundingClientRect();viewport.style.transformOrigin=`${r.left+r.width*.18}px ${r.top+r.height*.3}px`;roomFlight=viewport.animate([{transform:'scale(1)'},{transform:'scale(34)'}],{duration:reduced?1:950,fill:'forwards',easing:'cubic-bezier(.6,0,.8,.4)'});await roomFlight.finished;roomOpen=true;roomEntering=false;$('#room').hidden=false;viewport.inert=true;$('#leave-room').focus();roomFlight.cancel()}
function leaveRoom(){if(!roomOpen)return;roomOpen=false;$('#room').hidden=true;viewport.inert=false;$('#last-heading').focus({preventScroll:true})}
$('#leave-room').onclick=leaveRoom;$('#room-tomorrow').onclick=()=>tomorrow(reset);
{const h=$('#last-heading');h.onpointerenter=()=>hoverLast=true;h.onpointerleave=()=>hoverLast=false;h.onclick=enterRoom;h.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();enterRoom()}}}
addEventListener('wheel',e=>{if(reading||e.ctrlKey||document.querySelector('dialog[open]'))return;if(roomOpen||roomEntering){e.preventDefault();return}if(hoverLast&&u>START-.3&&u<START+SINK&&e.deltaY<0){e.preventDefault();enterRoom()}},{passive:false});
addEventListener('keydown',e=>{if(roomOpen){if(e.key==='Escape'){leaveRoom();e.preventDefault()}if(e.key==='Tab'){e.preventDefault();(document.activeElement===$('#leave-room')?$('#room-tomorrow'):$('#leave-room')).focus()}}});
mountGaps((x,y)=>{if(reading){tomorrow();return}viewport.style.transformOrigin=`${x}px ${y}px`;const a=viewport.animate([{transform:'scale(1)'},{transform:'scale(20)',opacity:0}],{duration:reduced?1:650,fill:'forwards',easing:'cubic-bezier(.6,0,1,1)'});a.onfinish=()=>{tomorrow(()=>{a.cancel()})}});

// ---------- A project, opened where it is ----------
// open: which one, or -1. shown: 0 on the wall, 1 on its page; it runs on the clock.
let open=-1,shown=0,aim=0,openedAt=0,pushed=false,clock=0;
// The address names the project, but is not the id of anything: a browser scrolls to an id.
const slug=k=>'project-'+pages[k].dataset.slug,named=()=>pages.findIndex((p,k)=>'#'+slug(k)===location.hash);
function openProject(k,instant=false){
  if(reading||roomOpen||open===k&&aim===1)return;
  if(open<0||shown===0){open=k;pageSprite[k]?.sharpen(pageFit)}else if(open!==k)return;
  aim=1;openedAt=scrollY;if(instant)shown=1;
  if(location.hash!=='#'+slug(k)){history.pushState({project:k},'','#'+slug(k));pushed=true}
  lastKey='';
}
function closeProject(viaHistory=false){
  if(open<0||aim===0)return;aim=0;lastKey='';
  if(!viaHistory&&location.hash==='#'+slug(open)){if(pushed){pushed=false;history.back()}else history.replaceState(null,'',location.pathname+location.search)}
}
$$('[data-open]').forEach(b=>b.addEventListener('click',e=>{if(e.target.closest('a,[data-back]'))return;const k=+b.dataset.open;
  // From the list in the fourth chapter: walk down to the hole first, then go in.
  if(u<START+SINK+.6){go(HOLE);const wait=()=>{if(Math.abs(scrollY-at(START+SINK+1))<4)openProject(k);else if(scrollY<at(START+SINK+1)+4)requestAnimationFrame(wait)};setTimeout(wait,reduced?0:300)}else openProject(k)}));
$$('[data-back]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();closeProject()}));
addEventListener('keydown',e=>{if(e.key==='Escape'&&open>=0&&aim===1){e.preventDefault();closeProject()}});
addEventListener('popstate',()=>{const k=named();if(k>=0)openProject(k);else closeProject(true)});

// ---------- Looking up ----------
// From the first screen you can also scroll up. Then the hole stays where it is, the
// rabbit drops into it, and the wall slides down in perspective: we did not move, we
// raised our head. Above the wall is a white screen with one word, and a door to find.
const above=$('#above'),TILT=62*Math.PI/180;
// ---------- Behind the door ----------
// A few lines, one behind another. Scrolling walks forward through them, as the wall is
// walked, and past the last one is the next day. Scrolling back leaves by the door.
const beyond={el:$('#beyond'),lines:$$('#beyond [data-line]'),p:0,active:false,done:null,key:''};
beyond.enter=done=>{beyond.done=done;beyond.p=0;beyond.active=true;beyond.key='';beyond.el.hidden=false;beyond.el.classList.remove('leaving');void beyond.el.offsetWidth;beyond.el.classList.add('in')};
beyond.leave=()=>{if(!beyond.active)return;beyond.active=false;beyond.el.hidden=true;beyond.el.classList.remove('in');beyond.done?.();lastKey=''};
beyond.on=()=>{if(!beyond.active)return;beyond.active=false;tomorrow(()=>{beyond.el.hidden=true;beyond.el.classList.remove('in');beyond.done?.();up=0;scrollTo(0,0);lastKey='';lastMark=''})};
beyond.step=d=>{if(!beyond.active)return;beyond.p+=d;const last=beyond.lines.length-1;if(beyond.p<-.4)beyond.leave();else if(beyond.p>last+.45)beyond.on();else beyond.p=clamp(beyond.p,-.4,last+.45)};
beyond.draw=()=>{if(!beyond.active)return;const key=beyond.p.toFixed(4)+innerHeight;if(key===beyond.key)return;beyond.key=key;const ih=innerHeight;
  beyond.lines.forEach((l,i)=>{const d=beyond.p-i,s=Math.pow(2.4,d),o=d<0?Math.pow(clamp(1+d/2.3),1.6):1-clamp(d/.5);
    l.style.transform=`translate(-50%,-50%) translateY(${(s<1?(1-s)*ih*.2:-(s-1)*ih*.3).toFixed(1)}px) scale(${(s/1.6).toFixed(4)})`;l.style.opacity=o.toFixed(3);l.style.visibility=o<.01?'hidden':'';l.inert=Math.abs(d)>.3})};
$('#beyond-on').onclick=beyond.on;$('#beyond-back').onclick=beyond.leave;
const door=mountDoor(above,{reduced,onEnter:done=>beyond.enter(done)});
function lookUp(){
  const a=TILT*ease(clamp((up-.2)/.8)),P=innerHeight*1.1;
  viewport.style.transform=a?`perspective(${P}px) translateZ(${P}px) rotateX(${a}rad) translateZ(${-P}px)`:'';
  above.classList.toggle('shown',a>0);above.classList.toggle('drawable',up>=1);
  above.style.transform=up>=1?'':`perspective(${P}px) translateZ(${P}px) rotateX(${a-TILT}rad) translateZ(${-P}px)`;
}
function lift(d){const before=up;up=clamp(up+d,0,1);if(up!==before)lastKey=''}
addEventListener('wheel',e=>{if(reading||roomOpen||document.querySelector('dialog[open]'))return;
  if(beyond.active){e.preventDefault();beyond.step(e.deltaY*(e.deltaMode===1?16:1)/(innerHeight*.75));return}
  if(up>0||(scrollY<=0&&e.deltaY<0)){e.preventDefault();lift(-e.deltaY*(e.deltaMode===1?16:1)/(innerHeight*1.4))}},{passive:false});
let touchY=null;
addEventListener('touchstart',e=>{touchY=e.target.closest('.above-ink')&&up>=1&&!beyond.active?null:e.touches[0].clientY},{passive:true});
addEventListener('touchmove',e=>{if(touchY==null||reading)return;const y=e.touches[0].clientY,dy=y-touchY;touchY=y;
  if(beyond.active){e.preventDefault();beyond.step(-dy/(innerHeight*.45));return}
  if(up>0||(scrollY<=0&&dy>0)){e.preventDefault();lift(dy/(innerHeight*1.1))}},{passive:false});
addEventListener('keydown',e=>{if(reading||roomOpen||document.querySelector('dialog[open]'))return;
  if(beyond.active){if(e.key==='Escape'){e.preventDefault();beyond.leave()}else if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();beyond.step(.5)}else if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();beyond.step(-.5)}return}
  if((e.key==='ArrowUp'||e.key==='PageUp')&&scrollY<=0&&up<1){e.preventDefault();lift(e.key==='PageUp'?.5:.15)}
  else if((e.key==='ArrowDown'||e.key==='PageDown'||e.key===' ')&&up>0){e.preventDefault();lift(e.key==='ArrowDown'?-.15:-.5)}});
$('#above-back').onclick=()=>{const from=up,t0=performance.now();const step=now=>{const k=clamp((now-t0)/900);up=from*(1-ease(k));lastKey='';if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)};

// ---------- The camera ----------
// [Z, cx, cy]: a point (X, Y) of the wall is seen at (iw/2 + Z(X-cx), ih/2 + Z(Y-cy) + lower).
const overview=()=>Math.min(fit*.3,innerHeight*.4/(floor+300));
function walk(u){
  if(u<START){// from afar: distance shrinks linearly while descending, and eases to a stop
    const v=ease((START-u)/BACK),Z5=fit/scales[LAST],Zend=overview();
    return [1/((1-v)/Z5+v/Zend),0,centres[LAST]+(centres[0]-centres[LAST])*v];
  }
  const t=Math.max(0,u-START-SINK);if(t<=0)return [fit/scales[LAST],0,centres[LAST]];
  const i=Math.min(HOLE,LAST+Math.floor(t));let f=LAST+t-i;
  // Leaving the last screen it picks up from rest, as gently as it came to it.
  if(i===LAST)f=2*f*f-f*f*f;
  const scale=Math.exp(Math.log(scales[i])*(1-f)+Math.log(scales[i+1])*f);return [fit/scale,0,centres[i]+(centres[i+1]-centres[i])*f];
}
// Where a project's page is when it lies under its card, as a place on the wall.
function pageView(k){const [ox,oy,,oyo,,oxo]=origins[HOLE],s=scales[HOLE],[px,py]=rest[k].page,Z=pageFit/(s*S0);
  return [Z,ox+s*(px+pageSize[0]*S0/2-oxo),oy+centres[HOLE]+s*(py+pageSize[1]*S0/2-oyo)+lower/Z];}
function camera(){
  const from=walk(u);if(open<0||!shown)return from;
  // Into the page: the zoom runs evenly, and the page comes to the middle as it grows.
  const to=pageView(open),e=ease(shown),Z=Math.exp(Math.log(from[0])*(1-e)+Math.log(to[0])*e),w=(1-e)*from[0]/Z;
  return [Z,to[1]+(from[1]-to[1])*w,to[2]+(from[2]-to[2])*w];
}
function frame(now){
if(warming){requestAnimationFrame(frame);return}
const dt=Math.min(64,now-clock||16);clock=now;
if(!reading&&!roomOpen){
  u=clamp(scrollY/segment,0,TOTAL);
  // A project on its page: any scroll comes out of it.
  if(open>=0){if(aim===1&&Math.abs(scrollY-openedAt)>28)closeProject();
    const before=shown;shown=clamp(shown+(aim?1:-1)*dt/(reduced?1:1150));
    if(shown!==before)lastKey='';
    if(shown===1&&before<1)pages[open].querySelector('[data-back]').focus({preventScroll:true});
    if(shown===0&&!aim){pageSprite[open]?.sharpen(0);open=-1;lastKey=''}}
  const key=`${u}|${up}|${shown}|${open}|${innerWidth}|${innerHeight}`;
  if(key!==lastKey){lastKey=key;
    const iw=innerWidth,ih=innerHeight,[Z,cx,cy]=camera(),half=ih/2+80,inHole=u>=START+SINK,e=open>=0?ease(shown):0,wall=1-ease(clamp(e*1.6));
    panels.forEach((p,j)=>{const [ox,oy,h,oyo]=origins[j],k=Z*scales[j],x=Z*(ox-cx)-ox,y=Z*(oy+centres[j]-cy)+lower;const top=y-oyo*k,bottom=y+(h-oyo)*k;
      const far=k<.004||(j!==HOLE||!e)&&(bottom<-half||top>half)||(j>LAST&&!inHole&&!e);if(far!==p.hasAttribute('hidden-far'))far?p.setAttribute('hidden-far',''):p.removeAttribute('hidden-far');
      glw?.panel(j,x,y-oy,k,far,wall);if(!far)move(p,glw?`translate(${x}px,${y-oy}px) scale(${k})`:`translate3d(${x}px,${y-oy}px,0) scale(${k})`);if(p.inert!==far)p.inert=far});
    // The dock until the rabbit is gone; from then on, the hole belongs to the wall.
    dock.style.visibility=inHole?'hidden':'';dock.style.opacity=wall===1?'':wall.toFixed(3);
    lookUp();
    // The rabbit goes down as the camera arrives and is gone as it leaves.
    const going=clamp((u-(START-LEAD))/(LEAD+SINK)),flat=1-ease(clamp(up/.3)),t=u-START-SINK;
    // The foot of the lens is flat by the time the rabbit is gone, so that the hole it leaves
    // and the hole on the wall are the same pixels; it bends again as that hole rises.
    // Raising the head flattens all of it, and so does a project's page: it is for reading.
    const foot=flat*(t<0?1-ease(clamp(going/.8)):ease(clamp(t/.5)));
    glw?.lens(flat*(1-e),foot*(1-e));
    mist.style.opacity=(flat*wall*(1-ease(clamp(going/.85)))).toFixed(3);
    const sink=Math.max(ease(going),ease(clamp(up/.35))),m=sink.toFixed(4);if(m!==lastMark){lastMark=m;mark.set(sink,0,1);dock.style.transform=`translate(${dockX}px,${dockY+dockDepth*sink}px)`}
    const fa=Math.round(clamp((u/START-.15)/.4)*1000)/1000;if(fa!==lastFall){lastFall=fa;fall(fa)}
    // What the rabbit found comes out of the hole: each project starts inside it, small, is
    // squeezed through the funnel under it and opens out where it comes to lie. Its page
    // appears under it once it is there.
    cards.forEach((c,k)=>{const r=rest[k],mine=open===k?e:0,l=Math.max(ease(clamp((t-.3-k*.15)/.5)),mine),s=.3+.7*l;
      const x=holeAt[0]+(r.cx-holeAt[0])*l-r.w*s/2,y=holeAt[1]+(r.top-holeAt[1])*l,o=clamp(l*5)*wall;
      cardSprite[k]?.set(x,y,s,o);move(c,`translate(${x}px,${y}px) scale(${s})`);if(!glw)c.style.opacity=o.toFixed(3);
      const ps=S0*s,px=x+r.w*s/2-pageSize[0]*ps/2,py=y+(r.page[1]-r.top)*s,po=Math.max(clamp((l-.7)/.3)*wall,mine?clamp(e*3):0);
      pageSprite[k]?.set(px,py,ps,po);move(pages[k],`translate(${px}px,${py}px) scale(${ps})`);if(!glw)pages[k].style.opacity=po.toFixed(3);
      pages[k].inert=!(open===k&&shown>.9)});
    if(glw){const [ox,oy,,oyo,,oxo]=origins[HOLE],k=Z*scales[HOLE],on=ease(clamp(t/.25))*(1-ease(clamp((t-1.05)/.3)))*(1-e);
      glw.funnel(iw/2+Z*(ox-cx)+k*(holeAt[0]-oxo),ih/2+Z*(oy+centres[HOLE]-cy)+lower+k*(holeAt[1]-oyo),k*(rest[0].top-holeAt[1])*.92,on);glw.touch()}
  }
  if(glw){if(settle.size&&glw.idle&&(open<0||shown===aim)){settle.forEach((t,el)=>el.style.transform=t);settle.clear()}glw.tick()}
  beyond.draw();watchEdit();
}else if(reading){watchEdit();panels.forEach(p=>{p.inert=false;p.removeAttribute('hidden-far')});pages.forEach(p=>p.inert=false)}requestAnimationFrame(frame)}
document.fonts.ready.then(()=>{glw?.reread();layout()});addEventListener('resize',layout);body.classList.remove('reading');body.classList.add('flat');layout();if(reduced)toggleReading(true);requestAnimationFrame(frame);
// Give the page a few frames to draw every chapter before showing the far view.
if(warming){viewport.style.opacity='.01';let n=0;const tick=()=>{if(++n<4)requestAnimationFrame(tick);else{warming=false;lastKey='';requestAnimationFrame(()=>viewport.style.opacity='')}};requestAnimationFrame(tick)}
if(location.hash){const k=named(),target=k<0&&document.querySelector(location.hash);
  if(k>=0&&!reduced)setTimeout(()=>{scrollTo(0,at(START+SINK+1));u=START+SINK+1;openProject(k,true)},80);else if(target?.dataset?.panel)setTimeout(()=>go(+target.dataset.panel),50)}
$('.skip-link').onclick=e=>{e.preventDefault();go(7)};
