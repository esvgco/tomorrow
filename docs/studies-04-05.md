# Homepage studies 04 and 05

Working prototypes, 5 November 2026. Built from `mechanics.md`, the client direction,
founder copy in studies 02–03 and Elisey’s extended wall description. Existing study
routes remain available. Neither new route replaces the root page.

## 04 — The wall (`/wall.html`)

**Idea:** the scale of a possibility depends on where you stand.

Six chapters are printed on one white plane, each at 44% of the previous chapter’s
physical scale. Camera height and distance change together. This lets the visitor
read normally while descending toward the tiny door. Scrolling past the door moves
through the space in front of the wall. The wall and its surroundings are pure white;
there is no outline, floor grid, lighting gradient or artificial horizon.

The page’s argument: studio → possibilities → human technology → the two founders →
work in development → contact. Header links bypass exploration. Project details use
native dialogs. A normal-reading toggle removes the camera; this is also the default
for reduced motion and the no-JavaScript fallback.

### Controls and discoveries

- Wheel / vertical touch swipe: read, then move backward at the foot of the wall.
  Reverse scroll moves forward. After turning, motion follows camera orientation.
- Drag blank space / horizontal touch swipe / left and right arrow keys: turn.
  Horizontal wheel input is ignored, to avoid accidental trackpad discoveries.
- The “Look behind” button appears at the last chapter, giving touch and keyboard
  users a reliable way to discover the rear hole.
- A/D: sidestep. W/S: forward/backward at the foot. Walk beyond the white wall’s edge,
  then approach from the other side. The second hole is at x=650, z=-350; it can also
  become visible beyond the edge when backing far enough away from the front.
- The rear hole is at z=3000, behind the initial camera. Approach it or click it to
  advance a day. Holes are spatial elements, not a replacement screen on turning.
- Hover the final heading and reverse-scroll to fly into its “o”. Tap or focus/Enter
  also works. The interior has black ceiling, floor and side planes, without reflections.
  Escape / Back to the wall returns. Focus is contained while inside.
- Click an inter-word gap in the human-technology paragraph: fly through to the same
  page one day later. The URL records the day; browser Back restores it.
- The header and hero begin with “The Today Company”. First passage changes both to
  “The Tomorrow Company”, with tomorrow’s calendar date and the real local clock.
  Later passages keep advancing the date. Nothing depends on local storage.

### Coverage of mechanics.md

| Mechanic | Implementation / scope |
|---|---|
| 1.1 Whole paragraph → stack → new paragraph | Monospaced glyph columns, vertical travel, readable five-line hold, glyph changes at landing. Completes once per page load. |
| 1.2 Foreign edit | Caret, selection, deletion, typed replacement: “probably” → “certainly”. Starts after a reading pause. |
| 1.3–1.4 Edge teaser vs autonomous intervention | Edge highlight/disappearance reverses with scroll. Later edit runs independently and stays changed. |
| 1.5 Undo | Cmd/Ctrl+Z restores “probably”; Shift+Cmd/Ctrl+Z reapplies. Also available in help for phones. |
| 1.6 Top edge as an unseen passage | The teaser disappears into the upper edge, returning unchanged on reverse scroll. |
| 1.7 One-shot behavior | Once per load, not permanently once per browser. Refresh is a fresh performance. |
| 1.8 No explanations in the event | Controls and spoilers live in the optional `?` dialog. |
| 2.1 Camera breathing | Entire camera scales by at most 0.6%; effect falls away at high velocity. |
| 2.2–2.5 Scale, perspective, moving, rear hole | Shared CSS 3D coordinates. Progressively smaller wall chapters, slight camera pitch and pointer look; free movement after the last chapter. |
| 2.6 Return through the hole | Black aperture expands and collapses; returns to the first screen one day later. The rabbit sinks and its own hole flattens while leaving the hero. The literal animated hole jumping into itself is represented by aperture closure, not a rigged hole animation. |
| 2.7–2.9 Turn at any time / deliberate input | Arrow keys and blank-space drag, including touch. No horizontal-wheel navigation. |
| 3.1–3.4 Gaps, days, clock, Today/Tomorrow | Implemented, URL-addressable, with normal browser Back. Changes accumulate in the date and hole width; factual project information is never rewritten. |
| 4.1 Rotoscope | SVG tonal posterization as an illustrative stand-in for authored rotoscoping. |
| 4.2–4.3 Hold / partial reveal / mobile | A local region reveals first, then spreads; tap toggles. Small periodic mobile teaser. |
| 4.4 AI depth map | Not implemented: no source portraits or generated depth maps. Current mask is explicitly an artistic approximation. |
| 4.5 Rack focus | Blur resolves after the partial reveal, on the existing rabbit reference photographs. |

The letter interior is a CSS 3D prototype for the “o”, not a mesh extruded from every
letter in the typeface. This version proves the navigation, camera transition and
inside/outside contrast. The whole word has one entrance hit area.

## 05 — A little ahead (`/ahead.html`)

**Idea:** tomorrow is already appearing in today’s margins.

A different hierarchy and rhythm: a large offset typographic opening; “between” as
the studio’s working territory; two founders and a photographic field note; staggered
project entrances; an invitation that edits itself; the final passage to tomorrow.
Normal document scrolling throughout, with progressively disclosed details.

- The period in “ahead” opens a small marginal note after a hold, or immediately on
  click. Its invitation goes a day ahead.
- The rabbit sinks as the first screen leaves. The three ellipses between the kinds
  of work open the corresponding project, as do the larger staggered holes below.
- Inter-word spaces in the first paragraph can be crossed.
- The edge teaser, editable invitation, undo and photographic reveal share the tested
  mechanisms from 04.
- The final hole returns to the opening with tomorrow’s name/date. Back restores the
  previous day. The footer reflects the current day as well.

## Content and assets

Headlines and short framing copy are design drafts, not client-approved positioning.
The recruiting platform and its first clients are from the brief. Physical computing
and original IP are explicitly marked as areas of exploration, not invented launches.
Founder summaries are based on the existing project documents.

The two photographs are copies of the already-collected reference images in
`docs/references/board/`. They are labeled as field notes, never as founder portraits.
They are prototype reference assets, not a new claim of production image licensing.
Courier Prime and DM Sans load from Google Fonts, with local system fallbacks. The
fonts are a free prototype pairing, not a claim to reproduce Selectric Composer.

## Files and validation

Shared: `site/experiments.css`, `site/js/experiments/shared.js`.
Wall: `site/wall.html`, `site/wall.css`, `site/js/experiments/wall.js`.
Ahead: `site/ahead.html`, `site/ahead.css`, `site/js/experiments/ahead.js`.
No build step, new runtime package or modifications to the original rabbit rig.

Run the existing static server, then the browser regression:

```sh
python3 -m http.server 8000 --directory site
# In another terminal, with Playwright installed:
node tests/experiments-browser.cjs
node tests/experiments-touch.cjs
# Or point PLAYWRIGHT_MODULE at a temporary Playwright installation.
```

The script uses installed Google Chrome through Playwright. It checks project dialogs,
chapter navigation, letter-room entry/exit, rear-hole passage, date/history, edit with
undo/redo, 390px mobile layout, photo tap and reduced-motion reading. It writes review
screenshots to `/tmp`. Existing rig, clips, journey and playground tests also pass.

Manual visual review: Chrome at 1440×1000 and 390×844. Touch gestures are additionally
checked with the browser’s touch-event emulation. Real-device Safari testing remains
necessary before treating the CSS 3D experiment as production-ready.

## Second versions — simplification

`wall2.html` and `ahead2.html` preserve the original routes as references.
Wall 2 removes per-chapter scale and eased camera segments: equal-scale chapters
form one sheet, vertical travel is linear, and a small whole-sheet perspective tilt
responds to scrolling. The shrinking journey is intentionally removed in this iteration.
Ahead 2 keeps the header and interactions, with one reading axis, smaller headings,
no staggered project composition, and fewer labels and repeated entrances.
Both have isolated CSS/JS so changes do not affect the reference versions.

### Continuous transitions in version 2

Removed the full-screen aperture, opacity-to-zero and large zoom transitions from
version 2 only. Inter-word passages scroll to the next content section and advance
the date. The final hole returns along a visible scroll/camera path. The letter
interior is now a nonmodal inset; the page remains visible. Existing DOM nodes and
interaction state stay in place throughout. Original study transitions are unchanged.

### Ahead 2 — text space

All visible main-content text supports native whitespace hit-testing (without span
wrappers). A click flies through SVG vector-text foreground into a simultaneous
distant layer, then advances the date in place. Text selection and dragging do not
trigger flight. Escape/resize cancels; reduced motion changes the day without flight.
Selecting a word or paragraph scales main content to 1.15 around the selection;
clearing selection restores it. The header stays fixed. Original routes unchanged.

Wall 2 reading tilt now only responds to scrolling (maximum 0.018 radians, about
1 degree). A time-based envelope gently returns it to exactly zero at rest; there
is no permanent reading-plane tilt. Footer exploration keeps its separate camera
orientation. Original wall study unchanged.

### Wall 2 — letter interiors

The last heading now has individual CSS 3D glyph depth layers. Hover exposes their
depth; click/tap a letter or reverse-scroll over the heading to enter. The room grows
from that letter’s screen position and contains actual CSS 3D side, floor, ceiling
and rear planes with matte near-black surfaces. Copy is on the rear plane. Escape
or Back reverses the entrance. This replaces the previous inset for wall2 only;
rooms share a rectangular interior rather than font-outline-derived mesh geometry.
Validated glyph click, room rendering, keyboard exit and return in Chrome.

### Motion tuning

Ahead 2’s distant text layer starts transparent before its first rendered frame.
Opacity follows projected scale (distance), easing from zero near scale .045 to
full opacity at .365; nearby text stays opaque. No blur is applied to vector text.
Wall 2’s scrolling tilt ceiling increased from .018 to .030 radians (~1.7 degrees);
its timing, stationary zero angle and separate footer camera remain unchanged.

### Stronger wall motion and completed-selection focus

Wall 2 now caps scroll pitch at .09 radians (~5.2°), with a lower response threshold
(60px event delta). It still returns to zero. Initial camera transforms are applied
before revealing the sheet, after font readiness (bounded wait); native no-JS
reading remains available. Ahead 2 waits until pointer release and 350ms without
selection changes before zooming; pointer drag cancels pending focus. Selection
clearing restores scale immediately. Browser regression covers held selection,
release delay, initial/first-scroll scale, moving pitch and return to zero.

### Real open glyph volumes (local iteration)

Replaced the wall2 room overlay with a persistent WebGL renderer. Each glyph uses
extruded Helvetiker font contours (including counters), with front-cap triangles
removed, inward-facing matte side walls and the back cap retained. Raycasting picks
a point inside the glyph stroke. Camera position approaches that point inside the
extrusion; vector copy is geometry on its back wall. Scroll back / Escape exits.
The final heading uses Helvetiker geometry fitted to the existing heading layout;
it is not yet an outline conversion of DM Sans. Three.js and font assets are local.
Scrolling upward now reverses wall pitch. Local preview: http://localhost:8000/wall2.html.

### Cavities versus solid type — local iteration

Wall 2 uses a stencil aperture in a depth-writing white-wall plane. Only glyph
openings admit a view of the extruded interior; external surfaces are occluded.
The back wall has a localized grey emission-like shader around its vector lettering,
which becomes visible as the camera approaches. Geometry and camera remain in one scene.

Ahead 2 uses the actual local font outlines, parsed by OpenType.js, and per-character
DOM Range positions to preserve tracking. Local static OFL font instances: DM Sans
400 / optical size 14, Courier Prime Regular, a static Lora-derived italic renamed TomorrowSerif under OFL (the serif accents now
use Lora instead of system Georgia so their outlines are available consistently).
Native HTML remains the document; WebGL is a temporary presentation of its visible
text. First frame is orthographic; perspective FOV opens to 65°, then 75° as the
camera traverses solid glyphs toward flat text 2000 units behind them. The remote
text retains the atmospheric fade. Escape/resize cancels without changing the day.

Font geometry is cached in a bounded 320-glyph CPU cache and warmed in idle slices
for visible content. Only the visible viewport is batched into foreground caps,
sides and flat distant text; GPU resources are disposed after each flight. Existing
photographs/rabbit remain flat planes. Chrome desktop measurements for tested body,
italic and project sections: approximately 53–163ms preparation on first/warm paths,
82k–234k submitted triangles, tested at 1440px and 390px. These are local desktop
measurements, not a guarantee for physical mobile GPUs. Real-device profiling remains.

### One perspective for the whole wall

Scroll tilt now rotates the whole world around the document origin before camera
translation. Camera Y follows the projected reading position; accumulated Z depth
is deliberately retained. Later sections therefore continue the same converging
edges and become smaller while moving, rather than resetting their width at each
viewport. When tilt relaxes to zero, all sections recover their ordinary scale.
Reverse scroll reverses the same global angle. Footer exploration keeps its own
camera pitch. `tests/wall-sheet.cjs` verifies progressively narrower sections during
motion and recovery of normal size at rest.

## 04.15 — The wall, the rabbit keeps the hole (`/wall-menu.html`)

A copy of 04.14 (`wall-edge.html`) with another order and a tuning panel.
Script: `js/experiments/wall-menu.js`; panel: `js/experiments/wall-tune.js`; styles: `wall-menu.css`.

- The walk ends on "Tomorrow depends on what we make today". "Different worlds" is no longer on
  the wall; its content (the two founders, the field note) is the About space, without its heading.
- The rabbit and its hole stay at the foot of the window the whole way; the rabbit never goes
  down by itself. Under the pointer it leans toward the hole and floats up and down.
- Click the rabbit: it goes in, the wall steps a little back and away, and out of the hole come
  the three projects, upward, squeezed through it (the funnel of 04.11, now pointing up:
  `glw.funnel` takes a negative radius for that), and above them About and Contact.
  Scroll, Esc or a click on the hole puts them back.
- A project opens as before, by stepping back into its page; Esc or any scroll returns to the
  open menu.
- About: the camera steps back, we pass through the About content that stood behind us and it
  settles in the window. "← Back" passes through it forward and returns to the open menu.

### The tuning panel (top right)

- **Заголовки** (`--sans`) and **Текст** (`--mono`): face, weight, letter spacing, and each face's
  own axis — Areal: MONO 0–100; GT Pressura: the mono cut (a separate variable file) and width
  100–125; Publisher Rounded Sans / Slab / Mix: width 75–100; Grow A and AB are static.
- **Экран**: for each screen, and for what comes out of the hole, and for About: size, and a shift
  across and up/down from its base point, in the screen's own pixels. "Показать" brings it into view.
- Settings live in this browser (localStorage); "Скопировать настройки" copies them as JSON.
- How it reaches WebGL: a 2D canvas takes a font only by name and weight, so every setting is a new
  `@font-face` with the axes fixed in `font-variation-settings` descriptors. Canvas and CSS then draw
  the same thing.

Fonts for the web are copied into `site/assets/fonts/{pressura,publisher,grow}` (the variable files,
Publisher and Grow converted to woff2); the full trial packages stay in the repository root.
