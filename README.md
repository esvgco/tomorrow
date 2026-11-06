# The Tomorrow Company — website

Website for The Tomorrow Company (technology venture studio, tomorrowcompany.com).
The rabbit and the hole are the organizing device of the site.

Staging: https://tomorrow.esvgco.workers.dev — Cloudflare Workers, auto-deployed from this repo.

## Where things are

- `docs/` — project knowledge for people and agents
  - [`brief.md`](docs/brief.md) — client, task, studio notes
  - [`website-direction.md`](docs/website-direction.md) — the client's direction PDF, transcribed
  - [`references.md`](docs/references.md) — Pinterest board, every pin catalogued, animation breakdown
  - [`rabbit-study.md`](docs/rabbit-study.md) — the rabbit rig and its four looks: how it works
  - [`homepage.md`](docs/homepage.md) — homepage concept 01: the four screens, what's real and what's placeholder
  - [`ideas-02.md`](docs/ideas-02.md) — after the first client meeting: teardown of the client's own prototype (the.tomorrowcompany.com), concept candidates, brainstorm log, creative principles, mobile-first notes. **Read this before any second-pass work.**
  - [`dormouse-and-the-coast.md`](docs/dormouse-and-the-coast.md) — background for the mood hypothesis: *What the Dormouse Said*, Whole Earth Catalog, Sea Ranch, Big Sur/Esalen, with sources; how to use it as an echo, not a style
  - [`mechanics.md`](docs/mechanics.md) — only the mechanics Elisey proposed or explicitly accepted, with what is built where
  - [`studies-02-03.md`](docs/studies-02-03.md) — the second pass: study 02 *the corridor* and study 03 *someone else is here*, built on the client's own mark; what each mechanic does and where it lives
  - [`typefaces.md`](docs/typefaces.md) — typeface candidates (typewriter mono for body, Composer proportional for accents), criteria, pairs, how to decide
  - `references/` — local copies of the board and the PDF screenshots
- `site/` — the static site, served as is (no build)
  - `index.html` — Rabbit study 01: four rabbits, one rig
  - `studies.html` — index of all studies (staging only, everything is `noindex`)
  - `corridor.html`, `someone.html` — studies 02 and 03 (`js/corridor.js`, `js/someone.js`, shared `js/mark.js`, `js/day.js`, `study.css`)
  - `home.html` — Homepage concept 01 (`home.css`, `js/home.js`); to be swapped with `index.html` later
  - `lab.html` — rig contact sheet for keying poses
  - `js/rig.js` — skeleton, poses, gallop
  - `js/sdf.js` — ray-marched rabbit (contour, pixel, sky, gradient)
  - `js/ps1.js` — PS1 low-poly rabbit

## Run locally

```bash
python3 -m http.server 8000 --directory site
# open http://localhost:8000
```

## Deploy

`wrangler.toml` serves `./site` as static assets. Cloudflare's Git integration runs
`npx wrangler deploy` on push; locally: `npx wrangler deploy`.

## New homepage studies (04–05)

- `/wall.html` — **The wall**: a spatial homepage, shrinking camera, rear and hidden
  burrows, letter interior, text rearrangement, undoable editing and tomorrow loop.
- `/ahead.html` — **A little ahead**: an editorial homepage with entrances in the
  punctuation, project holes, photographic reveals and interventions in the copy.
- `/studies.html` — comparison index, including all previous studies.

Behavior, coverage and prototype limits: [studies-04-05.md](docs/studies-04-05.md).

## Easter egg preview (separate deployment)

Branch: `easter-eggs`. Prototype: `/easter-letters.html`; notes: `docs/easter-eggs.md`.
Deploy independently of the main site with:

```bash
npx wrangler deploy --config wrangler.easter-eggs.toml
```

This publishes the separate `tomorrow-easter-eggs` Worker and does not update `tomorrow`.
