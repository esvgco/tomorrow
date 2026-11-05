// The site is always one day ahead of where you've been. `day` is how many times you
// went through the hole (or flew through the letters). The clock is real; the date is yours.
// ?day=N sets it, ?reset clears everything stored by the studies (for demos).

const KEY = 'tc-day';
const listeners = [];

export function readDay() {
  const u = new URL(location.href);
  if (u.searchParams.has('reset')) {
    try { Object.keys(localStorage).filter(k => k.startsWith('tc-')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    u.searchParams.delete('reset');
    history.replaceState(null, '', u);
  }
  const q = u.searchParams.get('day');
  if (q !== null) return Math.max(0, parseInt(q, 10) || 0);
  try { return Math.max(0, parseInt(localStorage.getItem(KEY), 10) || 0); } catch (e) { return 0; }
}

let day = readDay();
export function getDay() { return day; }

export function setDay(n, { push = false } = {}) {
  n = Math.max(0, n | 0);
  day = n;
  try { localStorage.setItem(KEY, String(n)); } catch (e) {}
  const u = new URL(location.href);
  if (n) u.searchParams.set('day', String(n)); else u.searchParams.delete('day');
  if (push) history.pushState({ day: n }, '', u); else history.replaceState({ day: n }, '', u);
  listeners.forEach(f => f(n));
}

export function onDay(f) { listeners.push(f); f(day); }

history.replaceState({ day }, '', location.href);
window.addEventListener('popstate', e => {
  const q = new URL(location.href).searchParams.get('day');
  const n = e.state && typeof e.state.day === 'number' ? e.state.day : (q !== null ? Math.max(0, parseInt(q, 10) || 0) : 0);
  day = n;
  try { localStorage.setItem(KEY, String(n)); } catch (e2) {}
  listeners.forEach(f => f(n));
});

export function dayWord(n) {
  return ['Today', 'Tomorrow', 'The day after tomorrow'][n] || `${n} days from now`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dateFor(n, now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function clock(now = new Date()) {
  const p = v => String(v).padStart(2, '0');
  return `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
}

/** Header: the name on the left, the day on the right. The tab title stays the real name. */
export function mountHeader(el) {
  el.innerHTML = `<a class="hd-name" href="studies.html"><span class="hd-the">The </span><span class="hd-word">Today</span> Company</a>
  <span class="hd-day"><span class="hd-dword">Today</span><span class="hd-sep"> · </span><time class="hd-date"></time><span class="hd-sep hd-sep2"> · </span><span class="hd-clock"></span></span>`;
  const word = el.querySelector('.hd-word');
  const dword = el.querySelector('.hd-dword');
  const date = el.querySelector('.hd-date');
  const clk = el.querySelector('.hd-clock');
  function tick() {
    const now = new Date();
    date.textContent = dateFor(day, now);
    date.dateTime = new Date(now.getTime() + day * 864e5).toISOString().slice(0, 10);
    clk.textContent = clock(now);
  }
  onDay(n => {
    word.textContent = n ? 'Tomorrow' : 'Today';
    dword.textContent = dayWord(n);
    tick();
  });
  tick();
  setInterval(tick, 1000);
}

/** Words that change with the day: <span class="t" data-d0="is becoming" data-d1="became"> */
export function mountTenses(root = document) {
  const els = [...root.querySelectorAll('.t')];
  onDay(n => {
    els.forEach(el => {
      const keys = Object.keys(el.dataset).filter(k => /^d\d+$/.test(k)).map(k => +k.slice(1)).sort((a, b) => a - b);
      let pick = keys[0];
      keys.forEach(k => { if (k <= n) pick = k; });
      const v = el.dataset['d' + pick];
      if (el.textContent !== v) el.textContent = v;
    });
  });
}
