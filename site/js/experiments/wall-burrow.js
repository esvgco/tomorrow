import {clamp,ease,reduced,tomorrow,setDay,mountFall,mountGaps,watchEdit} from './shared.js';
import {mountMark} from '../mark.js';
import {mountDoor} from './door-ink.js';
import {mountWallGL} from './wall-gl.js';
// The wall, and what is under it (04.11). 04.10 taken further; drawn in WebGL (wall-gl.js),
// and without WebGL the same page moves its chapters directly and is simply not bent.
//
// The walk never stands still. In scroll segments:
//   1. START  from the whole wall, seen from afar, to the last screen: fast at first, and
//             slowing to the pace of the rest by the time the last screen is reached.
//   2. +1     on, at that pace, to the hole. The rabbit, waiting at the foot of the window,
//             goes down as the last screen arrives; then its hole lets go of the window and
//             travels with the wall (REL). What the rabbit found comes out of the hole: three
//             projects, squeezed through it and thrown down on the sheet anyhow.
//   3. +1     on to the last chapter: About and Contact.
//
// A project is not deeper in the wall, it is larger than it. Opening one steps back: the
// wall shrinks into the corner of a page that was there all along, too large to be seen.
// Any scroll, Back or Escape, or a touch of the small wall, steps forward again.
//
// Above the first screen is a white screen to draw on; the door found there opens on black,
// and in the black is the other side of the wall: the same studio, in rooms one behind
// another, walked forward through, and out into the next day.
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],body=document.body,viewport=$('#viewport');
const panels=$$('[data-panel]'),LAST=5,HOLE=6;
const RATIO=.34,RATE=Math.log(1/RATIO),scales=panels.map((_,i)=>RATIO**i),centres=[0],START=1.12,LEAD=.45,REL=.3,TOTAL=START+2;
const surface=$('#wall-surface'),dock=$('#rabbit-dock'),hole6=$('.burrow-hole'),cards=$$('.burrow-card'),pages=$$('.project-page');
let floor=0,origins=[],lastKey='',lastMark='',lastFall=-1,fit=1,segment=1100,mobile=false,lower=0,spacing=830,VH=0,wide=0;
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
// Sprites: the cards and the pages move by themselves inside the hole's chapter.
const cardSprite=cards.map(c=>glw?.sprite(c,HOLE,{funnel:true})),pageSprite=pages.map(p=>glw?.sprite(p,HOLE,{rest:1.1}));
const fallHost=$('[data-fall]'),fallLayer=glw?.paint(fallHost,1,170),fall=mountFall(fallHost,{center:true,paint:fallLayer?list=>fallLayer.set(list):null});
// Where the page's own elements should be. In WebGL they are only there for the pointer, so
// they are moved once the camera has come to rest, not on every frame.
const settle=new Map(),move=(el,t)=>{if(glw)settle.set(el,t);else el.style.transform=t};
// Written only when it differs: a write inside a chapter makes WebGL read the chapter again.
const put=(el,o)=>{for(const k in o)if(el.style[k]!==o[k])el.style[k]=o[k]};

// The dock: the rabbit and its hole. hx, hy: where the hole's centre is inside it; wide: how
// wide the hole is; y0: where on the window it waits; sink: how far the mark lifts its hole.
const rabbit={hx:0,hy:0,wide:0,y0:0,sink:0};
// Places inside the hole's chapter, in its own pixels.
let holeAt=[0,0],holeWide=0,rest=[],pageSize=[1100,650],pageFit=1,pagePose=[0,0,1],pageCam=[1,0,0];
function layout(force){
  const iw=innerWidth;
  // A phone's toolbar comes and goes while scrolling and changes the height of the window.
  // That is not a new layout: the wall keeps the height it was laid out for, nothing is
  // measured again, and the walk keeps its length.
  if(force!==true&&iw===wide&&Math.abs(innerHeight-VH)<160)return;
  wide=iw;VH=innerHeight;const ih=VH;mobile=iw<650;
  fit=Math.max(.3,Math.min((iw-(mobile?40:100))/(mobile?700:1100),(ih-60)/650));
  segment=Math.max(850,ih*1.3);$('#scroll-track').style.height=(segment*TOTAL+ih)+'px';
  lower=ih*.1;spacing=(mobile?1280:830)*.8*1.36;
  for(let i=1;i<=LAST;i++)centres[i]=centres[i-1]+spacing*scales[i-1];
  floor=centres[LAST]+6;
  origins=panels.map(p=>{const o=getComputedStyle(p).transformOrigin.split(' ').map(parseFloat);return [surface.offsetLeft+p.offsetLeft+o[0],surface.offsetTop+p.offsetTop+o[1],p.offsetHeight,o[1],p.offsetWidth,o[0]]});
  const wH=(mobile?Math.min(iw*.24,100):Math.min(iw*.11,150))*.84,sc=wH/hb.width,y0=ih-ih*.05-hb.height/2*sc;
  Object.assign(rabbit,{hx:(hb.x+hb.width/2-882)*sc,hy:(hb.y+hb.height/2-264)*sc,wide:wH,y0,sink:depth*sc});
  Object.assign(dock.style,{width:932*sc+'px',height:1251*sc+'px'});
  // The mist reaches from a little above the ears to below the window, however tall it gets.
  const mh=ih-(y0+hb.height/2*sc-depth*sc)+(mobile?70:110),stop=(a,f)=>`rgba(255,255,255,${a}) ${(mh*f).toFixed(0)}px`;
  Object.assign(mist.style,{top:ih-mh+'px',height:mh+240+'px',background:`linear-gradient(to bottom,${stop(0,0)},${stop(.04,.05)},${stop(.18,.13)},${stop(.45,.23)},${stop(.74,.32)},${stop(.93,.41)},${stop(1,.5)},#fff 100%)`});
  // The hole as a chapter: the size and place that project exactly onto the waiting hole
  // when the camera is at the last screen.
  const [ox,oy,PH,oyo,PW,oxo]=origins[HOLE],s6=scales[HOLE],k6=fit*RATIO,Z5=fit/scales[LAST],W6=wH/k6,H6=W6*hb.height/hb.width,hy=PH*(mobile?.14:.07);
  put(hole6,{width:W6+'px',height:H6+'px',left:PW/2-W6/2+'px',top:hy-H6/2+'px'});
  centres[HOLE]=centres[LAST]-oy+((y0-ih/2)-lower-(hy-oyo)*k6)/Z5;
  centres[HOLE+1]=centres[HOLE]+spacing*s6;
  // Where the projects come to lie: thrown down under the hole, each at its own angle and
  // size. [across, as a share of the chapter's width; down, in pixels; turn, degrees; size]
  holeAt=[PW/2,hy];holeWide=W6;
  const below=hy+H6/2+(mobile?95:80),spots=mobile?[[-.05,0,-4,1],[.07,215,3.2,.9],[-.04,415,-1.6,1.05]]:[[-.27,0,-5,1],[.26,64,3.6,.88],[-.02,205,-1.6,1.1]];
  rest=cards.map((c,k)=>{const [ax,down,turn,size]=spots[k],w=c.offsetWidth,h=c.offsetHeight;
    return {w,h,size,turn:turn*Math.PI/180,cx:PW/2+ax*PW,cy:below+down+h*size/2}});
  // A project's page is larger than the wall by FAR. It is placed so that, when the camera
  // has stepped back that far, the page fills the window and the wall, small, sits in the
  // page's top right corner.
  const FAR=mobile?8.5:9,Zt=fit/s6/FAR;pageSize=[pages[0].offsetWidth,pages[0].offsetHeight];
  pageFit=Math.min(1.1,(iw-(mobile?32:120))/pageSize[0],(ih-(mobile?50:90))/pageSize[1]);
  const px=(iw-pageSize[0]*pageFit)/2,py=(ih-pageSize[1]*pageFit)/2,miniW=iw/FAR,miniH=ih/FAR,mx=px+pageSize[0]*pageFit-miniW/2,my=py+miniH/2;
  pageCam=[Zt,(iw/2-mx)/Zt,centres[HOLE]-(my+lower/FAR-ih/2-lower)/Zt];
  pagePose=[oxo+(px-iw/2-Zt*(ox-pageCam[1]))/(Zt*s6),oyo+(py-ih/2-lower-Zt*(oy+centres[HOLE]-pageCam[2]))/(Zt*s6),pageFit/(Zt*s6)];
  pages.forEach(p=>{p.style.setProperty('--mini-w',(miniW/pageFit).toFixed(1)+'px');p.style.setProperty('--mini-h',(miniH/pageFit).toFixed(1)+'px')});
  glw?.rest(fit);glw?.layout();lastKey='';lastMark='';
}
function reset(){scrollTo(0,0);leaveRoom()}
const at=v=>v*segment;
function go(i){if(reading){panels[i].scrollIntoView({behavior:reduced?'instant':'smooth'});return}scrollTo({top:at(i<=LAST?START:i===HOLE?START+1:TOTAL),behavior:reduced?'instant':'smooth'})}
$$('[data-stop]').forEach(b=>b.onclick=e=>{e.preventDefault();go(+b.dataset.stop)});
$('#about-link').onclick=()=>$('#about-dialog').showModal();
$('#reset-wall').onclick=()=>{setDay(0);$('#help').close();reset()};
function toggleReading(force){reading=typeof force==='boolean'?force:!reading;body.classList.toggle('reading',reading);dock.hidden=reading;if(reading){viewport.removeAttribute('inert');scrollTo(0,0)}else{layout(true);reset()}}
async function enterRoom(){if(roomOpen||roomEntering||reading||open>=0)return;roomEntering=true;const r=$('#last-heading').getBoundingClientRect();viewport.style.transformOrigin=`${r.left+r.width*.18}px ${r.top+r.height*.3}px`;roomFlight=viewport.animate([{transform:'scale(1)'},{transform:'scale(34)'}],{duration:reduced?1:950,fill:'forwards',easing:'cubic-bezier(.6,0,.8,.4)'});await roomFlight.finished;roomOpen=true;roomEntering=false;$('#room').hidden=false;viewport.inert=true;$('#leave-room').focus();roomFlight.cancel()}
function leaveRoom(){if(!roomOpen)return;roomOpen=false;$('#room').hidden=true;viewport.inert=false;$('#last-heading').focus({preventScroll:true})}
$('#leave-room').onclick=leaveRoom;$('#room-tomorrow').onclick=()=>tomorrow(reset);
{const h=$('#last-heading');h.onpointerenter=()=>hoverLast=true;h.onpointerleave=()=>hoverLast=false;h.onclick=enterRoom;h.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();enterRoom()}}}
addEventListener('wheel',e=>{if(reading||e.ctrlKey||document.querySelector('dialog[open]'))return;if(roomOpen||roomEntering){e.preventDefault();return}if(hoverLast&&Math.abs(u-START)<.25&&e.deltaY<0){e.preventDefault();enterRoom()}},{passive:false});
addEventListener('keydown',e=>{if(roomOpen){if(e.key==='Escape'){leaveRoom();e.preventDefault()}if(e.key==='Tab'){e.preventDefault();(document.activeElement===$('#leave-room')?$('#room-tomorrow'):$('#leave-room')).focus()}}});
mountGaps((x,y)=>{if(reading){tomorrow();return}viewport.style.transformOrigin=`${x}px ${y}px`;const a=viewport.animate([{transform:'scale(1)'},{transform:'scale(20)',opacity:0}],{duration:reduced?1:650,fill:'forwards',easing:'cubic-bezier(.6,0,1,1)'});a.onfinish=()=>{tomorrow(()=>{a.cancel()})}});

// ---------- A project, opened by stepping back ----------
// open: which one, or -1. shown: 0 at the wall, 1 at its page; it runs on the clock.
let open=-1,shown=0,aim=0,openedAt=0,pushed=false,clock=0;
// The address names the project, but is not the id of anything: a browser scrolls to an id.
const slug=k=>'project-'+pages[k].dataset.slug,named=()=>pages.findIndex((p,k)=>'#'+slug(k)===location.hash);
function openProject(k,instant=false){
  if(reading||roomOpen||open===k&&aim===1)return;
  if(open<0||shown===0)open=k;else if(open!==k)return;
  aim=1;openedAt=scrollY;if(instant)shown=1;
  if(location.hash!=='#'+slug(k)){history.pushState({project:k},'','#'+slug(k));pushed=true}
  lastKey='';
}
function closeProject(viaHistory=false){
  if(open<0||aim===0)return;aim=0;lastKey='';
  if(!viaHistory&&location.hash==='#'+slug(open)){if(pushed){pushed=false;history.back()}else history.replaceState(null,'',location.pathname+location.search)}
}
$$('[data-open]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const k=+b.dataset.open;
  // At a page, the cards are the small wall in its corner: touching it steps forward again.
  if(open>=0){closeProject();return}
  // From the list in the fourth chapter: walk down to the hole first, then step back.
  if(u<START+.75){go(HOLE);const wait=()=>{if(Math.abs(scrollY-at(START+1))<4)openProject(k);else if(scrollY<at(START+1)+4)requestAnimationFrame(wait)};setTimeout(wait,reduced?0:300)}else openProject(k)}));
$$('[data-back]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();closeProject()}));
viewport.addEventListener('click',e=>{if(open>=0&&shown===1&&!e.target.closest('.project-page'))closeProject()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&open>=0&&aim===1){e.preventDefault();closeProject()}});
addEventListener('popstate',()=>{const k=named();if(k>=0)openProject(k);else closeProject(true)});

// ---------- Looking up ----------
// From the first screen you can also scroll up. Then the hole stays where it is, the
// rabbit drops into it, and the wall slides down in perspective: we did not move, we
// raised our head. Above the wall is a white screen with one word, and a door to find.
const above=$('#above'),TILT=62*Math.PI/180;
// ---------- Behind the door ----------
// The door opens on black, and the black has depth: rooms of white text one behind another.
// Scrolling walks forward. A room grows from small, is read at its own size, and goes by.
// Far ahead is a white point; past the last room it is the whole window, and that is the
// next day. Scrolling back out of the first room leaves by the door.
const inv=(a,b,v)=>clamp((v-a)/(b-a));
const beyond={el:$('#beyond'),far:$('#beyond .beyond-far'),rooms:$$('#beyond .chamber').map(el=>({el,c:+el.dataset.c,span:+el.dataset.span||1.05,on:null})),p:0,aim:null,active:false,done:null,key:''};
beyond.max=beyond.rooms[beyond.rooms.length-1].c;
beyond.enter=done=>{beyond.done=done;beyond.p=-.8;beyond.aim=0;beyond.active=true;beyond.key='';beyond.el.hidden=false};
beyond.close=()=>{beyond.active=false;beyond.el.hidden=true;beyond.done?.()};
beyond.leave=()=>{if(beyond.active){beyond.close();lastKey=''}};
beyond.on=()=>{if(!beyond.active)return;beyond.active=false;tomorrow(()=>{beyond.close();up=0;scrollTo(0,0);lastKey='';lastMark=''})};
beyond.step=d=>{if(!beyond.active)return;beyond.aim=null;beyond.p+=d;if(beyond.p<-.85)beyond.leave();else if(beyond.p>beyond.max+.62)beyond.on()};
beyond.draw=dt=>{if(!beyond.active)return;
  // Coming in, the first room arrives by itself.
  if(beyond.aim!=null){beyond.p+=(beyond.aim-beyond.p)*Math.min(1,dt/260);if(Math.abs(beyond.aim-beyond.p)<.003){beyond.p=beyond.aim;beyond.aim=null}}
  const p=beyond.p,key=p.toFixed(4)+innerWidth+innerHeight;if(key===beyond.key)return;beyond.key=key;
  for(const r of beyond.rooms){const d=(p-r.c)/r.span,a=Math.abs(d),on=a<1.02;      // -1 far ahead, +1 gone by
    if(on!==r.on){r.on=on;r.el.style.display=on?'':'none'}if(!on)continue;
    r.el.style.transform=`scale(${Math.pow(2,d*.95).toFixed(4)})`;r.el.style.opacity=(1-ease(inv(.15,.78,a))).toFixed(3);r.el.inert=a>.35}
  const k=clamp(p/(beyond.max+.6)),need=Math.hypot(innerWidth,innerHeight)/44;
  beyond.far.style.transform=`translate(-50%,-50%) scale(${(.18*Math.pow(need/.18,k**5)).toFixed(3)})`;beyond.far.style.opacity=(.95*inv(-.3,.05,p)).toFixed(3)};
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
  if(beyond.active){e.preventDefault();beyond.step(e.deltaY*(e.deltaMode===1?16:1)/700);return}
  if(up>0||(scrollY<=0&&e.deltaY<0)){e.preventDefault();lift(-e.deltaY*(e.deltaMode===1?16:1)/(innerHeight*1.4))}},{passive:false});
let touchY=null;
addEventListener('touchstart',e=>{touchY=e.target.closest('.above-ink')&&up>=1&&!beyond.active?null:e.touches[0].clientY},{passive:true});
addEventListener('touchmove',e=>{if(touchY==null||reading)return;const y=e.touches[0].clientY,dy=y-touchY;touchY=y;
  if(beyond.active){e.preventDefault();beyond.step(-dy/(innerHeight*.5));return}
  if(up>0||(scrollY<=0&&dy>0)){e.preventDefault();lift(dy/(innerHeight*1.1))}},{passive:false});
addEventListener('keydown',e=>{if(reading||roomOpen||document.querySelector('dialog[open]'))return;
  if(beyond.active){if(e.key==='Escape'){e.preventDefault();beyond.leave()}else if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();beyond.step(.34)}else if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();beyond.step(-.34)}return}
  if((e.key==='ArrowUp'||e.key==='PageUp')&&scrollY<=0&&up<1){e.preventDefault();lift(e.key==='PageUp'?.5:.15)}
  else if((e.key==='ArrowDown'||e.key==='PageDown'||e.key===' ')&&up>0){e.preventDefault();lift(e.key==='ArrowDown'?-.15:-.5)}});
$('#above-back').onclick=()=>{const from=up,t0=performance.now();const step=now=>{const k=clamp((now-t0)/900);up=from*(1-ease(k));lastKey='';if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)};

// ---------- The camera ----------
// [Z, cx, cy]: a point (X, Y) of the wall is seen at (iw/2 + Z(X-cx), VH/2 + Z(Y-cy) + lower).
const overview=()=>Math.min(fit*.3,VH*.4/(floor+300));
function walk(u){
  const Z5=fit/scales[LAST];
  if(u<START){
    // From afar, along a straight line to the last screen. How near we are grows evenly in
    // proportion (the zoom, not the distance, is what the hand feels): quickly at first,
    // and by the end at exactly the pace of the chapters that follow, so nothing stops.
    const Zend=overview(),all=Math.log(Z5/Zend),x=u/START,a=.6,b=RATE*START/all,h=(x**3-2*x*x+x)*a+(3*x*x-2*x**3)+(x**3-x*x)*b;
    const Z=Zend*Math.exp(all*h),v=(1/Z-1/Z5)/(1/Zend-1/Z5);
    return [Z,0,centres[LAST]+(centres[0]-centres[LAST])*v];
  }
  const t=u-START,i=Math.min(HOLE,LAST+Math.floor(t)),f=LAST+t-i;
  return [fit/Math.exp(Math.log(scales[i])*(1-f)+Math.log(scales[i+1])*f),0,centres[i]+(centres[i+1]-centres[i])*f];
}
function camera(){
  const from=walk(u);if(open<0||!shown)return from;
  // Stepping back to the page: the zoom runs evenly, and the view slides over as it widens.
  const to=pageCam,e=ease(shown),Z=Math.exp(Math.log(from[0])*(1-e)+Math.log(to[0])*e),w=e*to[0]/Z;
  return [Z,from[1]+(to[1]-from[1])*w,from[2]+(to[2]-from[2])*w];
}
function frame(now){
if(warming){requestAnimationFrame(frame);return}
const dt=Math.min(64,now-clock||16);clock=now;
if(!reading&&!roomOpen){
  u=clamp(scrollY/segment,0,TOTAL);
  // At a project's page, any scroll steps forward to the wall again.
  if(open>=0){if(aim===1&&Math.abs(scrollY-openedAt)>28)closeProject();
    const before=shown;shown=clamp(shown+(aim?1:-1)*dt/(reduced?1:1250));
    if(shown!==before)lastKey='';
    if(shown===1&&before<1)pages[open].querySelector('footer [data-back]').focus({preventScroll:true});
    if(shown===0&&!aim){open=-1;lastKey=''}}
  const key=`${u}|${up}|${shown}|${open}|${wide}|${VH}`;
  if(key!==lastKey){lastKey=key;
    const iw=wide,ih=VH,[Z,cx,cy]=camera(),half=(glw?.height||ih)/2+ih*.2,gone=u>=START+REL,e=open>=0?ease(shown):0,wall=1-ease(clamp(e*1.6));
    panels.forEach((p,j)=>{const [ox,oy,h,oyo]=origins[j],k=Z*scales[j],x=Z*(ox-cx)-ox,y=Z*(oy+centres[j]-cy)+lower;const top=y-oyo*k,bottom=y+(h-oyo)*k;
      const far=k<.004||(j!==HOLE||!e)&&(bottom<-half||top>half)||(j>LAST&&!gone&&!e)||(j!==HOLE&&wall<.004);if(far!==p.hasAttribute('hidden-far'))far?p.setAttribute('hidden-far',''):p.removeAttribute('hidden-far');
      // At a page only the hole's chapter is left of the wall: the rest would be in the way.
      glw?.panel(j,x,y-oy,k,far,j===HOLE?1:wall);if(!far)move(p,glw?`translate(${x}px,${y-oy}px) scale(${k})`:`translate3d(${x}px,${y-oy}px,0) scale(${k})`);if(!glw&&j!==HOLE)p.style.opacity=wall===1?'':wall.toFixed(3);if(p.inert!==far)p.inert=far});
    lookUp();
    // The rabbit goes down as the last screen arrives. Then its hole lets go of the window:
    // over REL it slides from where it waited to where the hole on the wall now is, and
    // grows with it, and at the end of REL the two are the same pixels and are swapped.
    const going=clamp((u-(START-LEAD))/(LEAD+REL*.7)),flat=1-ease(clamp(up/.3)),t=u-START-REL,sink=Math.max(ease(going),ease(clamp(up/.35)));
    const [ox6,oy6,,oyo6,,oxo6]=origins[HOLE],k6=Z*scales[HOLE],holeY=ih/2+Z*(oy6+centres[HOLE]-cy)+lower+k6*(holeAt[1]-oyo6),holeX=iw/2+Z*(ox6-cx)+k6*(holeAt[0]-oxo6);
    const letGo=ease(clamp((u-START)/REL)),S=1+(k6*holeWide/rabbit.wide-1)*letGo,dy=rabbit.y0+(holeY-rabbit.y0)*letGo;
    const m=`${sink.toFixed(4)}|${S.toFixed(4)}|${dy.toFixed(2)}`;if(m!==lastMark){lastMark=m;mark.set(sink,0,1);dock.style.transform=`translate(${iw/2-S*rabbit.hx}px,${dy-S*(rabbit.hy-rabbit.sink*sink)}px) scale(${S})`}
    dock.style.visibility=gone?'hidden':'';
    // The foot of the lens is flat by the time the hole is on the wall, so that the swap is
    // not seen; it bends again as the hole rises. Raising the head flattens all of it, and
    // so does a project's page: it is for reading.
    const foot=flat*(t<0?1-ease(clamp((u-(START-LEAD))/(LEAD+REL*.8))):ease(clamp(t/.5)));
    glw?.lens(flat*(1-e),foot*(1-e));
    mist.style.opacity=(flat*(1-ease(clamp(going/.85)))).toFixed(3);
    const fa=Math.round(clamp((u/START-.15)/.4)*1000)/1000;if(fa!==lastFall){lastFall=fa;fall(fa)}
    // What the rabbit found comes out of the hole: each project starts inside it, small and
    // tumbling, is squeezed through the funnel under it and lands where it lies.
    cards.forEach((c,k)=>{const r=rest[k],l=ease(clamp((t-.06-k*.1)/.4)),s=(.3+.7*l)*r.size,turn=r.turn+(1-l)*(k%2?.5:-.5);
      const mx=holeAt[0]+(r.cx-holeAt[0])*l,my=holeAt[1]+(r.cy-holeAt[1])*l,co=Math.cos(turn),si=Math.sin(turn),hw=r.w*s/2,hh=r.h*s/2;
      const x=mx-(hw*co-hh*si),y=my-(hw*si+hh*co),o=clamp(l*5);
      cardSprite[k]?.set(x,y,s,o,turn);move(c,`translate(${x}px,${y}px) rotate(${turn}rad) scale(${s})`);if(!glw)c.style.opacity=o.toFixed(3)});
    // The pages: all in the same place, far larger than the wall, and only the open one seen.
    pages.forEach((p,k)=>{const o=open===k?ease(clamp((e-.3)/.6)):0;pageSprite[k]?.set(pagePose[0],pagePose[1],pagePose[2],o);
      move(p,`translate(${pagePose[0]}px,${pagePose[1]}px) scale(${pagePose[2]})`);if(!glw)p.style.opacity=o.toFixed(3);p.inert=!(open===k&&shown>.9)});
    if(glw){glw.funnel(holeX,holeY,k6*(rest[0].cy-rest[0].h/2-holeAt[1])*.92,ease(clamp(t/.2))*(1-ease(clamp((t-.75)/.3)))*(1-e));glw.touch()}
  }
  if(glw){if(settle.size&&glw.idle&&(open<0||shown===aim)){settle.forEach((t,el)=>el.style.transform=t);settle.clear()}glw.tick()}
  // Looking for the moment of the edit reads the page; not while the wall is moving.
  if(!glw||glw.idle)watchEdit();
}else if(reading){watchEdit();panels.forEach(p=>{p.inert=false;p.removeAttribute('hidden-far')});pages.forEach(p=>p.inert=false)}
beyond.draw(dt);requestAnimationFrame(frame)}
document.fonts.ready.then(()=>{glw?.reread();layout(true)});addEventListener('resize',layout);body.classList.remove('reading');body.classList.add('flat');dock.style.transformOrigin='0 0';layout(true);if(reduced)toggleReading(true);requestAnimationFrame(frame);
// Give the page a few frames to draw every chapter before showing the far view.
if(warming){viewport.style.opacity='.01';let n=0;const tick=()=>{if(++n<4)requestAnimationFrame(tick);else{warming=false;lastKey='';requestAnimationFrame(()=>viewport.style.opacity='')}};requestAnimationFrame(tick)}
if(location.hash){const k=named(),target=k<0&&document.querySelector(location.hash);
  if(k>=0&&!reduced)setTimeout(()=>{scrollTo(0,at(START+1));u=START+1;openProject(k,true)},80);else if(target?.dataset?.panel)setTimeout(()=>go(+target.dataset.panel),50)}
$('.skip-link').onclick=e=>{e.preventDefault();go(7)};
