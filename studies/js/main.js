import * as THREE from 'three';
import { solve, idlePose, gallopPose, GALLOP, BONES } from './rig.js';
import { SdfView } from './sdf.js';
import { Ps1View } from './ps1.js';
import { CLIPS, clipFrame } from './clips.js';

const VERSIONS = {
  contour: { make: (c) => new SdfView(c, { style: 'contour' }) },
  pixel: { make: (c) => new SdfView(c, { style: 'pixel', pixelSize: 5 }) },
  sky: {
    make: (c) => new SdfView(c, { style: 'sky', bg: '#14a3e4' }),
    palettes: [
      { label: 'Sky', style: 'sky', bg: '#14a3e4' },
      { label: 'Gradient · nose', style: 'gradient', bg: '#ffffff', palette: 0 },
      { label: 'Gradient · view', style: 'gradient', bg: '#ffffff', palette: 1 },
    ],
  },
  ps1: { make: (c) => new Ps1View(c, { pixelSize: 2.5 }) },
};

const HOLE = [0.66, 0.06, 0.13];
const cards = [];
const v3 = new THREE.Vector3();

function setupCard(el) {
  const version = el.dataset.version;
  const mode = el.dataset.mode; // model | run
  const canvas = el.querySelector('canvas.view');
  const overlay = el.querySelector('canvas.overlay');
  const def = VERSIONS[version];
  const card = {
    el, version, mode, canvas, overlay, def,
    view: null,
    paletteIndex: 0,
    duration: CLIPS[mode]?.duration || GALLOP.duration,
    yaw: mode === 'model' ? 32 : 0,
    pitch: mode === 'model' ? 9 : 4,
    dist: version === 'sky' ? 3.8 : mode === 'model' ? 3.2 : 3.6,
    target: mode === 'model' ? [0.3, version === 'sky' ? 0.48 : 0.33, 0]
      : [0, version === 'sky' ? 0.48 : 0.33, 0],
    speed: 1,
    travel: mode === 'run',
    rig: false,
    poseMode: 'auto',
    paused: false,
    visible: false,
    t0: performance.now() / 1000,
    clock: 0,
  };
  if (CLIPS[mode]) {
    card.yaw = mode === 'peek' ? 20 : 15;
    card.pitch = 18;
    card.dist = mode === 'dive' ? 5.8 : 3.6;
    card.target = mode === 'dive' ? [-.35,.35,0] : [0,.22,0];
  }
  bindDrag(card);

  // controls
  el.querySelectorAll('[data-action]').forEach((b) => {
    b.addEventListener('click', () => {
      const a = b.dataset.action;
      if (a === 'pose') { card.poseMode = b.dataset.value; el.querySelectorAll('[data-action=pose]').forEach(x => x.classList.toggle('on', x === b)); }
      if (a === 'pause') { card.paused = !card.paused; b.classList.toggle('on', card.paused); b.textContent = card.paused ? 'Play' : 'Pause'; }
      if (a === 'replay') { card.clock = 0; card.paused = false; const pause = el.querySelector('[data-action=pause]'); pause.textContent = 'Pause'; pause.classList.remove('on'); }
      if (a === 'rig') { card.rig = !card.rig; b.classList.toggle('on', card.rig); }
      if (a === 'speed') {
        card.speed = parseFloat(b.dataset.value);
        el.querySelectorAll('[data-action=speed]').forEach((x) => x.classList.toggle('on', x === b));
      }
      if (a === 'travel') { card.travel = !card.travel; b.classList.toggle('on', card.travel); b.textContent = card.travel ? 'Across' : 'In place'; }
      if (a === 'reset') { card.yaw = mode === 'model' ? 32 : 0; card.pitch = mode === 'model' ? 9 : 4; }
      if (a === 'palette') setPalette(version, parseInt(b.dataset.value, 10));
    });
  });
  const scrub = el.querySelector('[data-phase]');
  if (scrub) scrub.addEventListener('input', () => {
    card.clock = +scrub.value * card.duration;
    card.paused = true;
    const pause = el.querySelector('[data-action=pause]');
    pause.textContent = 'Play'; pause.classList.add('on');
  });
  cards.push(card);
  return card;
}

/** Version 03 has two colourings of the same body; switching rebuilds its views. */
function setPalette(version, i) {
  const p = VERSIONS[version].palettes[i];
  for (const c of cards) {
    if (c.version !== version) continue;
    c.paletteIndex = i;
    if (c.view && c.view.style !== p.style) releaseView(c);
    if (c.view) { c.view.setBg(p.bg); if (p.palette !== undefined) c.view.setPalette(p.palette); }
    c.el.dataset.palette = p.style;
    c.el.querySelectorAll('[data-action=palette]').forEach((x) => x.classList.toggle('on', parseInt(x.dataset.value, 10) === i));
  }
}

// Keep GPU contexts only for visible cards; sixteen independent previews
// otherwise exhaust browser context limits, especially after palette changes.
function releaseView(card) {
  card.view.dispose(); card.view = null;
  const fresh = card.canvas.cloneNode(false);
  card.canvas.replaceWith(fresh); card.canvas = fresh;
}
function ensureView(card) {
  if (card.view) return;
  const p = card.def.palettes?.[card.paletteIndex];
  card.view = p ? new SdfView(card.canvas, p) : card.def.make(card.canvas);
}

/** Orbit by dragging the stage (the canvas inside may be swapped). */
function bindDrag(card) {
  const stage = card.el.querySelector('.stage');
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: card.yaw, pitch: card.pitch };
    stage.setPointerCapture(e.pointerId);
    card.el.classList.add('dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    card.yaw = drag.yaw - (e.clientX - drag.x) * 0.4;
    card.pitch = Math.max(-5, Math.min(70, drag.pitch + (e.clientY - drag.y) * 0.3));
  });
  const end = () => { drag = null; card.el.classList.remove('dragging'); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
}

function placeCamera(card) {
  const cam = card.view.camera;
  const y = (card.yaw * Math.PI) / 180, p = (card.pitch * Math.PI) / 180;
  const [tx, ty, tz] = card.target;
  cam.position.set(tx + Math.sin(y) * Math.cos(p) * card.dist, ty + Math.sin(p) * card.dist, tz + Math.cos(y) * Math.cos(p) * card.dist);
  cam.lookAt(tx, ty, tz);
  cam.updateMatrixWorld();
}

function drawRig(card, J) {
  const o = card.overlay;
  const r = o.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (o.width !== Math.round(r.width * dpr)) { o.width = Math.round(r.width * dpr); o.height = Math.round(r.height * dpr); }
  const g = o.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, r.width, r.height);
  const showRig = card.rig;
  const ground = card.mode === 'run' && card.version !== 'ps1';
  if (!showRig && !ground) return;
  const cam = card.view.camera;
  const proj = (p) => {
    v3.set(p[0], p[1], p[2]).project(cam);
    return [(v3.x * 0.5 + 0.5) * r.width, (-v3.y * 0.5 + 0.5) * r.height];
  };
  if (ground) {
    // one hairline for the ground, from the far edge of the frame to the near one
    const a = proj([-6, 0, 0]), b = proj([6, 0, 0]);
    const ink = card.el.dataset.palette === 'sky' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.85)';
    g.strokeStyle = ink;
    g.lineWidth = card.version === 'pixel' ? 5 : 1;
    g.beginPath();
    const yy = card.version === 'pixel' ? Math.round(a[1] / 5) * 5 + 2.5 : a[1];
    g.moveTo(a[0], yy); g.lineTo(b[0], card.version === 'pixel' ? yy : b[1]); g.stroke();
  }
  if (!showRig) return;
  g.lineWidth = 1.25;
  for (const [a, b] of BONES) {
    const far = a.endsWith('F') || b.endsWith('F') || /F\d$/.test(a) || /F\d$/.test(b);
    g.strokeStyle = far ? 'rgba(255,61,0,0.45)' : '#ff3d00';
    let ja = J[a], jb = J[b];
    if (CLIPS[card.mode]) {
      if (ja[1] < 0 && jb[1] < 0) continue;
      if (ja[1] < 0 || jb[1] < 0) {
        const t = -ja[1]/(jb[1]-ja[1]);
        const hit = ja.map((v,i) => v+t*(jb[i]-v));
        if (ja[1]<0) ja=hit; else jb=hit;
      }
    }
    const pa = proj(ja), pb = proj(jb);
    g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.stroke();
  }
  g.fillStyle = '#ff3d00';
  for (const k of new Set(BONES.flat())) {
    if (CLIPS[card.mode] && J[k][1] < 0) continue;
    const p = proj(J[k]);
    g.beginPath(); g.arc(p[0], p[1], 2.2, 0, Math.PI * 2); g.fill();
  }
}

let last = performance.now() / 1000;
function frame() {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - last);
  last = now;
  for (const card of cards) {
    if (!card.visible) { if (card.view) releaseView(card); continue; }
    ensureView(card);
    if (!card.paused) card.clock += dt * card.speed;
    card.view.resize();
    let J, hole = null;
    let clipGround = false;
    if (card.mode === 'model') {
      J = solve(idlePose(card.clock, card.poseMode), card.version === 'sky' ? 'soft' : 'classic');
      hole = HOLE;
    } else if (CLIPS[card.mode]) {
      ({ J, hole, clipGround } = clipFrame(card.mode,card.clock,card.version === 'sky' ? 'soft' : 'classic'));
      const scrub = card.el.querySelector('[data-phase]');
      if (scrub) scrub.value = (card.clock % card.duration) / card.duration;
    } else {
      const phase = card.clock / GALLOP.duration;
      const scrub = card.el.querySelector('[data-phase]');
      if (scrub) scrub.value = ((phase % 1) + 1) % 1;
      const pose = gallopPose(phase);
      if (card.travel) {
        // across the frame and in again from the left, never long out of sight
        const cam = card.view.camera;
        const span = 2 * card.dist * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect + 1.1;
        pose.x = ((phase * GALLOP.stride) % span) - span / 2 - 0.2;
      } else pose.x = -0.2;
      J = solve(pose, card.version === 'sky' ? 'soft' : 'classic');
      if (card.version === 'ps1') card.view.setFloorScroll(card.travel ? 0 : (phase * GALLOP.stride * 12) / 8);
    }
    placeCamera(card);
    card.view.update(J, hole, clipGround);
    card.view.render();
    drawRig(card, J);
  }
  requestAnimationFrame(frame);
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const c = cards.find((x) => x.el === e.target);
    if (c) c.visible = e.isIntersecting;
  }
}, { rootMargin: '120px' });

document.querySelectorAll('.card').forEach((el) => {
  try {
    io.observe(setupCard(el).el);
  } catch (err) {
    console.error(err);
    el.classList.add('failed');
  }
});
requestAnimationFrame(frame);
