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
  mark.set(Math.max(sinkDown(), sinkUp()), 0, 1);
  const rimY = r.top + r.height / 2 - stageTop;
  // the statement sits just under the sunk hole, but never peeks into the first screen
  statement.style.setProperty('--rise', Math.max(0, Math.min(vh - rimY - vh * 0.12, runway - vh * 0.03)).toFixed(1) + 'px');
  fall.measure();
}
function sinkDown() { return clamp(scrollY / runway, 0, 1); }
function onScroll() {
  if (axis > 0) return;
  mark.set(Math.max(sinkDown(), sinkUp()), 0, 1);
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
  if (axis > 0 || insideState !== 'out' || !fall.state().onShelf || reduced) return;
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

// ---- up: one axis, scrubbed -------------------------------------------------------------------
// Up is a second scroll. `axis` is how far up you have gone from the top, in pixels of intent
// (wheel, finger, keys). Along it, in order: the head goes into the hole (0..S), the hole opens
// into a circle and fills the screen (S..S+O), then the rooms, one every D px. Scrolling down
// runs the same axis backwards until you are out and the page scrolls normally again.
let axis = 0, shown = 0;              // shown follows axis with a short lag
let S = 1, O = 1; const D = 700;
function axisLayout() { S = Math.max(1, innerHeight * 0.42); O = Math.max(1, innerHeight * 0.6); }
function sinkUp() { return clamp(shown / S, 0, 1); }
function qOf(a) { return clamp((a - S) / O, 0, 1); }
function pOf(a) { return Math.max(0, (a - S - O) / D); }
const mode = { get v() { return shown <= 0.5 ? 'page' : qOf(shown) < 1 ? 'opening' : 'depth'; } };

let holeRect = null;
function placePortal() {
  const r = mark.hole.getBoundingClientRect();
  holeRect = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  portal.style.left = holeRect.x + 'px'; portal.style.top = holeRect.y + 'px';
}
// q: 0 = the hole as it is, 1 = black over everything. The hole is black; we go into it.
function drawPortal(q) {
  const toCircle = seg(0, 0.4, q);
  const grow = seg(0.25, 1, q);
  const need = Math.hypot(innerWidth, innerHeight) * 1.05;
  const w = lerp(holeRect.w, need, grow);
  const h = lerp(lerp(holeRect.h, holeRect.w, toCircle), need, grow);
  portal.style.width = w.toFixed(1) + 'px';
  portal.style.height = h.toFixed(1) + 'px';
  portal.style.transform = 'translate(-50%,-50%)';
}

let upRaf = null;
function renderUp() {
  upRaf = null;
  shown += (axis - shown) * 0.3;
  if (Math.abs(axis - shown) < 0.4) shown = axis;
  const q = qOf(shown), pp = pOf(shown);
  // the head
  mark.set(Math.max(sinkDown(), sinkUp()), 0, 1);
  // the hole opening
  const opening = shown > S && q < 1;
  if (opening && !holeRect) placePortal();
  portal.classList.toggle('on', opening);
  if (opening) drawPortal(q);
  html.classList.toggle('opening', opening);
  // the rooms: the scene fades in as the hole fills the screen, content with it
  const inDepth = q >= 1;
  html.classList.toggle('depth', inDepth);
  scene.style.opacity = seg(0.75, 1, q).toFixed(3);
  scene.style.visibility = q > 0.75 ? 'visible' : '';
  p = pp; renderDepth();
  if (pp >= MAX + 0.55) { leaveThroughTheWhite(); return; }
  if (shown === 0) holeRect = null;
  document.body.classList.toggle('up', shown > 0);
  if (shown !== axis) upRaf = requestAnimationFrame(renderUp);
}
function kickUp() { if (!upRaf) upRaf = requestAnimationFrame(renderUp); }
function pushUp(d) {                      // d > 0 means up, in px of intent
  if (reduced || insideState !== 'out') return;
  if (axis <= 0 && (scrollY > 2 || d <= 0)) return;
  axis = clamp(axis + d, 0, S + O + (MAX + 0.7) * D);
  kickUp();
}
// past the last room the white hole has filled the screen: you are out. For now, out means
// back on the first screen, the head over the hole. What is really out there is undecided.
let leaving = false, cooldownUntil = 0;
function leaveThroughTheWhite() {
  if (leaving) return;
  leaving = true;
  html.classList.add('leaving');
  setTimeout(() => {
    axis = 0; shown = 0; holeRect = null; p = 0;
    html.classList.remove('depth', 'opening'); portal.classList.remove('on');
    scene.style.opacity = '0'; scene.style.visibility = '';
    scrollTo(0, 0); mark.set(0, 0, 1); renderDepth();
    document.body.classList.remove('up');
    html.classList.remove('leaving');
    leaving = false; cooldownUntil = performance.now() + 1200;
  }, 700);
}

// ---- the rooms --------------------------------------------------------------------------------
const layers = [...document.querySelectorAll('.dl')].map(el => ({ el, c: +el.dataset.c, span: +el.dataset.span, vis: null }));
const MAX = layers[layers.length - 1].c;
const STOPS = layers.map(l => l.c);
let p = 0;
const ticksEl = document.getElementById('ticks');
STOPS.forEach(() => { const t = document.createElement('i'); t.className = 'tick'; ticksEl.appendChild(t); });
const tickEls = [...ticksEl.children];
const nearestStop = v => STOPS.reduce((b, s) => Math.abs(s - v) < Math.abs(b - v) ? s : b, STOPS[0]);
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
  // the white hole ahead grows as you go; past the last room it fills the screen
  const k = clamp(p / (MAX + 0.55), 0, 1);
  const need = Math.hypot(innerWidth, innerHeight) / 44;
  far.style.transform = `scale(${(0.18 * Math.pow(need / 0.18, Math.pow(k, 3))).toFixed(3)})`;
  far.style.opacity = (0.95 * seg(-0.3, 0.05, p)).toFixed(3);
  const near = nearestStop(p);
  tickEls.forEach((t, i) => t.classList.toggle('act', STOPS[i] === near));
}

// ---- input ------------------------------------------------------------------------------------
addEventListener('wheel', e => {
  if (insideState !== 'out') { e.preventDefault(); return; }
  const d = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
  if (axis > 0 || (scrollY <= 2 && d < 0 && performance.now() >= cooldownUntil)) {
    e.preventDefault();                   // while we are on the up axis, the page does not scroll
    pushUp(-d);
  }
}, { passive: false });

let touchY = null;
addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => {
  if (touchY === null || insideState !== 'out') return;
  const y = e.touches[0].clientY, dy = touchY - y; touchY = y;    // dy > 0: finger moved up (scroll down)
  if (axis > 0 || (scrollY <= 2 && dy < 0 && performance.now() >= cooldownUntil)) { if (e.cancelable) e.preventDefault(); pushUp(-dy * 1.4); }
}, { passive: false });
addEventListener('touchend', () => { touchY = null; });

addEventListener('keydown', e => {
  if (insideState === 'in' && e.key === 'Escape') { flyOut(); return; }
  if (insideState !== 'out') return;
  const inUp = axis > 0;
  if (e.key === 'ArrowUp' || e.key === 'PageUp') { if (inUp || scrollY <= 2) { e.preventDefault(); pushUp(e.key === 'PageUp' ? D : D / 4); } }
  else if (inUp && (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ')) { e.preventDefault(); pushUp(e.key === 'ArrowDown' ? -D / 4 : -D); }
  else if (inUp && e.key === 'Escape') { axis = 0; kickUp(); }
});

// ---- boot -----------------------------------------------------------------------------------
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { axisLayout(); layout(); holeRect = null; kickUp(); renderDepth(); }, { passive: true });
document.fonts && document.fonts.ready.then(layout);
axisLayout();
layout();
onScroll();
renderDepth();
if (location.search.includes('debug')) window.__portal = { get axis() { return axis; }, get mode() { return mode.v; }, get p() { return p; }, get inside() { return insideState; }, fall, flyIn, flyOut, pushUp };
