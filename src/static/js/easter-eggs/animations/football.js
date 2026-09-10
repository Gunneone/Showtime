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
