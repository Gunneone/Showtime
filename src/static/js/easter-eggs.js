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
        },
        // Avatar bends the four elements, in the order of the opening titles.
        avatar: {
            celebration: 'elementBending'
        },
        // Shows whose name belongs on a seven-segment display: 24's ticking
        // clock, and the IT Crowd's basement-dwelling nerdery.
        segmentDisplay: {
            cardClass: 'easter-egg-segment-display'
        }
    },

    // TMDB show id -> easter egg name.
    showIds: {
        1695: 'monk',          // Monk (2002)
        12609: 'dragonball',   // Dragon Ball (1986)
        12971: 'dragonball',   // Dragon Ball Z (1989)
        61709: 'dragonball',   // Dragon Ball Z Kai (2009)
        62715: 'dragonball',   // Dragon Ball Super (2015)
        246: 'avatar',         // Avatar: The Last Airbender (2005)
        82452: 'avatar',       // Avatar: The Last Airbender (2024)
        1973: 'segmentDisplay',  // 24 (2001)
        2490: 'segmentDisplay'   // The IT Crowd (2006)
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
        },
        elementBending(options) {
            ElementBendingAnimation.fire(options);
        }
    }
};

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

    /** How much to shrink a desktop-sized effect for this window. */
    scale() {
        return Math.min(1, window.innerWidth / 900);
    },

    /**
     * Add particles and make sure the loop is running.
     *
     * Each particle needs `x`, `y`, `ttl` and `draw(ctx, particle)`. Optional:
     * `vx`, `vy`, `gravity`, `drag`, `rotation`, `spin`, and `update(particle)`
     * to move by something other than gravity.
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
        requestAnimationFrame(() => this.step());
    },

    step() {
        const ctx = this.ctx;
        if (!ctx) {
            this.running = false;
            return;
        }

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        this.particles = this.particles.filter(p => {
            p.life += 1;
            p.rotation += p.spin;

            if (p.update) {
                p.update(p);
            } else {
                p.vx *= p.drag;
                p.vy = p.vy * p.drag + p.gravity;
                p.x += p.vx;
                p.y += p.vy;
            }

            const remaining = 1 - p.life / p.ttl;
            if (remaining <= 0 || p.y - 60 > window.innerHeight) return false;

            ctx.save();
            // Ease in over the first few frames and out over the last third,
            // so nothing pops into or out of existence.
            ctx.globalAlpha = Math.min(1, p.life / 5, remaining * 3);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            p.draw(ctx, p);
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

    // Fisher-Yates, for animations that want their pieces in a random order.
    shuffle(values) {
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        return values;
    }
};

/**
 * Throws the seven dragon balls: orange spheres with one to seven red stars.
 *
 * Drawn by hand rather than as canvas-confetti shapes, because a confetti
 * shape is filled in a single flat colour and a dragon ball needs its stars in
 * a second one.
 */
const DragonBallAnimation = {
    /**
     * @param {Object} options
     * @param {number} options.originX         horizontal origin, 0-1 of viewport
     * @param {number} options.originY         vertical origin, 0-1 of viewport
     * @param {number} options.intensityFactor 0-1, scales speed and size
     */
    fire(options) {
        const opts = options || {};
        const originX = (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth;
        const originY = (opts.originY !== undefined ? opts.originY : 0.5) * window.innerHeight;
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const scale = ParticleCanvas.scale();

        // Spread the seven evenly across an upward fan so none of them hides
        // behind another, and shuffle which star count goes where.
        const stars = ParticleCanvas.shuffle([1, 2, 3, 4, 5, 6, 7]);
        const fan = 100 + intensity * 40;

        ParticleCanvas.add(stars.map((starCount, i) => {
            const spot = (i + 0.5) / stars.length - 0.5;
            const angle = (-90 + spot * fan + (Math.random() - 0.5) * 6) * Math.PI / 180;
            const speed = (3.4 + Math.random() * 0.8) * (1 + intensity * 0.35) * scale;

            return {
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.06 * scale,
                drag: 0.995,
                radius: 26 * (0.9 + intensity * 0.3) * Math.max(scale, 0.72),
                rotation: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.03,
                stars: starCount,
                ttl: Math.round(220 + intensity * 40),
                draw: (ctx, p) => this.drawBall(ctx, p.radius, p.stars)
            };
        }));
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

/**
 * Bends the four elements in the order of the opening titles: water, earth,
 * fire, air.
 *
 * The style is the point, and it follows the flat two-tone look of the
 * hand-drawn water splash this was modelled on: no outlines, a bold liquid
 * silhouette with a round head and a tail tapering to a point, one lighter
 * highlight streak running along its inner edge, and a scatter of loose
 * droplets around it. One `drawStroke` serves water, fire and air; the earth
 * chunks are shaded from the same three tones, so the four elements read as
 * one set however differently they move.
 */
const ElementBendingAnimation = {
    // The bending order, and how long each element waits for its turn (ms).
    order: ['water', 'earth', 'fire', 'air'],
    stagger: 620,

    /**
     * The flat body colour, a darker tone for the shaded side, and the
     * brighter core that catches the light - the three tones every cel-shaded
     * effect is built from.
     */
    palettes: {
        water: { fill: '#3fb1ef', shade: '#1b7fc4', core: '#b3e6ff' },
        earth: { fill: '#a2764f', shade: '#6b4a2c', core: '#dcc08f' },
        fire: { fill: '#ff8f34', shade: '#e0561a', core: '#ffdd6b' },
        air: { fill: '#bfe6ef', shade: '#8dbecd', core: '#ffffff' }
    },

    /**
     * @param {Object} options
     * @param {number} options.originX         horizontal origin, 0-1 of viewport
     * @param {number} options.originY         vertical origin, 0-1 of viewport
     * @param {number} options.intensityFactor 0-1, scales speed and size
     */
    fire(options) {
        const opts = options || {};
        const origin = {
            x: (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth,
            y: (opts.originY !== undefined ? opts.originY : 0.5) * window.innerHeight,
            intensity: Math.min(Math.max(opts.intensityFactor || 0, 0), 1),
            scale: ParticleCanvas.scale()
        };

        // The canvas is created up front so the first element does not have to
        // wait for it, then each element comes in on its own beat.
        ParticleCanvas.ensureCanvas();
        this.order.forEach((element, i) => {
            const build = this.elements[element];
            setTimeout(() => ParticleCanvas.add(build.call(this, origin)), i * this.stagger);
        });
    },

    /**
     * A stroke: something that leaves a trail behind it and is drawn as one
     * tapered ribbon through that trail.
     *
     * `move(particle)` places the head each frame; everything else here is the
     * bookkeeping every stroke needs. `taper: 'tail'` puts the weight at the
     * back of the stroke instead of the front.
     */
    stroke(config) {
        const particle = {
            x: config.x,
            y: config.y,
            width: config.width,
            palette: config.palette,
            taper: config.taper,
            trailLength: config.trailLength || 14,
            trail: [{ x: config.x, y: config.y }],
            ttl: config.ttl,
            draw: (ctx, p) => this.drawStroke(ctx, p)
        };

        particle.update = p => {
            config.move(p);
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > p.trailLength) p.trail.shift();
        };

        return particle;
    },

    // One builder per element, each returning that element's particles.
    elements: {
        // Water: long ribbons whipping out of the card on a curving path.
        water(origin) {
            const palette = this.palettes.water;
            const turn = Math.random() < 0.5 ? 1 : -1;

            // Loose droplets flung off the arcs, as in the reference splash.
            const droplets = this.spread(7).map(spot => {
                const angle = (-90 + (spot - 0.5) * 160) * Math.PI / 180;
                const speed = (3 + Math.random() * 2.6) * origin.scale;
                return this.droplet({
                    x: origin.x,
                    y: origin.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    gravity: 0.12 * origin.scale,
                    size: (2.5 + Math.random() * 3) * origin.scale,
                    palette: palette,
                    ttl: 100
                });
            });

            return droplets.concat(this.spread(6).map((spot, i) => {
                const state = {
                    angle: spot * Math.PI * 1.5 - Math.PI * 0.9,
                    distance: (14 + i * 9) * origin.scale,
                    speed: (2.9 + Math.random() * 0.7) * origin.scale
                };

                return this.stroke({
                    x: origin.x,
                    y: origin.y,
                    width: (7 + Math.random() * 3) * origin.scale,
                    palette: palette,
                    trailLength: 18,
                    ttl: 115,
                    move: p => {
                        // A widening arc, with the curl easing off as the
                        // stroke runs out of momentum.
                        state.angle += turn * 0.052;
                        state.distance += state.speed;
                        state.speed *= 0.994;
                        p.x = origin.x + Math.cos(state.angle) * state.distance;
                        p.y = origin.y + Math.sin(state.angle) * state.distance * 0.62
                            + Math.sin(p.life * 0.16) * 4 * origin.scale;
                    }
                });
            }));
        },

        // Earth: inked chunks thrown up out of the card, each dragging the
        // smear of dust that the same arc leaves behind it.
        earth(origin) {
            const palette = this.palettes.earth;
            const gravity = 0.23 * origin.scale;
            const drag = 0.995;
            const particles = [];

            this.spread(7).forEach((spot, i) => {
                const angle = (-90 + (spot - 0.5) * 92) * Math.PI / 180;
                const speed = (5.4 + Math.random() * 2) * origin.scale;
                const size = (13 + Math.random() * 8) * origin.scale;
                const start = {
                    x: origin.x + (spot - 0.5) * 46 * origin.scale,
                    y: origin.y + 8 * origin.scale,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed
                };

                // The smear runs the same numbers as the chunk, so it traces
                // exactly the arc the chunk is flying. It goes in first, to be
                // drawn underneath.
                const dust = { ...start };
                particles.push(this.stroke({
                    x: dust.x,
                    y: dust.y,
                    width: size * 0.5,
                    palette: palette,
                    trailLength: 10,
                    ttl: 125,
                    move: p => {
                        dust.vx *= drag;
                        dust.vy = dust.vy * drag + gravity;
                        dust.x += dust.vx;
                        dust.y += dust.vy;
                        p.x = dust.x;
                        p.y = dust.y;
                    }
                }));

                particles.push({
                    x: start.x,
                    y: start.y,
                    vx: start.vx,
                    vy: start.vy,
                    gravity: gravity,
                    drag: drag,
                    rotation: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 0.11,
                    size: size,
                    facets: 5 + (i % 3),
                    palette: palette,
                    ttl: 125,
                    draw: (ctx, p) => this.drawChunk(ctx, p)
                });
            });

            return particles;
        },

        // Fire: flames licking upwards, each one a stroke that wavers as it
        // rises and burns down to nothing.
        fire(origin) {
            const palette = this.palettes.fire;

            // Embers drifting up out of the flames.
            const embers = this.spread(5).map(spot => this.droplet({
                x: origin.x + (spot - 0.5) * 140 * origin.scale,
                y: origin.y + 18 * origin.scale,
                vx: (Math.random() - 0.5) * 1.6 * origin.scale,
                vy: -(1.6 + Math.random() * 1.4) * origin.scale,
                gravity: -0.02 * origin.scale,
                size: (2 + Math.random() * 2.4) * origin.scale,
                palette: palette,
                ttl: 85
            }));

            return embers.concat(this.spread(8).map(spot => {
                const state = {
                    rise: (2.8 + Math.random() * 1.3) * origin.scale,
                    sway: (Math.random() - 0.5) * 1.1 * origin.scale,
                    phase: Math.random() * Math.PI * 2
                };

                return this.stroke({
                    x: origin.x + (spot - 0.5) * 150 * origin.scale,
                    y: origin.y + 26 * origin.scale,
                    width: (9 + Math.random() * 5) * origin.scale,
                    palette: palette,
                    taper: 'tail',
                    trailLength: 13,
                    ttl: 95,
                    move: p => {
                        p.y -= state.rise * (1 + p.life / 70);
                        p.x += state.sway + Math.sin(p.life * 0.19 + state.phase) * 2.1 * origin.scale;
                        // Flames narrow as they climb, the way a real one does.
                        p.width *= 0.982;
                    }
                });
            }));
        },

        // Air: long thin ribbons spiralling out and away.
        air(origin) {
            const palette = this.palettes.air;
            const turn = Math.random() < 0.5 ? 1 : -1;

            return this.spread(6).map((spot, i) => {
                const state = {
                    angle: spot * Math.PI * 2,
                    distance: (20 + i * 8) * origin.scale,
                    speed: (3 + Math.random() * 0.8) * origin.scale
                };

                return this.stroke({
                    x: origin.x,
                    y: origin.y,
                    width: (4.5 + Math.random() * 2) * origin.scale,
                    palette: palette,
                    trailLength: 22,
                    ttl: 110,
                    move: p => {
                        state.angle += turn * 0.08;
                        state.distance += state.speed;
                        state.speed *= 1.012;
                        p.x = origin.x + Math.cos(state.angle) * state.distance;
                        p.y = origin.y + Math.sin(state.angle) * state.distance * 0.7;
                    }
                });
            });
        }
    },

    /** n evenly spaced values in (0, 1), for laying particles out. */
    spread(count) {
        return Array.from({ length: count }, (_, i) => (i + 0.5) / count);
    },

    /**
     * Draw a stroke's trail as one liquid shape: a round head, a body that
     * tapers to a point at the tail, and a lighter highlight streak along one
     * edge of the front half. No outline - the silhouette does that work.
     *
     * The loop has already moved the origin to the head of the stroke, so the
     * trail is drawn relative to it.
     */
    drawStroke(ctx, p) {
        const points = p.trail.map(t => ({ x: t.x - p.x, y: t.y - p.y }));
        if (points.length < 3) return;

        // A stroke that has not moved has no direction to be thick in.
        const travel = Math.hypot(
            points[0].x - points[points.length - 1].x,
            points[0].y - points[points.length - 1].y
        );
        if (travel < 2) return;

        // Water and air lead with the heavy end, the way a thrown splash does.
        // A flame is the other way round: broad at its base, pointed at the tip.
        const headHeavy = p.taper !== 'tail';

        ctx.fillStyle = p.palette.fill;
        this.ribbonPath(ctx, points, p.width, 0, headHeavy);
        ctx.fill();

        // The heavy end is a blob, not a point: this is what makes a stroke
        // read as a splash of something rather than as a swoosh.
        const heavy = headHeavy ? { x: 0, y: 0 } : points[0];
        ctx.beginPath();
        ctx.arc(heavy.x, heavy.y, p.width * (headHeavy ? 0.92 : 0.7), 0, Math.PI * 2);
        ctx.fill();

        // The highlight rides the front of the stroke, off to one side.
        const front = points.slice(Math.floor(points.length * 0.35));
        if (front.length >= 3) {
            const alpha = ctx.globalAlpha;
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = p.palette.core;
            this.ribbonPath(ctx, front, p.width * 0.34, p.width * 0.34, headHeavy);
            ctx.fill();
            ctx.globalAlpha = alpha;
        }
    },

    /**
     * Trace a ribbon around a run of points: widest at the head, tapering to
     * nothing at the tail. `offset` slides the whole ribbon sideways, which is
     * how the highlight sits on one edge instead of down the middle.
     */
    ribbonPath(ctx, points, width, offset, headHeavy) {
        const last = points.length - 1;
        const shift = offset || 0;
        const left = [];
        const right = [];

        for (let i = 0; i <= last; i++) {
            const before = points[Math.max(0, i - 1)];
            const after = points[Math.min(last, i + 1)];
            let dx = after.x - before.x;
            let dy = after.y - before.y;
            const length = Math.hypot(dx, dy) || 1;
            dx /= length;
            dy /= length;

            const along = headHeavy === false ? 1 - i / last : i / last;
            const half = width * Math.pow(along, 0.45);
            const cx = points[i].x - dy * shift;
            const cy = points[i].y + dx * shift;
            left.push({ x: cx - dy * half, y: cy + dx * half });
            right.push({ x: cx + dy * half, y: cy - dx * half });
        }

        ctx.beginPath();
        left.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
        for (let i = last; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
        ctx.closePath();
    },

    /**
     * A loose droplet: the small blobs the splash throws off. Round, flat, and
     * given the same highlight as everything else.
     */
    drawBlob(ctx, p) {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 1.15, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.palette.fill;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(-p.size * 0.28, -p.size * 0.34, p.size * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = p.palette.core;
        ctx.fill();
    },

    /**
     * A lump of rock, shaded the same flat way: the body, a darker half where
     * the light does not reach, and one lit facet on top.
     */
    drawChunk(ctx, p) {
        const size = p.size;

        const silhouette = () => {
            ctx.beginPath();
            for (let i = 0; i < p.facets; i++) {
                const angle = (i / p.facets) * Math.PI * 2;
                // Deterministic wobble, so a rock keeps its shape as it tumbles.
                const radius = size * (0.62 + 0.38 * Math.abs(Math.sin(i * 2.3 + p.facets)));
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
        };

        silhouette();
        ctx.fillStyle = p.palette.fill;
        ctx.fill();

        // Shade the lower half by clipping the darker tone to the silhouette.
        ctx.save();
        silhouette();
        ctx.clip();
        ctx.fillStyle = p.palette.shade;
        ctx.fillRect(-size, size * 0.1, size * 2, size);
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(-size * 0.42, -size * 0.22);
        ctx.lineTo(-size * 0.05, -size * 0.62);
        ctx.lineTo(size * 0.36, -size * 0.16);
        ctx.closePath();
        ctx.fillStyle = p.palette.core;
        ctx.fill();
    },

    /**
     * A droplet, ember or speck thrown loose from the main shape.
     */
    droplet(config) {
        return {
            x: config.x,
            y: config.y,
            vx: config.vx,
            vy: config.vy,
            gravity: config.gravity || 0,
            drag: config.drag === undefined ? 0.995 : config.drag,
            size: config.size,
            palette: config.palette,
            ttl: config.ttl,
            draw: (ctx, p) => this.drawBlob(ctx, p)
        };
    }
};
