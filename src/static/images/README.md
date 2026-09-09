# Images

`favicon.ico`, `favicon.svg`, `no-poster.png`, `donut.svg` and `ufo.svg` are
Showtime's own, released under the repository's MIT licence. The last two are
original flat-style drawings used by on-page animations (see
`static/js/easter-eggs.js`):

* `donut.svg` - a pink sprinkled donut.
* `ufo.svg` - a flying saucer with a glassy dome and running lights.

They are simple geometric shapes, quick to draw well by hand, so no
third-party asset was needed. Anything more elaborate should be a
suitably-licensed asset from the internet, vendored here - not hand-drawn.

## pokeball.png, pokeball-super.png, pokeball-hyper.png, pokeball-master.png

Four flat ball icons (Poké / Great / Ultra / Master), used by an on-page
animation (see `static/js/easter-eggs.js`).

* Source: cropped from a "Pokeball Icons" sprite sheet supplied by the
  repository owner (originally from DeviantArt; no artist or licence was
  recorded with it).
* Modified: each ball cut out, padded to a square canvas, and its coloured
  regions re-mapped to Showtime's palette (`#e7402e` red, `#357fc4` blue,
  `#34343c` + `#f4c21c` charcoal/gold, `#7a4bb0` + `#d94ba6` purple/pink).
  The black outline, white base, band and button are unchanged.

> **Licence unverified.** The originating artwork has no known licence. If a
> clear provenance or a permissive licence cannot be established, replace
> these with a public-domain / CC0 set or an in-house drawing, per the asset
> policy in the top-level `CLAUDE.md`.

## soccerball.svg

* Image: [Soccerball.svg](https://commons.wikimedia.org/wiki/File:Soccerball.svg)
  from the Open Clip Art Library, via Wikimedia Commons
* Licence: public domain
  ([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.en)) - the
  Open Clip Art Library released it explicitly into the public domain
* Source: `https://upload.wikimedia.org/wikipedia/commons/d/d3/Soccerball.svg`
* Retrieved: 2026-09-08
* sha256 of the file as downloaded: `0405cfe3c75353882ffeecdbd4c8514bba49954482109c5f06f760d6a93b70e7`

Unmodified, and served from this origin rather than hotlinked, for the same
reason the JavaScript in `static/js/vendor` is: using Showtime should not
disclose visitors to a third party. Used by an on-page animation (see
`static/js/easter-eggs.js`).
