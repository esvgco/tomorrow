// Study 02 — the corridor.
// Scroll down: the rabbit goes into the hole, the hole flattens into a line, the first
// sentence surfaces through that line (the counterweight). Every rule below is the same
// hole seen edge-on; hover opens it. The camera breathes while you scroll and never quite
// comes back: by the end you are smaller. Keep scrolling past the end and you turn around:
// the hole was behind you the whole time, and now it is bigger than you. Go in, and it is
// tomorrow. Scroll back, Esc, Back: every strange thing has an ordinary way out.

import { mountMark } from './mark.js';
import { mountHeader, mountTenses, getDay, setDay, onDay, dateFor } from './day.js';

const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

mountHeader(document.getElementById('hd'));
mountTenses();
onDay(n => { document.getElementById('foot-date').textContent = dateFor(n); });

const plane = document.getElementById('plane');
const mark = mountMark(document.getElementById('mark'));
const surface = document.getElementById('surface');
const statement = document.getElementById('statement');
const turn = document.getElementById('turn');
const big = document.getElementById('big');
const dive = document.getElementById('dive');

// ---- geometry -------------------------------------------------------------------------
let runway = 1, flatLen = 1, maxScroll = 1;
function layout() {
  const vh = innerHeight;
  runway = Math.max(1, vh * 0.42);
  flatLen = Math.max(1, vh * 0.28);
  // the statement's bottom edge wants to sit on the hole's rim once the sink completes:
  // when scrollY = runway the statement's top is at the bottom of the viewport, so pull it
  // up by (vh - rimY + surfaceHeight). The flattened hole then is the sentence's baseline.
  const stageTop = document.querySelector('.stage').getBoundingClientRect().top;
  mark.set(1, 0, 1);
  const rimInStage = mark.hole.getBoundingClientRect();
  mark.set(0, 0, 1);
  const rimY = rimInStage.top + rimInStage.height / 2 - stageTop;
  const rise = Math.max(0, vh - rimY + surface.offsetHeight - 2);
  statement.style.setProperty('--rise', rise.toFixed(1) + 'px');
  maxScroll = Math.max(1, html.scrollHeight - innerHeight);
  // the big hole: the same shape as the mark's hole, from the same path
  const hb = mark.holeBox;
  big.setAttribute('viewBox', `${hb.x} ${hb.y} ${hb.width} ${hb.height}`);
  big.innerHTML = `<use href="#tc-holeshape" fill="currentColor"/>`;
}

// ---- scroll: sink, flatten, surface, camera ---------------------------------------------
let lastY = scrollY, lastT = performance.now(), vel = 0, breath = 0, raf = null;
function frame() {
  raf = null;
  const y = scrollY;
  const now = performance.now();
  const dt = Math.max(1, now - lastT);
  const v = Math.abs(y - lastY) / dt * 1000; // px/s
  vel += (v - vel) * 0.25;
  lastY = y; lastT = now;

  const sink = Math.max(0, Math.min(1, y / runway));
  const flat = Math.max(0, Math.min(1, (y - runway) / flatLen));
  mark.set(sink, Math.min(0.97, flat), 1);
  // the sentence rises through its baseline exactly as the hole flattens
  const up = reduced ? 0 : (1 - flat) * 100;
  surface.style.setProperty('--up', up.toFixed(2) + '%');

  // camera: a breath while moving (hump at ~700 px/s, less when you go fast to catch it),
  // and a slow shrink that does not come back
  const progress = Math.max(0, Math.min(1, y / maxScroll));
  const v0 = 700;
  const hump = (vel / v0) * Math.exp(1 - vel / v0);
  const targetBreath = reduced ? 0 : 0.008 * Math.min(1, hump);
  breath += (targetBreath - breath) * 0.08;
  const base = reduced ? 1 : 1 - 0.14 * progress;
  const s = base * (1 + breath);
  if (!html.classList.contains('turned')) {
    plane.style.transformOrigin = `50% ${(y + innerHeight / 2).toFixed(1)}px`;
    plane.style.transform = `scale(${s.toFixed(5)})`;
  }
  big.style.setProperty('--big', (0.3 + 0.75 * progress).toFixed(3));

  if (breath > 0.0002 && !raf) raf = requestAnimationFrame(frame);
}
function onScroll() { if (!raf) raf = requestAnimationFrame(frame); }

// ---- every line is a hole: cursor tilt opens them a little -------------------------------
let tiltRaf = null;
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' || coarse) return;
  const t = (e.clientY / innerHeight - 0.5) * 2; // -1..1
  const tilt = 1 + 2 * Math.abs(t);
  if (!tiltRaf) tiltRaf = requestAnimationFrame(() => {
    tiltRaf = null;
    document.querySelectorAll('.rule').forEach(r => r.style.setProperty('--tilt', tilt.toFixed(2)));
  });
}, { passive: true });

// ---- turning around ----------------------------------------------------------------------
let over = 0, turned = false, busy = false, turnedAt = 0, touchY = null, touchAcc = 0;
function setTurned(on) {
  if (turned === on || busy) return;
  turned = on;
  over = 0; touchAcc = 0; turnedAt = performance.now();
  html.classList.toggle('turned', on);
  if (on) {
    plane.style.transformOrigin = `50% ${(scrollY + innerHeight / 2).toFixed(1)}px`;
    plane.style.transform = `perspective(1400px) rotateY(90deg) scale(${(1 - 0.14 * (scrollY / maxScroll)).toFixed(4)})`;
  } else {
    plane.style.transition = 'transform .5s cubic-bezier(0,0,.6,1)';
    onScroll();
    setTimeout(() => { plane.style.transition = ''; }, 520);
  }
}
function atBottom() { return scrollY >= maxScroll - 2; }

addEventListener('wheel', e => {
  if (busy) return;
  if (!turned) {
    if (atBottom() && e.deltaY > 0) { over += e.deltaY; if (over > 260) setTurned(true); }
    else over = 0;
  } else {
    over += e.deltaY;
    if (over < -140) setTurned(false);
    if (over > 320) goIn();
  }
}, { passive: true });


addEventListener('touchstart', e => { touchY = e.touches[0].clientY; touchAcc = 0; }, { passive: true });
addEventListener('touchmove', e => {
  if (touchY === null || busy) return;
  const dy = touchY - e.touches[0].clientY; touchY = e.touches[0].clientY;
  if (!turned) { if (atBottom() && dy > 0) { touchAcc += dy; if (touchAcc > 160) setTurned(true); } else touchAcc = 0; }
  else { touchAcc += dy; if (touchAcc < -100) setTurned(false); if (touchAcc > 220) goIn(); }
}, { passive: true });

// drag on empty space, or the arrow keys, turn you around anywhere (desktop)
let drag = null;
addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || e.button !== 0) return;
  if (e.target.closest('a, button, p, .mark, .about')) return;
  drag = { x: e.clientX, y: e.clientY };
});
addEventListener('pointermove', e => {
  if (!drag) return;
  if (Math.abs(e.clientX - drag.x) > 90 && Math.abs(e.clientY - drag.y) < 60) { setTurned(!turned); drag = null; }
});
addEventListener('pointerup', () => { drag = null; });
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (!html.classList.contains('about-open')) { setTurned(!turned); e.preventDefault(); } }
  if (e.key === 'Escape') { if (html.classList.contains('about-open')) closeAbout(); else if (turned) setTurned(false); }
  if (turned && (e.key === 'Enter' || e.key === ' ')) goIn();
});
document.getElementById('jump').addEventListener('click', e => { e.preventDefault(); goIn(); });
turn.addEventListener('click', e => { if (e.target === turn || e.target.closest('.big')) goIn(); });

// ---- going in: it is tomorrow ------------------------------------------------------------
function goIn() {
  if (busy || !turned || performance.now() - turnedAt < 600) return;
  busy = true;
  html.classList.add('diving');
  setTimeout(() => {
    setDay(getDay() + 1, { push: true });
    scrollTo(0, 0);
    turned = false; over = 0; touchAcc = 0;
    html.classList.remove('turned');
    plane.style.transition = 'none';
    plane.style.transform = 'scale(1)';
    lastY = 0; vel = 0; breath = 0;
    mark.set(0, 0, 1);
    surface.style.setProperty('--up', '100%');
    layout();
    html.classList.remove('diving');
    html.classList.add('surfacing');
    setTimeout(() => { html.classList.remove('surfacing'); plane.style.transition = ''; busy = false; onScroll(); }, 900);
  }, 1150);
}

// ---- About: the rule under the word is a hole; you go through it ---------------------------
const door = document.getElementById('door');
const about = document.getElementById('about');
const aboutLink = document.getElementById('about-link');
function openAbout() {
  if (html.classList.contains('about-open')) return;
  const r = document.querySelector('#door-about .rule').getBoundingClientRect();
  door.style.left = r.left + 'px'; door.style.top = (r.top + r.height / 2 - 6) + 'px';
  door.style.width = r.width + 'px'; door.style.height = '12px'; door.style.opacity = '1';
  door.style.transition = 'none'; door.style.transform = 'scale(1)';
  requestAnimationFrame(() => {
    const k = Math.max(innerWidth / r.width, innerHeight / 12) * 1.3;
    door.style.transition = 'transform .7s cubic-bezier(.6,0,.8,.3)';
    door.style.transform = `scale(${k.toFixed(2)})`;
    setTimeout(() => { html.classList.add('about-open'); about.focus({ preventScroll: true }); door.style.opacity = '0'; door.style.transition = 'opacity .4s .1s'; }, 650);
  });
}
function closeAbout() {
  html.classList.remove('about-open');
  door.style.transition = 'none'; door.style.transform = 'scale(1)';
  aboutLink.focus({ preventScroll: true });
}
aboutLink.addEventListener('click', openAbout);
document.getElementById('about-back').addEventListener('click', e => { e.preventDefault(); closeAbout(); });

// ---- boot ----------------------------------------------------------------------------------
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { layout(); onScroll(); }, { passive: true });
document.fonts && document.fonts.ready.then(() => { layout(); onScroll(); });
layout();
frame();
