# Vendored third-party JavaScript

Served from this origin rather than a CDN so that using Showtime does not
disclose visitors to a third party. Update by re-downloading the same file and
re-checking the version below.

## lottie_light.min.js

* Library: [lottie-web](https://github.com/airbnb/lottie-web) 5.13.0 (MIT licence)
* Source: `https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.13.0/lottie_light.min.js`
* Retrieved: 2026-09-08
* sha256 of the file as downloaded: `9588432bec30c8ef8200bac4a67d8aaad881047bc2a6c9fa624d90ec96402410`

The `light` build: the SVG renderer without expression support, which the
animation in `static/animations` does not use. Loaded on demand by the Avatar
easter egg rather than by every page, since it is 164KB.

## confetti.browser.min.js

* Library: [canvas-confetti](https://github.com/catdad/canvas-confetti) 1.9.2 (ISC licence)
* Source: `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js`
* Retrieved: 2026-08-22
* sha256 of the file as downloaded: `e888ffb2080774361d6731d80aa5ae5d3f1265633b0bb32cc73c15dca97ae34e`

The trailing `//# sourceMappingURL=` comment was removed: the source map is not
vendored, and the relative path would resolve against this server and 404.
