// Study 03 — someone else is here.
import { mountMark } from './mark.js';
import { mountHeader, mountTenses, getDay, setDay, onDay, dateFor } from './day.js';

const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

mountHeader(document.getElementById('hd'));
mountTenses();
onDay(n => { document.getElementById('foot-date').textContent = dateFor(n); });

const plane = document.getElementById('plane');
const mark = mountMark(document.getElementById('mark'));
let runway = 1;

// =========================================================================================
// 1. The fall. Every letter of the first paragraph is a tile on the monospace grid. On
//    scroll the tiles fall straight down their own column, pause as a list of five words,
//    then fall on into the next paragraph. A letter that lands where a different letter is
//    needed changes on the shelf. Position is conserved; the glyph is not.
// =========================================================================================
const grid = document.getElementById('grid');
const p1 = document.getElementById('p1');
const stack = document.getElementById('stack');
const p2 = document.getElementById('p2');

function tileize(el, cls) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = []; let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(node => {
    const frag = document.createDocumentFragment();
    let word = null;
    for (const chr of node.textContent) {
      if (chr === ' ' || chr === '\n') { word = null; frag.appendChild(document.createTextNode(' ')); continue; }
      if (!word) { word = document.createElement('span'); word.className = 'w'; frag.appendChild(word); }
      const s = document.createElement('span');
      s.className = cls; s.textContent = chr;
      word.appendChild(s);
    }
    node.parentNode.replaceChild(frag, node);
  });
  return [...el.querySelectorAll('.' + cls)];
}
const travellers = tileize(p1, 'ch');
const shelf = tileize(stack, 'nest');
const nests2 = tileize(p2, 'nest');

let plan = []; // per traveller: {el, y0, yS, yP, gS, gP, colFree}
let fallStart = 0, fallEnd = 1, chW = 8;
function measure() {
  travellers.forEach(t => { t.style.setProperty('--ty', '0px'); t.classList.remove('gone'); });
  const g = grid.getBoundingClientRect();
  const left = g.left;
  chW = parseFloat(getComputedStyle(p1).fontSize) * 0.6; // mono advance ≈ 0.6em (measured below)
  const probe = travellers[0];
  if (probe) { const r = probe.getBoundingClientRect(); if (r.width > 2) chW = r.width; }
  const col = el => { const r = el.getBoundingClientRect(); return Math.round((r.left + r.width / 2 - left) / chW); };
  const top = el => el.getBoundingClientRect().top + scrollY;
  const byCol = (els) => { const m = new Map(); els.forEach(el => { const c = col(el); if (!m.has(c)) m.set(c, []); m.get(c).push(el); }); m.forEach(a => a.sort((x, y) => top(x) - top(y))); return m; };
  const T = byCol(travellers), S = byCol(shelf), P = byCol(nests2);
  plan = [];
  T.forEach((list, c) => {
    const s = S.get(c) || [], p = P.get(c) || [];
    list.forEach((el, i) => {
      const y0 = top(el);
      const sN = s[i] || null;                     // shelf nest for this letter, if any
      const pN = p[i] || null;                     // paragraph-2 nest, if any
      plan.push({ el, y0, sN, pN, yS: sN ? top(sN) : null, yP: pN ? top(pN) : null, g0: el.textContent });
    });
  });
  // where on the scroll the fall happens: from p1 reaching the upper third to p2 reaching it
  fallStart = top(p1) - innerHeight * 0.62;
  fallEnd = top(p2) - innerHeight * 0.36;
  // p2 nests that no letter will reach are simply shown at the end
  nests2.forEach(n => n.classList.remove('shown'));
  shelf.forEach(n => n.classList.remove('shown'));
  applyFall(scrollY, true);
}
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
let lastPhase = -1;
function applyFall(y, force) {
  if (reduced) { nests2.forEach(n => n.classList.add('shown')); travellers.forEach(t => t.classList.add('gone')); return; }
  const t = Math.max(0, Math.min(1, (y - fallStart) / Math.max(1, fallEnd - fallStart)));
  const A = 0.42, H = 0.56; // phase A ends, hold, phase B begins
  for (const q of plan) {
    let ty, glyph = q.g0, gone = false;
    if (q.sN) {
      if (t <= A) { ty = (q.yS - q.y0) * ease(t / A); glyph = t >= A * 0.97 ? q.sN.textContent : q.g0; }
      else if (t <= H) { ty = q.yS - q.y0; glyph = q.sN.textContent; }
      else {
        const k = ease((t - H) / (1 - H));
        if (q.pN) { ty = (q.yS - q.y0) + (q.yP - q.yS) * k; glyph = k >= 0.97 ? q.pN.textContent : q.sN.textContent; }
        else { ty = (q.yS - q.y0) + (innerHeight * 0.6) * k; gone = k > 0.6; glyph = q.sN.textContent; }
      }
    } else if (q.pN) {
      // no shelf for this column: go straight to the next paragraph and wait there
      const k = ease(t / A); ty = (q.yP - q.y0) * k; glyph = k >= 0.97 ? q.pN.textContent : q.g0;
    } else {
      const k = ease(t / A); ty = (innerHeight * 0.9) * k; gone = k > 0.7;
    }
    q.el.style.setProperty('--ty', Math.round(ty) + 'px');
    if (q.el.textContent !== glyph) q.el.textContent = glyph;
    q.el.classList.toggle('gone', gone);
  }
  // nests with no traveller: the shelf's while it is a shelf, the paragraph's at the end
  const done = t >= 0.995;
  const onShelf = t >= A * 0.97 && t <= H + 0.02;
  const phase = done ? 2 : onShelf ? 1 : 0;
  if (phase !== lastPhase || force) {
    nests2.forEach(n => { if (!plan.some(q => q.pN === n)) n.classList.toggle('shown', done); });
    shelf.forEach(n => { if (!plan.some(q => q.sN === n)) n.classList.toggle('shown', onShelf); });
    lastPhase = phase;
  }
}

// =========================================================================================
// 2. The sink, and the fall, on scroll
// =========================================================================================
let raf = null;
function frame() {
  raf = null;
  const y = scrollY;
  mark.set(Math.max(0, Math.min(1, y / runway)), 0, 1 + 0.01 * getDay());
  applyFall(y);
  teaseFallback();
  armEdit();
}
function onScroll() { if (!raf) raf = requestAnimationFrame(frame); }

// =========================================================================================
// 3. The teaser, for browsers without scroll-driven animations
// =========================================================================================
const hasViewTimeline = CSS.supports('animation-timeline: view()');
const teases = [...document.querySelectorAll('.tease .hl, .tease .vanish')];
function teaseFallback() {
  if (hasViewTimeline) return;
  teases.forEach(el => {
    const r = el.getBoundingClientRect();
    const k = -r.top / Math.max(1, r.height); // 0 when the top edge reaches the top, 1 when gone
    el.classList.toggle('js-on', k > (el.classList.contains('vanish') ? 0.1 : 0.0) && k < 1);
  });
}

// =========================================================================================
// 4. The edit. Once per browser. A caret appears at the end of the sentence, the
//    selection grows back over "might ", it is deleted, the caret stays a moment and goes.
//    Cmd+Z puts it back. Shift+Cmd+Z takes it out again. The other hand does not argue.
// =========================================================================================
const EDIT_KEY = 'tc-edit';
const target = document.getElementById('edit-target');
let editState = 'idle'; // idle | armed | running | done | undone
try { const v = localStorage.getItem(EDIT_KEY); if (v === '1') editState = 'done'; else if (v === '2') editState = 'undone'; } catch (e) {}
const victimText = 'probably ';
let victim = null, caret = null, armedAt = 0;

function findVictim() {
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  let n; while ((n = walker.nextNode())) { const i = n.textContent.indexOf(victimText); if (i >= 0) return { node: n, i }; }
  return null;
}
// mark the victim span up front so it can be removed or restored cleanly
(function prepare() {
  const v = document.querySelector('#edit-target .vanish');
  // the teaser's vanishing word is our victim too: "probably " — keep the teaser, wrap the text
  if (!v) return;
  victim = v;
  if (editState === 'done') { v.textContent = ''; v.classList.add('edited'); }
})();

function placeCaret(afterEl) {
  if (!caret) { caret = document.createElement('span'); caret.className = 'caret'; }
  afterEl.after(caret);
  caret.classList.remove('hidden');
}
function hideCaret() { if (caret) caret.classList.add('hidden'); }

let armTimer = null;
function inReadingPosition() {
  const r = target.getBoundingClientRect();
  const centre = r.top + r.height / 2;
  return centre > innerHeight * 0.22 && centre < innerHeight * 0.72;
}
function armEdit() {
  if (editState !== 'idle' || document.visibilityState !== 'visible' || reduced) return;
  if (inReadingPosition()) {
    if (!armedAt) {
      armedAt = performance.now();
      clearTimeout(armTimer);
      armTimer = setTimeout(() => { if (editState === 'idle' && inReadingPosition() && document.visibilityState === 'visible') runEdit(); else armedAt = 0; }, 1700);
    }
  } else { armedAt = 0; clearTimeout(armTimer); }
}
document.addEventListener('visibilitychange', () => { armedAt = 0; clearTimeout(armTimer); onScroll(); });

const wait = ms => new Promise(r => setTimeout(r, ms));
async function runEdit() {
  if (editState !== 'idle' || !victim) return;
  editState = 'running';
  const sel = getSelection();
  // 1. a caret appears after the word, blinks
  placeCaret(victim);
  await wait(900);
  // 2. the selection grows back over the word, one letter at a time
  const txt = victim.firstChild;
  const len = txt.textContent.length;
  for (let i = 1; i <= len; i++) {
    const range = document.createRange();
    range.setStart(txt, len - i); range.setEnd(txt, len);
    sel.removeAllRanges(); sel.addRange(range);
    await wait(55 + Math.random() * 40);
  }
  await wait(520);
  // 3. deleted
  sel.removeAllRanges();
  victim.textContent = '';
  victim.classList.add('edited');
  victim.before(caret); caret.classList.remove('hidden');
  try { localStorage.setItem(EDIT_KEY, '1'); } catch (e) {}
  editState = 'done';
  await wait(1400);
  hideCaret();
}
async function undoEdit() {
  if (editState !== 'done') return;
  victim.textContent = victimText; victim.classList.remove('edited');
  editState = 'undone';
  try { localStorage.setItem(EDIT_KEY, '2'); } catch (e) {}
  placeCaret(victim);         // the other hand notices, waits, lets you have it
  await wait(1100); hideCaret();
}
async function redoEdit() {
  if (editState !== 'undone') return;
  victim.textContent = ''; victim.classList.add('edited');
  editState = 'done';
  try { localStorage.setItem(EDIT_KEY, '1'); } catch (e) {}
  placeCaret(victim); await wait(700); hideCaret();
}
addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || e.key.toLowerCase() !== 'z') return;
  if (e.shiftKey) { if (editState === 'undone') { e.preventDefault(); redoEdit(); } }
  else if (editState === 'done') { e.preventDefault(); undoEdit(); }
});

// =========================================================================================
// 5. Flying through the letters. Click the space between two words: the page rushes past
//    and you land on the same page a day later. Back is the way out.
// =========================================================================================
function caretAt(x, y) {
  if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p && { node: p.offsetNode, off: p.offset }; }
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r && { node: r.startContainer, off: r.startOffset }; }
  return null;
}
let flying = false;
document.getElementById('prose').addEventListener('click', e => {
  if (flying || reduced) return;
  if (e.target.closest('a, button')) return;
  const c = caretAt(e.clientX, e.clientY);
  if (!c || c.node.nodeType !== 3) return;
  const s = c.node.textContent;
  const ch = s[c.off] || s[c.off - 1];
  if (ch !== ' ') return;
  fly(e.clientX, e.clientY);
});
function fly(x, y) {
  flying = true;
  const ox = x, oy = y + scrollY;
  plane.style.transformOrigin = `${ox}px ${oy}px`;
  html.classList.add('flying');
  plane.style.transform = 'scale(26)';
  setTimeout(() => {
    setDay(getDay() + 1, { push: true });
    html.classList.remove('flying');
    plane.style.transition = 'none';
    plane.style.transform = 'scale(1)';
    plane.style.opacity = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      plane.style.transition = '';
      html.classList.add('landing');
      plane.style.opacity = '1';
      setTimeout(() => { html.classList.remove('landing'); flying = false; onScroll(); }, 500);
    }));
  }, 600);
}

// =========================================================================================
// boot
// =========================================================================================
function layout() { runway = Math.max(1, innerHeight * 0.4); measure(); }
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { layout(); onScroll(); }, { passive: true });
document.fonts && document.fonts.ready.then(() => { layout(); onScroll(); });
onDay(() => onScroll());
layout();
frame();
