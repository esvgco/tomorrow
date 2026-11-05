import {clamp,ease,reduced,onDay,getDay,setDay,mountFall,mountGaps,watchEdit,updateTeasers} from './shared.js';
import {mountMark} from '../mark.js';
const $=s=>document.querySelector(s),body=document.body,viewport=$('#viewport'),camera=$('#camera'),world=$('#world');
const panels=[...document.querySelectorAll('[data-panel]')];
// Each chapter is printed at less than half the physical size of the previous one.
// Camera height AND wall distance decrease together; the apparent page is a camera path.
const scales=[1,1,1,1,1,1],centres=[0];
let floor=0;
function placeWall(){
  const spacing=innerWidth<650?1280:830;
  for(let i=1;i<6;i++)centres[i]=centres[i-1]+spacing*scales[i-1];
  floor=centres[5]+6;
  panels.forEach((p,i)=>{p.style.transform=`translateY(${centres[i]}px) scale(${scales[i]})`});
  $('#wall-surface').style.height=(floor+540)+'px';
  $('#rear-hole').style.transform=`translate3d(0,${floor+22}px,3000px) rotateX(75deg)`;
  $('#secret-hole').style.transform=`translate3d(0,${floor+22}px,-350px) rotateX(75deg)`;
  $('.back-inscription').style.transform=`translate3d(-200px,${floor-160}px,-2px) rotateY(180deg)`;
}
const mark=mountMark($('#wall-rabbit')),fall=mountFall($('[data-fall]'));
let roomEntering=false,roomFlight=null;
let step=0,targetStep=0,retreat=0,yaw=0,targetYaw=0,side=0,lookX=0,lookY=0,reading=false,roomOpen=false,hoverLast=false,lastTime=performance.now(),velocity=0,scrollTilt=0,lastScroll=0;
let focal=1000,fit=1,segment=1100,drag=null,suppressClick=false;
function layout(){placeWall();focal=Math.max(650,innerHeight*1.25);fit=Math.min((innerWidth-(innerWidth<650?40:100))/(innerWidth<650?700:1100),(innerHeight-160)/650);fit=Math.max(.3,fit);viewport.style.perspective=focal+'px';$('#rear-hole').style.transform=`translate3d(0,${floor+22}px,${focal/fit+2950}px) rotateX(75deg)`;segment=Math.max(850,innerHeight*1.3);$('#scroll-track').style.height=(segment*5+innerHeight)+'px'}
let returning=false;
function tomorrow(){if(returning)return;returning=true;setDay(getDay()+1);leaveRoom();const start=performance.now(),from={retreat,side,yaw,y:scrollY};const duration=reduced?0:1800;function move(now){const t=duration?clamp((now-start)/duration):1,k=ease(t);retreat=from.retreat*(1-k);side=from.side*(1-k);yaw=targetYaw=from.yaw*(1-k);scrollTo({top:from.y*(1-k),behavior:'instant'});targetStep=clamp(scrollY/segment,0,5);if(t<1)requestAnimationFrame(move);else returning=false}requestAnimationFrame(move)}
function reset(){retreat=0;side=0;targetYaw=0;yaw=0;step=0;targetStep=0;scrollTo(0,0);leaveRoom();}
function go(i){retreat=0;side=0;targetYaw=0;if(reading){panels[i].scrollIntoView({behavior:reduced?'instant':'smooth'});return}scrollTo({top:i*segment,behavior:reduced?'instant':'smooth'})}
document.querySelectorAll('[data-stop]').forEach(b=>b.onclick=e=>{e.preventDefault();go(+b.dataset.stop)});
$('#little-door').onclick=()=>{retreat=Math.max(retreat,180);targetYaw=Math.PI};$('#turn-button').onclick=()=>{targetYaw+=Math.PI};
$('#rear-hole').onclick=()=>tomorrow(reset);$('#secret-hole').onclick=()=>tomorrow(reset);$('#reset-wall').onclick=()=>{setDay(0);$('#help').close();reset()};
function toggleReading(force){reading=typeof force==='boolean'?force:!reading;body.classList.toggle('reading',reading);$('#read-button').textContent=reading?'Explore the wall':'Read normally';$('#turn-button').hidden=true;if(reading){viewport.removeAttribute('inert');scrollTo(0,0)}else{layout();reset()}}
$('#read-button').onclick=()=>toggleReading();
let chosenLetter=null,roomMotion=null;
const heading=$('#last-heading');
for(const node of [...heading.childNodes]){if(node.nodeType!==3)continue;const fragment=document.createDocumentFragment();for(const char of node.textContent){if(/\s/.test(char)){fragment.append(document.createTextNode(char));continue}const letter=document.createElement('span');letter.className='room-letter';letter.dataset.letter=char;letter.append(document.createTextNode(char));for(let i=1;i<=6;i++){const depth=document.createElement('span');depth.className='letter-depth';depth.setAttribute('aria-hidden','true');depth.textContent=char;depth.style.transform=`translateZ(${-i*.6}px)`;letter.append(depth)}letter.onpointerenter=()=>chosenLetter=letter;fragment.append(letter)}node.replaceWith(fragment)}
function enterRoom(event){if(roomOpen||reading||roomEntering)return;chosenLetter=event?.target?.closest('.room-letter')||chosenLetter||heading.querySelector('.room-letter');const r=chosenLetter.getBoundingClientRect(),room=$('#room');roomOpen=true;roomEntering=true;room.hidden=false;room.setAttribute('aria-label',`Inside the letter ${chosenLetter.dataset.letter}`);$('.room-caption').textContent=`Inside “${chosenLetter.dataset.letter}”.`;
const sx=Math.max(.015,r.width/innerWidth),sy=Math.max(.015,r.height/innerHeight);room.style.transformOrigin='0 0';room.dataset.entry=`translate(${r.left}px,${r.top}px) scale(${sx},${sy})`;
roomMotion=room.animate([{transform:room.dataset.entry},{transform:'translate(0,0) scale(1)'}],{duration:reduced?1:1700,easing:'cubic-bezier(.5,0,.15,1)',fill:'both'});
viewport.inert=true;$('.site-header').inert=true;$('.page-tools').inert=true;
roomMotion.finished.then(()=>{roomEntering=false;$('#leave-room').focus({preventScroll:true})}).catch(()=>{});
}
function leaveRoom(){if(!roomOpen)return;const room=$('#room');roomMotion?.cancel();roomOpen=false;roomEntering=true;const exit=room.animate([{transform:'translate(0,0) scale(1)'},{transform:room.dataset.entry||'scale(.01)'}],{duration:reduced?1:1100,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});exit.finished.then(()=>{room.hidden=true;exit.cancel();roomEntering=false;viewport.inert=false;$('.site-header').inert=false;$('.page-tools').inert=false;heading.focus({preventScroll:true})})}
$('#leave-room').onclick=leaveRoom;$('#room-tomorrow').onclick=()=>tomorrow(reset);$('#last-heading').onpointerenter=()=>hoverLast=true;$('#last-heading').onpointerleave=()=>hoverLast=false;$('#last-heading').onclick=enterRoom;$('#last-heading').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();enterRoom()}};
function travel(delta){if(roomEntering||returning)return;if(delta<0&&hoverLast&&targetStep>4.7){enterRoom();return}const distance=delta*1.15;const zNext=retreat+Math.cos(yaw)*distance;side-=Math.sin(yaw)*distance;const minimum=Math.abs(side)>660||retreat<0?-950:0;retreat=clamp(zNext,minimum,3200);if(Math.hypot(side,retreat-2950)<170||Math.hypot(side-650,retreat+350)<120)tomorrow(reset)}
addEventListener('wheel',e=>{if(reading||e.ctrlKey||document.querySelector('dialog[open]'))return;if(roomOpen||roomEntering){e.preventDefault();return}if((targetStep>=4.99&&e.deltaY>0)||retreat!==0||Math.abs(side)>1||Math.abs(Math.sin(yaw/2))>.1){e.preventDefault();travel(e.deltaY*(e.deltaMode===1?16:1))}else if(hoverLast&&targetStep>4.7&&e.deltaY<0){e.preventDefault();enterRoom()}},{passive:false});
addEventListener('scroll',()=>{targetStep=clamp(scrollY/segment,0,5);velocity=Math.abs(scrollY-lastScroll);lastScroll=scrollY},{passive:true});
viewport.addEventListener('pointerdown',e=>{if(reading||e.target.closest('button,a,#last-heading')||e.button!==0)return;drag={x:e.clientX,y:e.clientY,lastY:e.clientY,yaw:targetYaw,moved:false,touch:e.pointerType==='touch'};if(!drag.touch)viewport.setPointerCapture(e.pointerId)});
viewport.addEventListener('pointermove',e=>{lookX=e.clientX/innerWidth-.5;lookY=e.clientY/innerHeight-.5;if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)){drag.moved=true;targetYaw=drag.yaw+dx/innerWidth*Math.PI*2}suppressClick=drag.moved});
viewport.addEventListener('pointerup',()=>drag=null);viewport.addEventListener('pointercancel',()=>drag=null);
viewport.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();suppressClick=false}},true);
// Vertical swipes remain native until the foot of the wall. A horizontal swipe is
// a deliberate turn; horizontal wheel/trackpad deltas are intentionally ignored.
let touch=null;
viewport.addEventListener('touchstart',e=>{const t=e.touches[0];touch={x:t.clientX,y:t.clientY,lastY:t.clientY,yaw:targetYaw}},{passive:true});
viewport.addEventListener('touchmove',e=>{if(reading||!touch)return;const t=e.touches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>12){e.preventDefault();targetYaw=touch.yaw+dx/innerWidth*Math.PI*2}else if((targetStep>=4.99&&dy<0)||retreat!==0||Math.abs(side)>1||Math.abs(Math.sin(yaw/2))>.1){e.preventDefault();travel(touch.lastY-t.clientY)}touch.lastY=t.clientY},{passive:false});
viewport.addEventListener('touchend',()=>touch=null);
addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(roomOpen){if(e.key==='Tab'){e.preventDefault();(document.activeElement===$('#leave-room')?$('#room-tomorrow'):$('#leave-room')).focus()}if(e.key==='Escape'){leaveRoom();e.preventDefault()}return}if(reading||e.metaKey||e.ctrlKey||e.target.closest('input,textarea'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();targetYaw+=(e.key==='ArrowLeft'?-1:1)*Math.PI/4}else if(e.key==='Escape'){targetYaw=0;side=0;retreat=0}else if(targetStep>4.9){if(e.key.toLowerCase()==='a'){side-=120;e.preventDefault()}if(e.key.toLowerCase()==='d'){side+=120;e.preventDefault()}if(e.key.toLowerCase()==='w'){travel(-130);e.preventDefault()}if(e.key.toLowerCase()==='s'){travel(130);e.preventDefault()}if(['ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(e.key)){e.preventDefault();travel(['ArrowUp','PageUp'].includes(e.key)?-120:120)}}});
mountGaps(()=>{setDay(getDay()+1);go(Math.min(5,Math.floor(targetStep)+1))});
onDay(n=>{$('#rear-hole').style.width=600*(1+n*.01)+'px'});
function frame(now){const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;const lerp=1-Math.exp(-dt*9);step=targetStep;yaw+=(targetYaw-yaw)*lerp;velocity*=Math.exp(-dt*5);scrollTilt+=(-clamp(velocity/60)*.09-scrollTilt)*(1-Math.exp(-dt*8));if(velocity<.01&&Math.abs(scrollTilt)<.00001)scrollTilt=0;
if(!reading&&!roomOpen){const i=Math.min(4,Math.floor(step)),t=step-i;const scale=Math.exp(Math.log(scales[i])*(1-t)+Math.log(scales[i+1])*t);const cy=centres[i]+(centres[i+1]-centres[i])*t;const z=focal*scale/fit+retreat;const breath=1;const pitch=scrollTilt+(retreat>0?(.23*ease(retreat/1500)*Math.max(0,Math.cos(yaw))-.04*Math.max(0,-Math.cos(yaw))):0);const turnLook=retreat?lookX*.18:0;
camera.style.transform=`translateZ(${focal}px) rotateX(${pitch}rad) rotateY(${yaw+turnLook}rad) scale(${breath})`;
world.style.transform=`translate3d(${-side}px,${-cy}px,${-z}px)`;
mark.set(ease(step/.7),ease((step-.45)/.3)*.98,1);fall(clamp((step-.72)/.62));watchEdit();updateTeasers();const index=Math.min(5,Math.round(step));$('#position-label').textContent=retreat>10?'06 — Another perspective':`${String(index+1).padStart(2,'0')} — ${['A beginning','Possibility','Human','People','In the making','A small beginning'][index]}`;$('#progress').style.width=(step/5*100)+'%';$('#turn-button').hidden=step<4.8;
// Focus cannot jump the native document to a transformed, tiny section.
panels.forEach((p,j)=>p.inert=Math.abs(j-step)>1.15);$('#rear-hole').inert=Math.cos(yaw)>.2;$('#secret-hole').inert=retreat>=0&&Math.abs(side)<400;
}else if(reading){watchEdit();updateTeasers();panels.forEach(p=>p.inert=false)}requestAnimationFrame(frame)}
addEventListener('resize',layout);await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2000))]);body.classList.remove('reading');layout();targetStep=clamp(scrollY/segment,0,5);lastScroll=scrollY;if(reduced)toggleReading(true);frame(performance.now());document.documentElement.classList.remove('wall-boot');
// Direct anchors work from both the header and a copied URL.
if(location.hash){const target=document.querySelector(location.hash);if(target?.dataset.panel)setTimeout(()=>go(+target.dataset.panel),50)}
$('.skip-link').onclick=e=>{e.preventDefault();go(5);setTimeout(()=>$('.contact-link').focus({preventScroll:true}),400)};
