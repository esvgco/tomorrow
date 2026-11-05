import {clamp,ease,reduced,getDay,setDay,mountFall,mountGaps,watchEdit,updateTeasers,tomorrow} from './shared.js';
import {mountMark} from '../mark.js';
// The tube: the wall's six screens are pinned to the inside of a vertical shaft in a
// helix. Scrolling moves the camera down and round, so the next screen is always a
// little lower and a little further to the side. The shaft is drawn on a canvas with
// the same projection as the CSS scene, and the whole viewport goes through a
// displacement filter that bends its sides towards you, like a concave screen.
const $=s=>document.querySelector(s),body=document.body,viewport=$('#viewport'),camera=$('#camera'),lines=$('#tube-lines'),ctx=lines.getContext('2d');
const panels=[...document.querySelectorAll('[data-panel]')];
const R=1500,EYE=650,STEP=.62,DESC=2; // tube radius, eye behind the axis, turn per screen, length of the drop
const guides=!body.classList.contains('no-guides');
// Safari (and every iPad browser, all WebKit) is left flat unless ?bend=1 forces the filter on.
const safari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent)&&new URLSearchParams(location.search).get('bend')!=='1';
if(safari)body.classList.add('no-bend');
let mobile=false,PW=1100,PH=650,H=760,bottomY=0,persp=1000,T=0,fit=1,segment=1100,iw=innerWidth,ih=innerHeight,dpr=1;
let s=0,yaw=0,camY=0,pitch=0,roll=0,lookX=0,lookY=0,look={x:0,y:0},velocity=0,lastScroll=0,lastTime=performance.now();
let reading=false,roomOpen=false,roomEntering=false,hoverLast=false,falling=false;

function placePanels(){panels.forEach((p,i)=>{p.style.transform=`translate3d(0,${i*H}px,0) rotateY(${-i*STEP}rad) translateZ(${-R}px) translate(${-PW/2}px,${-PH/2}px)`})}
function bendMap(){
  // Source lookup: horizontal compression and vertical pull towards the middle grow
  // outside a flat middle band, so the centre stays crisp and only the sides bend.
  const w=Math.max(2,Math.round(iw/2)),h=Math.max(2,Math.round(ih/2)),a=mobile?.08:.12,b=mobile?.12:.18;
  const maxD=Math.max(a*iw/2,b*ih/2),S=Math.ceil(maxD*2+4);
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),img=g.createImageData(w,h);
  for(let y=0;y<h;y++){const ny=(y+.5)/h*2-1;for(let x=0;x<w;x++){const nx=(x+.5)/w*2-1,k=Math.max(0,(Math.abs(nx)-.32)/.68)**2.4;const dx=-a*(iw/2)*nx*k,dy=-b*(ih/2)*ny*k;const o=(y*w+x)*4;img.data[o]=Math.round(255*clamp(dx/S+.5));img.data[o+1]=Math.round(255*clamp(dy/S+.5));img.data[o+2]=128;img.data[o+3]=255}}
  g.putImageData(img,0,0);const url=c.toDataURL();
  const f=$('#bend'),im=$('#bend-map'),dm=f.querySelector('feDisplacementMap');
  for(const el of [f,im]){el.setAttribute('width',iw);el.setAttribute('height',ih)}
  im.setAttribute('href',url);im.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',url);dm.setAttribute('scale',S);
}
function layout(){
  iw=innerWidth;ih=innerHeight;mobile=iw<650;PW=mobile?700:1100;PH=mobile?1000:650;H=mobile?1150:760;bottomY=5*H+11000;
  fit=Math.max(.3,Math.min((iw-(mobile?40:100))/PW,(ih-160)/PH));
  persp=(R+EYE)*fit;T=persp-EYE;viewport.style.perspective=persp+'px';
  segment=Math.max(850,ih*1.3);$('#scroll-track').style.height=(segment*(5+DESC)+ih)+'px';
  dpr=Math.min(2,devicePixelRatio||1);lines.width=Math.round(iw*dpr);lines.height=Math.round(ih*dpr);
  placePanels();if(!safari)bendMap();
}

// The CSS chain on #camera is translateZ(T) rotateZ(roll) rotateX(pitch) rotateY(yaw) translate(0,-camY);
// the canvas uses the same chain, so the drawn shaft and the DOM screens agree.
let cy=1,sy=0,cp=1,sp=0,cr=1,sr=0;
function toCam(x,y,z){y-=camY;let X=x*cy+z*sy,Z=-x*sy+z*cy,Y=y;let Y2=Y*cp-Z*sp,Z2=Y*sp+Z*cp;return [X*cr-Y2*sr,X*sr+Y2*cr,Z2]}
const NEAR=40;
function proj(c){const k=persp/(EYE-c[2]);return [iw/2+c[0]*k,ih/2+c[1]*k]}
function depth(c){return EYE-c[2]}
function wallPoint(t,y){return toCam(R*Math.sin(t),y,-R*Math.cos(t))}
const buckets=[[],[],[],[]];
function seg(a,b){let da=depth(a),db=depth(b);if(da<NEAR&&db<NEAR)return;if(da<NEAR||db<NEAR){const t=(NEAR-da)/(db-da),m=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,EYE-NEAR];if(da<NEAR){a=m;da=NEAR}else{b=m;db=NEAR}}const d=(da+db)/2,q=Math.min(3,Math.floor(d/2400));buckets[q].push(proj(a),proj(b))}
function drawTube(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,iw,ih);if(!guides)return drawHole();buckets.forEach(b=>b.length=0);
  const rate=H/STEP,gap=rate*Math.PI*2/14,top=camY-3200,bot=bottomY,full=pitch<-.25;
  const t0=yaw-(full?Math.PI:2.1),t1=yaw+(full?Math.PI:2.1),dt=.045;
  // the thread: helical grooves parallel to the path of the screens
  for(let k=Math.floor((top-t1*rate)/gap)-1;k<=Math.ceil((bot-t0*rate)/gap)+1;k++){let prev=null;for(let t=t0;t<=t1+1e-6;t+=dt){const y=t*rate+k*gap+PH*.62;if(y<top||y>bot){prev=null;continue}const c=wallPoint(t,y);if(prev)seg(prev,c);prev=c}}
  // ribs, and the rim where the shaft meets its floor
  for(let i=0;i<24;i++){const t=i/24*Math.PI*2;let prev=null;for(let y=top;y<=bot;y+=220){const c=wallPoint(t,Math.min(y,bot));if(prev)seg(prev,c);prev=c}}
  {let prev=null;for(let i=0;i<=96;i++){const c=wallPoint(i/96*Math.PI*2,bot);if(prev)seg(prev,c);prev=c}}
  const tones=['#d2d2d2','#dcdcdc','#e5e5e5','#eeeeee'];
  ctx.lineWidth=1;buckets.forEach((b,q)=>{if(!b.length)return;ctx.strokeStyle=tones[q];ctx.beginPath();for(let i=0;i<b.length;i+=2){ctx.moveTo(b[i][0],b[i][1]);ctx.lineTo(b[i+1][0],b[i+1][1])}ctx.stroke()});
  // the hole at the bottom of the shaft
  drawHole();
}

function drawHole(){
  const bot=bottomY;
  let poly=[];for(let i=0;i<72;i++){const t=i/72*Math.PI*2;poly.push(toCam(R*.4*Math.sin(t),bot,-R*.4*Math.cos(t)))}
  const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=depth(a),db=depth(b);if(da>=NEAR)out.push(a);if((da<NEAR)!==(db<NEAR)){const t=(NEAR-da)/(db-da);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,EYE-NEAR])}}
  if(out.length>2){ctx.fillStyle='#000';ctx.beginPath();out.forEach((c,i)=>{const p=proj(c);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])});ctx.closePath();ctx.fill()}
}
const mark=mountMark($('#wall-rabbit')),fall=mountFall($('[data-fall]'));
function go(i){if(reading){panels[i].scrollIntoView({behavior:reduced?'instant':'smooth'});return}scrollTo({top:i*segment,behavior:reduced?'instant':'smooth'})}
function reset(){scrollTo({top:0,behavior:'instant'});s=0;lastScroll=0;velocity=0;falling=false}
document.querySelectorAll('[data-stop]').forEach(b=>b.onclick=e=>{e.preventDefault();go(+b.dataset.stop)});
$('#little-door').onclick=()=>scrollTo({top:segment*(5+DESC),behavior:reduced?'instant':'smooth'});
$('#reset-wall').onclick=()=>{setDay(0);$('#help').close();reset()};
function toggleReading(force){reading=typeof force==='boolean'?force:!reading;body.classList.toggle('reading',reading);$('#read-button').textContent=reading?'Go down the tube':'Read normally';if(reading){viewport.removeAttribute('inert');scrollTo(0,0)}else{layout();reset()}}
$('#read-button').onclick=()=>toggleReading();

// Every glyph of the last heading is a room, as on the wall.
let chosenLetter=null,roomMotion=null;const heading=$('#last-heading');
for(const node of [...heading.childNodes]){if(node.nodeType!==3)continue;const fragment=document.createDocumentFragment();for(const char of node.textContent){if(/\s/.test(char)){fragment.append(document.createTextNode(char));continue}const letter=document.createElement('span');letter.className='room-letter';letter.dataset.letter=char;letter.append(document.createTextNode(char));for(let i=1;i<=6;i++){const d=document.createElement('span');d.className='letter-depth';d.setAttribute('aria-hidden','true');d.textContent=char;d.style.transform=`translateZ(${-i*.6}px)`;letter.append(d)}letter.onpointerenter=()=>chosenLetter=letter;fragment.append(letter)}node.replaceWith(fragment)}
function enterRoom(event){if(roomOpen||reading||roomEntering)return;chosenLetter=event?.target?.closest('.room-letter')||chosenLetter||heading.querySelector('.room-letter');const r=chosenLetter.getBoundingClientRect(),room=$('#room');roomOpen=true;roomEntering=true;room.hidden=false;room.setAttribute('aria-label',`Inside the letter ${chosenLetter.dataset.letter}`);$('.room-caption').textContent=`Inside “${chosenLetter.dataset.letter}”.`;
  const kx=Math.max(.015,r.width/innerWidth),ky=Math.max(.015,r.height/innerHeight);room.style.transformOrigin='0 0';room.dataset.entry=`translate(${r.left}px,${r.top}px) scale(${kx},${ky})`;
  roomMotion=room.animate([{transform:room.dataset.entry},{transform:'translate(0,0) scale(1)'}],{duration:reduced?1:1700,easing:'cubic-bezier(.5,0,.15,1)',fill:'both'});
  viewport.inert=true;$('.site-header').inert=true;$('.page-tools').inert=true;
  roomMotion.finished.then(()=>{roomEntering=false;$('#leave-room').focus({preventScroll:true})}).catch(()=>{})}
function leaveRoom(){if(!roomOpen)return;const room=$('#room');roomMotion?.cancel();roomOpen=false;roomEntering=true;const exit=room.animate([{transform:'translate(0,0) scale(1)'},{transform:room.dataset.entry||'scale(.01)'}],{duration:reduced?1:1100,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});exit.finished.then(()=>{room.hidden=true;exit.cancel();roomEntering=false;viewport.inert=false;$('.site-header').inert=false;$('.page-tools').inert=false;heading.focus({preventScroll:true})})}
$('#leave-room').onclick=leaveRoom;$('#room-tomorrow').onclick=()=>{leaveRoom();tomorrow(reset)};
heading.onpointerenter=()=>hoverLast=true;heading.onpointerleave=()=>hoverLast=false;heading.onclick=enterRoom;heading.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();enterRoom()}};
addEventListener('wheel',e=>{if(reading||e.ctrlKey||document.querySelector('dialog[open]'))return;if(roomOpen||roomEntering||falling){e.preventDefault();return}if(hoverLast&&s>4.7&&s<5.3&&e.deltaY<0){e.preventDefault();enterRoom()}},{passive:false});
addEventListener('keydown',e=>{if(roomOpen){if(e.key==='Tab'){e.preventDefault();(document.activeElement===$('#leave-room')?$('#room-tomorrow'):$('#leave-room')).focus()}if(e.key==='Escape'){leaveRoom();e.preventDefault()}}});
addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;lookX=e.clientX/innerWidth-.5;lookY=e.clientY/innerHeight-.5});
mountGaps(()=>{setDay(getDay()+1);go(Math.min(5,Math.floor(s)+1))});

const names=['A beginning','Possibility','Human','People','In the making','A small beginning'];
function frame(now){
  const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
  if(!reading&&!roomOpen){
    s=clamp(scrollY/segment,0,5+DESC);
    const v=scrollY-lastScroll;lastScroll=scrollY;velocity+=(v-velocity)*(1-Math.exp(-dt*10));
    look.x+=(lookX-look.x)*(1-Math.exp(-dt*3));look.y+=(lookY-look.y)*(1-Math.exp(-dt*3));
    const u=clamp((s-5)/DESC);
    yaw=Math.min(s,5)*STEP+u*u*.9+look.x*.06;
    camY=Math.min(s,5)*H+(bottomY-120-5*H)*u**2.2;
    roll+=(clamp(velocity/90,-1,1)*.03-roll)*(1-Math.exp(-dt*6));
    pitch=-ease(u/.45)*Math.PI/2-clamp(velocity/90,-1,1)*.02*(1-u)+look.y*.03*(1-u);
    cy=Math.cos(yaw);sy=Math.sin(yaw);cp=Math.cos(pitch);sp=Math.sin(pitch);cr=Math.cos(roll);sr=Math.sin(roll);
    camera.style.transform=`translateZ(${T}px) rotateZ(${roll}rad) rotateX(${pitch}rad) rotateY(${yaw}rad) translate3d(0,${-camY}px,0)`;
    drawTube();
    panels.forEach((p,j)=>{const off=Math.abs(j-Math.min(s,5));p.style.visibility=off>2.6?'hidden':'';p.inert=off>1.15});
    mark.set(ease(s/.7),ease((s-.45)/.3)*.98,1);fall(clamp((s-.72)/.62));watchEdit();updateTeasers();
    const index=Math.min(5,Math.round(s));$('#position-label').textContent=u>.15?'06 — Down the hole':`${String(index+1).padStart(2,'0')} — ${names[index]}`;
    if(u>.985&&!falling){falling=true;tomorrow(reset)}
  }else if(reading){watchEdit();updateTeasers();panels.forEach(p=>{p.inert=false;p.style.visibility=''})}
  requestAnimationFrame(frame)}
addEventListener('resize',()=>{if(!reading)layout()});
await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2000))]);
body.classList.remove('reading');layout();lastScroll=scrollY;if(reduced)toggleReading(true);frame(performance.now());document.documentElement.classList.remove('wall-boot');
if(location.hash){const target=document.querySelector(location.hash);if(target?.dataset.panel)setTimeout(()=>go(+target.dataset.panel),50)}
$('.skip-link').onclick=e=>{e.preventDefault();go(5);setTimeout(()=>$('.contact-link').focus({preventScroll:true}),400)};
