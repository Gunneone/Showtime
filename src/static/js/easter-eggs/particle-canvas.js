// Showtime easter eggs - Shared requestAnimationFrame particle canvas for celebrations


/**
 * A full-screen overlay canvas and the animation loop that drives it, shared
 * by every celebration animation below.
 *
 * Particles are plain objects. They move ballistically by default, and carry
 * their own `draw`, so one loop can push dragon balls and flames around at the
 * same time. Sizes and speeds are expressed against a desktop-sized window and
 * scaled by `scale()`, so an animation looks the same on a phone instead of
 * shooting off the sides.
 */
const ParticleCanvas = {
    canvas: null,
    ctx: null,
    particles: [],
    running: false,
    // Viewport size the canvas bitmap was last built for, see resizeCanvas
    sizedFor: null,
    // Timestamp of the previous frame, so motion can be scaled by how long
    // that frame actually took rather than assuming a steady 60fps.
    lastFrame: 0,
    // Playback multiplier for the plain ballistic celebrations - the "throw"
    // effects (dragon balls, Poké Balls, footballs, donuts, umbrellas, blue
    // sky, party pills). Their whole arc and lifetime run this much faster, so
    // the burst plays out in ~1/throwSpeed of its natural time (2.22 -> ~45%).
    // Custom movers (portal, Squid Game, dragonfire) are timed against their
    // own clocks and are left alone.
    throwSpeed: 2.22,

    // Ensure the overlay canvas exists and matches the viewport.
    ensureCanvas() {
        if (!this.canvas) {
            const canvas = document.createElement('canvas');
            canvas.className = 'easter-egg-canvas';
            canvas.setAttribute('aria-hidden', 'true');
            document.body.appendChild(canvas);
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            window.addEventListener('resize', () => this.resizeCanvas());
            // The keyboard sliding away does not always fire a window resize
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', () => this.resizeCanvas());
            }
        }
        this.resizeCanvas();
        return this.canvas;
    },

    resizeCanvas() {
        if (!this.canvas) return;
        // The canvas is fixed at 100% x 100%, so its coordinate space is the
        // layout viewport - not the visual one, which the keyboard shrinks.
        const ratio = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Assigning canvas.width wipes the bitmap and resets the transform, and
        // iOS fires visualViewport resizes all through the keyboard animation.
        // Nothing to do unless the size really changed, or a burst in flight
        // would strobe.
        if (this.sizedFor === `${width}x${height}@${ratio}`) return;
        this.sizedFor = `${width}x${height}@${ratio}`;
        this.canvas.width = Math.round(width * ratio);
        this.canvas.height = Math.round(height * ratio);
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    },

    /**
     * Add particles and make sure the loop is running.
     *
     * Each particle needs `x`, `y`, `ttl` and `draw(ctx, particle)`. Optional:
     * `vx`, `vy`, `gravity`, `drag`, `rotation`, `spin`, and
     * `update(particle, dt)` to move by something other than gravity. `ttl`,
     * speeds and gravity are all in units of 60fps frames; the loop scales
     * them by `dt` so the effect runs at the same wall-clock speed whatever
     * the real frame rate.
     */
    add(particles) {
        this.ensureCanvas();
        particles.forEach(p => {
            p.vx = p.vx || 0;
            p.vy = p.vy || 0;
            p.gravity = p.gravity || 0;
            p.drag = p.drag === undefined ? 1 : p.drag;
            p.rotation = p.rotation || 0;
            p.spin = p.spin || 0;
            p.life = 0;
            this.particles.push(p);
        });
        this.start();
    },

    start() {
        if (this.running) return;
        this.running = true;
        this.lastFrame = 0;
        requestAnimationFrame((now) => this.step(now));
    },

    step(now) {
        const ctx = this.ctx;
        if (!ctx) {
            this.running = false;
            return;
        }

        // How many 60fps frames' worth of time this frame covered. Clamped so
        // a long stall (a background tab, a GC pause) can't fling everything
        // off-screen in one jump - past that point the effect just slows down,
        // which beats particles teleporting.
        const frame = 1000 / 60;
        const dt = this.lastFrame
            ? Math.min(Math.max((now - this.lastFrame) / frame, 0.1), 3)
            : 1;
        this.lastFrame = now;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // Walk a snapshot and rebuild the list. A particle whose `update`
        // emits more particles - a fire trail, a spray of goo - then adds
        // them to the live array instead of to a copy that a filter would
        // throw away when it reassigns `this.particles`.
        const current = this.particles;
        this.particles = [];

        for (let i = 0; i < current.length; i++) {
            const p = current[i];

            if (p.update) {
                // Custom movers keep counting in whole frames - their own
                // logic (spark cadence, freeze windows) is written that way.
                p.life += 1;
                p.rotation += p.spin;
                p.update(p, dt);
            } else {
                // Ballistic "throw" celebration: fast-forward its whole arc
                // and lifetime by throwSpeed, trajectory shape unchanged.
                const sdt = dt * this.throwSpeed;
                p.life += sdt;
                p.rotation += p.spin * sdt;
                const decay = Math.pow(p.drag, sdt);
                p.vx *= decay;
                p.vy = p.vy * decay + p.gravity * sdt;
                p.x += p.vx * sdt;
                p.y += p.vy * sdt;
            }

            const remaining = 1 - p.life / p.ttl;
            if (remaining <= 0 || p.y - 60 > window.innerHeight) continue;

            ctx.save();
            // Ease in over the first few frames and out over the last third,
            // so nothing pops into or out of existence.
            ctx.globalAlpha = Math.min(1, p.life / 5, remaining * 3);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            p.draw(ctx, p);
            ctx.restore();

            this.particles.push(p);
        }

        if (this.particles.length > 0) {
            requestAnimationFrame((next) => this.step(next));
        } else {
            this.running = false;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }
};
