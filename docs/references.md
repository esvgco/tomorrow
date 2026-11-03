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

## Animation breakdown — the half-bound (ref 05 for timing, real rabbits for the poses)

Ref 05 is 16 frames at 30 fps ≈ **0.53 s**; the rig runs the cycle in 0.56 s. The hare in
ref 05 is stylised (long legs that sweep down through the vertical on the way forward); the
poses below follow a real rabbit instead, and the 9-frame run breakdown the team lead sent
(skeleton over a rabbit: 1 crouch → 2 push → 3 toe-off, forelegs tucked → 4 flight →
5 fore landing → 6 fore stance, hinds folding → 7 hinds rolling forward → 8 hinds reaching →
9 crouch). Phase `t` is used as-is in `site/js/rig.js` (`GALLOP`).

| t | Ref 05 fr. | Key | Pose |
|---|---|---|---|
| 0.00 | 14–16 | **Hind plant** | Back at its roundest (a C leaning forward: rump high, head low), tail tucked. Hind feet reach ahead of the body (thigh forward, shin folded back under it, foot out to the toes) and plant together. Forelegs folded up under the chest. |
| 0.09 | 1 | **Crouch** | The body passes over the planted feet and sinks on them (lowest point); the back begins to open. Forelegs still pressed to the chest. |
| 0.18 | 2 | **Launch** | Hind legs straightening under the body, hocks and toes flat on the ground; the back nearly straight, nose up. |
| 0.27 | 3 | **Toe-off** | Hind legs one straight line down-back to the toes; spine and legs almost one line. Forelegs still tucked, just starting to open. |
| 0.42 | 5–6 | **Flight** | Longest silhouette, highest point. Back a hollow arc (rump and head up), ears flat. Hind legs trail straight back; forelegs shoot forward. |
| 0.54 | 7 | **Fore reach** | Forelegs reach down ahead to land. Hind knees fold, hocks drop, feet begin to tuck. |
| 0.64 | 8–9 | **Fore plant** | Forelegs down under the chest, toes angled. Hind legs folded into a Z, feet tucked up under the belly, rolling forward close to the body. |
| 0.76 | 10–11 | **Fore stance** | Brief: the body vaults over the forelegs, they push back; back starts to round. Hind legs still folded, feet skimming forward past the forepaws. |
| 0.88 | 12–13 | **Gather** | All feet off the ground. Head forward and low, forelegs back, hind legs forward and unfolding toward the ground. The back rounds into a C leaning forward for the next plant. |

Left/right legs are almost in phase (hind legs as a pair, forelegs slightly staggered) — a
rabbit "half-bound" rather than a horse gallop. While feet are planted the body's height is
solved from the legs every frame, so the planted feet stay put (and the body rides up and
down on them, which is where the "spring" feel comes from).

Reading on the gait: the flexed-back half-bound is the usual high-speed gait of rabbits and
hares (hind feet contact together, forefeet together or slightly apart), with most of the
hip's travel coming from the spine and pelvis rather than the hip joint itself —
[Bertram & Gutmann 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC2696142/) on gallop
mechanics; [Hall et al. 2022](https://peerj.com/articles/13611) for rabbit hind-limb
stance kinematics (digitigrade: the heel lifts through the push).

## Hop breakdown (refs 06 and 10)

Sit (compact, ears up) → crouch (weight back, head down) → push (hind legs straighten,
forelegs lift) → flight (stretched, ears back) → fore landing → gather → sit.
The hop is the same mechanics as the gallop, slowed down, with a sitting pose at both ends.
