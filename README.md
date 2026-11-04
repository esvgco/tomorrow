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
  - `references/` — local copies of the board and the PDF screenshots
- `site/` — the static site, served as is (no build)
  - `index.html` — Rabbit study 01: four rabbits, one rig
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
