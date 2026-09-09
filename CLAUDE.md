# Showtime — working notes for Claude

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

Per-show easter eggs live in `src/static/js/easter-eggs.js` (styles in
`style.css`). A definition can set a `cardClass`, a `decorator` (reaches into
the built card element), and/or a `celebration` (replaces the confetti burst;
runs on the shared `ParticleCanvas` or as plain DOM). They are meant to be
found, so they are never documented anywhere a user reads — the top-level
`README.md` least of all.

**Do not write automated tests for easter eggs.** No `tests/test_easter_eggs.py`,
no assertions on their wiring, CSS classes or animation code. String-matching
tests over this file are churn, not safety — they break on every refactor and
prove nothing about whether the effect looks right. Verify an easter egg by
running the app and watching it; leave it at that.

## Pull requests

Keep PR descriptions minimal — four sentences at most. Nobody really reads
them; the diff and the commit messages carry the detail. Don't spend effort
formatting a long PR body.
