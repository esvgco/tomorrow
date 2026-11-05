// The fall: every letter of one paragraph is a tile on the monospace grid. On scroll the
// tiles move only vertically, down their own column: first onto a shelf (one word per
// line), where they hold, readable, then on into the next paragraph. A tile that lands
// where a different letter is needed changes glyph on the shelf. Position is conserved,
// the glyph is not. Extracted from someone.js so other studies can use it.
//
// mountFall({ grid, p1, stack, p2, startAt = 0.62, endAt = 0.36 }) → { measure, apply(y), state() }

const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

export function mountFall({ grid, p1, stack, p2, startAt = 0.62, endAt = 0.36 }) {
  const travellers = tileize(p1, 'ch');
  const shelf = tileize(stack, 'nest');
  const nests2 = tileize(p2, 'nest');
  const A = 0.42, H = 0.56;
  let plan = [], fallStart = 0, fallEnd = 1, lastPhase = -1, lastT = 0;

  function measure() {
    travellers.forEach(t => { t.style.setProperty('--ty', '0px'); t.classList.remove('gone'); });
    const left = grid.getBoundingClientRect().left;
    let chW = parseFloat(getComputedStyle(p1).fontSize) * 0.6;
    const probe = travellers[0];
    if (probe) { const r = probe.getBoundingClientRect(); if (r.width > 2) chW = r.width; }
    const col = el => { const r = el.getBoundingClientRect(); return Math.round((r.left + r.width / 2 - left) / chW); };
    const top = el => el.getBoundingClientRect().top + scrollY;
    const byCol = els => { const m = new Map(); els.forEach(el => { const c = col(el); if (!m.has(c)) m.set(c, []); m.get(c).push(el); }); m.forEach(a => a.sort((x, y) => top(x) - top(y))); return m; };
    const T = byCol(travellers), S = byCol(shelf), P = byCol(nests2);
    plan = [];
    T.forEach((list, c) => {
      const s = S.get(c) || [], p = P.get(c) || [];
      list.forEach((el, i) => {
        const sN = s[i] || null, pN = p[i] || null;
        plan.push({ el, y0: top(el), sN, pN, yS: sN ? top(sN) : null, yP: pN ? top(pN) : null, g0: el.textContent });
      });
    });
    fallStart = top(p1) - innerHeight * startAt;
    fallEnd = top(p2) - innerHeight * endAt;
    nests2.forEach(n => n.classList.remove('shown'));
    shelf.forEach(n => n.classList.remove('shown'));
    apply(scrollY, true);
  }

  function apply(y, force) {
    if (reduced) { nests2.forEach(n => n.classList.add('shown')); travellers.forEach(t => t.classList.add('gone')); return; }
    const t = Math.max(0, Math.min(1, (y - fallStart) / Math.max(1, fallEnd - fallStart)));
    lastT = t;
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
        const k = ease(t / A); ty = (q.yP - q.y0) * k; glyph = k >= 0.97 ? q.pN.textContent : q.g0;
      } else {
        const k = ease(t / A); ty = (innerHeight * 0.9) * k; gone = k > 0.7;
      }
      q.el.style.setProperty('--ty', Math.round(ty) + 'px');
      if (q.el.textContent !== glyph) q.el.textContent = glyph;
      q.el.classList.toggle('gone', gone);
    }
    const done = t >= 0.995;
    const onShelf = t >= A * 0.97 && t <= H + 0.02;
    const phase = done ? 2 : onShelf ? 1 : 0;
    if (phase !== lastPhase || force) {
      nests2.forEach(n => { if (!plan.some(q => q.pN === n)) n.classList.toggle('shown', done); });
      shelf.forEach(n => { if (!plan.some(q => q.sN === n)) n.classList.toggle('shown', onShelf); });
      stack.classList.toggle('held', onShelf);
      lastPhase = phase;
    }
  }

  /** scroll position at which the shelf is fully formed (the middle of the hold) */
  function holdY() { return fallStart + (fallEnd - fallStart) * (A + H) / 2; }
  function state() { return { t: lastT, onShelf: lastT >= A * 0.97 && lastT <= H + 0.02 }; }

  return { measure, apply, state, holdY, travellers, shelf, nests2 };
}
