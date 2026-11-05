// The homepage concept: one rabbit, three roles.
//   hero  — sits by the hole on the white field; notices the cursor, looks up, settles back
//   run   — crosses the "what we do" screen in a half-bound and goes down the hole
//   holes — travels to the hovered project, dives, peeks, exits and travels again
// All three are the contour rabbit from the study, drawn by the same ray-marcher.
import * as THREE from 'three';
import { solve, idlePose, gallopPose, GALLOP, CHANNELS } from './rig.js';
import { SdfView } from './sdf.js';
import { clipFrame } from './clips.js';
import { ProjectView } from './project-view.js?v=20261103-2';
import { ProjectJourney } from './home-journey.js?v=20261103-2';
import { blend } from './play/motion.js?v=20261103-2';

const HOLE = [0.66, 0.06, 0.13]; // x, z, radius — where the sitting rabbit looks
const v3 = new THREE.Vector3();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/** A contour rabbit on a canvas with its own camera. */
class Rabbit {
  constructor(canvas, cam, opts = {}) {
    this.view = new SdfView(canvas, { style: 'contour', ...opts });
    this.cam = { yaw: 30, pitch: 10, dist: 3.2, target: [0.3, 0.33, 0], ...cam };
    this.canvas = canvas;
    this.visible = false;
  }
  place() {
    const c = this.view.camera, { yaw, pitch, dist, target: [tx, ty, tz] } = this.cam;
    const y = (yaw * Math.PI) / 180, p = (pitch * Math.PI) / 180;
    c.position.set(tx + Math.sin(y) * Math.cos(p) * dist, ty + Math.sin(p) * dist, tz + Math.cos(y) * Math.cos(p) * dist);
    c.lookAt(tx, ty, tz);
    c.updateMatrixWorld();
  }
  draw(J, hole, clip = false) {
    this.view.resize();
    this.place();
    this.view.update(J, hole, clip);
    this.view.render();
  }
  /** A world point in CSS pixels of the canvas. */
  project(p) {
    const r = this.canvas.getBoundingClientRect();
    v3.set(p[0], p[1], p[2]).project(this.view.camera);
    return [(v3.x * 0.5 + 0.5) * r.width, (-v3.y * 0.5 + 0.5) * r.height];
  }
}

/** Blend two poses channel by channel (near and far sides). */
function mix(a, b, k) {
  const out = { ...a, far: { ...a.far } };
  for (const c of CHANNELS) out[c] = a[c] + (b[c] - a[c]) * k;
  for (const c of Object.keys(a.far)) out.far[c] = a.far[c] + (b.far[c] - a.far[c]) * k;
  return out;
}

const scenes = [];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const s = scenes.find((x) => x.el === e.target);
    if (s) { s.visible = e.isIntersecting; if (s.onVisible) s.onVisible(e.isIntersecting); }
  }
}, { rootMargin: '80px' });

// ---------------------------------------------------------------- 1 · hero
function heroScene(el) {
  const rabbit = new Rabbit(el.querySelector('canvas.view'), { yaw: 30, pitch: 10, dist: 3.2, target: [0.3, 0.3, 0] });
  const s = { el, rabbit, visible: false, alert: 0, near: 0, mouse: null, clock: 0, bolt: 0 };
  // where the cursor is relative to the rabbit, in canvas widths
  addEventListener('pointermove', (e) => { s.mouse = [e.clientX, e.clientY]; }, { passive: true });
  s.frame = (dt) => {
    s.clock += dt;
    const r = el.getBoundingClientRect();
    let want = 0, turn = 0, lift = 0;
    if (s.mouse) {
      const cx = r.left + r.width * 0.42, cy = r.top + r.height * 0.6;
      const dx = (s.mouse[0] - cx) / r.width, dy = (s.mouse[1] - cy) / r.height;
      const d = Math.hypot(dx, dy);
      want = 1 - smooth((d - 0.9) / 1.6); // notices you from about a canvas-and-a-half away
      turn = clamp(dx, -1, 1); // which side you are on
      lift = clamp(-dy, -1, 1); // above or below it
      s.near = d;
    }
    s.alert += (want - s.alert) * (1 - Math.exp(-dt * 3));
    // calm: the study's idle loop (alert sit ↔ inspecting the hole); noticed: sits up and turns to you
    const calm = idlePose(s.clock, 'auto');
    const up = idlePose(s.clock, 'sit');
    const pose = mix(calm, up, s.alert);
    pose.head += s.alert * (lift * 10);
    pose.neck += s.alert * (lift * 4);
    pose.ear1 -= s.alert * 10; pose.ear2 -= s.alert * 8;
    pose.far.ear1 -= s.alert * 10; pose.far.ear2 -= s.alert * 8;
    rabbit.cam.yaw = 30 + s.alert * turn * -36; // turns toward the cursor
    rabbit.draw(solve(pose), HOLE);
  };
  return s;
}

// ------------------------------------------------------------ 2 · the run
function runScene(el) {
  const section = el.closest('section');
  const rabbit = new Rabbit(el.querySelector('canvas.view'), { yaw: 10, pitch: 14, dist: 3.8, target: [0,.12,0] }, { maxDpr: 1.5 });
  const s = { el, rabbit, visible:false, elapsed:0, started:false, done:false, approach:0, startX:0, holeX:0 };
  s.frame = dt => {
    const rect=el.getBoundingClientRect();
    if(!s.started && rect.top<innerHeight-20 && rect.bottom>0){
      rabbit.view.resize();rabbit.place();
      const half=rabbit.view.camera.aspect*3.8*Math.tan(12*Math.PI/180);
      s.holeX=Math.max(.5,half*.58);s.startX=-half-.8;
      s.approach=(s.holeX-1.2-s.startX)/(GALLOP.stride/GALLOP.duration);
      s.started=true;section.classList.add('revealed');
    }
    if(!s.started)return;
    if(!s.done)s.elapsed+=reduced?s.approach+2:dt;
    let J;
    if(s.elapsed<s.approach){
      const pose=gallopPose(.27+(s.elapsed-s.approach)/GALLOP.duration);
      pose.x=s.startX+s.elapsed*GALLOP.stride/GALLOP.duration;J=solve(pose);
    }else{
      J=clipFrame('dive',Math.min(2.5,.85+s.elapsed-s.approach),'classic').J;
      for(const p of Object.values(J))p[0]+=s.holeX-.55;
      if(s.elapsed>s.approach+1.4)s.done=true;
    }
    el.dataset.phase=s.done?'done':s.elapsed<s.approach?'run':'dive';
    rabbit.draw(J,[s.holeX,0,.36],true);
  };
  return s;
}

// ---------------------------------------------------------- 3 · the holes
function holesScene(el) {
  const canvas=el.querySelector('canvas.view'),view=new ProjectView(canvas);
  const holes=[...el.querySelectorAll('.hole')], scales=[1.45,1.18,.88,.7];
  const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  let journey=null,dimensions='',lastState='',prior=null,transition=null,transitionTime=1;
  const destinations=[];
  const groundPoint=(x,y)=>{
    raycaster.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),view.camera);
    return raycaster.ray.intersectPlane(plane,new THREE.Vector3());
  };
  const project=p=>{const v=new THREE.Vector3(...p).project(view.camera);return [(v.x*.5+.5)*view.cssW,(-v.y*.5+.5)*view.cssH];};
  const layout=()=>{
    view.resize();const key=`${view.cssW}:${view.cssH}`;if(key===dimensions)return;
    dimensions=key;
    holes.forEach((h,i)=>{
      const x=parseFloat(h.style.getPropertyValue('--x'))/100,y=parseFloat(h.style.getPropertyValue('--y'))/100;
      const p=groundPoint(x,y),scale=scales[i];destinations[i]={id:i,x:p.x,z:p.z,scale};
      const r=.3*scale,points=Array.from({length:64},(_,j)=>project([p.x+Math.cos(j/64*Math.PI*2)*r,0,p.z+Math.sin(j/64*Math.PI*2)*r]));
      const w=Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]));
      const height=Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]));
      const dot=h.querySelector('.dot');dot.style.width=`${w}px`;dot.style.height=`${height}px`;
    });
    if(!journey){const p=groundPoint(.08,.82);journey=new ProjectJourney(p.x,p.z);}
    else if(journey.goal)journey.goal=destinations[journey.goal.id];
    if(journey?.hole)journey.hole=destinations[journey.hole.id];
  };
  const choose=i=>{layout();journey.select(destinations[i]);holes.forEach((h,j)=>h.classList.toggle('on',i===j));};
  holes.forEach((h,i)=>{h.addEventListener('pointerenter',()=>choose(i));h.addEventListener('focus',()=>choose(i));h.addEventListener('click',()=>choose(i));});
  const s={el,visible:false,frame(dt){
    layout();journey.update(dt);let J=journey.pose();
    if(journey.state!==lastState){transition=prior;transitionTime=0;lastState=journey.state;}
    transitionTime+=dt;if(transition&&transitionTime<.14)J=blend(transition,J,transitionTime/.14);prior=J;
    const h=journey.state==='run'?journey.goal:journey.hole;
    holes.forEach((node,i)=>node.classList.toggle('rendered',i===h?.id));
    view.update(J,journey.renderedHole(),true);view.render();
    el.dataset.phase=journey.state;el.dataset.destination=String(journey.goal?.id??'');
  }};
  return s;
}

// the navigation underlines the screen you are on
const navLinks = [...document.querySelectorAll('.nav a[data-for]')];
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle('on', a.dataset.for === e.target.id));
}, { rootMargin: '-45% 0px -45% 0px' });
navLinks.forEach((a) => { const el = document.getElementById(a.dataset.for); if (el) spy.observe(el); });

const makers = { hero: heroScene, run: runScene, holes: holesScene };
document.querySelectorAll('[data-scene]').forEach((el) => {
  try {
    const s = makers[el.dataset.scene](el);
    scenes.push(s);
    io.observe(el);
  } catch (err) {
    console.error(err);
    el.classList.add('failed');
  }
});

let last = performance.now() / 1000;
function loop() {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - last);
  last = now;
  for (const s of scenes) if (s.visible) s.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
