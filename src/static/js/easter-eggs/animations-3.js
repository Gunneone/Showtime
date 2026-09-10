// Showtime easter eggs - Celebrations: Red Light Green Light, Portal, Alphabet Wall, Deduction


/**
 * Squid Game: circle, triangle and square rain down like ordinary confetti -
 * until a red light freezes every piece in mid-air. Green sets them falling
 * again. One cycle, timed to land inside the celebration.
 */
const RedLightGreenLightAnimation = {
    frozen: false,

    play(options) {
        const opts = options || {};
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const count = Math.round(18 + intensity * 12);
        const shapes = ['circle', 'triangle', 'square'];
        this.frozen = false;

        EasterEggUtils.fountain(options, count, (i, env) => {
            const size = (11 + Math.random() * 9) * Math.max(env.scale, 0.7);
            return {
                gravity: 0.09 * env.scale,
                spin: (Math.random() - 0.5) * 0.04,
                ttl: 340,
                size: size,
                shape: shapes[i % shapes.length],
                update: (p) => {
                    if (RedLightGreenLightAnimation.frozen) return;
                    p.vx *= p.drag;
                    p.vy = p.vy * p.drag + p.gravity;
                    p.x += p.vx;
                    p.y += p.vy;
                },
                draw: (ctx, p) => this.drawShape(ctx, p.size, p.shape)
            };
        });

        setTimeout(() => { this.frozen = true; this.flash('#c0143c'); }, 650);
        setTimeout(() => { this.frozen = false; this.flash('#1f9e57'); }, 1750);
    },

    // A brief full-screen colour wash for the light change.
    flash(colour) {
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100;opacity:0;' +
            'transition:opacity .16s ease;mix-blend-mode:multiply;background:' + colour + ';';
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '0.32'; });
        setTimeout(() => { el.style.opacity = '0'; }, 300);
        setTimeout(() => el.remove(), 650);
    },

    drawShape(ctx, size, shape) {
        ctx.strokeStyle = '#ff4d9d';
        ctx.lineWidth = Math.max(1, size * 0.28);
        ctx.lineJoin = 'round';
        if (shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.stroke();
        } else if (shape === 'square') {
            ctx.strokeRect(-size * 0.85, -size * 0.85, size * 1.7, size * 1.7);
        } else {
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.9, size * 0.7);
            ctx.lineTo(-size * 0.9, size * 0.7);
            ctx.closePath();
            ctx.stroke();
        }
    }
};

/**
 * Rick and Morty: a portal-gun portal swirls open over the card, holds, then
 * collapses - flinging a few blobs of green goo as it goes.
 *
 * The ring is a band of glowing blobs whose `update` spins them round the
 * origin while the radius eases up and back down over the particle's life.
 */
const PortalAnimation = {
    fire(options) {
        const opts = options || {};
        const cx = (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth;
        const cy = (opts.originY !== undefined ? opts.originY : 0.5) * window.innerHeight;
        const scale = Math.max(EasterEggUtils.scale(), 0.6);
        const R = 108 * scale;
        const ttl = 112;

        // One particle paints the whole vortex and sheds sparks off its rim
        // for as long as it is open.
        ParticleCanvas.add([{
            x: cx, y: cy, cx: cx, cy: cy, R: R, ttl: ttl,
            spinAngle: Math.random() * Math.PI * 2,
            update: (p) => {
                p.spinAngle += 0.3;
                const grow = PortalAnimation.envelope(p.life / p.ttl);
                if (grow > 0.35 && p.life % 2 === 0) {
                    const a = Math.random() * Math.PI * 2;
                    const rr = p.R * grow * (0.9 + Math.random() * 0.22);
                    ParticleCanvas.add([PortalAnimation.spark(
                        p.cx + Math.cos(a) * rr, p.cy + Math.sin(a) * rr * 0.92, a, scale
                    )]);
                }
            },
            draw: (ctx, p) => PortalAnimation.drawVortex(
                ctx, p.R * PortalAnimation.envelope(p.life / p.ttl), p.spinAngle
            )
        }]);

        // A little goo flung out as the portal punches open.
        const splats = [];
        for (let i = 0; i < 18; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = (2.5 + Math.random() * 4.5) * scale;
            const rad = (3 + Math.random() * 6) * scale;
            splats.push({
                x: cx, y: cy,
                vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                gravity: 0.09, drag: 0.96,
                ttl: 34 + Math.floor(Math.random() * 22),
                draw: (ctx) => {
                    ctx.fillStyle = 'rgba(150, 245, 120, 0.9)';
                    ctx.shadowColor = 'rgba(120, 240, 110, 0.9)';
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.arc(0, 0, rad, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
        ParticleCanvas.add(splats);
    },

    spark(x, y, angle, scale) {
        // Tangential flick, so sparks spiral off the rim.
        const t = angle + Math.PI / 2;
        const speed = (1.5 + Math.random() * 3) * scale;
        const rad = (1.5 + Math.random() * 2.5) * scale;
        return {
            x: x, y: y,
            vx: Math.cos(t) * speed + (Math.random() - 0.5),
            vy: Math.sin(t) * speed + (Math.random() - 0.5),
            drag: 0.94, gravity: 0.02,
            ttl: 16 + Math.floor(Math.random() * 14),
            draw: (ctx) => {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(198, 255, 130, 0.95)';
                ctx.shadowColor = 'rgba(160, 255, 110, 0.95)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, rad, 0, Math.PI * 2);
                ctx.fill();
            }
        };
    },

    drawVortex(ctx, r, spin) {
        if (r < 2) return;
        ctx.save();
        // Squashed a touch, as if the hole is seen at a slight angle.
        ctx.scale(1, 0.92);

        const rim = (rad) => {
            ctx.beginPath();
            for (let i = 0; i <= 40; i++) {
                const a = (i / 40) * Math.PI * 2;
                const wob = 1 + Math.sin(a * 6 + spin * 2) * 0.05 + Math.sin(a * 11 - spin) * 0.03;
                const x = Math.cos(a) * rad * wob;
                const y = Math.sin(a) * rad * wob;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath();
        };

        // Body: hot yellow-green core fading to a deep green rim.
        const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
        grad.addColorStop(0, 'rgba(226, 255, 158, 0.98)');
        grad.addColorStop(0.35, 'rgba(140, 240, 110, 0.95)');
        grad.addColorStop(0.75, 'rgba(46, 170, 60, 0.9)');
        grad.addColorStop(1, 'rgba(18, 92, 30, 0.12)');
        rim(r);
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(120, 240, 110, 0.9)';
        ctx.shadowBlur = r * 0.5;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Three spiral arms swept around the centre.
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let arm = 0; arm < 3; arm++) {
            ctx.beginPath();
            const base = spin + arm * (Math.PI * 2 / 3);
            for (let s = 0; s <= 30; s++) {
                const f = s / 30;
                const a = base + f * 3.2;
                const rad = r * (0.12 + f * 0.82);
                const x = Math.cos(a) * rad;
                const y = Math.sin(a) * rad;
                s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.strokeStyle = 'rgba(210, 255, 150, 0.5)';
            ctx.lineWidth = Math.max(1, r * 0.05);
            ctx.stroke();
        }

        // Flickering hot centre.
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.14 + Math.abs(Math.sin(spin * 3)) * 0.05), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(240, 255, 210, 0.95)';
        ctx.fill();

        // Crisp rim.
        ctx.globalCompositeOperation = 'source-over';
        rim(r * 0.99);
        ctx.strokeStyle = 'rgba(216, 255, 150, 0.7)';
        ctx.lineWidth = Math.max(1, r * 0.04);
        ctx.stroke();

        ctx.restore();
    },

    // 0 -> 1 -> 1 -> 0: opens over the first quarter, holds, shuts at the end.
    envelope(t) {
        if (t < 0.28) return t / 0.28;
        if (t > 0.82) return Math.max(0, (1 - t) / 0.18);
        return 1;
    }
};

/**
 * Stranger Things: Joyce's Christmas-light alphabet wall. A full A-Z painted
 * across the running-total card on a drooping wire of bulbs. A few bulbs
 * flicker first, then the word is spelt out one glowing bulb at a time, held,
 * pulsed and faded away. Pure DOM - no canvas.
 */
const AlphabetWallAnimation = {
    word: 'RUN',
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    colours: ['#ff5a5a', '#ffd23f', '#4dff6a', '#4db8ff', '#ff7ad2', '#ffa64d'],

    play(options) {
        const opts = options || {};
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Like every celebration, the wall hangs off the running-total card at
        // the top - never the individual show card, and never just pinned to
        // the viewport.
        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: window.innerWidth * 0.5 - 260, top: window.innerHeight * 0.24,
            width: 520, height: 180
        };

        const letters = this.alphabet.split('');
        const n = letters.length;

        // Everything is sized off one cell's width, so 26 bulbs and their
        // letters fit across the card however wide it is.
        const cell = b.width / n;
        const bulbW = Math.max(6, Math.min(16, cell * 0.62));
        const fontPx = Math.max(9, Math.min(20, cell * 0.82));
        const gapPx = Math.max(4, Math.round(fontPx * 0.5));
        const padY = Math.round(fontPx * 1.3);

        const wrap = document.createElement('div');
        wrap.setAttribute('aria-hidden', 'true');
        wrap.style.cssText = [
            'position:fixed', 'box-sizing:border-box', 'z-index:100',
            'left:' + Math.round(b.left) + 'px', 'top:' + Math.round(b.top) + 'px',
            'width:' + Math.round(b.width) + 'px',
            'pointer-events:none', 'padding:' + padY + 'px 4px ' + Math.round(padY * 1.2) + 'px',
            'opacity:0', 'transition:opacity .35s ease',
            'font-family:Georgia,"Times New Roman",serif',
            'background:linear-gradient(180deg,rgba(6,8,14,0.92),rgba(6,8,14,0.55) 68%,transparent)'
        ].join(';');

        // A wire that sags between every bulb.
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 1000 46');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.cssText = 'position:absolute;left:0;width:100%;top:' +
            Math.round(padY * 0.5) + 'px;height:' + Math.round(fontPx * 2) + 'px;';
        let d = 'M 0 10';
        for (let i = 0; i < n; i++) {
            const x = ((i + 0.5) / n) * 1000;
            const prevX = i === 0 ? 0 : ((i - 0.5) / n) * 1000;
            d += ' Q ' + ((prevX + x) / 2).toFixed(1) + ' 40 ' + x.toFixed(1) + ' 12';
        }
        d += ' Q 999 40 1000 10';
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(28,30,38,0.95)');
        path.setAttribute('stroke-width', '3');
        svg.appendChild(path);
        wrap.appendChild(svg);

        const row = document.createElement('div');
        row.style.cssText = 'position:relative;display:flex;justify-content:space-between;align-items:flex-end;';
        const cells = letters.map((ch, i) => {
            const cell = document.createElement('div');
            cell.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:' + gapPx + 'px;';

            const bulb = document.createElement('div');
            bulb.style.cssText = [
                'width:' + bulbW.toFixed(1) + 'px', 'height:' + (bulbW * 1.3).toFixed(1) + 'px',
                'border-radius:50% 50% 50% 50% / 60% 60% 40% 40%',
                'background:#2c2c31', 'transition:background .1s ease,box-shadow .1s ease'
            ].join(';');

            const letter = document.createElement('div');
            letter.textContent = ch;
            letter.style.cssText = [
                'font-size:' + fontPx.toFixed(1) + 'px', 'font-weight:700',
                'color:rgba(210,200,190,0.22)', 'letter-spacing:0.02em',
                'transition:color .12s ease,text-shadow .12s ease'
            ].join(';');

            cell.appendChild(bulb);
            cell.appendChild(letter);
            row.appendChild(cell);
            return { bulb: bulb, letter: letter, colour: this.colours[i % this.colours.length] };
        });
        wrap.appendChild(row);
        document.body.appendChild(wrap);
        requestAnimationFrame(() => { wrap.style.opacity = '1'; });

        const on = (c, lit, strong) => {
            c.bulb.style.background = lit ? c.colour : '#2c2c31';
            c.bulb.style.boxShadow = lit
                ? '0 0 ' + (strong ? '22px 8px ' : '12px 4px ') + c.colour
                : 'none';
            c.letter.style.color = lit ? '#fff' : 'rgba(210,200,190,0.22)';
            c.letter.style.textShadow = lit ? '0 0 16px ' + c.colour : 'none';
        };

        const at = (ch) => cells[this.alphabet.indexOf(ch)];
        const timers = [];
        const after = (ms, fn) => timers.push(setTimeout(fn, ms));
        const done = () => { timers.forEach(clearTimeout); wrap.remove(); };

        if (reduce) {
            this.word.split('').forEach(ch => on(at(ch), true, true));
            after(1900, () => { wrap.style.transition = 'opacity 1s ease'; wrap.style.opacity = '0'; });
            after(3000, done);
            return;
        }

        // 1. A few bulbs flicker first - the lights are trying to talk.
        for (let f = 0; f < 6; f++) {
            const c = cells[Math.floor(Math.random() * cells.length)];
            after(150 + f * 170, () => on(c, true));
            after(150 + f * 170 + 85, () => on(c, false));
        }

        // 2. Spell the word, one glowing bulb at a time.
        const start = 1300;
        const step = 520;
        this.word.split('').forEach((ch, i) => {
            after(start + i * step, () => on(at(ch), true, true));
        });

        // 3. Hold, pulse once, fade the wall away.
        const held = start + this.word.length * step;
        after(held + 650, () => this.word.split('').forEach(ch => on(at(ch), true)));
        after(held + 800, () => this.word.split('').forEach(ch => on(at(ch), true, true)));
        after(held + 1600, () => { wrap.style.transition = 'opacity 1.1s ease'; wrap.style.opacity = '0'; });
        after(held + 2800, done);
    }
};

/**
 * Sherlock: the show's on-screen deductions - but about the person on the
 * sofa. Like every celebration it plays on the running-total card at the top:
 * four verdicts flash up down its left and right sides, flanking the big
 * number, each sliding in as it fades. Pure DOM, clipped to that card's box.
 */
const DeductionAnimation = {
    notes: [
        'BINGE-WATCHER', 'SKIPS THE RECAP', "LIED: 'ONE MORE'", 'SUBTITLES: ON',
        'CRIED AT EPISODE SIX', 'ALREADY KNOWS THE TWIST', 'STILL IN PYJAMAS',
        'SEVENTH REWATCH', 'PAUSED TO GOOGLE AN ACTOR', 'AVOIDS ALL SPOILERS',
        'SHOULD BE ASLEEP', 'TELLS NO ONE THE ENDING', 'WATCHES AT 1.5x',
        'READ THE PLOT ON WIKIPEDIA FIRST', 'ONE EYE ON A SECOND SCREEN'
    ],

    play(options) {
        const opts = options || {};
        // The bounds handed over are the running-total card at the top - the
        // one every celebration plays on. Never the individual show card.
        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth - 260,
            top: (opts.originY !== undefined ? opts.originY : 0.28) * window.innerHeight - 90,
            width: 520, height: 180
        };

        const host = document.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText = 'position:fixed;pointer-events:none;z-index:100;overflow:hidden;left:' +
            Math.round(b.left) + 'px;top:' + Math.round(b.top) + 'px;width:' +
            Math.round(b.width) + 'px;height:' + Math.round(b.height) + 'px;';
        document.body.appendChild(host);
        this.spawn(host, () => host.remove());
    },

    // Two down each side, flanking the centred total - clear of the heading,
    // the big number and the caption. A max width per spot keeps each line in.
    spots: [
        { left: 2, top: 24, maxw: 30 },
        { left: 2, top: 58, maxw: 30 },
        { left: 68, top: 28, maxw: 30 },
        { left: 66, top: 62, maxw: 32 }
    ],

    // Drop four deductions into `host`, which clips them. `onDone` fires once
    // the last one has gone. Paced slowly enough to actually read each line.
    spawn(host, onDone) {
        const picks = EasterEggUtils.shuffle(this.notes.slice()).slice(0, 4);
        const spots = EasterEggUtils.shuffle(this.spots.slice());
        const stagger = 480;   // between one line appearing and the next
        const hold = 2600;     // how long a line stays fully readable
        let remaining = picks.length;

        picks.forEach((text, i) => {
            const spot = spots[i];
            setTimeout(() => {
                const el = document.createElement('div');
                el.textContent = text;
                el.style.cssText = [
                    'position:absolute',
                    'left:' + spot.left + '%', 'top:' + spot.top + '%',
                    'max-width:' + spot.maxw + '%',
                    'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
                    'font-family:"Courier New",monospace', 'font-size:12px',
                    'letter-spacing:0.1em', 'text-transform:uppercase',
                    'color:#eaf2f8', 'text-shadow:0 1px 6px rgba(0,0,0,0.85)',
                    'border-left:2px solid rgba(130,195,255,0.95)', 'padding-left:7px',
                    'opacity:0', 'transform:translateX(-8px)',
                    'transition:opacity .3s ease,transform .3s ease'
                ].join(';');
                host.appendChild(el);

                requestAnimationFrame(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateX(0)';
                });
                setTimeout(() => {
                    el.style.opacity = '0';
                    el.style.transform = 'translateX(6px)';
                }, hold);
                setTimeout(() => {
                    el.remove();
                    if (--remaining === 0) onDone();
                }, hold + 500);
            }, i * stagger);
        });
    }
};
