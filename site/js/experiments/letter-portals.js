import * as THREE from '../../vendor/three/three.module.js';
import {arealFonts,shapesFor} from './areal-outlines.js';
import {MARK_SVG} from '../mark.js';

const dialog=document.querySelector('#letter-gallery');
const host=dialog.querySelector('.gallery-canvas');
const entries=[...document.querySelectorAll('.letter-entry')];
const views=[...dialog.querySelectorAll('[data-view]')];
const flight=document.querySelector('.letter-flight');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const angles=[-Math.PI/2,0,Math.PI/2];
let renderer,scene,camera,painting,easel,backPortal,rabbitTexture,raf=0,entry=0,angle=0,target=0,drag=null,busy=false,scrollBefore=0,oldOverflow='';
let returnEntry=0,historyActive=false,portalDiving=false;
let closeMode=false,approach=0,approachTarget=0,portalHover=false,hoverAmount=0,portalFill,portalFont;
const approachButton=document.querySelector('.approach-easel');
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const materials={};
const material=(color)=>materials[color]??=(new THREE.MeshStandardMaterial({color,roughness:1}));
function box(w,h,d,x,y,z,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh}
let portalGeometry;
const wallPortals=[];
let hoveredWall=null;
function makePortalGeometry(font){
 // The opening is the actual counter of the same Areal Regular o used in the hero.
 const counter=shapesFor(font,'o',1).flatMap(shape=>shape.holes)[0];
 if(!counter)throw new Error('The Areal o has no inner contour');
 const shape=new THREE.Shape();shape.curves=counter.curves;
 const geometry=new THREE.ShapeGeometry(shape,48);
 geometry.computeBoundingBox();
 const bounds=geometry.boundingBox,size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 geometry.translate(-center.x,-center.y,0);
 const scale=2.5/size.y;
 geometry.scale(scale,scale,1);
 return geometry;
}
function portal(x,y,z,rotation=0){const mesh=new THREE.Mesh(portalGeometry.clone(),new THREE.MeshBasicMaterial({color:0x141414,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.userData.rest=mesh.geometry.attributes.position.array.slice();mesh.userData.wave=0;scene.add(mesh);wallPortals.push(mesh);return mesh}
async function loadRabbit(){
 if(rabbitTexture)return;
 const source=new DOMParser().parseFromString(MARK_SVG,'image/svg+xml');
 const rabbit=source.querySelector('#tc-bun');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="882 244 932 1070" fill="#171717">${rabbit.innerHTML}</svg>`;
 const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1200;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1024,1200);ctx.drawImage(image,160,160,704,810);
 rabbitTexture=new THREE.CanvasTexture(canvas);rabbitTexture.colorSpace=THREE.SRGBColorSpace;
}
function makeBackPortal(font){
 const shape=shapesFor(font,'o',1)[0],outer=shape.holes[0].getPoints(96);
 const xs=outer.map(p=>p.x),ys=outer.map(p=>p.y),minX=Math.min(...xs),maxY=Math.max(...ys),w=Math.max(...xs)-minX,h=maxY-Math.min(...ys);
 const pad=24,width=320,height=Math.ceil((width-pad*2)*h/w+pad*2),scale=(width-pad*2)/w;
 function path(points){const p=new Path2D();points.forEach((v,i)=>{const x=pad+(v.x-minX)*scale,y=pad+(maxY-v.y)*scale;i?p.lineTo(x,y):p.moveTo(x,y)});p.closePath();return p}
 const outline=path(outer);
 function tex(hover){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle='#111';if(hover)ctx.filter='blur(5px)';ctx.fill(outline);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
 const geometry=new THREE.PlaneGeometry(1.25*w/h*width/(width-pad*2),1.25*height/(height-pad*2));
 const material=new THREE.ShaderMaterial({
  uniforms:{sharp:{value:tex(false)},soft:{value:tex(true)},hover:{value:0},time:{value:0},wave:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform sampler2D sharp;uniform sampler2D soft;uniform float hover;uniform float time;uniform float wave;varying vec2 vUv;void main(){vec2 uv=vUv+wave*vec2(0.012*sin(vUv.y*8.0+time*1.7),0.010*sin(vUv.x*9.0-time*1.3));float alpha=mix(texture2D(sharp,uv).a,texture2D(soft,uv).a,hover);gl_FragColor=vec4(vec3(0.067),alpha);}',
  transparent:true,depthTest:true,depthWrite:false
 });
 const normal=new THREE.Mesh(geometry,material);
 normal.position.set(0,2.23,.03);normal.rotation.y=Math.PI;normal.renderOrder=10;
 portalFill=normal;easel.add(normal);return normal;
}
function init(){
 if(renderer)return;
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2.5));renderer.setClearColor(0xf5f5f5);renderer.outputColorSpace=THREE.SRGBColorSpace;
 rabbitTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 host.append(renderer.domElement);scene=new THREE.Scene();scene.background=new THREE.Color(0xf5f5f5);
 camera=new THREE.PerspectiveCamera(49,1,.1,50);
 scene.add(new THREE.HemisphereLight(0xffffff,0xb8b8b8,2.5));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-4,8,5);scene.add(light);
 box(12,.12,12,0,-.06,0,0xe5e5e5);
 const wallHeight=host.clientWidth/host.clientHeight<.8?22:8;
 box(12,wallHeight,.12,0,wallHeight/2,-6.1,0xf3f3f3);box(12,wallHeight,.12,0,wallHeight/2,6.1,0xf3f3f3);
 box(.12,wallHeight,12,-6.1,wallHeight/2,0,0xededed);box(.12,wallHeight,12,6.1,wallHeight/2,0,0xededed);
 box(12,.12,12,0,wallHeight,0,0xededed);
 // Every letter shares the central entrance; side walls have no portals.
 portal(0,2.23,6.02,Math.PI);
 for(const x of [-4,-2,0,2,4])box(.008,.002,12,x,.002,0,0xd3d3d3);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:0x888888,transparent:true,opacity:.13}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.7,.8,1);shadow.position.set(0,.008,-2.35);scene.add(shadow);
 easel=new THREE.Group();scene.add(easel);
 const wood=material(0x949494);
 function beam(from,to,width=.065,depth=.075){
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),direction=b.clone().sub(a);
  const m=new THREE.Mesh(new THREE.BoxGeometry(width,direction.length(),depth),wood);
  m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());easel.add(m);return m;
 }
 // A tripod studio easel: two splayed front legs, a hinged rear leg,
 // central sliding mast, lower crossbar and the canvas shelf.
 beam([-1,0,.15],[-.3,2.95,-.10]);beam([1,0,.15],[.3,2.95,-.10]);
 beam([0,0,-1.15],[0,2.65,-.18]);
 beam([0,.65,-.04],[0,3.68,-.04],.075,.07);
 beam([-.86,.52,.105],[.86,.52,.105],.085,.07);
 beam([-1.3,.85,.08],[1.3,.85,.08],.09,.23);
 beam([-.40,2.64,-.15],[.40,2.64,-.15],.11,.14);
 beam([0,1.57,-.04],[0,1.35,-.66],.045,.055);
 painting=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.7),new THREE.MeshBasicMaterial({map:rabbitTexture}));painting.position.set(0,2.23,.16);easel.add(painting);
 const edge=new THREE.Mesh(new THREE.BoxGeometry(2.34,2.74,.09),material(0xd6d6d6));edge.position.set(0,2.23,.10);easel.add(edge);
 const reverse=new THREE.Mesh(new THREE.PlaneGeometry(2.22,2.62),new THREE.MeshBasicMaterial({color:0xe5e5e5}));reverse.position.set(0,2.23,.049);reverse.rotation.y=Math.PI;easel.add(reverse);
 // A dark opening on the canvas reverse, naturally occluded by the easel supports.
 backPortal=makeBackPortal(portalFont);
 easel.position.z=-2.2;
 resize();
}
function pose(a){
 // First explore only the arc joining the three entrances. Once approached,
 // orbit the easel on a smaller ellipse, with enough clearance behind the tripod.
 const roomRadius=camera.aspect<.8?5.42:5.4;
 const roomX=Math.sin(a)*roomRadius,roomZ=Math.cos(a)*roomRadius;
 const nearX=easel.position.x+Math.sin(a)*4.3,nearZ=easel.position.z+Math.cos(a)*(Math.cos(a)>=0?4.8:3.3);
 camera.position.set(THREE.MathUtils.lerp(roomX,nearX,approach),2.23,THREE.MathUtils.lerp(roomZ,nearZ,approach));
 camera.lookAt(0,2.23,easel.position.z);
 const base=camera.userData.baseFov??49;
 camera.fov=THREE.MathUtils.lerp(base,Math.max(base,62),approach);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const behind=closeMode&&camera.position.z<easel.position.z-.12;
 dialog.querySelector('.back-portal-access').hidden=!behind;
 approachButton.hidden=closeMode;
}
function limitAngle(a){return closeMode?a:THREE.MathUtils.clamp(a,-Math.PI/2,Math.PI/2)}
function approachEasel(){if(busy||closeMode)return;closeMode=true;approachTarget=1;approachButton.hidden=true;wake()}
function resize(){if(!renderer||!dialog.open||portalDiving)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.userData.baseFov=w/h<.8?78:49;camera.updateProjectionMatrix();pose(angle);draw()}
function draw(){if(renderer&&dialog.open)renderer.render(scene,camera)}
function animate(){
 if(!dialog.open||portalDiving){raf=0;return}
 const k=reduced.matches?1:.09;
 angle+=(target-angle)*k;approach+=(approachTarget-approach)*k;
 hoverAmount+=((portalHover?1:0)-hoverAmount)*(reduced.matches?1:.16);
 if(portalFill){const u=portalFill.material.uniforms;u.hover.value=hoverAmount;u.wave.value=reduced.matches?0:hoverAmount;u.time.value=performance.now()/1000*1.3;}
 let wallMoving=false;
 const time=performance.now()/1000*1.3;
 for(const wall of wallPortals){
  const goal=wall===hoveredWall&&!reduced.matches?1:0;
  wall.userData.wave+=(goal-wall.userData.wave)*.09;
  const strength=wall.userData.wave;
  if(goal===0&&strength<.0001)continue;
  const positions=wall.geometry.attributes.position,rest=wall.userData.rest;
  for(let i=0;i<positions.count;i++){
   const x=rest[i*3],y=rest[i*3+1];
   positions.setXY(i,x+strength*.035*Math.sin(y*3.2+time*1.7),y+strength*.028*Math.sin(x*4-time*1.3));
  }
  positions.needsUpdate=true;
  wallMoving ||= goal>0||strength>.001;
 }
 pose(angle);draw();
 if((portalHover&&!reduced.matches)||wallMoving||Math.abs(target-angle)>.0001||Math.abs(approachTarget-approach)>.0001||Math.abs((portalHover?1:0)-hoverAmount)>.001)raf=requestAnimationFrame(animate);else raf=0;
}
function wake(){if(!raf&&!portalDiving)raf=requestAnimationFrame(animate)}
function setView(n){hoveredWall=null;closeMode=false;approachTarget=0;portalHover=false;angle=Math.atan2(Math.sin(angle),Math.cos(angle));target=angles[n];views.forEach((v,i)=>v.setAttribute('aria-pressed',String(i===n)));wake()}
async function flyThroughLetter(n){
 const r=entries[n].getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.57;
 const cover=Math.hypot(innerWidth,innerHeight),start=Math.max(3,r.width*.48);
 const rim=document.createElement('div');rim.className='letter-flight-rim';flight.replaceChildren(rim);flight.classList.add('active');
 // Move the whole page toward the aperture, not an isolated letter toward the viewer.
 const canvas=document.querySelector('.wall-canvas');
 const layers=canvas&&getComputedStyle(canvas).display!=='none'?[canvas,document.querySelector('#rabbit-dock')]:[document.querySelector('#viewport'),document.querySelector('#rabbit-dock')];
 const saved=layers.map(el=>{const rect=el.getBoundingClientRect();const state=[el,el.style.scale,el.style.translate,el.style.transformOrigin,el.style.filter,el.style.willChange];el.style.willChange='filter, transform';el.style.transformOrigin=`${cx-rect.left}px ${cy-rect.top}px`;return state});
 const contour=shapesFor(portalFont,'o',1)[0].getPoints(128);
 const xs=contour.map(p=>p.x),ys=contour.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const outline=contour.map(p=>({x:(p.x-(minX+maxX)/2)/((maxX-minX)/2),y:((minY+maxY)/2-p.y)/((maxY-minY)/2)}));
 // Use the same horizontal wave frequencies, speed and relative amplitude as hover.
 const heroSize=parseFloat(getComputedStyle(document.querySelector('#opening h1')).fontSize);
 const entrySize=parseFloat(getComputedStyle(entries[n]).fontSize),ratio=entrySize/heroSize;
 const glyphWidth=entries[n].offsetWidth/ratio;
 const glyphHeight=entries[n].offsetHeight/ratio;
 let waveState,waveStarted;
 function portalOutline(x,y,r,time){
  const phase=waveState.phase+(time-waveStarted)*1.5,amp=reduced.matches?0:waveState.wave*.28;
  return 'polygon('+outline.map(p=>{
   const fontY=(minY+maxY)/2-p.y*(maxY-minY)/2;
   const row=(waveState.baseline-fontY*entrySize+Math.ceil(entrySize*.4))/ratio;
   const dx=amp*(Math.sin(row*.09+phase*1.7)+.4*Math.sin(row*.17-phase));
   return `${(x+r*(p.x+dx/(glyphWidth*.48))).toFixed(2)}px ${(y+r*1.18*p.y).toFixed(2)}px`;
  }).join(',')+')';
 }
 Object.assign(rim.style,{inset:'0',width:'100%',height:'100%',borderRadius:'0'});
 if(canvas)dispatchEvent(new Event('wall-camera-flight-prepare'));
 waveState=entries[n]._portalWave||{phase:performance.now()/1000*1.5,wave:8,baseline:glyphHeight*ratio*.8};
 waveStarted=performance.now()/1000;
 const duration=reduced.matches?1:1000;let started=null,revealAt=null;
 const easeOut=t=>1-(1-t)**2;
 // Subtle ease-out bias in logarithmic zoom space.
 const approachEase=t=>t+.25*t*(1-t);
 // Reach every viewport corner at 70% of the flight, retaining the 25% ease-out.
 const blackProgress=approachEase(.7);
 const blackX=cx+(innerWidth/2-cx)*blackProgress,blackY=cy+(innerHeight/2-cy)*blackProgress;
 const blackRadius=Math.max(...[[0,0],[innerWidth,0],[0,innerHeight],[innerWidth,innerHeight]].map(([x,y])=>Math.hypot(x-blackX,(y-blackY)/1.18)));
 const zoomTarget=Math.pow(blackRadius/start,1/blackProgress);
 function coverage(x,y,rx){
  let area=0;const rows=64,dy=innerHeight/rows,ry=rx*1.18;
  for(let i=0;i<rows;i++){const yy=(i+.5)*dy,d=(yy-y)/ry;if(Math.abs(d)>=1)continue;const dx=rx*Math.sqrt(1-d*d);area+=Math.max(0,Math.min(innerWidth,x+dx)-Math.max(0,x-dx))*dy}
  return area/(innerWidth*innerHeight);
 }
 try{await new Promise(resolve=>{
  function frame(now){
   // Start on the first displayed frame, after texture preparation.
   started??=now;
   const t=Math.min(1,(now-started)/duration),move=approachEase(t);
   const x=cx+(innerWidth/2-cx)*move,y=cy+(innerHeight/2-cy)*move;
   const zoom=Math.pow(zoomTarget,approachEase(t)),outer=start*zoom;
   // Subtle softening of the enlarged phrase and smooth portal edge only.
   const handoff=Math.min(1,t/.12);
   const phraseSoftness=reduced.matches?0:Math.min(3,Math.max(0,Math.log2(zoom)-1)*.65);

   for(const el of layers){if(el===canvas)continue;el.style.scale=String(zoom);el.style.translate=`${x-cx}px ${y-cy}px`}
   if(canvas)dispatchEvent(new CustomEvent('wall-camera-flight',{detail:[zoom,cx,cy,x-cx,y-cy,phraseSoftness,+entries[n].closest('[data-panel]').dataset.panel]}));
   const waveTime=now/1000;
   rim.style.clipPath=portalOutline(x,y,outer,waveTime);
   flight.style.filter='none';
   rim.style.opacity=String(handoff*handoff*(3-2*handoff));
   const filled=coverage(x,y,outer);
   if(revealAt===null&&filled>=.5)revealAt=t;
   const progress=revealAt===null?0:Math.min(1,(t-revealAt)/Math.max(.001,1-revealAt));
   const radius=revealAt===null?0:2*Math.pow(cover/2,easeOut(progress));
   dialog.style.opacity=String(revealAt===null?0:easeOut(Math.min(1,progress/.22)));
   dialog.style.clipPath=`ellipse(${radius}px ${radius*1.18}px at ${x}px ${y}px)`;
   const scale=.015+.985*easeOut(progress);
   host.style.filter=`blur(${(reduced.matches?0:1.2*Math.sin(Math.PI*progress)**2).toFixed(3)}px)`;
   host.style.transform=`translate(${x-innerWidth/2}px,${y-innerHeight/2}px) scale(${scale})`;
   draw();
   if(t<1)requestAnimationFrame(frame);else resolve();
  }
  requestAnimationFrame(frame);
 })}finally{if(canvas)dispatchEvent(new CustomEvent('wall-camera-flight',{detail:[1,0,0,0,0]}));for(const [el,scale,translate,origin,filter,willChange] of saved){el.style.scale=scale;el.style.translate=translate;el.style.transformOrigin=origin;el.style.filter=filter;el.style.willChange=willChange}}
}

async function enter(n,{fly=true}={}){
 const viewIndex=1;
 if(busy||dialog.open)return;busy=true;entry=n;returnEntry=n;scrollBefore=scrollY;oldOverflow=document.documentElement.style.overflow;
 document.documentElement.style.overflow='hidden';
 try{
  const [fonts]=await Promise.all([arealFonts,loadRabbit()]);portalFont=fonts[0];portalGeometry??=makePortalGeometry(fonts[0]);
  closeMode=false;approach=approachTarget=0;portalHover=false;hoverAmount=0;
  if(fly){dialog.classList.add('entering');dialog.style.clipPath='circle(0px at 50% 50%)';dialog.style.opacity='0'}
  dialog.showModal();init();angle=target=angles[viewIndex];resize();setView(viewIndex);
  if(fly){cancelAnimationFrame(raf);raf=0;host.style.transformOrigin='50% 50%';pose(angle);draw();await flyThroughLetter(n)}
  history.pushState({...history.state,letterGallery:true},'',location.href);historyActive=true;entries[n].classList.add('visited');dialog.querySelector('.gallery-back').focus({preventScroll:true});
 }catch(error){console.error('Letter room could not open',error);dialog.close();document.documentElement.style.overflow=oldOverflow;}
 finally{dialog.classList.remove('entering');dialog.style.clipPath='';dialog.style.opacity='';host.style.transform='';host.style.filter='';host.style.transformOrigin='';flight.classList.remove('active');flight.style.filter='';flight.replaceChildren();busy=false;draw()}
}

function finishClose(){
 dialog.close();cancelAnimationFrame(raf);raf=0;document.documentElement.style.overflow=oldOverflow;scrollTo(0,scrollBefore);entries[returnEntry].focus({preventScroll:true});busy=false;
}
function close(){if(busy||!dialog.open)return;returnEntry=entry;if(historyActive){history.back()}else finishClose()}
addEventListener('popstate',()=>{if(dialog.open){historyActive=false;finishClose()}});
async function through(){
 if(busy||!dialog.open||!closeMode||camera.position.z>=easel.position.z-.12)return;busy=true;portalDiving=true;
 cancelAnimationFrame(raf);raf=0;
 const destination=backPortal.getWorldPosition(new THREE.Vector3());
 const start=camera.position.clone(),end=destination.clone();end.z-=.018;
 camera.near=.005;camera.updateProjectionMatrix();
 const duration=reduced.matches?1:800,started=performance.now();
 await new Promise(resolve=>{
  function dive(now){
   const t=Math.min(1,(now-started)/duration),progress=t*t*(3-2*t);
   camera.position.lerpVectors(start,end,progress);camera.lookAt(destination);camera.updateMatrixWorld();draw();
   if(t<1)requestAnimationFrame(dive);else resolve();
  }
  requestAnimationFrame(dive);
 });
 // Open the original door destination in this page. Returning restores the easel view.
 dialog.close();portalDiving=false;document.documentElement.style.overflow=oldOverflow;
 dispatchEvent(new CustomEvent('letter-portal-through',{detail:{returnToGallery(nextDay){
  if(nextDay){finishClose();historyActive=false;history.replaceState({...history.state,letterGallery:false},'',location.href);return}
  document.documentElement.style.overflow='hidden';dialog.showModal();
  camera.near=.1;camera.updateProjectionMatrix();busy=false;resize();wake();
  dialog.querySelector('.back-portal-access').focus({preventScroll:true});
 }}}));

}
function wallPortalHit(){
 const hit=ray.intersectObjects([...wallPortals,...easel.children],true)[0];
 return hit&&wallPortals.includes(hit.object)?hit.object:null;
}
async function returnThroughWall(portal){
 if(busy)return;busy=true;
 const center=portal.getWorldPosition(new THREE.Vector3()).project(camera);
 host.style.transformOrigin=`${(center.x+1)*50}% ${(1-center.y)*50}%`;
 const animation=host.animate([{transform:'scale(1)',opacity:1},{transform:'scale(5)',opacity:0}],{duration:reduced.matches?1:750,easing:'cubic-bezier(.6,0,.8,.3)',fill:'forwards'});
 await animation.finished;
 // Wall exits lead to the homepage opening, regardless of the entry heading.
 const home=new URL(location.href);home.hash='';home.searchParams.delete('room');
 location.assign(home.href);
}
entries.forEach((e,n)=>e.addEventListener('click',event=>{event.stopPropagation();enter(n)}));
views.forEach((e,n)=>e.addEventListener('click',()=>setView(n)));
dialog.querySelector('.gallery-back').addEventListener('click',close);
dialog.querySelector('.back-portal-access').addEventListener('click',through);
approachButton.addEventListener('click',approachEasel);
for(const event of ['focus','blur'])dialog.querySelector('.back-portal-access').addEventListener(event,()=>{portalHover=event==='focus';wake()});
dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();target=limitAngle(target+(e.key==='ArrowLeft'?-.18:.18));views.forEach(v=>v.setAttribute('aria-pressed','false'));wake()}});
function pointRay(e){const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera)}
host.addEventListener('pointerdown',e=>{if(busy)return;drag={x:e.clientX,y:e.clientY,a:target,moved:false};host.setPointerCapture(e.pointerId)});
host.addEventListener('pointermove',e=>{
 if(!renderer||busy)return;
 if(drag){const dx=e.clientX-drag.x;if(Math.hypot(dx,e.clientY-drag.y)>6)drag.moved=true;target=limitAngle(drag.a-dx/host.clientWidth*Math.PI*2);views.forEach(v=>v.setAttribute('aria-pressed','false'));portalHover=false;hoveredWall=null;wake();return}
 pointRay(e);const hit=closeMode&&camera.position.z<easel.position.z-.12&&ray.intersectObject(backPortal).length>0;
 const wall=e.pointerType==='touch'?null:wallPortalHit();
 if(portalHover!==hit||hoveredWall!==wall){portalHover=hit;hoveredWall=wall;wake()}
 host.style.cursor=hit||wall?'pointer':!closeMode&&ray.intersectObjects(easel.children,true).length?'pointer':'grab';
});
host.addEventListener('pointerup',e=>{if(!drag)return;const clicked=!drag.moved;drag=null;if(!clicked||busy)return;pointRay(e);
 const wall=wallPortalHit();if(wall){returnThroughWall(wall);return}
 if(!closeMode){if(ray.intersectObjects(easel.children,true).length)approachEasel();return}
 if(camera.position.z<easel.position.z-.12&&ray.intersectObject(backPortal).length)through();
});
host.addEventListener('pointerleave',()=>{portalHover=false;hoveredWall=null;wake()});
host.addEventListener('pointercancel',()=>drag=null);
addEventListener('resize',resize);

// A travelling distortion in the actual glyph, with a normal pointer (no zoom icon).
const mobileLetters=matchMedia('(hover: none), (pointer: coarse), (max-width: 600px)');
const letterWaveSpeed=1.5; // Time multiplier; easing and distortion size stay independent.
// One shared random sequence per heading; exclude the two most recent letters.
const waveGroups=new Map();
function autoTime(group,now){
 if(!group.active.size&&!dialog.open)group.elapsed+=Math.max(0,now-Math.max(group.last,group.resumeAt||0));
 group.last=now;return group.elapsed/1000;
}
function releaseLetter(group,button,now){
 autoTime(group,now);
 if(group.active.delete(button)&&!group.active.size)group.resumeAt=now+1500;
}
entries.forEach((button,index)=>{
 const heading=button.closest('h1,h2');
 if(!waveGroups.has(heading))waveGroups.set(heading,{indices:[],current:null,previous:null,step:-1,active:new Set(),elapsed:0,last:performance.now(),delay:heading.closest('#opening')?1.5:0});
 waveGroups.get(heading).indices.push(index);
});
function timedLetter(group,step){
 if(group.step!==step){
  const choices=group.indices.filter(index=>index!==group.current&&index!==group.previous);
  group.previous=group.current;
  group.current=choices[Math.floor(Math.random()*choices.length)];
  group.step=step;
 }
 return group.current;
}
entries.forEach((button,index)=>{
 const group=waveGroups.get(button.closest('h1,h2'));
 const turbulence=document.querySelector(`#letter-wave-${index} feTurbulence`);
 const displacement=document.querySelector(`#letter-wave-${index} feDisplacementMap`);
 turbulence.setAttribute('numOctaves','2');
 let active=false,frame=0,last=0,phase=index*1.7,strength=0;
 function tick(now){
  if(dialog.open){frame=0;return}
  // Scrolling can move an invisible DOM hit area away without a pointerleave.
  // Use the rendered hit-test state so a stale hover cannot pause the group timer.
  if(document.body.classList.contains('wall-gl')&&!document.body.classList.contains('reading')){
    const hovered=button.classList.contains('portal-hover')||button.matches(':focus-visible');
    if(active!==hovered){autoTime(group,now);active=hovered;if(active)group.active.add(button);else releaseLetter(group,button,now)}
  }
  const dt=Math.min((now-last)/1000,.05);last=now;phase+=dt*letterWaveSpeed;
  const idle=!reduced.matches;
  // Each heading cycles automatically on desktop and touch: 3s wave + 0.3s pause.
  const cycleTime=autoTime(group,now)-group.delay;
  const step=Math.floor(cycleTime/3.3),local=cycleTime%3.3;
  const pulse=now>=(group.resumeAt||0)&&cycleTime>=0&&!group.active.size&&index===timedLetter(group,step)&&local<3?Math.pow(Math.sin(Math.PI*local/3),2)*.7:0;
  if(group.active.size&&!active)strength=0;
  // Smooth the complete amplitude, including the transition from the stronger timed wave.
  strength+=((reduced.matches?0:active?1:pulse*5)-strength)*(1-Math.exp(-dt/.3));
  const smooth=1;
  turbulence.setAttribute('baseFrequency',`${(.018+Math.sin(phase*.65)*.004)*smooth} ${(.025+Math.cos(phase*.5)*.005)*smooth}`);
  displacement.setAttribute('scale',String(strength*(8+Math.sin(phase*1.1)*2)));
  dispatchEvent(new CustomEvent('wall-effect-frame',{detail:button}));
  if((!reduced.matches&&(active||idle))||strength>.002)frame=requestAnimationFrame(tick);
  else{frame=0;strength=0;button.classList.remove('rippling')}
 }
 function begin(){if(reduced.matches)return;autoTime(group,performance.now());group.active.add(button);active=true;button.classList.add('rippling');if(!frame){last=performance.now();frame=requestAnimationFrame(tick)}}
 function end(){releaseLetter(group,button,performance.now());active=false}
 function syncMotion(){
  if(reduced.matches)active=false;
  if(!frame){last=performance.now();button.classList.add('rippling');frame=requestAnimationFrame(tick)}
 }
 dialog.addEventListener('close',syncMotion);
 mobileLetters.addEventListener('change',syncMotion);reduced.addEventListener('change',syncMotion);
 if(!reduced.matches){const start=()=>{group.last=performance.now();syncMotion()};if(document.documentElement.classList.contains('wall-ready'))start();else addEventListener('wall-ready',start,{once:true})}
 button.addEventListener('pointerenter',begin);button.addEventListener('pointerleave',end);button.addEventListener('focus',begin);button.addEventListener('blur',end);button.addEventListener('click',end);
});
// Consume the return address once: reloads always start on the homepage.
if(new URLSearchParams(location.search).get('room')==='back'){
 const url=new URL(location.href);url.searchParams.delete('room');
 history.replaceState(history.state,'',url);
 const navigation=performance.getEntriesByType('navigation')[0];
 if(navigation?.type!=='reload')document.fonts.ready.then(async()=>{await enter(1,{fly:false});closeMode=true;approach=approachTarget=1;angle=target=Math.PI;views.forEach(v=>v.setAttribute('aria-pressed','false'));pose(angle);draw()});
}

// Fill the actual o counter on hover, using the font outline and baseline metrics.
arealFonts.then(([font])=>{
 const shape=shapesFor(font,'o',1)[0],counter=shape.holes[0];
 const points=counter.getPoints(64);
 const path='M'+points.map(p=>`${p.x},${-p.y}`).join('L')+'Z';
 const glyph=font.charToGlyph('o'),units=font.unitsPerEm;
 entries.forEach(button=>{
  const fill=document.createElementNS('http://www.w3.org/2000/svg','svg');fill.classList.add('letter-counter');fill.setAttribute('aria-hidden','true');
  fill.setAttribute('viewBox',`0 ${-font.ascender/units} ${glyph.advanceWidth/units} ${(font.ascender-font.descender)/units}`);
  fill.innerHTML=`<path d="${path}" fill="currentColor" stroke="currentColor" stroke-width="0.035" stroke-linejoin="round"/>`;
  fill.style.width=`${glyph.advanceWidth/units}em`;fill.style.height=`${(font.ascender-font.descender)/units}em`;
  button.append(fill);
 });
}).catch(error=>console.error('Letter fill unavailable',error));
