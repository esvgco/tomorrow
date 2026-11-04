# Studies 02 and 03 — the second pass, on the client's own mark

Live on staging: [`/studies.html`](../site/studies.html) lists everything;
[`/corridor.html`](../site/corridor.html) is study 02, [`/someone.html`](../site/someone.html) is
study 03. The main page (`/`) is untouched. Every page carries `noindex`, plus `robots.txt`
and an `X-Robots-Tag` header via `site/_headers`.

Both studies are built on the client's own prototype grammar (the.tomorrowcompany.com): their
mark, inline, with their sink mechanic (the hole rises over the head); their copy; a monospace
(system mono as a stand-in, see [typefaces.md](typefaces.md)); no build step, no libraries.
Ideas and principles: [ideas-02.md](ideas-02.md).

## Shared

- `site/js/mark.js` — the mark SVG (from their page, the hole path given an id so it can be
  reused), `mountMark(host)` → `set(sink, flatten, scale)`.
- `site/js/day.js` — the day counter, the real clock, the header. The site is always `day`
  days ahead: `?day=N` sets it, it is remembered in `localStorage`, `?reset` clears all
  study state. Header: *The Today Company* until you have gone through once, then *The
  Tomorrow Company*; right side: *Today / Tomorrow / The day after tomorrow · date · clock*.
  The tab title stays the real name. `.t` spans with `data-d0`/`data-d1` change tense with
  the day (only in their own statements about the world, never facts about projects).
  Day changes are history entries, so **Back** is the way out of tomorrow.
- `site/study.css` — paper, ink, header, the rule as a flattened ellipse (`.rule`), doorways.

## Study 02 — the corridor (`corridor.html`, `js/corridor.js`)

1. **Sink.** Scroll: the rabbit goes into the hole (their mechanic, ported).
2. **Counterweight.** The hole flattens into a line; the first sentence surfaces up through
   that line at the same rate. The flattened hole stays as the sentence's baseline.
3. **Every line is a hole.** Each rule below is an ellipse with ry = 1; hover opens it to
   ry = 10; the cursor's vertical position tilts all of them a little (1–3 px).
   The rule under *About us* is a doorway: click, it grows to fill the screen (black only
   inside the hole), About appears on white; *Return* / Esc reverse it.
4. **Camera.** `.plane` scales from the viewport centre: a breath while scrolling
   (0–0.8 %, humped at ~700 px/s, smaller when you scroll fast to catch it) on top of a slow
   shrink to 86 % by the end that does not come back. The last sentence is the smallest text.
5. **Turn.** Overscroll at the bottom (wheel: 260 px of intent; touch: 160 px; also drag
   sideways on empty space, or ← →): the plane rotates edge-on and the same hole shape, now
   big (scaled by how far you walked), is in front of you. Scroll up (or Esc) turns back.
6. **Go in.** Keep scrolling (a separate gesture on touch), click the hole, or Enter: the
   hole fills the screen, then you are at the top, day + 1, the rabbit looking in again.

## Study 03 — someone else is here (`someone.html`, `js/someone.js`)

1. **The fall.** The lead paragraph is split into letter tiles (words wrapped in `nowrap`
   spans so wrapping is unchanged). On scroll each tile moves **only vertically** down its
   own monospace column: first onto a five-line shelf (*Technologies / Companies / Products /
   Experiences / Original IP*), holds there readable, then on into the next paragraph.
   A tile landing where a different letter is needed changes glyph on the shelf (position is
   conserved, the glyph is not). Columns with no shelf go straight to the next paragraph
   and wait; letters with nowhere to go fall and fade; nests nobody reaches show at the end.
   Timeline: paragraph 1 at 62 % of the viewport → paragraph 2 at 36 %.
2. **Teaser.** Two lines get the system selection highlight as they leave the top edge
   (`animation-timeline: view()`, `animation-range: exit 0% exit 55%`; JS fallback where
   unsupported). One word, *probably*, vanishes on exit. Scroll back: nothing happened.
3. **The edit.** Once per browser: when the paragraph has sat in reading position for
   1.7 s and the tab is visible, a caret appears after *probably*, the real selection grows
   back over it letter by letter, pauses, deletes it, the caret stays a moment and goes.
   **Cmd/Ctrl+Z** puts the word back (the caret appears, waits, leaves — the other hand does
   not argue). **Shift+Cmd+Z** takes it out again. The state is remembered (`tc-edit`:
   1 done, 2 undone), so it never replays. `?reset` for demos.
4. **Fly-through.** Click the space between two words in the prose: the plane scales ×26
   from the click point and fades to white; you land on the same page, day + 1 (header,
   tense, the hole 1 % wider). Back returns.

## What to look at with the client

- The counterweight (02, first screen) and the turn (02, last screen) — the whole
  geometry in two moments: the hole was behind you.
- The hold on the shelf (03) — the moment the fall is a list.
- The edit (03) and Cmd+Z — the strange event and the ordinary exit.
- The header after the first dive — *The Tomorrow Company* appears.

## Known limits

- Typeface is the system mono; the fall and the glyph switch depend on a monospace grid.
- `view()` timelines: Chrome, Safari 26+; Firefox falls back to the JS version.
- The portrait reveal (rotoscope, rack focus) is not built: no source photos yet.
- On touch there is no cursor tilt, no drag-turn, no fly-through by tap (taps on text are
  accidental); the core — sink, fall, teaser, edit, turn, dive — works.
