# Vendored animations

Served from this origin rather than a CDN, for the same reason the JavaScript
in `../js/vendor` is: using Showtime should not disclose visitors to a third
party.

## avatar-elements.json

* Animation: [avatar elements](https://lottiefiles.com/free-animation/avatar-elements-M9LlOxsckM)
  by iconnut, from LottieFiles
* Licence: [Lottie Simple License](https://lottiefiles.com/page/license) - free
  to use commercially, modify and redistribute
* Source: `https://assets-v2.lottiefiles.com/a/a1a6b294-d311-11ee-93b6-abf0babd0c44/NeiII8xOoa.lottie`,
  the animation JSON unpacked from that dotLottie archive
* Retrieved: 2026-09-08
* sha256 of the file as unpacked: `65f03477552d06e664ffa2b1e6f2db1d7314a24054dc0451d2005bcd12d25ea4`

Unmodified. The source plays water, earth, fire and air one after another in
the same place over about eight seconds; `static/js/easter-eggs.js` plays each
of the four as its own segment, in its own spot, in three seconds. The earth
emblem is drawn in a green too dark for a dark page, and is lifted with a CSS
filter rather than by editing this file.
