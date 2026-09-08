# Vendored fonts

Served from this origin rather than a font CDN, for the same reason the
JavaScript in `static/js/vendor` is: using Showtime should not disclose
visitors to a third party.

## DSEG14Classic-Regular.ttf

* Font: [DSEG](https://github.com/keshikan/DSEG) v0.46 by keshikan
* Licence: SIL Open Font License 1.1, reproduced verbatim in
  `DSEG-LICENSE.txt`. Reserved Font Name: "DSEG" - the file is redistributed
  unmodified, so it is free to use and redistribute, commercially included.
* Source: `https://github.com/keshikan/DSEG/releases/download/v0.46/fonts-DSEG_v046.zip`,
  file `DSEG14-Classic/DSEG14Classic-Regular.ttf`
* Retrieved: 2026-09-08
* sha256 of the font as downloaded: `0106818dd2e2c9ac9c6b5b7edbbe193df367397d48a18377a58090b00580d4e6`

The fourteen-segment variant, rather than the seven-segment one: a real LCD
splits each character into fourteen segments precisely so that letters are
legible, and a show's name is mostly letters.

Used by the easter egg that prints a show's name on a calculator display
(see `static/js/easter-eggs.js`).
