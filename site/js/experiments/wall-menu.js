import {clamp,ease,reduced,tomorrow,setDay,mountFall,mountGaps,watchEdit} from './shared.js';
import {mountMark} from '../mark.js';
import {mountDoor} from './door-ink.js';
import {mountWallGL} from './wall-gl.js';
import {mountTune} from './wall-tune.js';
import {mountCookieBar} from './cookie-bar.js';
// The wall, the rabbit keeps the hole (04.15). 04.14 in another order, with a panel to tune
// the type and the place of every screen (wall-tune.js).
//
// The walk goes from the whole wall, seen from afar, to the last screen, "Tomorrow depends on
// what we make today", and ends there. "Different worlds" is no longer on the wall.
//
// The rabbit and its hole wait at the foot of the window the whole way and never go down by
// themselves. Under the pointer the rabbit leans toward the hole and floats a little, up and
// down. Clicked, it goes in, and out of the hole come the projects, upward, squeezed through
// it as in 04.11, and above them About and Contact. A scroll, Esc or a touch of the hole puts
// them back.
//
// A project opens as in 04.11, by stepping back until the wall is small in the corner of its
// page. About is behind us: the camera steps back, we pass through it, and it stands in the
// window; Back passes through it again, forward, to the projects where it was.
//
// Above the first screen is still the white screen to draw on, and the door in it.
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],body=document.body,viewport=$('#viewport');
const panels=$$('[data-panel]'),LAST=4,HOLE=5;
const RATIO=.34,RATE=Math.log(1/RATIO),scales=panels.map((_,i)=>RATIO**i),centres=[0],START=1.12,TOTAL=START;
const surface=$('#wall-surface'),dock=$('#rabbit-dock'),hole6=$('.burrow-hole'),cards=$$('.burrow-card'),pages=$$('.project-page');
let floor=0,origins=[],lastKey='',lastMark='',lastFall=-1,fit=1,segment=1100,mobile=false,lower=0,spacing=830,VH=0,wide=0;
let up=0,RISE=0,pos=0,over=0,warming=!reduced,roomEntering=false,roomFlight=null,reading=false,roomOpen=false,hoverLast=false,u=0;
const mark=mountMark($('#wall-rabbit'));
const hb=mark.holeBox,bb=mark.bunBox,depth=hb.y+hb.height-bb.y;
hole6.setAttribute('viewBox',`${hb.x} ${hb.y} ${hb.width} ${hb.height}`);
const LENS=reduced?0:Math.max(0,parseFloat(new URLSearchParams(location.search).get('lens')??1)||0);
// A white mist lies over the foot of the wall, under the rabbit; it lifts when the menu opens.
const mist=document.createElement('div');mist.className='foot-mist';dock.before(mist);
// 04.12 (lean), 04.13 (steady) and 04.14 (under), as in wall-burrow.js.
let lean=body.classList.contains('lean')&&!reduced,running=false,awakeUntil=0,followed=false;
const PARK=110,asked=new URLSearchParams(location.search).get('layer'),iOS=/iP(hone|ad|od)/.test(navigator.userAgent)||/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1;
let under=body.classList.contains('under')&&lean&&asked!=='fixed'&&(iOS||asked==='inner'),stage=null,box=null;
if(under){
  stage=document.createElement('div');stage.className='under-stage';viewport.before(stage);stage.append(viewport);
  box=document.createElement('div');box.className='under-scroller';stage.after(box);box.append($('#scroll-track'));
  document.documentElement.dataset.layer='inner';
  const hold=()=>{if(scrollX!==0||Math.abs(scrollY-PARK)>.5)scrollTo(0,PARK)};
  for(const type of ['scroll','load','pageshow'])addEventListener(type,hold,{passive:true});
}
const here=()=>box?box.scrollTop:scrollY,goTo=(top,smooth=false)=>(box||window).scrollTo({top,behavior:smooth&&!reduced?'smooth':'instant'});
const scene=stage||viewport;
function wake(){awakeUntil=performance.now()+300;if(!running){running=true;requestAnimationFrame(frame)}}
const glw=LENS?mountWallGL(viewport,panels,{flare:.9*LENS,lean,calm:body.classList.contains('steady'),onWork:wake,host:scene,scene}):null;
if(!glw){body.classList.remove('wall-gl','lean');lean=false;
  if(under){under=false;delete document.documentElement.dataset.layer;box.before($('#scroll-track'));stage.before(viewport);stage.remove();box.remove();stage=box=null}}
const hareState={sc:1,sink:0,color:'#000'},bunPaths=[...mark.svg.querySelectorAll('#tc-bun path')].map(p=>new Path2D(p.getAttribute('d'))),holePath=new Path2D(mark.svg.querySelector('#tc-holeshape').getAttribute('d'));
const steady=lean&&body.classList.contains('steady'),EASE=steady?Math.max(0,parseFloat(new URLSearchParams(location.search).get('ease')??70)||0):0;
const inMark=(ctx,draw)=>{ctx.save();ctx.scale(hareState.sc,hareState.sc);ctx.translate(-882,-264);ctx.fillStyle=hareState.color;draw();ctx.restore()};
// Where the head is over the hole it is drawn white: black on black would be lost, and this is
// what Exclusion would give (the canvas is clear, so a blend mode would have nothing under it).
// Head-local, the hole is depth*sink higher than at rest.
const overHole=(ctx,lift)=>{ctx.save();ctx.translate(0,lift);ctx.clip(holePath);ctx.translate(0,-lift);ctx.fillStyle='#fff';for(const p of bunPaths)ctx.fill(p);ctx.restore()};
const holeFront=steady?glw.front(ctx=>inMark(ctx,()=>ctx.fill(holePath)),10,10):null,headFront=steady?glw.front(ctx=>inMark(ctx,()=>{for(const p of bunPaths)ctx.fill(p);overHole(ctx,-depth*hareState.sink)}),10,10):null;
const hare=lean&&!steady?glw.front(ctx=>{const {sc,sink}=hareState,dy=-depth*sink;ctx.save();ctx.scale(sc,sc);ctx.translate(-882,-264);ctx.fillStyle=hareState.color;
  ctx.save();ctx.translate(0,dy);ctx.fill(holePath);ctx.restore();
  ctx.beginPath();ctx.rect(bb.x-bb.width,bb.y-bb.width+dy,bb.width*3,hb.y+hb.height/2-bb.y+bb.width);ctx.clip();for(const p of bunPaths)ctx.fill(p);overHole(ctx,dy);ctx.restore()},10,10):null;
// Sprites: the projects, About and Contact (all .burrow-card), and the projects' pages.
// The arrow over the hole, once everything is out: the way back in.
const arrow=$('.hole-arrow'),arrowSprite=glw?.sprite(arrow,HOLE);let arrowAt=[0,0];
arrow.addEventListener('click',e=>{e.stopPropagation();closeMenu()});
// The rules between the projects on the fourth screen: drawn apart from it, so that they can
// grow from nothing to the whole width of the window as the screen comes up to its size.
const PROJ=3,rules=[...panels[PROJ].querySelectorAll('.grow-rule')],ruleSprite=rules.map(r=>glw?.sprite(r,PROJ));let ruleAt=[],ruleW=1100;
const cardSprite=cards.map(c=>glw?.sprite(c,HOLE,{funnel:true})),pageSprite=pages.map(p=>glw?.sprite(p,HOLE,{rest:1.1}));
const fallHost=$('[data-fall]'),fallLayer=glw?.paint(fallHost,1,170,{glyphs:steady}),fall=mountFall(fallHost,{center:true,paint:fallLayer?list=>fallLayer.set(list):null});
const settle=new Map(),move=(el,t)=>{if(glw)settle.set(el,t);else el.style.transform=t};
const place=()=>{settle.forEach((t,el)=>el.style.transform=t);settle.clear()};
const edited=$('[data-edit]')?.closest('[data-panel]'),editedAt=panels.indexOf(edited);let editNear=false;
const put=(el,o)=>{for(const k in o)if(el.style[k]!==o[k])el.style[k]=o[k]};

// ---------- Tuning ----------
// Every screen can be made larger or smaller and moved from where it is placed (wall-tune.js).
// 'hole' is what comes out of the hole; 'about', the About space.
const names=['The Tomorrow Company','A technology venture studio','More human','Not everything fits a category','Tomorrow depends on what we make today'];
const tune=mountTune({
  screens:[...names.map((n,i)=>({id:String(i),name:`${String(i+1).padStart(2,'0')} — ${n}`})),{id:'hole',name:'Из норы: проекты и ссылки'},{id:'about',name:'About'}],
  show:id=>{if(id==='about'){openMenu(true);openAbout()}else if(id==='hole'){closeAbout();openMenu()}else{closeAbout();closeMenu();showScreen(+id)}},
  onType:()=>{glw?.reread();layout(true);fall.reset?.();lastFall=-1;wake()},
  onScreen:()=>{layout(true);wake()},
});

const rabbit={hx:0,hy:0,wide:0,y0:0,sink:0,rect:[0,0,0,0]};
// Inside the hole's chapter, in its own pixels: where the hole is, and where everything that
// comes out of it comes to lie.
let mistAt=[0,1],holeAt=[0,0],holeWide=0,rest=[],pageSize=[1100,650],pageFit=1,pagePose=[0,0,1],backAt=[0,0],FAR=9;
function layout(force){
  const iw=innerWidth;
  if(force!==true&&iw===wide&&Math.abs(innerHeight-VH)<160)return;
  wide=iw;VH=innerHeight;const ih=VH;mobile=iw<650;
  fit=Math.max(.3,Math.min((iw-(mobile?40:100))/(mobile?700:1100),(ih-60)/650));
  const was=RISE?[up,u]:null;
  segment=Math.max(850,ih*1.3);RISE=Math.round(ih*.72);
  if(under){document.documentElement.style.setProperty('--under-h',ih+'px');document.documentElement.style.setProperty('--under-park',PARK+'px')}
  $('#scroll-track').style.height=(RISE+segment*TOTAL+(under?ih+PARK:ih))+'px';
  if(!reading)goTo(was?(was[0]>0?RISE*(1-was[0]):RISE+was[1]*segment):RISE);pos=here();
  lower=ih*.1;spacing=(mobile?1280:830)*.8*1.36;
  for(let i=1;i<=LAST;i++)centres[i]=centres[i-1]+spacing*scales[i-1];
  floor=centres[LAST]+6;
  origins=panels.map(p=>{const o=getComputedStyle(p).transformOrigin.split(' ').map(parseFloat);return [surface.offsetLeft+p.offsetLeft+o[0],surface.offsetTop+p.offsetTop+o[1],p.offsetHeight,o[1],p.offsetWidth,o[0]]});
  const wH=(mobile?Math.min(iw*.24,100):Math.min(iw*.11,150))*.84,sc=wH/hb.width,y0=ih-ih*.05-hb.height/2*sc;
  Object.assign(rabbit,{hx:(hb.x+hb.width/2-882)*sc,hy:(hb.y+hb.height/2-264)*sc,wide:wH,y0,sink:depth*sc});
  // Where the rabbit and its hole are on the window, for the pointer.
  {const x0=iw/2-rabbit.hx,yd=y0-rabbit.hy,pad=mobile?14:10,L=Math.min(bb.x,hb.x),R=Math.max(bb.x+bb.width,hb.x+hb.width);
    rabbit.rect=[x0+(L-882)*sc-pad,yd+(bb.y-264)*sc-pad,x0+(R-882)*sc+pad,yd+(hb.y+hb.height-264)*sc+pad]}
  Object.assign(dock.style,{width:932*sc+'px',height:1251*sc+'px'});
  hareState.sc=sc;hareState.color=getComputedStyle(dock).color;hare?.size(932*sc,1251*sc,hb.height*sc*1.2);hare?.again();for(const f of [holeFront,headFront]){f?.size(932*sc,1251*sc);f?.again()}
  const mh=ih-(y0+hb.height/2*sc-depth*sc)+(mobile?70:110),stop=(a,f)=>`rgba(255,255,255,${a}) ${(mh*f).toFixed(0)}px`;
  mistAt=[ih-mh,mh];
  Object.assign(mist.style,{top:ih-mh+'px',height:mh+240+'px',background:`linear-gradient(to bottom,${stop(0,0)},${stop(.04,.05)},${stop(.18,.13)},${stop(.45,.23)},${stop(.74,.32)},${stop(.93,.41)},${stop(1,.5)},#fff 100%)`});
  // The hole's chapter is not on the wall any more: it is held on the window, at the size
  // fit, with its hole exactly over the rabbit's.
  const [ox,oy,PH,oyo,PW,oxo]=origins[HOLE],W6=wH/fit,H6=W6*hb.height/hb.width,hy=PH*.9;
  put(hole6,{width:W6+'px',height:H6+'px',left:PW/2-W6/2+'px',top:hy-H6/2+'px'});
  holeAt=[PW/2,hy];holeWide=W6;
  arrowAt=[PW/2-arrow.offsetWidth/2,hy-H6/2-(mobile?30:22)-arrow.offsetHeight];
  {const p=panels[PROJ],bs=[...p.querySelectorAll('.project-lines button')];ruleW=p.offsetWidth;
    ruleAt=bs.map(b=>b.offsetTop);const l=bs[bs.length-1];if(l)ruleAt.push(l.offsetTop+l.offsetHeight-1);
    rules.forEach(r=>r.style.width=ruleW+'px')}
  // What comes out lies above the hole, up to just under the top of the window. Each is
  // [across, as a share of the chapter's width; up, as a share of the room above the hole;
  // turn, degrees; size]. Three projects, then About and Contact, highest.
  const tH=tune.screen('hole'),room=Math.max(200,(y0-hb.height/2*sc-(mobile?70:56))/fit);
  const spots=mobile?[[-.05,.16,-3,1],[.07,.36,3,.92],[-.04,.56,-1.6,1.02],[-.2,.84,-2.4,1],[.2,.86,2.2,1]]:[[-.22,.18,-4,1],[.2,.38,3.4,.9],[-.03,.58,-1.6,1.05],[-.16,.86,-2.2,1],[.16,.88,2.4,1]];
  rest=cards.map((c,k)=>{const [ax,upf,turn,size]=spots[k],w=c.offsetWidth,h=c.offsetHeight;
    const cx=PW/2+ax*PW,cy=hy-H6/2-upf*room;
    return {w,h,size:size*tH.s,turn:turn*Math.PI/180,cx:holeAt[0]+(cx-holeAt[0])*tH.s+tH.x,cy:holeAt[1]+(cy-holeAt[1])*tH.s+tH.y}});
  // A project's page is larger than everything by FAR: stepping back that far from the
  // window, the page fills it and what was the window sits small in its top right corner.
  FAR=mobile?8.5:9;pageSize=[pages[0].offsetWidth,pages[0].offsetHeight];
  pageFit=Math.min(1.1,(iw-(mobile?32:120))/pageSize[0],(ih-(mobile?50:90))/pageSize[1]);
  const px=(iw-pageSize[0]*pageFit)/2,py=(ih-pageSize[1]*pageFit)/2,miniW=iw/FAR,miniH=ih/FAR,left=px+pageSize[0]*pageFit-miniW,top=py;
  // The point everything shrinks toward: the window's top left goes to (left, top).
  backAt=[left/(1-1/FAR),top/(1-1/FAR)];
  const H=holeScreen(),SXe=backAt[0]+(H[0]-backAt[0])/FAR,SYe=backAt[1]+(H[1]-backAt[1])/FAR,ke=H[2]/FAR;
  pagePose=[oxo+(px-SXe)/ke,oyo+(py-SYe)/ke,pageFit/ke];
  pages.forEach(p=>{p.style.setProperty('--mini-w',(miniW/pageFit).toFixed(1)+'px');p.style.setProperty('--mini-h',(miniH/pageFit).toFixed(1)+'px')});
  glw?.layout();
  if(under){const tall=Object.assign(document.createElement('div'),{style:'position:fixed;top:0;height:100lvh;width:0'});body.append(tall);const lvh=tall.offsetHeight||ih;tall.remove();glw.inset(PARK,62,Math.max(ih,lvh))}
  glw?.rest(fit);lastKey='';lastMark='';
}
// The hole's chapter on the window: [x, y, scale] of its transform origin.
function holeScreen(){const [,, ,oyo,,oxo]=origins[HOLE];return [wide/2-fit*(holeAt[0]-oxo),rabbit.y0-fit*(holeAt[1]-oyo),fit]}
function reset(){closeAbout(true);closeMenu(true);if(reading)scrollTo(0,0);else goTo(RISE);leaveRoom()}
const at=v=>RISE+v*segment;
// Where on the walk screen i is seen at the size it is read at.
function showScreen(i){if(reading){panels[i].scrollIntoView({behavior:reduced?'instant':'smooth'});return}
  const want=fit/scales[i];let a=0,b=START;for(let n=0;n<40;n++){const m=(a+b)/2;if(walk(m)[0]<want)a=m;else b=m}goTo(at(i>=LAST?START:(a+b)/2),true)}
$$('[data-stop]').forEach(b=>b.onclick=e=>{e.preventDefault();showScreen(+b.dataset.stop)});
$('#reset-wall').onclick=()=>{setDay(0);$('#help').close();reset()};
function toggleReading(force){reading=typeof force==='boolean'?force:!reading;body.classList.toggle('reading',reading);dock.hidden=reading;if(reading){viewport.removeAttribute('inert');scrollTo(0,0)}else{layout(true);reset()}}
async function enterRoom(){if(roomOpen||roomEntering||reading||open>=0||menuAim)return;roomEntering=true;const r=$('#last-heading').getBoundingClientRect();scene.style.transformOrigin=`${r.left+r.width*.18}px ${r.top+r.height*.3}px`;roomFlight=scene.animate([{transform:'scale(1)'},{transform:'scale(34)'}],{duration:reduced?1:950,fill:'forwards',easing:'cubic-bezier(.6,0,.8,.4)'});await roomFlight.finished;roomOpen=true;roomEntering=false;$('#room').hidden=false;viewport.inert=true;$('#leave-room').focus();roomFlight.cancel()}
function leaveRoom(){if(!roomOpen)return;roomOpen=false;$('#room').hidden=true;viewport.inert=false;$('#last-heading').focus({preventScroll:true})}
$('#leave-room').onclick=leaveRoom;$('#room-tomorrow').onclick=()=>tomorrow(reset);
{const h=$('#last-heading');h.onpointerenter=()=>hoverLast=true;h.onpointerleave=()=>hoverLast=false;h.onclick=enterRoom;h.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();enterRoom()}}}
addEventListener('wheel',e=>{if(reading||e.ctrlKey||document.querySelector('dialog[open]'))return;if(roomOpen||roomEntering){e.preventDefault();return}if(hoverLast&&!menuAim&&Math.abs(u-START)<.25&&e.deltaY<0){e.preventDefault();enterRoom()}},{passive:false});
addEventListener('keydown',e=>{if(roomOpen){if(e.key==='Escape'){leaveRoom();e.preventDefault()}if(e.key==='Tab'){e.preventDefault();(document.activeElement===$('#leave-room')?$('#room-tomorrow'):$('#leave-room')).focus()}}});
mountGaps((x,y)=>{if(reading){tomorrow();return}scene.style.transformOrigin=`${x}px ${y}px`;const a=scene.animate([{transform:'scale(1)'},{transform:'scale(20)',opacity:0}],{duration:reduced?1:650,fill:'forwards',easing:'cubic-bezier(.6,0,1,1)'});a.onfinish=()=>{tomorrow(()=>{a.cancel()})}});

// ---------- The rabbit, and what comes out of its hole ----------
// menuT runs on the clock, in seconds, toward MENU when open and back to 0 when closed:
// first the rabbit goes in (DIVE), then what it found comes up.
const DIVE=.5,MENU=1.65;
let menuT=0,menuAim=0,menuAt=0,hovering=false,hover=0;
const inRabbit=(x,y)=>{const r=rabbit.rect;return x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3]};
function openMenu(instant=false){if(reading||roomOpen)return;if(!menuAim){menuAim=1;menuAt=here();lastKey=''}if(instant)menuT=MENU;wake()}
function closeMenu(instant=false){if(open>=0||about.aim)return;if(menuAim){menuAim=0;lastKey=''}if(instant)menuT=0;wake()}
const quiet=e=>e.target.closest?.('.tune-panel,.cookie-bar,dialog,.about-space,.beyond,.room');
addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const on=!reading&&!menuAim&&!roomOpen&&!quiet(e)&&up===0&&inRabbit(e.clientX,e.clientY);
  if(on!==hovering){hovering=on;document.documentElement.classList.toggle('over-rabbit',on);wake()}},{passive:true});
addEventListener('click',e=>{if(reading||roomOpen||quiet(e)||!e.isTrusted||up>0)return;if(!inRabbit(e.clientX,e.clientY))return;
  if(!menuAim){e.preventDefault();e.stopPropagation();hovering=false;document.documentElement.classList.remove('over-rabbit');openMenu()}
  else if(open<0&&!about.aim){e.preventDefault();e.stopPropagation();closeMenu()}},true);
// Any scroll puts them back (not while a page or About is open: those have their own ways back).
const pushBack=e=>{if(menuAim&&open<0&&!about.aim&&!quiet(e))closeMenu()};
addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>3)pushBack(e)},{passive:true});
addEventListener('touchmove',pushBack,{passive:true});
$('.skip-link').onclick=e=>{e.preventDefault();openMenu()};

// ---------- About, behind us ----------
// t runs from 0 to 1 on the clock. The wall and what came out of the hole shrink away to the
// middle of the window and fade, as if the camera stepped back; About comes from behind,
// too large and nearly clear, and settles at its size.
const about={el:$('#about-space'),content:$('#about-content'),t:0,aim:0,key:''};
function openAbout(){if(reading)return;if(!menuAim)openMenu(true);about.aim=1;about.el.hidden=false;wake()}
function closeAbout(instant=false){if(!about.aim&&!instant)return;about.aim=0;if(instant){about.t=0;about.el.hidden=true}wake()}
$$('[data-about]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openAbout()}));
$('#about-back').onclick=()=>closeAbout();
function drawAbout(){const e=ease(about.t),a=tune.screen('about'),key=`${e}|${a.s}|${a.x}|${a.y}`;if(key===about.key)return;about.key=key;
  if(about.t===0&&!about.aim){about.el.hidden=true;return}
  const s=a.s*(1+5.5*(1-e)**2);about.content.style.transform=`translate(${a.x}px,${a.y}px) scale(${s.toFixed(4)})`;
  about.content.style.opacity=clamp(e*1.8).toFixed(3);about.el.classList.toggle('settled',about.aim&&about.t>.75);
  $('#about-back').style.opacity=ease(clamp((about.t-.6)/.4)).toFixed(3)}

// ---------- A project, opened by stepping back ----------
let open=-1,shown=0,aim=0,openedAt=0,pushed=false,clock=0;
const slug=k=>'project-'+pages[k].dataset.slug,named=()=>pages.findIndex((p,k)=>'#'+slug(k)===location.hash);
function openProject(k,instant=false){
  if(reading||roomOpen||about.aim||open===k&&aim===1)return;
  if(open<0||shown===0)open=k;else if(open!==k)return;
  aim=1;openedAt=here();if(instant)shown=1;wake();
  if(location.hash!=='#'+slug(k)){history.pushState({project:k},'','#'+slug(k));pushed=true}
  lastKey='';
}
function closeProject(viaHistory=false){
  if(open<0||aim===0)return;aim=0;lastKey='';menuAt=here();wake();
  if(!viaHistory&&location.hash==='#'+slug(open)){if(pushed){pushed=false;history.back()}else history.replaceState(null,'',location.pathname+location.search)}
}
$$('[data-open]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const k=+b.dataset.open;
  if(open>=0){closeProject();return}
  // From the list on the fourth screen: the rabbit goes in first, then the page.
  if(menuT<MENU){openMenu();const wait=()=>{if(menuT>=MENU)openProject(k);else if(menuAim)requestAnimationFrame(wait)};requestAnimationFrame(wait)}else openProject(k)}));
$$('[data-back]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();closeProject()}));
viewport.addEventListener('click',e=>{if(open>=0&&shown===1&&!e.target.closest('.project-page'))closeProject()});
addEventListener('keydown',e=>{if(e.key!=='Escape'||beyond.active||roomOpen||document.querySelector('dialog[open]'))return;
  if(about.aim){e.preventDefault();closeAbout()}else if(open>=0&&aim===1){e.preventDefault();closeProject()}else if(menuAim){e.preventDefault();closeMenu()}});
addEventListener('popstate',()=>{const k=named();if(k>=0){openMenu(true);openProject(k)}else closeProject(true)});

// ---------- Looking up, and behind the door (as in wall-burrow.js) ----------
const above=$('#above'),TILT=62*Math.PI/180;
const inv=(a,b,v)=>clamp((v-a)/(b-a));
const beyond={el:$('#beyond'),far:$('#beyond .beyond-far'),rooms:$$('#beyond .chamber').map(el=>({el,c:+el.dataset.c,span:+el.dataset.span||1.05,on:null,at:(el.dataset.at||'0,0').split(',').map(Number),narrow:(el.dataset.narrow||el.dataset.at||'0,0').split(',').map(Number)})),p:0,since:0,pull:0,active:false,done:null,key:''};
beyond.max=beyond.rooms[beyond.rooms.length-1].c;
{const stage=document.createElement('div'),track=document.createElement('div');stage.className='beyond-stage';track.className='beyond-track';stage.append(...beyond.el.childNodes);beyond.el.append(stage,track);beyond.track=track;beyond.el.tabIndex=-1}
const roomStep=()=>Math.min(700,innerHeight*.62);
beyond.enter=done=>{wake();beyond.done=done;beyond.active=true;beyond.key='';beyond.pull=0;beyond.since=performance.now();beyond.el.hidden=false;if(under)document.documentElement.style.background='#000';
  beyond.track.style.height=(beyond.max+.75)*roomStep()+'px';beyond.el.scrollTop=0;beyond.el.focus({preventScroll:true})};
beyond.close=()=>{wake();beyond.active=false;beyond.el.hidden=true;if(under)document.documentElement.style.background='';beyond.done?.()};
beyond.leave=()=>{if(beyond.active){beyond.close();lastKey=''}};
beyond.on=()=>{if(!beyond.active)return;beyond.active=false;tomorrow(()=>{beyond.close();goTo(RISE);pos=RISE;lastKey='';lastMark=''})};
beyond.el.addEventListener('wheel',e=>{if(beyond.el.scrollTop<=0&&e.deltaY<0){beyond.pull-=e.deltaY;if(beyond.pull>260)beyond.leave()}else beyond.pull=0},{passive:true});
{let from=null;beyond.el.addEventListener('touchstart',e=>{from=beyond.el.scrollTop<=0?e.touches[0].clientY:null},{passive:true});
 beyond.el.addEventListener('touchmove',e=>{if(from!=null&&beyond.el.scrollTop<=0&&e.touches[0].clientY-from>110)beyond.leave()},{passive:true})}
beyond.draw=now=>{if(!beyond.active)return;
  const p=beyond.el.scrollTop/roomStep()-.8*(1-ease(clamp((now-beyond.since)/900)));if(p>beyond.max+.62){beyond.on();return}
  const key=p.toFixed(4)+innerWidth+innerHeight;if(key===beyond.key)return;beyond.key=key;
  for(const r of beyond.rooms){const d=(p-r.c)/r.span,a=Math.abs(d),on=a<1.02;
    if(on!==r.on){r.on=on;r.el.style.display=on?'':'none'}if(!on)continue;
    const size=Math.pow(2,d*1.5),[ax,ay]=innerWidth<650?r.narrow:r.at;
    r.el.style.transform=`translate(${(ax*innerWidth*size).toFixed(1)}px,${(ay*innerHeight*size).toFixed(1)}px) scale(${size.toFixed(4)})`;
    r.el.style.opacity=(d<0?1-ease(inv(.12,.95,a)):1-ease(inv(.3,.8,a))).toFixed(3);r.el.inert=a>.35}
  const k=clamp(p/(beyond.max+.6)),need=Math.hypot(innerWidth,innerHeight)/44;
  beyond.far.style.transform=`translate(-50%,-50%) scale(${(.18*Math.pow(need/.18,k**5)).toFixed(3)})`;beyond.far.style.opacity=(.95*inv(-.3,.05,p)).toFixed(3)};
$('#beyond-on').onclick=beyond.on;$('#beyond-back').onclick=beyond.leave;
const door=mountDoor(above,{reduced,onEnter:done=>beyond.enter(done)});
function lookUp(){
  const a=TILT*ease(clamp((up-.2)/.8)),P=innerHeight*1.1;
  scene.style.transform=a?`perspective(${P}px) translateZ(${P}px) rotateX(${a}rad) translateZ(${-P}px)`:'';
  above.classList.toggle('shown',a>0);above.classList.toggle('drawable',up>=1);
  above.style.transform=up>=1?'':`perspective(${P}px) translateZ(${P}px) rotateX(${a-TILT}rad) translateZ(${-P}px)`;
}
const hud=new URLSearchParams(location.search).has('perf')?body.appendChild(Object.assign(document.createElement('div'),{className:'perf-hud'})):null,perf={n:0,worst:0,js:0,since:0,slow:0};
addEventListener('keydown',e=>{if(beyond.active&&e.key==='Escape'){e.preventDefault();beyond.leave()}});
$('#above-back').onclick=()=>goTo(RISE,true);

// ---------- Lean: waking, and the pointer ----------
if(lean){
  for(const type of ['scroll','resize','wheel','touchstart','touchmove','keydown','pointerdown','popstate','focusin','click'])addEventListener(type,wake,{passive:true,capture:true});
  for(const type of ['pointerdown','touchstart','focusin'])addEventListener(type,()=>{if(!reading)place()},{passive:true,capture:true});
  let passing=false;
  viewport.addEventListener('click',e=>{if(passing||reading||!e.isTrusted)return;const x=glw.unbend(e.clientX,e.clientY);if(Math.abs(x-e.clientX)<1.5)return;
    place();const el=document.elementFromPoint(x,e.clientY);if(!el||!viewport.contains(el))return;
    e.stopPropagation();e.preventDefault();passing=true;el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,clientX:x,clientY:e.clientY}));passing=false},true);
}
if(under){
  box.addEventListener('scroll',wake,{passive:true});
  box.addEventListener('click',e=>{if(!e.isTrusted)return;place();const x=glw.unbend(e.clientX,e.clientY),el=document.elementsFromPoint(x,e.clientY).find(n=>n!==viewport&&viewport.contains(n));
    if(el)el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,clientX:x,clientY:e.clientY}))});
}

// ---------- The camera ----------
// [Z, cx, cy]: a point (X, Y) of the wall is seen at (iw/2 + Z(X-cx), VH/2 + Z(Y-cy) + lower).
const overview=()=>Math.min(fit*.3,VH*.4/(floor+300));
function walk(u){
  const Z5=fit/scales[LAST];
  if(u>=START)return [Z5,0,centres[LAST]];
  const Zend=overview(),all=Math.log(Z5/Zend),x=u/START,a=.6,b=RATE*START/all,h=(x**3-2*x*x+x)*a+(3*x*x-2*x**3)+(x**3-x*x)*b;
  const Z=Zend*Math.exp(all*h),v=(1/Z-1/Z5)/(1/Zend-1/Z5);
  return [Z,0,centres[LAST]+(centres[0]-centres[LAST])*v];
}
function frame(now){
if(warming){requestAnimationFrame(frame);return}
if(now==null)now=performance.now();
const gap=now-clock||16,dt=Math.min(64,gap),t0=hud?performance.now():0;clock=now;
// The clocks: what came out of the hole, About, and the rabbit under the pointer.
const sec=dt/1000;
{const was=menuT;menuT=menuAim?Math.min(MENU,menuT+sec):Math.max(0,menuT-sec*1.5);if(reduced)menuT=menuAim?MENU:0;if(menuT!==was)lastKey=''}
{const was=about.t;about.t=clamp(about.t+(about.aim?1:-1)*sec/(reduced?.001:1.15));if(about.t!==was){lastKey='';about.el.hidden=false}drawAbout()}
{const was=hover;hover=clamp(hover+(hovering?1:-1)*sec/.35);if(hover!==was||hover>0)lastKey=''}
if(!reading&&!roomOpen){
  const y=here();
  if(EASE&&followed){const gap=y-pos;pos=Math.abs(gap)<.08?y:pos+gap*(1-Math.exp(-dt/EASE));if(pos!==y)awakeUntil=now+300}else{pos=y;followed=true}
  u=clamp((pos-RISE)/segment,0,TOTAL);up=clamp((RISE-pos)/RISE);over=Math.max(0,pos-(RISE+segment*TOTAL));
  if(menuAim&&open<0&&!about.aim&&Math.abs(y-menuAt)>40)closeMenu();
  if(open>=0){if(aim===1&&Math.abs(y-openedAt)>28)closeProject();
    const before=shown;shown=clamp(shown+(aim?1:-1)*dt/(reduced?1:1250));
    if(shown!==before)lastKey='';
    if(shown===1&&before<1)pages[open].focus({preventScroll:true});
    if(shown===0&&!aim){open=-1;lastKey=''}}
  const key=`${pos}|${shown}|${open}|${wide}|${VH}`;
  const changed=key!==lastKey;
  if(changed){lastKey=key;
    const iw=wide,ih=VH,[Z,cx,cy0]=walk(u),cy=cy0+over/Z,half=(glw?.height||ih)/2+ih*.2;
    const e=open>=0?ease(shown):0,aE=ease(about.t),wall=1-ease(clamp(e*1.6)),tt=(menuT-DIVE+.1)/1.1,shownMenu=menuT>0||e>0||aE>0;
    // Stepping back: for a project toward its page's corner, for About toward the middle.
    const g=aE>0?1-.84*aE:Math.exp(Math.log(1/FAR)*e),P=aE>0?[iw/2,ih/2]:backAt,fade=1-aE;
    // While what the rabbit found is out, the wall steps aside: a little back, and away.
    const mf=ease(clamp((menuT-DIVE*.5)/.7)),gm=1-.14*mf,wallMenu=1-mf;
    const H=holeScreen();let proj=null;
    panels.forEach((p,j)=>{const [ox,oy,h,oyo]=origins[j];let SX,SY,k;
      if(j===HOLE)[SX,SY,k]=H;
      else{const a=tune.screen(j),kb=Z*scales[j];k=kb*a.s;SX=iw/2+Z*(ox-cx)+a.x*kb;SY=ih/2+Z*(oy+centres[j]-cy)+lower+a.y*kb;SX=iw/2+(SX-iw/2)*gm;SY=ih/2+(SY-ih/2)*gm;k*=gm}
      SX=P[0]+(SX-P[0])*g;SY=P[1]+(SY-P[1])*g;k*=g;
      const x=SX-iw/2-ox,yc=SY-ih/2,top=yc-oyo*k,bottom=yc+(h-oyo)*k;
      const far=k<.004||j===HOLE&&!shownMenu||j!==HOLE&&(bottom<-half||top>half||wall*wallMenu<.004)||fade<.004;if(far!==p.hasAttribute('hidden-far'))far?p.setAttribute('hidden-far',''):p.removeAttribute('hidden-far');
      const alpha=(j===HOLE?1:wall*wallMenu)*fade;if(j===PROJ)proj={SX,k,far,alpha,oxo:origins[j][5]};
      glw?.panel(j,x,yc-oy,k,far,alpha);if(!far)move(p,glw?`translate(${x}px,${yc-oy}px) scale(${k})`:`translate3d(${x}px,${yc-oy}px,0) scale(${k})`);if(!glw)p.style.opacity=alpha===1?'':alpha.toFixed(3);if(p.inert!==far)p.inert=far;if(j===editedAt)editNear=!far&&k>fit*.45&&k<fit*2.4});
    lookUp();
    // The rules: nothing while the screen is far, the whole window's width once it is read,
    // growing faster toward the end. The window's centre, in the screen's own pixels, is
    // where they grow from.
    if(proj){const read=fit*tune.screen(PROJ).s,q=clamp((proj.k/read-.2)/.65),w=q**3*iw/proj.k,mid=proj.oxo+(iw/2-proj.SX)/proj.k,sx=w/ruleW,o=w>.5?proj.alpha:0;
      rules.forEach((r,i)=>{const y=ruleAt[i]??0;ruleSprite[i]?.set(mid-w/2,y,1,o,0,sx);if(!proj.far)move(r,`translate(${mid-w/2}px,${y}px) scaleX(${sx})`)})}
    // The rabbit: it leans toward the hole under the pointer and floats there; clicked, it goes
    // in. When the wall steps back (a page, About), the hole on the chapter takes its place.
    const dive=ease(clamp(menuT/DIVE)),float=hover>0?ease(hover)*(.17+.05*Math.sin(now/1000*Math.PI*2/1.6)):0;
    const flat=1-ease(clamp(up/.3)),sink=Math.max(float,dive,ease(clamp(up/.35))),stepping=e>0||aE>0;
    const dy=rabbit.y0,x=iw/2-rabbit.hx,drawn=lean&&up===0,m=`${sink.toFixed(4)}|${drawn}|${stepping}|${x}|${dy}`;
    if(m!==lastMark){lastMark=m;const y=dy-(rabbit.hy-rabbit.sink*sink);
      if(drawn&&hare){if(hareState.sink!==sink){hareState.sink=sink;hare.again()}}
      else if(drawn&&headFront&&hareState.sink!==sink){hareState.sink=sink;headFront.again()}
      else if(!drawn){mark.set(sink,0,1);dock.style.transform=`translate(${x}px,${y}px)`}}
    if(lean){const on=drawn&&!stepping?1:0;
      hare?.set(x,dy-(rabbit.hy-rabbit.sink*sink),1,on);
      holeFront?.set(x,dy-rabbit.hy,1,on);headFront?.set(x,dy-(rabbit.hy-rabbit.sink*sink),1,on,dy)}
    dock.style.visibility=stepping||drawn?'hidden':'';
    // The foot of the lens flattens as the menu opens, so the hole on the chapter and the
    // rabbit's hole stay the same pixels; the mist lifts with it.
    const opened=ease(clamp(menuT/DIVE)),foot=flat*(1-opened);
    glw?.lens(flat*(1-e)*fade,foot*(1-e));
    const haze=flat*(1-opened);if(lean)glw.mist(mistAt[0],mistAt[1],haze);else mist.style.opacity=haze.toFixed(3);
    const fa=Math.round(clamp((u/START-.15)/.4)*1000)/1000;if(fa!==lastFall){lastFall=fa;fall(fa)}
    // What the rabbit found comes up out of the hole: each starts inside it, small and
    // tumbling, is squeezed through the funnel over it and comes to lie where it lies.
    const [,, ,oyo6,,oxo6]=origins[HOLE],k6=H[2]*g,holeX=P[0]+(iw/2-P[0])*g,holeY=P[1]+(dy-P[1])*g;
    cards.forEach((c,k)=>{const r=rest[k],l=ease(clamp((tt-.06-k*.1)/.4)),s=(.3+.7*l)*r.size,turn=r.turn+(1-l)*(k%2?.5:-.5);
      const sy=holeAt[1]-r.h*.3*r.size*.55,mx=holeAt[0]+(r.cx-holeAt[0])*l,my=sy+(r.cy-sy)*l,co=Math.cos(turn),si=Math.sin(turn),hw=r.w*s/2,hh=r.h*s/2;
      const px=mx-(hw*co-hh*si),py=my-(hw*si+hh*co),o=clamp(l*5)*(open>=0?wall:1);
      cardSprite[k]?.set(px,py,s,o,turn);move(c,`translate(${px}px,${py}px) rotate(${turn}rad) scale(${s})`);if(!glw)c.style.opacity=o.toFixed(3);c.inert=l<.9||open>=0});
    {const o=ease(clamp((tt-.85)/.3))*(open>=0?wall:1)*(menuAim?1:ease(clamp(menuT/MENU)));arrowSprite?.set(arrowAt[0],arrowAt[1],1,o);move(arrow,`translate(${arrowAt[0]}px,${arrowAt[1]}px)`);if(!glw)arrow.style.opacity=o.toFixed(3);arrow.inert=o<.5}
    pages.forEach((p,k)=>{const o=open===k?ease(clamp((e-.3)/.6)):0;pageSprite[k]?.set(pagePose[0],pagePose[1],pagePose[2],o);
      move(p,`translate(${pagePose[0]}px,${pagePose[1]}px) scale(${pagePose[2]})`);if(!glw)p.style.opacity=o.toFixed(3);p.inert=!(open===k&&shown>.9)});
    if(glw){const r0=rest[0];glw.funnel(holeX,holeY,-k6*Math.max(40,holeAt[1]-(r0.cy+r0.h*r0.size/2))*.92,ease(clamp(tt/.2))*(1-ease(clamp((tt-.75)/.3)))*(1-e)*fade);glw.touch()}
  }
  let busy=changed||open>=0&&shown!==aim||hover>0||menuT>0&&menuT<MENU||about.t>0&&about.t<1;
  if(glw){if(!lean&&settle.size&&glw.idle&&(open<0||shown===aim))place();if(glw.tick())busy=true}
  if(!glw||glw.idle&&(!lean||editNear)){if(lean&&settle.has(edited)){edited.style.transform=settle.get(edited);settle.delete(edited)}watchEdit()}
  if(busy||beyond.active)awakeUntil=now+300;
}else if(reading){watchEdit();panels.forEach(p=>{p.inert=false;p.removeAttribute('hidden-far')});pages.forEach(p=>p.inert=false);cards.forEach(c=>c.inert=false)}
beyond.draw(now);
if(hud){perf.n++;perf.worst=Math.max(perf.worst,gap);perf.js+=performance.now()-t0;if(gap>40)perf.slow++;
  if(now-perf.since>1000){const g=glw?.stats||{};hud.textContent=`${Math.round(perf.n*1000/(now-perf.since))} fps   worst ${perf.worst.toFixed(0)} ms   over 40ms: ${perf.slow}\nscript ${(perf.js/perf.n).toFixed(1)} ms/frame\ndrawn again ${g.rasters||0} (${(g.rasterMs||0).toFixed(0)} ms)   read ${g.reads||0}\n${innerWidth}x${innerHeight} @${devicePixelRatio}   drawn at ${glw?(Math.min(2,devicePixelRatio)*glw.res).toFixed(2):'-'}x${lean?'   lean':''}${steady?'   steady, ease '+EASE+' ms':''}`;
    Object.assign(perf,{n:0,worst:0,js:0,since:now,slow:0});if(glw)Object.assign(glw.stats,{rasters:0,rasterMs:0,reads:0})}}
if(!lean||warming||now<awakeUntil)requestAnimationFrame(frame);else{running=false;if(hud)hud.textContent+='\nat rest: loop stopped'}}
pages.forEach(p=>p.tabIndex=-1);if('scrollRestoration' in history)history.scrollRestoration='manual';
document.fonts.ready.then(()=>{glw?.reread();layout(true);wake()});addEventListener('resize',layout);body.classList.remove('reading');body.classList.add('flat');dock.style.transformOrigin='0 0';layout(true);if(reduced)toggleReading(true);running=true;requestAnimationFrame(frame);
if(warming){viewport.style.opacity='.01';let n=0;const tick=()=>{if(++n<4)requestAnimationFrame(tick);else{warming=false;lastKey='';wake();requestAnimationFrame(()=>viewport.style.opacity='')}};requestAnimationFrame(tick)}
if(location.hash){const k=named(),target=k<0&&document.querySelector(location.hash);
  if(k>=0&&!reduced)setTimeout(()=>{openMenu(true);openProject(k,true)},80);else if(location.hash==='#about')setTimeout(openAbout,80);else if(target?.dataset?.panel)setTimeout(()=>showScreen(+target.dataset.panel),50)}
mountCookieBar();
