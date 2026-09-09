#!/usr/bin/env python3
"""Regenerate `screen-crack.svg` - the impact fracture used by an on-page
animation (see ../js/easter-eggs.js).

Deterministic: the fixed seed makes re-running produce a byte-identical file.
Output is plain geometry (paths, polygons) - no filters, no raster data.

    python3 src/static/images/gen_crack.py
"""
import math
import os
import random

OUT = os.path.join(os.path.dirname(__file__), "screen-crack.svg")


def build():
    rnd = random.Random(20260909)
    w = h = 400
    ox, oy = 168, 146            # impact point, a little up-left of centre
    maxr = 300
    n = 14                       # radial cracks

    radial_ang = []
    radials = []
    forks = []
    for i in range(n):
        base = (i / n) * 2 * math.pi + rnd.uniform(-0.10, 0.10)
        radial_ang.append(base)
        reach = rnd.uniform(120, maxr)
        ang = base
        knee = rnd.uniform(0.45, 0.75)
        x1 = ox + reach * knee * math.cos(ang)
        y1 = oy + reach * knee * math.sin(ang)
        ang += rnd.uniform(-0.14, 0.14)
        x2 = x1 + reach * (1 - knee) * math.cos(ang)
        y2 = y1 + reach * (1 - knee) * math.sin(ang)
        radials.append(f'M {ox:.1f} {oy:.1f} L {x1:.1f} {y1:.1f} L {x2:.1f} {y2:.1f}')
        if rnd.random() < 0.4:
            fa = ang + rnd.choice([-1, 1]) * rnd.uniform(0.2, 0.5)
            fl = rnd.uniform(30, 80)
            forks.append(
                f'M {x1:.1f} {y1:.1f} L {x1 + fl*math.cos(fa):.1f} {y1 + fl*math.sin(fa):.1f}')

    rings = []
    for rr in (16, 30, 48, 72, 104, 146, 196, 250):
        pts = []
        for base in radial_ang:
            r = rr * rnd.uniform(0.8, 1.2)
            pts.append((ox + r * math.cos(base), oy + r * math.sin(base)))
        start = rnd.randrange(n)
        k = 0
        while k < n:
            run = rnd.randint(2, 4)
            seg = [pts[(start + k + j) % n] for j in range(min(run, n - k))]
            if len(seg) >= 2:
                d = f'M {seg[0][0]:.1f} {seg[0][1]:.1f}'
                for p in seg[1:]:
                    d += f' L {p[0]:.1f} {p[1]:.1f}'
                rings.append(d)
            k += run + rnd.randint(1, 2)

    shards = []
    for _ in range(4):
        rr = rnd.uniform(5, 15)
        poly = []
        for kk in range(rnd.randint(4, 6)):
            aa = kk / 5 * 2 * math.pi + rnd.uniform(-0.3, 0.3)
            r = rr * rnd.uniform(0.5, 1.15)
            poly.append(f'{ox + r*math.cos(aa):.1f},{oy + r*math.sin(aa):.1f}')
        shards.append(" ".join(poly))

    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}">',
        '  <title>cracked screen</title>',
        # Dark under-shadow, offset, so the crack reads on a pale poster too.
        '  <g fill="none" stroke="#050509" stroke-linecap="round" '
        'stroke-linejoin="round" opacity="0.55" transform="translate(1.5 1.5)">',
    ]
    for d in rings + forks:
        out.append(f'    <path d="{d}" stroke-width="2.2" />')
    for d in radials:
        out.append(f'    <path d="{d}" stroke-width="3.6" />')
    out.append('  </g>')
    # Bright core - the fracture catching the light.
    out.append('  <g fill="none" stroke="#eef3ff" stroke-linecap="round" '
               'stroke-linejoin="round" opacity="0.92">')
    for d in rings + forks:
        out.append(f'    <path d="{d}" stroke-width="1.1" />')
    for d in radials:
        out.append(f'    <path d="{d}" stroke-width="2" />')
    out.append('  </g>')
    out.append('  <g fill="rgba(255,255,255,0.14)" stroke="#eef3ff" '
               'stroke-width="1" stroke-opacity="0.8">')
    for poly in shards:
        out.append(f'    <polygon points="{poly}" />')
    out.append('  </g>')
    out.append('</svg>')
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    with open(OUT, "w") as f:
        f.write(build())
    print("wrote", OUT)
