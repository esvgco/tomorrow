// Study 06 — the portal.
// Down: the client's page (their sink, one column). Up from the top: the head goes into the
// hole as well, then the hole opens into a circle that fills the screen, the black runs
// through dark blue, orange and lilac to white, and the same content is there — scrolled
// forward, into depth (after xholding/depth). Scroll back past the first stop, or Esc, and
// the portal plays in reverse: white → lilac → orange → blue → black, circle → ellipse, and
// the rabbit's head comes back up. Nothing changed; you just went the other way.

import { mountMark, MARK_SVG } from './mark.js';
import { mountFall } from './fall.js';

const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const ease = t => t * t * (3 - 2 * t);
const seg = (a, b, v) => ease(inv(a, b, v));

const mark = mountMark(document.getElementById('mark'));
const statement = document.getElementById('statement');
const portal = document.getElementById('portal');
const scene = document.getElementById('scene');
const far = document.getElementById('far');
const page = document.getElementById('page');

// ---- down: their page ----------------------------------------------------------------------
let runway = 1;
const markSmall = document.getElementById('mark-small');
if (markSmall) { markSmall.innerHTML = MARK_SVG.replace(/id="tc-/g, 'id="tcs-').replace(/url\(#tc-/g, 'url(#tcs-').replace(/href="#tc-/g, 'href="#tcs-').replace('width="0" height="0" x="0" y="0"', 'width="9999" height="9999" x="-4000" y="-4000"'); }
function layout() {
  const vh = innerHeight;
  runway = Math.max(1, vh * 0.42);
  const stageTop = document.querySelector('.stage').getBoundingClientRect().top;
  mark.set(1, 0, 1);
  const r = mark.hole.getBoundingClientRect();
  mark.set(sinkDown(), 0, 1);
  const rimY = r.top + r.height / 2 - stageTop;
  // the statement sits just under the sunk hole, but never peeks into the first screen
  statement.style.setProperty('--rise', Math.max(0, Math.min(vh - rimY - vh * 0.12, runway - vh * 0.03)).toFixed(1) + 'px');
  fall.measure();
}
function sinkDown() { return clamp(scrollY / runway, 0, 1); }
function onScroll() {
  if (mode !== 'page') return;
  mark.set(Math.max(sinkDown(), upSink), 0, 1);
  document.body.classList.toggle('scrolled', scrollY > 8);
  fall.apply(scrollY);
}

// ---- down: the lead falls into a list; while it is a list, the space between the letters
//      is a door. Click it and you fly in, a little ahead, into a project's own space. -----
const grid = document.getElementById('grid');
const stack = document.getElementById('stack');
const fall = mountFall({ grid, p1: document.getElementById('p1'), stack, p2: document.getElementById('p2') });
const inside = document.getElementById('inside');
let insideState = 'out'; // out | flying | in | returning
function onGlyph(x, y) {
  // a click on an actual letter is a click on a letter; a gap between letters, lines or words is a door
  for (const el of stack.querySelectorAll('.nest.shown, .ch')) {
    if (getComputedStyle(el).color === 'rgba(0, 0, 0, 0)') continue;
    const r = el.getBoundingClientRect();
    if (r.width && x >= r.left + 1 && x <= r.right - 1 && y >= r.top + 2 && y <= r.bottom - 2) return true;
  }
  // travellers sitting on the shelf are children of p1, positioned by transform
  for (const el of fall.travellers) {
    if (el.classList.contains('gone')) continue;
    const r = el.getBoundingClientRect();
    const s = stack.getBoundingClientRect();
    if (r.top < s.top - 4 || r.bottom > s.bottom + 4) continue;
    if (x >= r.left + 1 && x <= r.right - 1 && y >= r.top + 2 && y <= r.bottom - 2) return true;
  }
  return false;
}
grid.addEventListener('click', e => {
  if (mode !== 'page' || insideState !== 'out' || !fall.state().onShelf || reduced) return;
  const s = stack.getBoundingClientRect();
  if (e.clientY < s.top - 6 || e.clientY > s.bottom + 6) return;   // the door is the list itself
  if (onGlyph(e.clientX, e.clientY)) return;
  e.preventDefault();
  flyIn(e.clientX, e.clientY);
});
let heldY = null;
function flyIn(x, y) {
  insideState = 'flying';
  heldY = scrollY;
  const host = grid.parentElement, r = host.getBoundingClientRect();
  host.style.perspectiveOrigin = `${(x - r.left).toFixed(1)}px ${(y - r.top).toFixed(1)}px`;
  html.classList.add('flying');
  grid.style.transform = 'translateZ(820px)';
  setTimeout(() => {
    html.classList.add('inside');
    html.classList.remove('flying');
    insideState = 'in';
  }, 1100);
}
function flyOut() {
  if (insideState !== 'in') return;
  insideState = 'returning';
  html.classList.remove('inside');
  html.classList.add('returning');
  if (heldY !== null) scrollTo(0, heldY);
  requestAnimationFrame(() => { grid.style.transform = 'translateZ(0)'; });
  setTimeout(() => { html.classList.remove('returning'); grid.style.transform = ''; insideState = 'out'; onScroll(); }, 850);
}
document.getElementById('inside-back').addEventListener('click', e => { e.preventDefault(); flyOut(); });

// ---- up: the portal --------------------------------------------------------------------------
// state: 'page' | 'opening' | 'depth' | 'closing'
let mode = 'page';
let up = 0, upSink = 0;         // accumulated upward intent at the top, 0..1
const UP_NEED = 420;            // px of wheel/touch intent to go through
const COLORS = [[0, 0, 0], [12, 24, 74], [242, 107, 29], [216, 200, 239], [255, 255, 255]];
const STOPS_T = [0, 0.3, 0.55, 0.8, 1];
function colorAt(t) {
  t = clamp(t, 0, 1);
  let i = 0; while (i < STOPS_T.length - 2 && t > STOPS_T[i + 1]) i++;
  const k = inv(STOPS_T[i], STOPS_T[i + 1], t);
  const a = COLORS[i], b = COLORS[i + 1];
  return `rgb(${lerp(a[0], b[0], k) | 0},${lerp(a[1], b[1], k) | 0},${lerp(a[2], b[2], k) | 0})`;
}
let holeRect = null;
function placePortal() {
  const r = mark.hole.getBoundingClientRect();
  holeRect = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  portal.style.left = holeRect.x + 'px'; portal.style.top = holeRect.y + 'px';
}
// q: 0 = the hole as it is, 1 = white over everything
function drawPortal(q) {
  const toCircle = seg(0, 0.35, q);           // ellipse → circle
  const grow = seg(0.2, 0.85, q);             // circle → beyond the screen
  const need = Math.hypot(innerWidth, innerHeight) * 1.05;
  const w = lerp(holeRect.w, need, grow);
  const h = lerp(lerp(holeRect.h, holeRect.w, toCircle), need, grow);
  portal.style.width = w.toFixed(1) + 'px';
  portal.style.height = h.toFixed(1) + 'px';
  portal.style.transform = `translate(-50%,-50%)`;
  portal.style.backgroundColor = colorAt(seg(0.3, 1, q));
}
let anim = null;
function openPortal() {
  if (mode !== 'page') return;
  mode = 'opening';
  html.classList.add('opening');
  placePortal();
  mark.set(1, 0, 1);
  portal.classList.add('on');
  const t0 = performance.now(), D = 1250;
  cancelAnimationFrame(anim);
  (function step(now) {
    const q = clamp((now - t0) / D, 0, 1);
    drawPortal(q);
    if (q >= 0.9 && !html.classList.contains('depth')) { html.classList.add('depth'); p = 0; target = 0; renderDepth(); }
    if (q < 1) anim = requestAnimationFrame(step);
    else { mode = 'depth'; html.classList.remove('opening'); portal.classList.remove('on'); lastInput = performance.now() - 9999; }
  })(t0);
}
function closePortal() {
  if (mode !== 'depth') return;
  mode = 'closing';
  placePortal();
  portal.classList.add('on');
  drawPortal(1);
  html.classList.add('opening');
  const t0 = performance.now(), D = 1250;
  cancelAnimationFrame(anim);
  (function step(now) {
    const q = 1 - clamp((now - t0) / D, 0, 1);
    drawPortal(q);
    if (q <= 0.85 && html.classList.contains('depth')) html.classList.remove('depth');
    // the head comes back up as the hole closes
    mark.set(clamp(q / 0.35, 0, 1), 0, 1);
    if (q > 0) anim = requestAnimationFrame(step);
    else { mode = 'page'; up = 0; upSink = 0; html.classList.remove('opening'); portal.classList.remove('on'); mark.set(sinkDown(), 0, 1); }
  })(t0);
}

function pushUp(d) {                      // d > 0 means "up"
  if (mode !== 'page' || scrollY > 2 || reduced) { up = 0; upSink = 0; return; }
  up = clamp(up + d, 0, UP_NEED);
  upSink = ease(up / UP_NEED);
  mark.set(Math.max(sinkDown(), upSink), 0, 1);
  if (up >= UP_NEED) openPortal();
}
let upDecay = null;
function decayUp() {                       // let go before the threshold: the head comes back
  clearTimeout(upDecay);
  upDecay = setTimeout(() => {
    if (mode !== 'page') return;
    const t0 = performance.now(), from = up;
    (function step(now) {
      const k = clamp((now - t0) / 500, 0, 1);
      up = from * (1 - ease(k)); upSink = ease(up / UP_NEED);
      if (mode === 'page') mark.set(Math.max(sinkDown(), upSink), 0, 1);
      if (k < 1 && up > 0) requestAnimationFrame(step);
    })(t0);
  }, 600);
}

// ---- forward: depth --------------------------------------------------------------------------
const layers = [...document.querySelectorAll('.dl')].map(el => ({ el, c: +el.dataset.c, span: +el.dataset.span, vis: null }));
const MAX = layers[layers.length - 1].c;
const STOPS = layers.map(l => l.c);
let p = 0, target = 0, lastInput = 0, depthRaf = null;
const ticksEl = document.getElementById('ticks');
STOPS.forEach(() => { const t = document.createElement('i'); t.className = 'tick'; ticksEl.appendChild(t); });
const tickEls = [...ticksEl.children];
const nearestStop = v => STOPS.reduce((b, s) => Math.abs(s - v) < Math.abs(b - v) ? s : b, STOPS[0]);

// d > 0 means forward. Up is forward: the same direction that opened the portal.
function pushDepth(d) {
  target = clamp(target + d, -0.6, MAX);
  lastInput = performance.now();
  if (target <= -0.45) { target = 0; p = 0; closePortal(); }
}
function renderDepth() {
  for (const L of layers) {
    const d = (p - L.c) / L.span;             // -1 far ahead, +1 passed
    const a = Math.abs(d);
    const on = a < 1.02;
    if (on !== L.vis) { L.el.style.display = on ? '' : 'none'; L.el.classList.toggle('on', on); L.vis = on; }
    if (!on) continue;
    const scale = Math.pow(2, d * 0.95);
    const o = 1 - ease(inv(0.42, 1.0, a));
    L.el.style.transform = `scale(${scale.toFixed(4)})`;
    L.el.style.opacity = o.toFixed(3);
    L.el.style.filter = a > 0.55 ? `blur(${((a - 0.55) * 14).toFixed(1)}px)` : '';
  }
  // the hole ahead grows as you go: by the last stop it is the size of the screen
  const k = clamp(p / MAX, 0, 1);
  far.style.transform = `scale(${lerp(0.2, 1.6, ease(k)).toFixed(3)})`;
  far.style.opacity = (0.85 * (1 - seg(0.9, 1, k)) * seg(-0.3, 0.05, p)).toFixed(3);
  const near = nearestStop(p);
  tickEls.forEach((t, i) => t.classList.toggle('act', STOPS[i] === near));
}
function depthFrame() {
  depthRaf = null;
  if (mode !== 'depth') return;
  if (performance.now() - lastInput > 240) target = lerp(target, nearestStop(target), 0.12);
  p = lerp(p, target, 0.085);
  renderDepth();
  if (Math.abs(p - target) > 0.0005 || performance.now() - lastInput < 400) depthRaf = requestAnimationFrame(depthFrame);
}
function kickDepth() { if (!depthRaf) depthRaf = requestAnimationFrame(depthFrame); }

// ---- input ----------------------------------------------------------------------------------
addEventListener('wheel', e => {
  if (insideState !== 'out') { e.preventDefault(); return; }
  if (mode === 'depth') {
    e.preventDefault();
    const d = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
    pushDepth(-d / 700); kickDepth();
  } else if (mode === 'page') {
    if (e.deltaY < 0 && scrollY <= 2) { pushUp(-e.deltaY); decayUp(); }
    else if (up > 0) { up = 0; upSink = 0; }
  }
}, { passive: false });

let touchY = null;
addEventListener('touchstart', e => { touchY = e.touches[0].clientY; if (mode === 'depth') lastInput = performance.now(); }, { passive: true });
addEventListener('touchmove', e => {
  if (touchY === null || insideState !== 'out') return;
  const y = e.touches[0].clientY, dy = touchY - y; touchY = y;
  if (mode === 'depth') { pushDepth(-dy / 420); kickDepth(); }
  else if (mode === 'page' && dy < 0 && scrollY <= 2) { pushUp(-dy * 1.6); decayUp(); }
}, { passive: true });
addEventListener('touchend', () => { touchY = null; });

addEventListener('keydown', e => {
  if (mode === 'depth') {
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); const i = STOPS.indexOf(nearestStop(target)); target = STOPS[clamp(i + 1, 0, STOPS.length - 1)]; lastInput = 0; kickDepth(); }
    else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); const i = STOPS.indexOf(nearestStop(target)); if (i === 0) closePortal(); else { target = STOPS[i - 1]; lastInput = 0; kickDepth(); } }
    else if (e.key === 'Escape') closePortal();
  } else if (insideState === 'in' && e.key === 'Escape') { flyOut(); }
  else if (mode === 'page' && insideState === 'out' && scrollY <= 2 && (e.key === 'ArrowUp' || e.key === 'PageUp')) { pushUp(UP_NEED); }
});

// ---- boot -----------------------------------------------------------------------------------
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { layout(); if (mode === 'depth') { renderDepth(); } }, { passive: true });
document.fonts && document.fonts.ready.then(layout);
layout();
onScroll();
renderDepth();
if (location.search.includes('debug')) window.__portal = { get up() { return up; }, get mode() { return mode; }, get p() { return p; }, get inside() { return insideState; }, fall, flyIn, flyOut };
