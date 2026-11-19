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
let returnEntry=0,historyActive=false;
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
 // Three entrances: left, front and right. All meet the easel at the same eye level.
 portal(-6.02,2.23,0,Math.PI/2);portal(0,2.23,6.02,Math.PI);portal(6.02,2.23,0,-Math.PI/2);
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
function resize(){if(!renderer||!dialog.open)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.userData.baseFov=w/h<.8?78:49;camera.updateProjectionMatrix();pose(angle);draw()}
function draw(){if(renderer&&dialog.open)renderer.render(scene,camera)}
function animate(){
 if(!dialog.open){raf=0;return}
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
function wake(){if(!raf)raf=requestAnimationFrame(animate)}
function setView(n){hoveredWall=null;closeMode=false;approachTarget=0;portalHover=false;angle=Math.atan2(Math.sin(angle),Math.cos(angle));target=angles[n];views.forEach((v,i)=>v.setAttribute('aria-pressed',String(i===n)));wake()}
function prepareFlight(n){
 const b=entries[n].getBoundingClientRect(),h=entries[n].closest('h1,h2'),r=h.getBoundingClientRect();
 // A screen-space copy avoids disturbing the existing scroll camera while we cross the letter.
 const title=document.createElement('div');title.className='flight-title';title.innerHTML=h.innerHTML;
 title.querySelectorAll('.letter-entry').forEach((letter,i)=>{letter.classList.remove('rippling');letter.tabIndex=-1;if(letter.dataset.entry===entries[n].dataset.entry)letter.classList.add('flight-entry')});
 const hStyle=getComputedStyle(h),scale=r.width/h.offsetWidth;
 Object.assign(title.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',fontSize:parseFloat(hStyle.fontSize)*scale+'px',fontWeight:hStyle.fontWeight,lineHeight:hStyle.lineHeight==='normal'?'normal':parseFloat(hStyle.lineHeight)*scale+'px',letterSpacing:hStyle.letterSpacing==='normal'?'normal':parseFloat(hStyle.letterSpacing)*scale+'px'});flight.replaceChildren(title);flight.classList.add('active');
 const cx=b.left+b.width/2,cy=b.top+b.height*.57;
 flight.style.transformOrigin=`${cx}px ${cy}px`;
 const zoom=Math.max(innerWidth/b.width,innerHeight/(b.height*.42))*2.8;
 return `translate(${innerWidth/2-cx}px,${innerHeight/2-cy}px) scale(${zoom})`;
}
async function enter(n,{fly=true}={}){
 const viewIndex=[0,1,2,1,0,1,2,1,1][n]??1;
 if(busy||dialog.open)return;busy=true;entry=n;returnEntry=n;scrollBefore=scrollY;oldOverflow=document.documentElement.style.overflow;
 const zoomTransform=fly?prepareFlight(n):null;
 const animation=fly?flight.animate([{transform:'scale(1)',opacity:1},{transform:zoomTransform,opacity:1}],{duration:reduced.matches?1:1100,easing:'cubic-bezier(.7,0,.6,1)',fill:'forwards'}):{finished:Promise.resolve(),cancel(){}};
 document.documentElement.style.overflow='hidden';
 try{const [,fonts]=await Promise.all([animation.finished,arealFonts,loadRabbit()]);portalFont=fonts[0];portalGeometry??=makePortalGeometry(fonts[0]);closeMode=false;approach=approachTarget=0;portalHover=false;hoverAmount=0;dialog.showModal();init();angle=target=angles[viewIndex];resize();setView(viewIndex);history.pushState({...history.state,letterGallery:true},'',location.href);historyActive=true;entries[n].classList.add('visited');dialog.querySelector('.gallery-back').focus();}
 catch(error){console.error('Letter room could not open',error);dialog.close();document.documentElement.style.overflow=oldOverflow;}
 finally{animation.cancel();flight.classList.remove('active');flight.replaceChildren();busy=false}
}
function finishClose(){
 dialog.close();cancelAnimationFrame(raf);raf=0;document.documentElement.style.overflow=oldOverflow;scrollTo(0,scrollBefore);entries[returnEntry].focus({preventScroll:true});busy=false;
}
function close(){if(busy||!dialog.open)return;returnEntry=entry;if(historyActive){history.back()}else finishClose()}
addEventListener('popstate',()=>{if(dialog.open){historyActive=false;finishClose()}});
async function through(){
 if(busy||!dialog.open||!closeMode||camera.position.z>=easel.position.z-.12)return;busy=true;
 cancelAnimationFrame(raf);raf=0;
 const destination=backPortal.getWorldPosition(new THREE.Vector3());
 const start=camera.position.clone(),end=destination.clone();end.z-=.018;
 camera.near=.005;camera.updateProjectionMatrix();
 const duration=reduced.matches?1:1100,started=performance.now();
 await new Promise(resolve=>{
  function dive(now){
   const t=Math.min(1,(now-started)/duration),progress=t*t*(3-2*t);
   camera.position.lerpVectors(start,end,progress);camera.lookAt(destination);camera.updateMatrixWorld();draw();
   if(t<1)requestAnimationFrame(dive);else resolve();
  }
  requestAnimationFrame(dive);
 });
 // Keep the fully black portal on screen until the next black page has loaded.
 const black=document.createElement('div');
 Object.assign(black.style,{position:'fixed',inset:'0',background:'#000',zIndex:'9999'});
 dialog.append(black);document.documentElement.style.background='#000';
 location.href='easter-beyond.html';
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
 await animation.finished;animation.cancel();busy=false;close();
}
entries.forEach((e,n)=>e.addEventListener('click',()=>enter(n)));
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
entries.forEach((button,index)=>{
 const turbulence=document.querySelector(`#letter-wave-${index} feTurbulence`);
 const displacement=document.querySelector(`#letter-wave-${index} feDisplacementMap`);
 const finalHeading=button.closest('#last-heading')!==null;
 if(finalHeading)turbulence.setAttribute('numOctaves','1');
 let active=false,frame=0,last=0,phase=index*1.7,strength=0;
 function tick(now){
  if(dialog.open){frame=0;button.classList.remove('rippling');return}
  const dt=Math.min((now-last)/1000,.05);last=now;phase+=dt*letterWaveSpeed;
  const idle=mobileLetters.matches&&!reduced.matches;
  // Each heading has its own mobile cycle: 3s wave + 0.3s pause.
  const sequence=finalHeading?[4,5,6,7,8]:[0,3,0,2];
  const cycleTime=(now/1000)%(sequence.length*3.3);
  const step=Math.floor(cycleTime/3.3),local=cycleTime%3.3;
  const pulse=index===sequence[step]&&local<3?Math.pow(Math.sin(Math.PI*local/3),2)*.7:0;
  strength+=((reduced.matches?0:idle?pulse:active?1:0)-strength)*(1-Math.exp(-dt/.3));
  const smooth=finalHeading?.6:1;
  turbulence.setAttribute('baseFrequency',`${(.018+Math.sin(phase*.65)*.004)*smooth} ${(.025+Math.cos(phase*.5)*.005)*smooth}`);
  displacement.setAttribute('scale',String(strength*(8+Math.sin(phase*1.1)*2)*(idle?5:1)));
  if((!reduced.matches&&(active||idle))||strength>.002)frame=requestAnimationFrame(tick);
  else{frame=0;strength=0;button.classList.remove('rippling')}
 }
 function begin(){if(reduced.matches)return;active=true;button.classList.add('rippling');if(!frame){last=performance.now();frame=requestAnimationFrame(tick)}}
 function end(){active=false}
 function syncMotion(){
  if(reduced.matches)active=false;
  if(!frame){last=performance.now();button.classList.add('rippling');frame=requestAnimationFrame(tick)}
 }
 dialog.addEventListener('close',syncMotion);
 mobileLetters.addEventListener('change',syncMotion);reduced.addEventListener('change',syncMotion);
 if(mobileLetters.matches&&!reduced.matches)syncMotion();
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
