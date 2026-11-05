# Rabbit Field — /play.html

A standalone third-person playground using the approved soft rabbit. Existing
home.html, the study page, shared rig and renderers are unchanged by this feature.

- WASD / arrows: camera-relative movement, acceleration and facing.
- Click/tap ground: direct travel to a destination (no obstacles/pathfinding).
- Mobile directional pad; help pauses the simulation; Start over resets score.
- Nearby burrow: existing head-first dive, one point, automatic waist-high reveal.
- The rabbit waits in the burrow and looks around until another movement command.
- Movement then plays a new hop-out, lands outside the trigger and resumes control.
- A visited burrow rearms after moving clear; the field is bounded to ±10 units.

Files are isolated in site/play.html, site/play.css and site/js/play/:
state.js is the testable controller, motion.js composes existing rig/clip poses,
view.js composites the SDF rabbit over a Three.js world with shared depth, and
main.js supplies the scene, camera, input and UI. There is no backend or new build.
The renderer uses the existing CDN import of Three.js 0.170.

Check: node tests/play.mjs, node tests/rig.mjs, node tests/clips.mjs.
Browser verification: click-to-burrow, score, indefinite peek, keyboard exit,
resumed movement, restart, console. Existing homepage/studies retain their routes.

Deployment uses the repository's existing GitHub → Cloudflare Workers integration.
No hosting configuration, homepage source, or production secrets are changed.

## Style selection and site typography

The style controls switch Contour / Pixel / Soft geometric / PS1 without resetting
position, score or the active burrow clip. Motion selects classic versus soft
anatomy; the PS1 meshes share the world's depth buffer, and contour/pixel SDF
passes composite over the world texture. Render contexts are released on switch.
Header logo alignment and Geist/Geist Mono typography follow home.css; the existing
Burrows found block keeps its original type, size and placement.
