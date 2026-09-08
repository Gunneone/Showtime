/**
 * Easter eggs for individual TV shows.
 *
 * An easter egg can change two things:
 *   - `cardClass`:   an extra CSS class put on the show's card in the watched
 *                    list, so a show can get its own look (see style.css).
 *   - `celebration`: the name of an animation that replaces the default
 *                    confetti burst when that show pushes the total watch
 *                    time up.
 *
 * Adding a new one means adding a definition to `definitions` and mapping the
 * TMDB show id(s) onto it in `showIds`. Everything else picks it up on its own.
 */
const EasterEggs = {
    // Easter egg definitions, keyed by name.
    definitions: {
        // Monk is famously the "other way round" detective - so is his card.
        monk: {
            cardClass: 'easter-egg-monk'
        },
        // The Dragon Ball franchise throws dragon balls instead of confetti.
        dragonball: {
            celebration: 'dragonballs'
        }
    },

    // TMDB show id -> easter egg name.
    showIds: {
        1695: 'monk',          // Monk (2002)
        12609: 'dragonball',   // Dragon Ball (1986)
        12971: 'dragonball',   // Dragon Ball Z (1989)
        61709: 'dragonball',   // Dragon Ball Z Kai (2009)
        62715: 'dragonball'    // Dragon Ball Super (2015)
    },

    /**
     * Look up the easter egg for a show, or null when the show has none.
     * Ids arrive from storage as numbers or strings, so normalise first.
     */
    forShow(showId) {
        if (showId === null || showId === undefined || showId === '') return null;
        const name = this.showIds[String(showId)];
        return name ? this.definitions[name] || null : null;
    },

    /** Extra CSS class for a show's card, or an empty string. */
    cardClass(showId) {
        const egg = this.forShow(showId);
        return (egg && egg.cardClass) || '';
    },

    /**
     * Run a show's custom celebration animation.
     * Returns true when an easter egg handled it, so the caller knows to skip
     * the default confetti.
     */
    celebrate(showId, options) {
        const egg = this.forShow(showId);
        if (!egg || !egg.celebration) return false;

        const celebration = this.celebrations[egg.celebration];
        if (typeof celebration !== 'function') return false;

        try {
            celebration.call(this, options);
            return true;
        } catch (error) {
            // A broken easter egg must never swallow the celebration - fall
            // back to the regular confetti instead.
            console.warn('Easter egg celebration failed', error);
            return false;
        }
    },

    // Celebration animations, keyed by name.
    celebrations: {
        dragonballs(options) {
            DragonBallAnimation.fire(options);
        }
    }
};

/**
 * Canvas particle animation that throws dragon balls: orange spheres with one
 * to seven red stars inside them.
 *
 * Kept independent of canvas-confetti because confetti shapes are drawn in a
 * single flat colour, and a dragon ball needs its stars in a second one.
 */
const DragonBallAnimation = {
    canvas: null,
    ctx: null,
    particles: [],
    running: false,

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
        }
        this.resizeCanvas();
        return this.canvas;
    },

    resizeCanvas() {
        if (!this.canvas) return;
        const ratio = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.canvas.width = Math.round(width * ratio);
        this.canvas.height = Math.round(height * ratio);
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    },

    /**
     * Spawn a burst of dragon balls.
     *
     * @param {Object} options
     * @param {number} options.originX        horizontal origin, 0-1 of viewport
     * @param {number} options.originY        vertical origin, 0-1 of viewport
     * @param {number} options.particleCount  number of balls to throw
     * @param {number} options.intensityFactor 0-1, scales speed and size
     */
    fire(options) {
        const opts = options || {};
        const originX = (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth;
        const originY = (opts.originY !== undefined ? opts.originY : 0.5) * window.innerHeight;
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const count = Math.max(1, Math.round(opts.particleCount || 20));

        this.ensureCanvas();

        for (let i = 0; i < count; i++) {
            // Fan the balls upwards: mostly up, some to either side.
            const angle = (-90 + (Math.random() - 0.5) * (70 + intensity * 50)) * Math.PI / 180;
            const speed = (5 + Math.random() * 5) * (1 + intensity * 0.8);
            const radius = (7 + Math.random() * 5) * (0.85 + intensity * 0.35);

            this.particles.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: radius,
                rotation: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.15,
                // Every ball is one of the seven.
                stars: 1 + Math.floor(Math.random() * 7),
                life: 0,
                ttl: Math.round(110 + intensity * 70 + Math.random() * 30)
            });
        }

        this.start();
    },

    start() {
        if (this.running) return;
        this.running = true;
        requestAnimationFrame(() => this.step());
    },

    step() {
        const ctx = this.ctx;
        if (!ctx) {
            this.running = false;
            return;
        }

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        const gravity = 0.22;
        const drag = 0.99;

        this.particles = this.particles.filter(p => {
            p.life += 1;
            p.vx *= drag;
            p.vy = p.vy * drag + gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.spin;

            // Fade out over the last third of the ball's life.
            const remaining = 1 - p.life / p.ttl;
            if (remaining <= 0 || p.y - p.radius > window.innerHeight) return false;

            ctx.save();
            ctx.globalAlpha = Math.min(1, remaining * 3);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            this.drawBall(ctx, p.radius, p.stars);
            ctx.restore();

            return true;
        });

        if (this.particles.length > 0) {
            requestAnimationFrame(() => this.step());
        } else {
            this.running = false;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    },

    // Draw one dragon ball centred on the current origin.
    drawBall(ctx, radius, stars) {
        const gradient = ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.35, radius * 0.1,
            0, 0, radius
        );
        gradient.addColorStop(0, '#ffe9a8');
        gradient.addColorStop(0.45, '#ffb43d');
        gradient.addColorStop(1, '#e07a12');

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.lineWidth = Math.max(0.5, radius * 0.08);
        ctx.strokeStyle = 'rgba(150, 75, 0, 0.55)';
        ctx.stroke();

        ctx.fillStyle = '#d61f2b';
        this.starPositions(stars).forEach(pos => {
            this.drawStar(ctx, pos.x * radius, pos.y * radius, radius * (stars > 4 ? 0.2 : 0.24));
        });
    },

    /**
     * Where the stars sit inside a ball, in units of the ball radius.
     * One star sits in the middle; from five on, one stays in the middle and
     * the rest form a ring around it.
     */
    starPositions(stars) {
        if (stars <= 1) return [{ x: 0, y: 0 }];

        const positions = [];
        const hasCentre = stars >= 5;
        const ringCount = hasCentre ? stars - 1 : stars;
        const ringRadius = hasCentre ? 0.46 : 0.36;

        if (hasCentre) positions.push({ x: 0, y: 0 });
        for (let i = 0; i < ringCount; i++) {
            const angle = (i / ringCount) * Math.PI * 2 - Math.PI / 2;
            positions.push({ x: Math.cos(angle) * ringRadius, y: Math.sin(angle) * ringRadius });
        }
        return positions;
    },

    // Classic five-pointed star.
    drawStar(ctx, cx, cy, size) {
        const points = 5;
        const inner = size * 0.42;

        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? size : inner;
            const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    }
};
