# Homepage concept 01 — `site/home.html`

Live on staging at `/home.html` (the study stays at `/` until the two are swapped).
Code: [`site/home.html`](../site/home.html), [`site/home.css`](../site/home.css),
[`site/js/home.js`](../site/js/home.js). The rabbit is the contour rabbit from the study,
drawn by the same ray-marcher (`sdf.js`), which gained a ground plane for this page.

## What the client asked for, in one line each

- 90–95 % true white; black type; the rabbit/hole mark; maybe very fine technical lines.
- The site shouldn't *look* technical, it should *behave* technically.
- A very small rabbit by the hole somewhere on the white field. Move toward it and it
  responds. Follow it and something is revealed. Enter the hole and you reach another layer.
- Projects discovered as you move, not in a grid. Different projects, different identities.
- Simple to navigate, interesting to explore. Intelligent, optimistic, curious, a little unexpected.
- The feeling: "This is incredibly simple" → "Wait, what's happening here?" → "I want to see where this goes."

## The four screens

| # | Screen | The rabbit | What happens |
|---|---|---|---|
| 01 | **The field.** Headline, one paragraph, the rabbit by the hole in the lower right. | Sits by the hole, alternating between an alert sit and looking into the hole (the study's idle loop). | Bring the cursor toward it: it notices from about a canvas-and-a-half away, sits up, turns toward you and lifts or lowers its head to where you are. Move away and it goes back to the hole. "Follow it" scrolls to screen 02. |
| 02 | **What we do.** "One studio. Different kinds of things." Companies / Products / Original IP. | Runs in from the left edge along a hairline in a half-bound, reaches a hole two thirds across, and goes down it. | The three lines of text reveal as it passes. "Again" replays. *The dive is a stand-in (the rabbit sinks nose-first below the ground plane); it will be replaced by the dive animation being made in the rig.* |
| 03 | **Projects.** Four holes on the white field, numbered, nothing else. | Appears at whichever hole the cursor approaches, sitting up, then leans in to look into it. | The hole's label appears next to it. *Later: the rabbit peeks out of the hole, looks around and dives back (animation in progress).* |
| 04 | **Say hello.** The e-mail address, large. | — | — |

Fixed top bar: the name, and three words of navigation (What we do · Projects · Contact).

## Content — what is real and what is a placeholder

From the brief and the client's direction document (the company's own site is a single
line with an e-mail address, and there is nothing public about it yet):

- A technology venture studio in the USA, combining technology, entrepreneurship and
  entertainment. Builds its own products, companies and original IP at the intersection of
  AI, physical computing and new user scenarios.
- One project in development: a recruiting platform for technology companies, with its first
  clients (per Stephen). → hole **01**.
- Contact: contact@tomorrowcompany.com.

Placeholders, to be replaced once the client names things:

- The headline "We make the things that come next." and the three "kinds" lines — our words.
- Holes **02** (physical computing), **03** (original IP), **04** ("something that doesn't fit a
  category yet") are labelled *Unannounced* / *Not yet*. They stand for the kinds of things the
  direction document says the studio makes; they are not real project names.

## How the rabbit is driven on the page (for the next animations)

`home.js` builds one `Rabbit` per scene (a canvas, an `SdfView`, a camera). Each scene has a
`frame(dt)` that composes a pose and calls `rabbit.draw(J, hole)`:

- `hero`: `mix(idlePose(t, 'auto'), idlePose(t, 'sit'), alert)` plus head/neck offsets and a
  camera yaw toward the cursor. `alert` eases toward 0/1 with the cursor distance.
- `run`: `gallopPose(phase)` with `pose.x` advancing at `GALLOP.stride / GALLOP.duration`;
  past the hole the pose is lowered below y = 0 and the ground plane hides it. Replace the
  "sink" block with the dive clip when it exists (`solve(pose, 'classic', false)` leaves the
  height to the pose).
- `holes`: `mix(idlePose(t, 'sit'), idlePose(t, 'look'), k)` at the hovered hole; the canvas
  is positioned so its own hole lands on the DOM hole. Replace with the peek-out clip.

`SdfView` options added for the page: `ground: true` (the plane y = 0 hides what's below it;
`uGround = 2` also draws a hairline along z = 0), `maxDpr` (cap for big canvases).

## Open questions for the client

- Headline and the three "kinds" lines: our draft, needs their voice.
- Real project names and one line each; which may be shown, which stay as holes.
- Whether the hole should lead somewhere (a project page, "another layer of the company").

## Motion revision

The hero no longer has the first screen's rule/index/field labels. Screen two uses
the approved dive clip after an approach on white, without a ground line; camera
yaw 10° / pitch 14° produces a slight upper-left to lower-right path. It plays
once per page load, including when the section is revisited.

Projects use ProjectView's shared orthographic ground and ProjectJourney's
continuous run → dive → peek → exit state machine. Hover, keyboard focus and tap
set the latest destination. A new target during a dive is queued until the rabbit
can emerge and leave; it never relocates the canvas to the new hole. Deliberate
reverse scale is 1.45 / 1.18 / 0.88 / 0.70 from the far upper-left to near lower-right;
rabbit scale interpolates during travel and matches the destination hole. DOM hit
areas and rendered holes use the same camera projection.

Validation: tests/home-journey.mjs plus rig, clip and both game anatomy checks;
browser checks cover the one-shot run, both extremes of project scale and all
four game styles, including switching while peeking without losing score.
