# References — Pinterest board "Rabbit"

Board by Elisey Soloviev, 13 pins: https://pin.it/2U39nPOyn
(`pinterest.com/eliseysoloviev/rabbit`). Local copies of every pin are in
[`references/board/`](references/board/). Images are for internal reference only.

| # | File | What it is | Used for |
|---|---|---|---|
| 01 | [01-sky-rabbit-blue-red-nose.jpg](references/board/01-sky-rabbit-blue-red-nose.jpg) | White, soft, geometric leaping rabbit on a cyan field. Volumes fade into blue at their edges, a blue dot eye and a red dot nose. **Pin shared separately** (pin.it/3rdhDi6jB). | **Version 03 "Sky"** |
| 02 | [02-photo-rabbit-midair-sky.jpg](references/board/02-photo-rabbit-midair-sky.jpg) | Photo: white rabbit mid-jump against blue sky. | Pose reference (flight) |
| 03 | [03-gradient-metaball-shape.jpg](references/board/03-gradient-metaball-shape.jpg) | Abstract metaball form, gradient orange-red → pink → white, deep burgundy in the shadows. **Pin shared separately** (pin.it/5fRxpgCd0). | **Version 03 "Gradient"** colouring |
| 04 | [04-red-hare-leap-pink.png](references/board/04-red-hare-leap-pink.png) | Red/blue brush-drawn hare in full extension over a pink field. | Pose reference (extension) |
| 05 | [05-green-hare-gallop-cycle.mp4](references/board/05-green-hare-gallop-cycle.mp4) | Green silhouette hare, looping gallop cycle (video pin, 736×414, 120 fps). Frames: [05-…-frames.png](references/board/05-green-hare-gallop-frames.png). | **Main animation reference** |
| 06 | [06-line-rabbit-hop.gif](references/board/06-line-rabbit-hop.gif) | Ink-line rabbit, one hop: sit → crouch → push → flight → land. 14 frames. Frames: [06-…-frames.png](references/board/06-line-rabbit-hop-frames.png). | **Version 01 "Contour"**, animation (hop) |
| 07 | [07-soft-rabbit-moon.png](references/board/07-soft-rabbit-moon.png) | Soft-focus white rabbit silhouette under a moon, blue night. | Mood |
| 08 | [08-pixel-rabbit.png](references/board/08-pixel-rabbit.png) | 1-bit pixel rabbit, black on transparent, ~20 px tall; white pixel lines separate eye, ears, haunch, forelegs. | **Version 02 "Pixel"** |
| 09 | [09-red-hares-pattern.jpg](references/board/09-red-hares-pattern.jpg) | Pattern of red leaping hares on blue grid paper. | Mood / pose variety |
| 10 | [10-line-rabbit-grass-hop.gif](references/board/10-line-rabbit-grass-hop.gif) | Line rabbit hopping over a green patch: dive → land → sit → jump. Frames: [10-…-frames.png](references/board/10-line-rabbit-grass-hop-frames.png). | Animation (hop arc, sitting) |
| 11 | [11-photo-rabbit-leap-river.jpg](references/board/11-photo-rabbit-leap-river.jpg) | Photo: rabbit in full horizontal leap. | Pose reference |
| 12 | [12-photo-rabbit-running-grass.jpg](references/board/12-photo-rabbit-running-grass.jpg) | Photo: white rabbit from behind, running. | Pose reference |
| 13 | [13-photo-rabbit-jump-fence.jpg](references/board/13-photo-rabbit-jump-fence.jpg) | Photo: white rabbit jumping by a fence. | Pose reference |

The client's own mark (in the PDF): a line-drawn rabbit head, two tall ears, seen from the
front, looking down into a flat black elliptical hole.

## Animation breakdown — gallop (ref 05)

The cycle is 16 frames at 30 fps ≈ **0.53 s**. Hare in profile, facing right. Phase `t` is used
as-is in `site/js/rig.js` (`GALLOP`).

| t | Frames | Pose |
|---|---|---|
| 0.00 | 1–3 | **Push-off.** Hind feet planted behind the hips, legs straightening; forelegs tucked under the chest; back flattening, head forward. |
| 0.25 | 5–7 | **Extension / flight.** Longest silhouette: hind legs stretched straight back, forelegs reaching forward, back flat, ears laid back. Highest point. |
| 0.45 | 8–9 | **Fore landing.** Forelegs touch down one after the other (lead and trailing), hind legs still trailing. |
| 0.60 | 10–11 | **Fore stance.** Forelegs under the chest pushing back; hind legs swing forward under the belly; back starts to round. |
| 0.75 | 12–14 | **Gather.** Back fully rounded, hind feet pass in front of the forefeet, forelegs leave the ground backwards. Most compact silhouette. Lowest point. |
| 0.90 | 15–16 | **Hind landing.** Hind feet plant far forward; forelegs swing forward; back starts to open into the next push. |

Left/right legs are almost in phase (hind legs as a pair, forelegs slightly staggered) — a
rabbit "half-bound" rather than a horse gallop.

## Hop breakdown (refs 06 and 10)

Sit (compact, ears up) → crouch (weight back, head down) → push (hind legs straighten,
forelegs lift) → flight (stretched, ears back) → fore landing → gather → sit.
The hop is the same mechanics as the gallop, slowed down, with a sitting pose at both ends.
