# Rabbit study 01 — four rabbits, one rig

Live: `/` (main page) and `/lab.html` (rig contact sheet).
Code: [`site/js/`](../site/js/).

## The task (from the team lead)

1. Design the rabbit in several looks, because the look decides 2D vs 3D and the rig.
2. Four versions:
   - **01 Contour** — line rabbit, as in the client's mark (refs 06, 10).
   - **02 Pixel** — 1-bit pixel rabbit (ref 08).
   - **03 Soft geometric** — white geometric rabbit on blue, blue eye, red nose (ref 01);
     same body also painted with a gradient orange-red/coral → pink → white (ref 03),
     the volumes blending like metaballs so the gradient follows the form.
     Gradient applied either from the nose back or depending on the camera.
   - **04 PS1 low-poly** — optional, in the spirit of Unity8Dev v3/v4 PS1 variants.
3. Animate: a run (gallop/hop) from the reference GIFs/video (refs 05, 06, 10), applied to all four.
4. Show on one web page: 4 blocks with the model, 4 blocks with the animation.

## Decision: one 3D rig for every look

All four rabbits are the same 3D skeleton. Even the "2D" looks (contour, pixel) are rendered
from the 3D body, which is why the contour stays correct when you orbit it and why one
animation drives every version. Later the same rig can be steered on the site (turn toward
the cursor, run along a path, dive into the hole) without redrawing anything per look.

### Skeleton — `site/js/rig.js`

- 28 bones: pelvis → lumbar → thoracic → neck → head (snout, eyes, nose), two ears of two
  segments each, two forelegs (upper arm, forearm, paw), two hind legs (thigh, shin, long
  foot), tail.
- Space: x forward (the rabbit faces +x), y up, z toward the viewer; "near" side is +z.
- A pose is a flat set of channels. Body and limb channels are **world angles in the
  sagittal plane** (degrees: 0 forward, 90 up, 180 back, 270 down). Hind thigh lives in
  ~190–345, so the sit and the gallop blend without wrapping round.
- `solve(pose)` — forward kinematics, returns joint positions.
- `SHAPES` — 21 round cones on the joints (radius at each end, a group, a flatten factor
  for the ears). Groups decide what melts into what and where contour lines are drawn.

### Poses and animation

- `SIT` — sitting, head down, looking into the hole (the client's mark).
  `idlePose(t)` adds breathing, sniffing and an ear twitch.
- `GALLOP` — six keys over 0.56 s, keyed against ref 05 frame by frame
  (push-off 0.00 · extension 0.25 · fore landing 0.45 · fore stance 0.60 · gather 0.75 ·
  hind landing 0.88; table in [references.md](references.md)). Cyclic Catmull-Rom between
  keys. Far legs lag the near ones slightly (`GALLOP.far`). Keys marked `contact` have their
  height solved so those feet sit on the ground; flight keys float above (`lift`).
  `GALLOP.stride` is the distance covered per cycle when it travels.

### Renderers

| Version | File | How |
|---|---|---|
| 01 Contour | `sdf.js` (`style: 'contour'`) | Ray-marched signed distance field of the round cones, blended with a smooth minimum. Pass 1 writes a G-buffer (depth, part, light, eye/nose); pass 2 draws ink where the silhouette, a depth jump, or a part change with a depth step happens. |
| 02 Pixel | `sdf.js` (`style: 'pixel'`) | Same G-buffer at ~1/5 resolution, 1-bit: black body, white 1-px seam on the far side of every occluding edge, white eye; scaled up with `image-rendering: pixelated`. |
| 03 Sky / Gradient | `sdf.js` (`style: 'sky' \| 'gradient'`) | Same SDF shaded directly. Sky: white fading into the field colour by fresnel, blue eye, red nose. Gradient: ramp orange-red → coral → pink → white by distance from the nose (`palette 0`) or by how the surface faces the camera (`palette 1`), burgundy in the shadows. |
| 04 PS1 | `ps1.js` | Each round cone becomes a rigid 5–7-sided segment, flat faces, 32 px fur texture with nearest filtering, vertex snapping, affine texture mapping, 15-bit colour with 4×4 Bayer dither, blob shadow, low-res render scaled up. |

### Page — `site/index.html`, `site/js/main.js`

Row A: the sitting model with the hole, drag to orbit, `Rig` shows the bones.
Row B: the gallop, speed 1× / ½ / ⅕, `Across` (travels through the frame) or `In place`.
Version 03 switches between Sky / Gradient · nose / Gradient · view.
Views only render while on screen. Three.js 0.170 from jsDelivr through an import map, no build.

### Lab — `site/lab.html`

Contact sheet of the sit (4 angles) and N frames of the gallop with bones, for keying against
the reference frames: `lab.html?style=contour|pixel|sky|gradient|ps1&frames=16&rig=1&yaw=0&palette=0`.

## Next steps

- Tune proportions per look (the soft geometric one wants a rounder, chunkier body; the pixel
  one may want hand-placed eye/ear pixels on top of the render).
- More clips on the same rig: hop (refs 06/10), sit ↔ run transitions, look-at-cursor,
  dive into the hole, emerge.
- Pick one look with the client, then decide whether the site keeps the SDF renderer or the
  rabbit gets baked to a skinned mesh (glTF) for a full scene.
