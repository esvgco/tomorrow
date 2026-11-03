// The homepage concept: one rabbit, three roles.
//   hero  — sits by the hole on the white field; notices the cursor, looks up, settles back
//   run   — crosses the "what we do" screen in a half-bound and goes down the hole
//   holes — appears at whichever project hole the cursor approaches, looking into it
// All three are the contour rabbit from the study, drawn by the same ray-marcher.
import * as THREE from 'three';
import { solve, idlePose, gallopPose, GALLOP, CHANNELS } from './rig.js';
import { SdfView } from './sdf.js';

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
  draw(J, hole) {
    this.view.resize();
    this.place();
    this.view.update(J, hole);
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
  const rabbit = new Rabbit(el.querySelector('canvas.view'), { yaw: 0, pitch: 6, dist: 3.6, target: [0, 0.22, 0] }, { ground: true, maxDpr: 1.5 });
  rabbit.view.uniforms.uGround.value = 2; // with the hairline it runs along
  const again = el.querySelector('.again');
  const s = { el, rabbit, visible: false, t: -1, runs: 0 };
  const start = () => { s.t = 0; again.hidden = true; };
  s.onVisible = (v) => { if (v && s.t < 0) start(); };
  again.addEventListener('click', () => { section.classList.remove('revealed'); start(); });
  const HOLE_X = 2.2; // where the hole is on the track, in world units
  s.frame = (dt) => {
    if (s.t < 0) return;
    const cam = rabbit.view.camera;
    const half = cam.aspect * rabbit.cam.dist * Math.tan((cam.fov * Math.PI) / 360) + 0.6;
    const speed = GALLOP.stride / GALLOP.duration;
    s.t += reduced ? 0 : dt;
    const x = -half + s.t * speed; // runs in from the left edge
    const phase = s.t / GALLOP.duration;
    const pose = gallopPose(phase);
    pose.x = Math.min(x, HOLE_X);
    // at the hole: one more bound in place, going down — stands in for the dive animation
    const over = x - HOLE_X;
    let sink = 0;
    if (over > 0) {
      sink = smooth(over / 1.4);
      pose.y -= sink * 0.9;
      pose.lumbar -= sink * 50; pose.thoracic -= sink * 50; pose.neck -= sink * 40; // nose first
    }
    if (x > -half + 1.6) section.classList.add('revealed');
    if (sink >= 1) { s.t = -2; again.hidden = false; }
    rabbit.draw(solve(pose, 'classic', false), [HOLE_X + 0.25, 0, 0.16]);
  };
  return s;
}

// ---------------------------------------------------------- 3 · the holes
function holesScene(el) {
  const peek = el.querySelector('.peek');
  const rabbit = new Rabbit(peek.querySelector('canvas.view'), { yaw: 30, pitch: 10, dist: 3.2, target: [0.3, 0.3, 0] });
  const holes = [...el.querySelectorAll('.hole')];
  const s = { el, rabbit, visible: false, current: null, clock: 0, since: 0 };
  const show = (h) => {
    if (s.current === h) return;
    holes.forEach((x) => x.classList.toggle('on', x === h));
    s.current = h; s.since = 0;
    peek.classList.toggle('on', !!h);
    if (!h) return;
    // put the canvas so that its hole lands on this hole
    const dot = h.querySelector('.dot').getBoundingClientRect();
    const box = el.getBoundingClientRect();
    rabbit.view.resize(); rabbit.place();
    const [hx, hy] = rabbit.project([HOLE[0], 0, HOLE[1]]);
    peek.style.left = `${dot.left + dot.width / 2 - box.left - hx}px`;
    peek.style.top = `${dot.top + dot.height / 2 - box.top - hy}px`;
  };
  holes.forEach((h) => {
    h.addEventListener('pointerenter', () => show(h));
    h.addEventListener('focus', () => show(h));
    h.addEventListener('click', () => show(h));
  });
  el.addEventListener('pointerleave', () => show(null));
  s.frame = (dt) => {
    s.clock += dt; s.since += dt;
    if (!s.current) return;
    // arrives alert, then leans in to look
    const k = smooth((s.since - 0.4) / 1.2);
    const pose = mix(idlePose(s.clock, 'sit'), idlePose(s.clock, 'look'), k);
    rabbit.draw(solve(pose), HOLE);
  };
  return s;
}

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
