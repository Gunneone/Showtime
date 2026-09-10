// Showtime easter eggs - Celebrations: Abduction, CRT collapse, Hatch timer


/**
 * The X-Files: a saucer drops over the running-total card, opens a beam, and
 * lifts the celebration away - the pieces are pulled *up* into its belly
 * instead of falling - then blinks white and streaks off. A vendored saucer
 * SVG (see static/images/README.md) painted onto the shared particle canvas;
 * the debris is drawn by hand.
 *
 * `_ship` is shared module state: the saucer particle writes its position
 * there every frame so the debris particles know what to home in on.
 */
const AbductionAnimation = {
    ufoUrl: '/static/images/ufo.svg',
    colours: ['#8be9c4', '#5ad1ff', '#ffe27a', '#ff8db4', '#c9a7ff', '#a0f0d0'],
    _ship: null,

    /** Load the saucer, once. Same promise for every caller. */
    ready() {
        if (!this.readyPromise) {
            this.readyPromise = new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => { this.image = image; resolve(image); };
                image.onerror = () => reject(new Error('saucer failed to load'));
                image.src = this.ufoUrl;
            });
        }
        return this.readyPromise;
    },

    fire(options) {
        const opts = options || {};
        const scale = Math.max(EasterEggUtils.scale(), 0.6);
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Anchor to the running-total card (every celebration plays on it).
        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: window.innerWidth * 0.5 - 220, top: window.innerHeight * 0.24,
            width: 440, height: 160
        };
        const cardX = b.left + b.width / 2;
        const cardY = b.top + b.height / 2;

        // Saucer size, and where it hovers: above the card, clear of the very
        // top of the viewport.
        const radius = Math.min(b.width * 0.62, 260) * scale / 1.84;
        const hoverY = Math.max(radius * 0.9 + 12, b.top - radius * 0.35);

        this._ship = { x: cardX, y: hoverY, belly: radius * 0.16, open: 0 };

        // Usually already decoded, the show having been preloaded when it was
        // added; a session in which the load failed simply does nothing.
        this.ready().then(() => {
            this.launch(cardX, cardY, hoverY, radius, scale, reduce);
        }).catch((error) => {
            console.warn('X-Files easter egg could not be played', error);
        });

        this.caption(b, reduce);
    },

    launch(cardX, cardY, hoverY, radius, scale, reduce) {
        const ship = this._ship;
        const dropFrom = reduce ? hoverY : hoverY - 260 * scale;
        const ttl = reduce ? 150 : 210;
        const ease = (t) => 1 - Math.pow(1 - t, 3);

        ship.x = cardX;
        ship.y = dropFrom;

        ParticleCanvas.add([{
            x: cardX, y: dropFrom, ttl: ttl, spin: 0,
            update: (p) => {
                const t = p.life / p.ttl;
                if (reduce) {
                    ship.y = hoverY;
                    ship.open = Math.min(1, p.life / 12);
                    if (t > 0.7) ship.open = Math.max(0, (1 - t) / 0.3);
                } else if (t < 0.16) {
                    ship.y = dropFrom + (hoverY - dropFrom) * ease(t / 0.16);
                } else if (t < 0.72) {
                    ship.y = hoverY + Math.sin(p.life * 0.12) * 3 * scale;
                    ship.open = Math.min(1, (t - 0.16) / 0.09);
                } else if (t < 0.86) {
                    ship.y = hoverY - (t - 0.72) / 0.14 * 26 * scale;
                    ship.open = Math.max(0, 1 - (t - 0.72) / 0.14);
                } else {
                    // Streak away, up and to one side.
                    ship.open = 0;
                    ship.x += 5.4 * scale;
                    ship.y -= 7.2 * scale;
                }
                p.x = ship.x;
                p.y = ship.y;
            },
            draw: (ctx, p) => this.drawShip(ctx, p, radius, scale)
        }]);

        // Debris kicked up from the card, then reeled in.
        const count = reduce ? 10 : 26;
        const debris = [];
        for (let i = 0; i < count; i++) {
            const a = (-90 + (Math.random() - 0.5) * 150) * Math.PI / 180;
            const speed = (1.6 + Math.random() * 2.4) * scale;
            debris.push({
                x: cardX + (Math.random() - 0.5) * 40,
                y: cardY,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed - (reduce ? 1.1 * scale : 0),
                ttl: reduce ? 90 : 150,
                colour: this.colours[i % this.colours.length],
                len: (7 + Math.random() * 7) * scale,
                update: (p) => {
                    if (reduce) {
                        p.vy -= 0.02 * scale;
                        p.x += p.vx; p.y += p.vy;
                        p.rotation = Math.atan2(p.vy, p.vx);
                        return;
                    }
                    if (p.life > 18 && ship.open > 0.15) {
                        const tx = ship.x;
                        const ty = ship.y + ship.belly;
                        const dx = tx - p.x;
                        const dy = ty - p.y;
                        const dist = Math.hypot(dx, dy) || 1;
                        const pull = 0.5 + (p.life - 18) * 0.02;
                        p.vx += (dx / dist) * pull - p.vx * 0.06;
                        p.vy += (dy / dist) * pull - p.vy * 0.06;
                        if (dist < 18 * scale) p.life = p.ttl;
                    } else {
                        p.vy += 0.05 * scale;
                    }
                    p.x += p.vx;
                    p.y += p.vy;
                    p.rotation = Math.atan2(p.vy, p.vx);
                },
                draw: (ctx, p) => {
                    const stretch = 1 + Math.min(2.4, Math.hypot(p.vx, p.vy) * 0.16);
                    ctx.fillStyle = p.colour;
                    ctx.shadowColor = p.colour;
                    ctx.shadowBlur = 6;
                    const w = p.len * stretch;
                    const h = p.len * 0.5;
                    ctx.beginPath();
                    (ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, h / 2)
                        : ctx.rect(-w / 2, -h / 2, w, h));
                    ctx.fill();
                }
            });
        }
        ParticleCanvas.add(debris);
    },

    drawShip(ctx, p, radius, scale) {
        const ship = this._ship;
        // Beam: a translucent green cone from the belly down past the card.
        if (ship.open > 0.02) {
            const spread = radius * 1.15;
            const reach = radius * 4.2;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const pulse = 0.12 + 0.05 * Math.sin(p.life * 0.4);
            const grad = ctx.createLinearGradient(0, ship.belly, 0, ship.belly + reach);
            grad.addColorStop(0, 'rgba(150, 255, 190, ' + (pulse + 0.18) * ship.open + ')');
            grad.addColorStop(1, 'rgba(120, 240, 150, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-radius * 0.28, ship.belly);
            ctx.lineTo(radius * 0.28, ship.belly);
            ctx.lineTo(spread, ship.belly + reach);
            ctx.lineTo(-spread, ship.belly + reach);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // A blink of white just as it leaves.
        const t = p.life / p.ttl;
        if (t > 0.84 && t < 0.9) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(0, 0, radius * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.image) {
            ctx.drawImage(this.image, -radius, -radius, radius * 2, radius * 2);
        }
    },

    // "THE TRUTH IS OUT THERE", typed out under the card once the saucer is
    // hovering.
    caption(b, reduce) {
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = [
            'position:fixed', 'z-index:100', 'pointer-events:none',
            'left:' + Math.round(b.left) + 'px',
            'top:' + Math.round(b.top + b.height + 14) + 'px',
            'width:' + Math.round(b.width) + 'px',
            'text-align:center', 'font-family:"Courier New",monospace',
            'font-size:13px', 'letter-spacing:0.34em', 'text-transform:uppercase',
            'color:#9ff0c8', 'text-shadow:0 0 12px rgba(120,240,170,0.7)',
            'opacity:0', 'transition:opacity .3s ease'
        ].join(';');
        document.body.appendChild(el);

        const text = 'The truth is out there';
        const done = () => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); };

        if (reduce) {
            el.textContent = text;
            setTimeout(() => { el.style.opacity = '1'; }, 350);
            setTimeout(done, 2600);
            return;
        }

        let i = 0;
        setTimeout(() => {
            el.style.opacity = '1';
            const tick = setInterval(() => {
                el.textContent = text.slice(0, ++i);
                if (i >= text.length) clearInterval(tick);
            }, 55);
        }, 700);
        setTimeout(done, 3200);
    }
};

/**
 * Black Mirror: the celebration is the screen switching itself off. The burst
 * is replaced by an old-CRT power-down over the whole viewport - the picture
 * collapses to a bright line, the line to a dot, the dot goes out - then the
 * page comes back. This one is deliberately full-screen: the whole "screen"
 * is the black mirror, not just the card. Pure DOM, nothing on the canvas.
 */
const CrtCollapseAnimation = {
    play() {
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // A re-fire before the last one cleared: drop the old overlay.
        const stale = document.querySelector('.crt-collapse');
        if (stale) stale.remove();

        const outer = document.createElement('div');
        outer.className = 'crt-collapse';
        outer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(outer);

        if (reduce) {
            outer.style.background = '#000';
            requestAnimationFrame(() => { outer.style.opacity = '0.92'; });
            setTimeout(() => { outer.style.opacity = '0'; }, 380);
            setTimeout(() => outer.remove(), 700);
            return;
        }

        const bar = document.createElement('div');
        bar.className = 'crt-collapse-bar';
        outer.appendChild(bar);

        // 1. Snap to black with a bright line across the middle.
        outer.style.background = '#000';
        outer.style.opacity = '1';
        // 2. Line collapses horizontally to a dot.
        setTimeout(() => { bar.style.transform = 'translateY(-50%) scaleX(0.004)'; }, 110);
        // 3. Dot fades.
        setTimeout(() => { bar.style.opacity = '0'; }, 270);
        // 4. Black lifts - the page is "back".
        setTimeout(() => { outer.style.opacity = '0'; }, 520);
        setTimeout(() => outer.remove(), 850);
    }
};

/**
 * Lost: the Swan hatch. The celebration is the timer running out - the
 * split-flap counter over the running-total card falls from 108:00 to
 * 000:00, accelerating, then SYSTEM FAILURE, then resets. Pure DOM.
 */
const HatchTimerAnimation = {
    play(options) {
        const opts = options || {};
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: window.innerWidth * 0.5 - 200, top: window.innerHeight * 0.24,
            width: 400, height: 150
        };

        this.counter(b, reduce);
    },

    counter(b, reduce) {
        const glyphs = '108:00'.split('');
        const row = document.createElement('div');
        row.className = 'hatch-timer';
        row.setAttribute('aria-hidden', 'true');
        row.style.cssText = [
            'position:fixed', 'z-index:100', 'pointer-events:none',
            'left:' + Math.round(b.left + b.width / 2) + 'px',
            'top:' + Math.round(b.top + b.height / 2) + 'px',
            'transform:translate(-50%,-50%)', 'display:flex', 'gap:4px',
            'opacity:0', 'transition:opacity .4s ease'
        ].join(';');

        const cells = glyphs.map(ch => {
            const cell = document.createElement('span');
            cell.className = 'hatch-cell';
            cell.textContent = ch;
            row.appendChild(cell);
            return cell;
        });

        const caption = document.createElement('div');
        caption.className = 'hatch-caption';
        caption.textContent = '';
        row.appendChild(caption);

        document.body.appendChild(row);
        requestAnimationFrame(() => { row.style.opacity = '1'; });

        const format = (secs) => {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return String(m).padStart(3, '0') + ':' + String(s).padStart(2, '0');
        };
        const setGlyphs = (str, flip) => {
            str.split('').forEach((ch, i) => {
                if (!cells[i] || cells[i].textContent === ch) return;
                cells[i].textContent = ch;
                if (flip) {
                    cells[i].classList.remove('flip');
                    void cells[i].offsetWidth;
                    cells[i].classList.add('flip');
                }
            });
        };

        const fail = () => {
            cells.forEach(c => c.classList.add('alarm'));
            this.edgeFlash();
            caption.textContent = 'SYSTEM FAILURE';
            setTimeout(() => {
                cells.forEach(c => c.classList.remove('alarm'));
                setGlyphs('108:00', false);
                caption.textContent = '';
                row.style.opacity = '0';
            }, reduce ? 900 : 800);
            setTimeout(() => row.remove(), (reduce ? 900 : 800) + 600);
        };

        if (reduce) {
            setTimeout(() => setGlyphs('000:00', false), 700);
            setTimeout(fail, 1300);
            return;
        }

        const startSecs = 108 * 60;
        const dur = 2400;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / dur);
            const secs = Math.round(startSecs * (1 - t * t));   // accelerating
            setGlyphs(format(secs), true);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                setGlyphs('000:00', true);
                setTimeout(fail, 260);
            }
        };
        requestAnimationFrame(step);
    },

    // A brief amber pulse round the edge of the screen.
    edgeFlash() {
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = [
            'position:fixed', 'inset:0', 'pointer-events:none', 'z-index:100',
            'opacity:0', 'transition:opacity .16s ease',
            'box-shadow:inset 0 0 120px 40px rgba(255,150,40,0.75)'
        ].join(';');
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; }, 220);
        setTimeout(() => { el.style.opacity = '1'; }, 380);
        setTimeout(() => { el.style.opacity = '0'; }, 560);
        setTimeout(() => el.remove(), 900);
    }
};
