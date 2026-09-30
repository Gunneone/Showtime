# Showtime — working notes for Claude

## Project map

Watch history lives in the browser (`localStorage`); the server keeps no user
state. Source files are kept under ~500 lines — grep for a symbol, read the one
module it lands in.

- `routes/api/` — the `/api` blueprint, one module per resource: `search.py`
  (search, typo fallback, recommendations, on-demand seasons), `watched.py`
  (watched-list CRUD), `calculate.py` (watch-time / stats recompute),
  `refresh.py` (season-count refresh). `helpers.py` has the shared limits,
  request parsing and service factories.
- `services/tmdb_service.py` — TMDB client; `tmdb_mock.py` offline fixtures,
  `tmdb_search.py` pure typo-fallback / released-season helpers.
- `services/metrics_service.py` — aggregate usage counters (`metrics_schema.py`
  is its DDL). The other `services/*` files are one job each, named for it.
- `js/storage.js` — `localStorage` wrapper. `js/app/` — the `App` object:
  `core.js` (state, init, events) plus feature modules that `Object.assign`
  onto it (`search`, `search-results`, `watched`, `watched-list`,
  `season-editing`, `ui`, `data-io`). `js/stats/` builds `StatsApp` the same way.
- `css/` — numbered partials in cascade order (`01-…` … `13-…`).

No bundler: a new JS or CSS module needs a `<script>` / `<link>` in `base.html`,
which lists them all in load order.

## Design system

Showtime is part of the gunne.one family. **Read `DESIGN.md` before touching
templates, CSS or markup-building JS.** Its "Shared vs. your own" section is the
line to hold: the shared header and footer, page background, `--g1-*` colour tokens
(light and dark), Plex fonts and Tabler icons are fixed; the rest is Showtime's own.

What Showtime takes from gunne.one beyond that, and what it keeps (decided with
the owner; don't drift either way without asking):

- **Same as gunne.one:** buttons are `g1-btn` with gunne.one roles (data buttons
  and Share are default, Remove all is a default button with danger-coloured text and edge, never a ghost, blue
  `--primary` only for a view's one main action; Done/Add/Load more are
  `g1-btn--sm`). Toasts are flat like `g1-callout`. Inline links use gunne.css's
  default style. Award titles are `g1-badge g1-badge--primary`.
- **Showtime's own:** rounded cards with soft shadows and a blue-tinted border
  (never chamfered), rounded search box and select, the rounded season strip,
  pick toggle and × button, big numbers as they are (no mono labels, no
  `g1-stats`), no eyebrows, rounded blue chart bars, and only a few scribbles.
  Highlights are blue (the palette in `css/01-base.css` maps onto the tokens);
  no red. The mark (`brand/showtime-mark-v2.svg` in the gunne.one repo) is a
  blue TV with orange clock hands.

`gunne.css` and `theme.js` are linked from `G1_DS_URL` (default
`https://gunne.one/ds/v1`). Locally, `.env` points it at the homepage: its
container (`http://localhost:8088/ds/v1`) or its dev server (port 5001);
`docker-compose.yml` passes it through to the Showtime container. Icons come from
the app's own sprite `src/static/images/icons.svg` (the `icon()` macro in
templates, `App.icon()` in JS).

## The top-level README

`README.md` must **never** mention the easter eggs, and must **never** carry
third-party asset attribution or licensing. Keep both out of it entirely.

## Third-party assets and libraries

When the user refers to "an existing animation", "a library from the internet",
"a nice icon/SVG/font", "find one online", or similar, they always mean:
**search for a suitably-licensed one, download it, and vendor it into this
repository** — never hotlink it.

**Prefer a real, existing asset over a self-drawn one.** When an easter egg (or
anything else) needs a graphic, icon, animation or illustration, first go
looking for a well-made, suitably-licensed one on the internet and vendor it.
Only draw or hand-code it yourself when doing it *well* is genuinely quick — a
few geometric paths, a simple shape. A rough hand-drawn graphic is not an
acceptable stand-in for a good one that already exists online.

- Assets go under `src/static/` (`images/`, `animations/`, `fonts/`,
  `js/vendor/`, …).
- Record where it came from and its licence in the `README.md` inside that
  asset folder (e.g. `src/static/images/README.md`) or in a comment in the
  source file — source URL, licence, retrieval date, sha256 when useful. Do
  **not** name the easter egg it is used for; keep the provenance note generic.
- Prefer public-domain / CC0, then permissive licences (CC-BY with attribution,
  MIT, the Lottie "Simple License", etc.). Note any attribution requirement in
  that asset-folder README.
- Hotlinking is also blocked at runtime: the Content-Security-Policy only allows
  a short list of script/style CDNs and nothing else, so external images,
  media, fonts and fetches will silently fail. Vendoring is the only option.

## Easter eggs

Per-show easter eggs live in `src/static/js/easter-eggs/` — `core.js` holds the
registry and per-show dispatch, `particle-canvas.js` the shared canvas, and
`animations/<name>.js` one celebration object each. Styles are in
`src/static/css/05-easter-eggs.css`. A definition can set a `cardClass`, a
`decorator` (reaches into the built card element), and/or a `celebration`
(replaces the confetti burst; runs on the shared `ParticleCanvas` or as plain
DOM). They are meant to be found, so they are never documented anywhere a user
reads — the top-level `README.md` least of all.

**Do not write automated tests for easter eggs.** No `tests/test_easter_eggs.py`,
no assertions on their wiring, CSS classes or animation code. String-matching
tests over these files are churn, not safety — they break on every refactor and
prove nothing about whether the effect looks right. Verify an easter egg by
running the app and watching it; leave it at that.

## Pull requests

Keep PR descriptions minimal — four sentences at most. Nobody really reads
them; the diff and the commit messages carry the detail. Don't spend effort
formatting a long PR body.
