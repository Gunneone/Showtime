// Showtime easter eggs - Celebration: Dragonfire


/**
 * Game of Thrones / House of the Dragon.
 *
 * The confetti goes up exactly as it always does - our own pieces on the
 * shared canvas, so we can get at them later. Then a dragon we never see,
 * off the left edge, breathes fire across the screen: a vendored Lottie plume
 * (see static/animations/README.md) laid on its side, and a heat front that
 * rushes out ahead of it. Every piece of confetti the front reaches flares
 * orange, chars to a coal and drops straight down like a stone.
 *
 * lottie-web and the plume are fetched on demand, the same way Avatar's are -
 * no one who never watches Westeros should have to download either.
 */
const DragonfireAnimation = {
    libraryUrl: '/static/js/vendor/lottie_light.min.js',
    animationUrl: '/static/animations/fire-element.json',

    // The confetti palette, straight from the default burst in app.js.
    colours: [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b',
        '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'
    ],

    // How long a charred piece keeps its cooling ember glow, in frames.
    emberFrames: 26,

    /**
     * Fetch the library and the plume, once. Safe to call any time and as
     * often as you like; every caller gets the same promise.
     */
    ready() {
        if (!this.readyPromise) {
            this.readyPromise = Promise.all([this.loadLibrary(), this.loadAnimation()]);
        }
        return this.readyPromise;
    },

    loadLibrary() {
        if (window.lottie) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.libraryUrl;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('lottie-web failed to load'));
            document.head.appendChild(script);
        });
    },

    loadAnimation() {
        if (this.data) return Promise.resolve(this.data);

        return fetch(this.animationUrl)
            .then(response => {
                if (!response.ok) throw new Error('fire animation failed to load');
                return response.json();
            })
            .then(data => {
                this.data = data;
                return data;
            });
    },

    /**
     * @param {Object} options
     * @param {Object} options.bounds          the running-total card's box
     * @param {number} options.intensityFactor 0-1, scales speed and count
     */
    play(options) {
        const opts = options || {};
        // Everything hangs off the running-total card, the same box every
        // celebration plays on.
        const bounds = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: window.innerWidth * 0.5 - 220,
            top: window.innerHeight * 0.22,
            width: 440,
            height: 150
        };
        const originX = bounds.left + bounds.width / 2;
        const originY = bounds.top + bounds.height / 2;
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const scale = EasterEggUtils.scale();
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Beat one: the usual confetti - a tight, mostly vertical throw kept
        // close to the card, so the fire has something to meet. Our own
        // particles, so the fire can find them again.
        const count = Math.round(44 + intensity * 24);
        const fan = 68 + intensity * 26;
        const pieces = [];
        for (let i = 0; i < count; i++) {
            const spot = (i + 0.5) / count - 0.5;
            const angle = (-90 + spot * fan + (Math.random() - 0.5) * 8) * Math.PI / 180;
            // A fairly uniform throw, so the pieces rise and fall together and
            // there is a real moment when the whole cloud is back down level
            // with the card - which is when the fire strikes.
            const speed = (3.3 + Math.random() * 1.3) * (1 + intensity * 0.3) * scale;

            pieces.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: (0.06 + intensity * 0.02) * scale,
                drift: (Math.random() - 0.5) * 0.04 * scale,
                drag: 0.992,
                rotation: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.22,
                flutter: Math.random() * Math.PI * 2,
                size: (7 + Math.random() * 5) * Math.max(scale, 0.7),
                colour: this.colours[i % this.colours.length],
                round: Math.random() < 0.4,
                charred: false,
                ember: 0,
                charLife: 0,
                smokeLen: 0,
                smokeAlpha: 0,
                ttl: 380,
                update: (p) => this.step(p, scale),
                draw: (ctx, p) => this.drawPiece(ctx, p, scale)
            });
        }
        ParticleCanvas.add(pieces);

        const charField = (base) => pieces.forEach(p => {
            setTimeout(() => this.char(p), Math.max(0, base + Math.random() * 260));
        });

        // No plume when motion is dialled down: just run the char across the
        // field, still timed to the confetti's way back down.
        if (reduce) {
            charField(760);
            return;
        }

        // Beats two and three. The confetti launches now, tops out around
        // 0.4s and is back down level with the card, still tightly bunched,
        // by roughly 0.8s - so the plume ignites just after the peak and the
        // heat front runs through the cloud right as it falls past the
        // flame's centre. Usually already loaded, the show having been
        // preloaded.
        this.ready().then(() => {
            setTimeout(() => this.breathe(bounds, scale), 450);
            setTimeout(() => this.sweep(pieces, bounds), 500);
        }).catch(error => {
            console.warn('Game of Thrones easter egg could not be played', error);
            // Still char the confetti, so the celebration lands even with no
            // flame to explain it.
            charField(700);
        });
    },

    // Move one piece for a frame - drifting confetti until the fire gets it,
    // then a dead weight falling straight down under a rising thread of smoke.
    step(p, scale) {
        if (p.charred) {
            p.vx *= 0.8;
            p.vy = Math.min(p.vy + p.gravity, 34 * scale);
            p.x += p.vx;
            p.y += p.vy;
            p.charLife += 1;
            if (p.ember > 0) p.ember -= 1;
            // The smoke thread grows for its first stretch, then holds and
            // thins as the coal drops away beneath it.
            p.smokeLen = Math.min(p.charLife * 3, 62) * Math.max(scale, 0.7);
            p.smokeAlpha = Math.max(0, 0.42 - p.charLife / 150);
            return;
        }

        p.flutter += 0.12;
        p.vx = p.vx * p.drag + p.drift + Math.sin(p.flutter) * 0.03 * scale;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
    },

    // Turn a piece of confetti to coal: it stops dead in the air, loses its
    // colour to a cooling ember, straightens up and from here on only falls.
    char(p) {
        if (p.charred) return;
        p.charred = true;
        p.ember = this.emberFrames;
        p.charLife = 0;
        p.vx *= 0.18;
        p.vy = Math.abs(p.vy) * 0.12 + 0.5;
        p.spin = 0;
        p.rotation = 0;
        p.gravity *= 4.4;
        p.drag = 1;
    },

    drawPiece(ctx, p, scale) {
        const s = p.size;

        if (!p.charred) {
            ctx.fillStyle = p.colour;
            if (p.round) {
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(-s * 0.5, -s * 0.32, s, s * 0.64);
            }
            return;
        }

        // A thread of smoke rising off the coal, drawn as a wavering column of
        // soft puffs. Charred pieces keep their rotation at zero, so straight
        // up the local axis is straight up the screen.
        if (p.smokeLen > 4 && p.smokeAlpha > 0.01) {
            const puffs = 7;
            const grip = Math.max(scale, 0.7);
            for (let k = 1; k <= puffs; k++) {
                const f = k / puffs;
                const y = -s * 0.3 - f * p.smokeLen;
                const sway = Math.sin(f * 3.6 + p.charLife * 0.16) * (1.5 + f * 6) * grip;
                const rad = (1.4 + f * 3.4) * grip;
                ctx.fillStyle = 'rgba(124, 124, 130, '
                    + (p.smokeAlpha * (1 - f * 0.85)).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(sway, y, rad, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Ember cools from a hot orange to cold charcoal over its ember frames.
        const heat = p.ember > 0 ? p.ember / this.emberFrames : 0;
        const r = Math.round(38 + 208 * heat);
        const g = Math.round(24 + 96 * heat);
        const b = Math.round(24 + 10 * heat);

        if (heat > 0) {
            ctx.shadowColor = 'rgba(255, 120, 30, ' + (0.8 * heat).toFixed(3) + ')';
            ctx.shadowBlur = s * (1 + heat * 1.8);
        }
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        const w = s * 0.92;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(-w * 0.5, -w * 0.5, w, w, s * 0.26);
            ctx.fill();
        } else {
            ctx.fillRect(-w * 0.5, -w * 0.5, w, w);
        }
        ctx.shadowBlur = 0;
    },

    /**
     * The heat front: an invisible line that races out from the card's left
     * edge through the confetti, charring every piece it reaches. Nothing is
     * drawn for it - the flame and the coals are the show.
     */
    sweep(pieces, bounds) {
        const from = bounds.left - 30;
        const span = bounds.width + 170;

        ParticleCanvas.add([{
            x: 0,
            y: 0,
            ttl: 120,
            update: (p) => {
                const t = Math.min(1, p.life / 60);
                const front = from + t * span;
                for (let i = 0; i < pieces.length; i++) {
                    if (!pieces[i].charred && pieces[i].x <= front) this.char(pieces[i]);
                }
                if (t >= 1) {
                    // Sweep anything the front raced straight past - pieces
                    // that had already flown off to the side or the top.
                    for (let i = 0; i < pieces.length; i++) this.char(pieces[i]);
                    p.life = p.ttl;
                }
            },
            draw: () => {}
        }]);
    },

    /**
     * Mount the plume: the upright Lottie flame, laid on its side by the
     * stylesheet, sized so it licks in from the left roughly level with the
     * card, held for a couple of seconds and taken away again.
     */
    breathe(bounds, scale) {
        const stale = document.querySelector('.easter-egg-dragonfire');
        if (stale) stale.remove();

        // The artwork is a tall plume: white-hot pool at the root, orange
        // tongues licking off the top. Laid on its side (a quarter turn in
        // the stylesheet) the root is the left end and the tongues stream
        // right. Size it to the card and place it so the pale root sits off
        // the left edge while the tongues reach across to the middle, where
        // the confetti is. The heat front handles anything further out.
        const reach = Math.min(bounds.width * 0.62, 680);
        // A long, fairly thin jet rather than a fat plume - keeps the pale
        // core a streak instead of a blob.
        const thickness = Math.min(
            Math.max(bounds.height * 0.95, 150),
            window.innerHeight * 0.34,
            230
        ) * (0.85 + scale * 0.15);

        const centreX = bounds.left + bounds.width * 0.5 - reach * 0.42;
        const centreY = bounds.top + bounds.height / 2;

        const host = document.createElement('div');
        host.className = 'easter-egg-dragonfire';
        host.setAttribute('aria-hidden', 'true');
        host.style.left = Math.round(centreX) + 'px';
        host.style.top = Math.round(centreY) + 'px';
        host.style.width = Math.round(thickness) + 'px';
        host.style.height = Math.round(reach) + 'px';
        document.body.appendChild(host);

        const animation = window.lottie.loadAnimation({
            container: host,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: JSON.parse(JSON.stringify(this.data))
        });
        // One play through, at the artwork's own speed: it flares up and dies
        // back down over about a second. Skip the first handful of frames -
        // they are just the pale root pooling before any tongues form.
        animation.setSpeed(1);
        animation.goToAndPlay(6, true);

        requestAnimationFrame(() => host.classList.add('is-lit'));

        let cleaned = false;
        const clean = () => {
            if (cleaned) return;
            cleaned = true;
            host.classList.remove('is-lit');
            setTimeout(() => { animation.destroy(); host.remove(); }, 450);
        };
        // Fade out as the single play finishes, with a failsafe in case the
        // complete event never lands.
        animation.addEventListener('complete', clean);
        setTimeout(clean, 3200);
    }
};
