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

## fire-element.json

* Animation: [Fire Element Effect Animation](https://lottiefiles.com/free-animation/fire-element-effect-animation-PlQVDxf9IG)
  by Zoro (`roronoa_zoro`), from LottieFiles
* Licence: [Lottie Simple License](https://lottiefiles.com/page/license) - free
  to use commercially, modify and redistribute
* Source: `https://assets-v2.lottiefiles.com/a/8b882a40-116c-11ee-b23f-4f6ef2cb7229/IThUhQkvaW.json`
* Retrieved: 2026-09-09
* sha256: `e2f1e829e8b96906ace2cb5ffebce4f7035bc78147e3ba37e7ac335a77b409e2`

Unmodified. A looping upright plume of flame, 400x490 at 24fps. It is fetched
on demand and only when it is needed, the same way `avatar-elements.json` is;
`static/js/easter-eggs.js` rotates it a quarter turn so it licks in from the
side of the screen, and blends it onto the dark page with `mix-blend-mode`
rather than editing the artwork.
