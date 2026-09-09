# Vendored fonts

Served from this origin rather than a font CDN, for the same reason the
JavaScript in `static/js/vendor` is: using Showtime should not disclose
visitors to a third party.

## SevenSegment.ttf

* Font: [Seven Segment](https://www.dafont.com/seven-segment.font) by Krafti Lab
* Source: `https://dl.dafont.com/dl/?f=seven_segment`
* Retrieved: 2026-09-08
* sha256 of the font as downloaded: `3d1907073d083ffcb1c8ba0f180e011ae14a6c24ddf89bf39489fb11da1e4dae`
* Renamed from `Seven Segment.ttf`; the file itself is unmodified.

**Licence: free for personal use.** The author sells a commercial licence for
$5 (https://crmrkt.com/kjkVDo) and the download ships no licence file, so this
font is *not* covered by the MIT licence in the repository root and is not
free to redistribute for commercial use. Anyone running Showtime commercially
should buy that licence or swap the font out.

Used by an on-page rendering of a show's name on a calculator display
(see `static/js/easter-eggs.js`).
