# Images

`favicon.ico`, `favicon.svg`, `no-poster.png`, `donut.svg`, `ufo.svg`,
`bagua.svg` and `screen-crack.svg` are Showtime's own, released under the
repository's MIT licence. The last four are original flat-style drawings used
by on-page animations (see `static/js/easter-eggs.js`):

* `donut.svg` - a pink sprinkled donut.
* `ufo.svg` - a flying saucer with a glassy dome and running lights.
* `bagua.svg` - an octagon ringed by the eight I Ching trigrams.
* `screen-crack.svg` - an impact fracture, drawn as radial cracks with a
  broken concentric web (`src/static/images/gen_crack.py` is the generator;
  re-running it with the same seed reproduces the file byte for byte).

They are simple geometric shapes, quick to draw well by hand, so no
third-party asset was needed. Anything more elaborate should be a
suitably-licensed asset from the internet, vendored here - not hand-drawn.

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
