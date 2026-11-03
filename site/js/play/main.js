import * as THREE from 'three';
import {makePlayView} from './view.js';
import {Game,HOLES} from './state.js';
import {gamePose,blend} from './motion.js';
let canvas=document.querySelector('#field');
const loading=document.querySelector('#loading');
try {
let style='sky',view=makePlayView(canvas,style);
const game=new Game(),world=new THREE.Group();view.world.add(world);
world.add(new THREE.HemisphereLight('#ffffff','#527568',2));
const sun=new THREE.DirectionalLight('#fff9e8',2.2);sun.position.set(-5,9,4);world.add(sun);
const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:1,metalness:0});
const fieldMat=material('#91b2a1');
const outline=new THREE.Shape();outline.moveTo(-12,-12);outline.lineTo(12,-12);outline.lineTo(12,12);outline.lineTo(-12,12);outline.closePath();
for(const h of HOLES){const path=new THREE.Path();path.absarc(h.x,-h.z,.46,0,Math.PI*2,true);outline.holes.push(path);}
const ground=new THREE.Mesh(new THREE.ShapeGeometry(outline,48),fieldMat);ground.rotation.x=-Math.PI/2;world.add(ground);
const base=new THREE.Mesh(new THREE.BoxGeometry(24,.3,24),material('#739b89'));base.position.y=-.18;world.add(base);
// Quiet spatial cues: a dotted grid and a few boundary stones.
const dots=[];for(let x=-11;x<=11;x++)for(let z=-11;z<=11;z++)if(!HOLES.some(h=>Math.hypot(x-h.x,z-h.z)<.8))dots.push(x,.006,z);
const dotGeo=new THREE.BufferGeometry();dotGeo.setAttribute('position',new THREE.Float32BufferAttribute(dots,3));
world.add(new THREE.Points(dotGeo,new THREE.PointsMaterial({color:'#5a8773',size:.035,sizeAttenuation:true,transparent:true,opacity:.5})));
for(const [i,h] of HOLES.entries()){
 const disk=new THREE.Mesh(new THREE.CircleGeometry(.46,48),new THREE.MeshBasicMaterial({color:'#102d2d'}));disk.rotation.x=-Math.PI/2;disk.position.set(h.x,-.006,h.z);world.add(disk);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.47,.025,8,48),material('#d6cc9e'));ring.rotation.x=-Math.PI/2;ring.position.set(h.x,.012,h.z);world.add(ring);
 const marker=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.28,6),material('#c6d8c7'));marker.position.set(h.x+.7,.14,h.z);world.add(marker);
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),material('#e6dfbc'));dot.position.set(h.x+.7,.3,h.z);world.add(dot);
}
for(let i=0;i<18;i++){
 const a=i/18*Math.PI*2,r=11.2;
 const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.16+(i%3)*.065,0),material(i%2?'#a7baab':'#d0cebc'));
 rock.position.set(Math.cos(a)*r,.11,Math.sin(a)*r);rock.scale.set(1.4,.65,1);rock.rotation.y=i*1.7;world.add(rock);
}
// A soft contact shadow anchors the rabbit without changing its material.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
const shadowContext=shadowCanvas.getContext('2d');
const radial=shadowContext.createRadialGradient(32,32,2,32,32,32);
radial.addColorStop(0,'rgba(20,50,40,.28)');radial.addColorStop(1,'rgba(20,50,40,0)');
shadowContext.fillStyle=radial;shadowContext.fillRect(0,0,64,64);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.95,.65),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;world.add(shadow);
const targetMark=new THREE.Mesh(new THREE.RingGeometry(.11,.15,32),new THREE.MeshBasicMaterial({color:'#fff7ce',side:THREE.DoubleSide}));targetMark.rotation.x=-Math.PI/2;targetMark.position.y=.02;targetMark.visible=false;world.add(targetMark);
const keys=new Set(),touch=new Set();let started=false,paused=false,last=performance.now(),lastState='free',previousJ=null,transitionFrom=null,transitionTime=1;
const intro=document.querySelector('#intro'),score=document.querySelector('#score'),noticeTitle=document.querySelector('#notice-title'),noticeDetail=document.querySelector('#notice-detail');
const help=document.querySelector('#help-panel');
function start(){started=true;intro.hidden=true;document.body.classList.add('started');canvas.focus();}
function reset(){game.reset();keys.clear();touch.clear();transitionFrom=null;previousJ=null;lastState='free';view.camera.position.set(game.x+3,3.3,game.z+5);score.textContent='00';}
document.querySelector('#start').onclick=start;
document.querySelector('#reset').onclick=()=>{reset();start();};
function showHelp(show){help.hidden=!show;paused=show;document.querySelector('#help').setAttribute('aria-expanded',String(show));keys.clear();touch.clear();if(!show)canvas.focus();}
document.querySelector('#help').onclick=()=>showHelp(help.hidden);
document.querySelector('#close-help').onclick=()=>showHelp(false);
const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
addEventListener('keydown',e=>{if(e.code==='Escape'){showHelp(help.hidden);return;}if(!movement.has(e.code)||paused)return;e.preventDefault();if(!started)start();keys.add(e.code);});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();touch.clear();});
document.addEventListener('visibilitychange',()=>{keys.clear();touch.clear();last=performance.now();});
for(const button of document.querySelectorAll('[data-dir]')){
 button.onpointerdown=e=>{e.preventDefault();start();touch.add(button.dataset.dir);button.setPointerCapture(e.pointerId);};
 button.onpointerup=button.onpointercancel=()=>touch.delete(button.dataset.dir);
}
const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function onFieldPointer(e){
 if(paused||e.button!==0)return;if(!started)start();
 const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),view.camera);
 if(raycaster.ray.intersectPlane(plane,hit))game.setTarget(hit.x,hit.z);
}
canvas.addEventListener('pointerdown',onFieldPointer);
for(const button of document.querySelectorAll('[data-style]'))button.onclick=()=>{
 const next=button.dataset.style;if(next===style)return;
 const old=view,position=old.camera.position.clone(),quaternion=old.camera.quaternion.clone();
 const fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);canvas=fresh;
 style=next;view=makePlayView(canvas,style);view.world.add(world);old.dispose();
 view.camera.position.copy(position);view.camera.quaternion.copy(quaternion);
 canvas.classList.toggle('pixelated',style==='pixel'||style==='ps1');
 canvas.addEventListener('pointerdown',onFieldPointer);
 previousJ=null;transitionFrom=null;
 document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 keys.clear();touch.clear();canvas.focus();
};
const input=()=>{
 const right=Number(keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'));
 const forward=Number(keys.has('KeyW')||keys.has('ArrowUp')||touch.has('up'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||touch.has('down'));
 return {x:(right*5-forward*3)/Math.sqrt(34),z:(-right*3-forward*5)/Math.sqrt(34)};
};
view.camera.position.set(game.x+3,3.3,game.z+5);
const aim=new THREE.Vector3(game.x,.35,game.z),desired=new THREE.Vector3();
function frame(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(started&&!paused&&!document.hidden)game.update(dt,input());
 let J=gamePose(game,style==='sky'?'soft':'classic');
 if(lastState!==game.state){transitionFrom=previousJ;transitionTime=0;lastState=game.state;}
 transitionTime+=dt;
 if(transitionFrom&&transitionTime<.18)J=blend(transitionFrom,J,Math.min(1,transitionTime/.18));
 previousJ=J;
 const cx=game.state==='free'?game.x:game.state==='exit'?J.pelvis[0]:game.hole.x;
 const cz=game.state==='free'?game.z:game.state==='exit'?J.pelvis[2]:game.hole.z;
 desired.set(cx+3,3.3,cz+5);view.camera.position.lerp(desired,1-Math.exp(-dt*5));
 aim.lerp(new THREE.Vector3(cx,.3,cz),1-Math.exp(-dt*7));view.camera.lookAt(aim);
 shadow.visible=game.state==='free';shadow.position.set((J.pelvis[0]+J.chest[0])*.5,.009,(J.pelvis[2]+J.chest[2])*.5);
 shadow.material.opacity=Math.max(.25,1-(J.pelvis[1]-.17));
 view.resize();view.update(J,null,game.state!=='free');view.render();
 targetMark.visible=!!game.target&&game.state==='free';if(game.target)targetMark.position.set(game.target.x,.02,game.target.z);
 score.textContent=String(game.score).padStart(2,'0');
 noticeTitle.textContent=game.state==='peek'?'+1 · Curiosity rewarded.':'';
 noticeDetail.textContent=game.state==='peek'?'Move or tap the field to leap back out.':'';
 // Readable state makes QA possible without exposing mutable game internals.
 canvas.dataset.style=style;canvas.dataset.state=game.state;canvas.dataset.position=`${game.x.toFixed(2)},${game.z.toFixed(2)}`;
 requestAnimationFrame(frame);
}
loading.hidden=true;requestAnimationFrame(frame);
} catch(error){console.error(error);loading.textContent='The field needs WebGL2. Try a recent browser with hardware acceleration enabled.';}
