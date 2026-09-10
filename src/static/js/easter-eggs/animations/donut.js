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
