// Showtime easter eggs - Celebrations: Football, Bluesky, Donut, Umbrella


/**
 * Kicks a handful of footballs into the air for Ted Lasso.
 *
 * The ball itself is a vendored SVG (see `static/images/README.md`), painted
 * onto the shared particle canvas as an image. They are kicked up from the
 * card, tumble as they go, and drop back off the bottom of the screen.
 */
const FootballAnimation = {
    ballUrl: '/static/images/soccerball.svg',

    /**
     * Load the ball, once. Safe to call at any time and as often as you like;
     * every caller gets the same promise. Adding the show preloads it, so by
     * the time anything celebrates the image is usually already decoded.
     */
    ready() {
        if (!this.readyPromise) {
            this.readyPromise = new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => {
                    this.image = image;
                    resolve(image);
                };
                image.onerror = () => reject(new Error('football failed to load'));
                image.src = this.ballUrl;
            });
        }
        return this.readyPromise;
    },

    /**
     * @param {Object} options
     * @param {number} options.originX         horizontal origin, 0-1 of viewport
     * @param {number} options.originY         vertical origin, 0-1 of viewport
     * @param {number} options.intensityFactor 0-1, scales speed, size and count
     */
    fire(options) {
        const opts = options || {};
        const originX = (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth;
        const originY = (opts.originY !== undefined ? opts.originY : 0.5) * window.innerHeight;
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const scale = EasterEggUtils.scale();

        // More than a handful and the balls hide each other on the way up.
        const count = Math.round(5 + intensity * 4);
        const fan = 130 + intensity * 50;

        const particles = Array.from({ length: count }, (_, i) => {
            const spot = (i + 0.5) / count - 0.5;
            const angle = (-90 + spot * fan + (Math.random() - 0.5) * 8) * Math.PI / 180;
            // A wide spread in speed as well as angle, so the balls fly apart
            // instead of going up as one clump.
            const speed = (3.0 + Math.random() * 2.4) * (1 + intensity * 0.35) * scale;

            return {
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.07 * scale,
                drag: 0.995,
                // Every ball the same size - a matching set, not a jumble.
                radius: 20 * (0.9 + intensity * 0.3) * Math.max(scale, 0.72),
                rotation: Math.random() * Math.PI * 2,
                // A kicked ball spins noticeably faster than it tumbles.
                spin: (Math.random() - 0.5) * 0.12,
                ttl: Math.round(220 + intensity * 40),
                draw: (ctx, p) => this.drawBall(ctx, p.radius)
            };
        });

        // Usually resolves on the spot, the show having been preloaded; a
        // celebration in the same session as a failed load simply does
        // nothing, rather than throwing balls that cannot be drawn.
        this.ready().then(() => {
            ParticleCanvas.add(particles);
        }).catch(error => {
            console.warn('Ted Lasso easter egg could not be played', error);
        });
    },

    // Draw one football centred on the current origin.
    drawBall(ctx, radius) {
        ctx.drawImage(this.image, -radius, -radius, radius * 2, radius * 2);
    }
};

/**
 * Breaking Bad: rains shards of Walt's blue "product".
 *
 * Each shard is an irregular crystal drawn by hand, lit with a blue gradient
 * and a single white glint, kicked up from the card and left to fall.
 */
const BlueSkyAnimation = {
    fire(options) {
        const opts = options || {};
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const count = Math.round(14 + intensity * 10);

        EasterEggUtils.fountain(options, count, (i, env) => {
            const size = (14 + Math.random() * 16) * Math.max(env.scale, 0.7);
            return {
                gravity: 0.085 * env.scale,
                spin: (Math.random() - 0.5) * 0.06,
                size: size,
                shape: this.crystal(),
                draw: (ctx, p) => this.drawShard(ctx, p.size, p.shape)
            };
        });
    },

    // An irregular 5-7 sided crystal, points in units of the shard size.
    crystal() {
        const n = 5 + Math.floor(Math.random() * 3);
        const points = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const r = 0.55 + Math.random() * 0.45;
            points.push([Math.cos(a) * r, Math.sin(a) * r * 1.3]);
        }
        return points;
    },

    drawShard(ctx, size, points) {
        ctx.beginPath();
        points.forEach(([x, y], i) => (i ? ctx.lineTo(x * size, y * size) : ctx.moveTo(x * size, y * size)));
        ctx.closePath();

        // A cool blue glow so the crystals carry on a dark page.
        ctx.shadowColor = 'rgba(90, 200, 255, 0.9)';
        ctx.shadowBlur = size * 0.7;

        const gradient = ctx.createLinearGradient(-size, -size, size, size);
        gradient.addColorStop(0, 'rgba(178, 240, 255, 0.98)');
        gradient.addColorStop(0.45, 'rgba(64, 178, 231, 0.95)');
        gradient.addColorStop(1, 'rgba(20, 104, 165, 0.97)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(240, 252, 255, 0.75)';
        ctx.lineWidth = Math.max(0.5, size * 0.06);
        ctx.stroke();

        // A bright facet running across the crystal.
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, -size * 0.55);
        ctx.lineTo(size * 0.2, size * 0.2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = Math.max(0.5, size * 0.1);
        ctx.stroke();
    }
};

/**
 * The Simpsons: rains Homer's pink sprinkled donut.
 *
 * The donut is a vendored SVG (see `static/images/README.md`), painted onto
 * the shared particle canvas as an image and left to tumble - the same
 * approach the Ted Lasso football uses.
 */
const DonutAnimation = {
    donutUrl: '/static/images/donut.svg',

    /**
     * Load the donut, once. Safe to call at any time and as often as you
     * like; every caller gets the same promise. Adding the show preloads it.
     */
    ready() {
        if (!this.readyPromise) {
            this.readyPromise = new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => { this.image = image; resolve(image); };
                image.onerror = () => reject(new Error('donut failed to load'));
                image.src = this.donutUrl;
            });
        }
        return this.readyPromise;
    },

    fire(options) {
        const opts = options || {};
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const count = Math.round(9 + intensity * 6);

        const particles = [];
        EasterEggUtils.fountain(options, count, (i, env) => {
            const radius = (16 + Math.random() * 12) * Math.max(env.scale, 0.7);
            const p = {
                gravity: 0.06 * env.scale,
                spin: (Math.random() - 0.5) * 0.06,
                radius: radius,
                draw: (ctx, part) => this.drawDonut(ctx, part.radius)
            };
            particles.push(p);
            return p;
        });

        // The fountain has already queued the particles; if the image is not
        // ready yet they simply draw nothing until it resolves.
        this.ready().catch((error) => {
            console.warn('Simpsons easter egg could not load the donut', error);
        });
    },

    drawDonut(ctx, radius) {
        if (!this.image) return;
        ctx.drawImage(this.image, -radius, -radius, radius * 2, radius * 2);
    }
};

/**
 * Friends: the title-sequence fountain, so a spray of open umbrellas rains
 * down. Each canopy is a scalloped half-disc in one of the logo's colours,
 * with ribs and a hooked handle.
 */
const UmbrellaAnimation = {
    colours: ['#e4483b', '#3aa3d8', '#f2c53d', '#e4483b', '#57b894', '#f2c53d'],

    fire(options) {
        const opts = options || {};
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const count = Math.round(8 + intensity * 6);

        EasterEggUtils.fountain(options, count, (i, env) => {
            const size = (16 + Math.random() * 12) * Math.max(env.scale, 0.7);
            return {
                gravity: 0.05 * env.scale,
                drag: 0.992,
                spin: (Math.random() - 0.5) * 0.05,
                size: size,
                colour: this.colours[i % this.colours.length],
                draw: (ctx, p) => this.drawUmbrella(ctx, p.size, p.colour)
            };
        });
    },

    drawUmbrella(ctx, size, colour) {
        const scallops = 4;
        const apexY = -size * 0.72;   // top of the dome
        const rimY = size * 0.06;     // where the scalloped edge sits
        const dip = size * 0.26;      // how far each scallop droops

        // Pole and hooked handle, drawn first so the canopy covers its top.
        ctx.strokeStyle = '#6b4a34';
        ctx.lineWidth = Math.max(1, size * 0.08);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, apexY - size * 0.12);
        ctx.lineTo(0, size * 0.95);
        ctx.arc(-size * 0.16, size * 0.95, size * 0.16, 0, Math.PI, false);
        ctx.stroke();

        // Canopy: a shallow top arc down to a scalloped lower edge.
        ctx.beginPath();
        ctx.moveTo(-size, rimY);
        ctx.quadraticCurveTo(-size * 0.5, apexY - size * 0.1, 0, apexY);
        ctx.quadraticCurveTo(size * 0.5, apexY - size * 0.1, size, rimY);
        for (let i = scallops; i > 0; i--) {
            const x1 = -size + (2 * size) * ((i - 1) / scallops);
            const xm = -size + (2 * size) * ((i - 0.5) / scallops);
            ctx.quadraticCurveTo(xm, rimY + dip, x1, rimY);
        }
        ctx.closePath();
        ctx.fillStyle = colour;
        ctx.fill();

        // Ribs from the apex to every scallop valley.
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.lineWidth = Math.max(0.5, size * 0.03);
        for (let i = 0; i < scallops; i++) {
            const xm = -size + (2 * size) * ((i + 0.5) / scallops);
            ctx.beginPath();
            ctx.moveTo(0, apexY);
            ctx.lineTo(xm, rimY + dip * 0.9);
            ctx.stroke();
        }
        // Panel seams to the rim corners.
        for (let i = 0; i <= scallops; i++) {
            const x = -size + (2 * size) * (i / scallops);
            ctx.beginPath();
            ctx.moveTo(0, apexY);
            ctx.lineTo(x, rimY);
            ctx.stroke();
        }

        // Ferrule at the very top.
        ctx.beginPath();
        ctx.moveTo(0, apexY);
        ctx.lineTo(0, apexY - size * 0.16);
        ctx.strokeStyle = '#6b4a34';
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.stroke();
    }
};
