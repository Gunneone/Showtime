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
        82452: 'avatar'        // Avatar: The Last Airbender (2024)
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
 * fire, air. Each element gets its own burst and its own way of moving -
 * water swirls, earth erupts and tumbles back down, fire rises and flickers,
 * air spirals outwards and away.
 */
const ElementBendingAnimation = {
    // The bending order, and how long each element waits for its turn (ms).
    order: ['water', 'earth', 'fire', 'air'],
    stagger: 620,

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

    // One builder per element, each returning that element's particles.
    elements: {
        // Water: droplets swirling around the origin on a widening ellipse.
        water(origin) {
            const size = 9 * origin.scale;
            const direction = Math.random() < 0.5 ? 1 : -1;

            return this.spread(14).map((spot, i) => {
                const particle = {
                    x: origin.x,
                    y: origin.y,
                    angle: spot * Math.PI * 1.6 - Math.PI / 2,
                    // Each droplet starts a little further out than the last,
                    // so the stream trails behind its head in a spiral.
                    distance: (12 + i * 5) * origin.scale,
                    swirl: direction * (0.055 + Math.random() * 0.02),
                    speed: (1.5 + Math.random() * 0.9) * origin.scale,
                    size: size * (0.7 + Math.random() * 0.6),
                    ttl: 105,
                    colour: ['#81d4fa', '#4fc3f7', '#29b6f6'][i % 3],
                    draw: (ctx, p) => this.drawDroplet(ctx, p)
                };

                particle.update = p => {
                    p.angle += p.swirl;
                    p.distance += p.speed;
                    // A little bob, so the stream ripples rather than sliding.
                    const bob = Math.sin(p.life * 0.18) * 5 * origin.scale;
                    p.x = origin.x + Math.cos(p.angle) * p.distance;
                    p.y = origin.y + Math.sin(p.angle) * p.distance * 0.62 + bob;
                    p.rotation = p.angle + Math.PI / 2;
                };

                return particle;
            });
        },

        // Earth: chunky rocks thrown up out of the card and tumbling back down.
        earth(origin) {
            const size = 13 * origin.scale;

            return this.spread(10).map(spot => {
                const angle = (-90 + (spot - 0.5) * 96) * Math.PI / 180;
                const speed = (5.5 + Math.random() * 2.2) * origin.scale;

                return {
                    x: origin.x + (spot - 0.5) * 40 * origin.scale,
                    y: origin.y + 10 * origin.scale,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    gravity: 0.24 * origin.scale,
                    drag: 0.995,
                    rotation: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 0.12,
                    size: size * (0.7 + Math.random() * 0.7),
                    facets: 5 + Math.floor(Math.random() * 3),
                    ttl: 120,
                    draw: (ctx, p) => this.drawRock(ctx, p)
                };
            });
        },

        // Fire: flames rising from a low, wide band, flickering as they go.
        fire(origin) {
            const size = 13 * origin.scale;

            return this.spread(13).map(spot => {
                const particle = {
                    x: origin.x + (spot - 0.5) * 150 * origin.scale,
                    y: origin.y + 24 * origin.scale,
                    rise: (2.4 + Math.random() * 1.4) * origin.scale,
                    sway: (Math.random() - 0.5) * 1.2 * origin.scale,
                    phase: Math.random() * Math.PI * 2,
                    size: size * (0.65 + Math.random() * 0.7),
                    ttl: 95,
                    draw: (ctx, p) => this.drawFlame(ctx, p)
                };

                particle.update = p => {
                    // Flames pick up speed as they rise and taper as they go out.
                    p.y -= p.rise * (1 + p.life / 60);
                    p.x += p.sway + Math.sin(p.life * 0.22 + p.phase) * 0.9 * origin.scale;
                    p.size *= 0.985;
                };

                return particle;
            });
        },

        // Air: pale crescents spiralling outwards and away.
        air(origin) {
            const size = 17 * origin.scale;
            const direction = Math.random() < 0.5 ? 1 : -1;

            return this.spread(12).map((spot, i) => {
                const particle = {
                    x: origin.x,
                    y: origin.y,
                    angle: spot * Math.PI * 2,
                    distance: (18 + i * 7) * origin.scale,
                    swirl: direction * 0.075,
                    speed: (2.6 + Math.random() * 1.3) * origin.scale,
                    size: size * (0.7 + Math.random() * 0.6),
                    ttl: 110,
                    draw: (ctx, p) => this.drawGust(ctx, p)
                };

                particle.update = p => {
                    p.angle += p.swirl;
                    p.distance += p.speed;
                    p.speed *= 1.012;
                    p.x = origin.x + Math.cos(p.angle) * p.distance;
                    p.y = origin.y + Math.sin(p.angle) * p.distance * 0.7;
                    p.rotation = p.angle + Math.PI / 2;
                };

                return particle;
            });
        }
    },

    /** n evenly spaced values in (0, 1), for laying particles out. */
    spread(count) {
        return Array.from({ length: count }, (_, i) => (i + 0.5) / count);
    },

    // A rounded teardrop, point first, with a highlight.
    drawDroplet(ctx, p) {
        const size = p.size;

        ctx.beginPath();
        ctx.moveTo(0, -size * 1.7);
        ctx.bezierCurveTo(size, -size * 0.5, size, size * 0.6, 0, size);
        ctx.bezierCurveTo(-size, size * 0.6, -size, -size * 0.5, 0, -size * 1.7);
        ctx.fillStyle = p.colour;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(-size * 0.3, size * 0.05, size * 0.22, size * 0.34, -0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fill();
    },

    // A lumpy little boulder with a lighter top face.
    drawRock(ctx, p) {
        const size = p.size;

        ctx.beginPath();
        for (let i = 0; i < p.facets; i++) {
            const angle = (i / p.facets) * Math.PI * 2;
            // Deterministic wobble, so a rock keeps its shape as it tumbles.
            const radius = size * (0.78 + 0.22 * Math.abs(Math.sin(i * 2.3 + p.facets)));
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fillStyle = '#a1887f';
        ctx.fill();
        ctx.lineWidth = Math.max(0.5, size * 0.1);
        ctx.strokeStyle = '#6d4c41';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-size * 0.45, -size * 0.2);
        ctx.lineTo(0, -size * 0.62);
        ctx.lineTo(size * 0.4, -size * 0.18);
        ctx.closePath();
        ctx.fillStyle = 'rgba(215, 204, 200, 0.5)';
        ctx.fill();
    },

    // A flame: an outer teardrop pointing up with a brighter core inside it.
    drawFlame(ctx, p) {
        const size = p.size;

        const flame = (height, width, colour) => {
            ctx.beginPath();
            ctx.moveTo(0, -height);
            ctx.bezierCurveTo(width, -height * 0.35, width, size * 0.55, 0, size * 0.75);
            ctx.bezierCurveTo(-width, size * 0.55, -width, -height * 0.35, 0, -height);
            ctx.fillStyle = colour;
            ctx.fill();
        };

        flame(size * 2, size * 0.85, '#ff7043');
        flame(size * 1.35, size * 0.5, '#ffb300');
        flame(size * 0.75, size * 0.26, '#fff59d');
    },

    // A gust: two thin crescents trailing each other.
    drawGust(ctx, p) {
        const size = p.size;

        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(224, 247, 250, 0.9)';
        ctx.lineWidth = Math.max(1, size * 0.16);
        ctx.beginPath();
        ctx.arc(0, 0, size, Math.PI * 0.15, Math.PI * 1.05);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(178, 235, 242, 0.7)';
        ctx.lineWidth = Math.max(1, size * 0.12);
        ctx.beginPath();
        ctx.arc(0, size * 0.1, size * 0.58, Math.PI * 0.2, Math.PI * 1.0);
        ctx.stroke();
    }
};
