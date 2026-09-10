/**
 * The Pokémon shows throw a whole handful of Poké Balls into the air, with the
 * odd rarer ball mixed in - a Super Ball about one throw in seven, a Hyper
 * Ball one in twenty, a Master Ball one in a hundred.
 *
 * Every ball is a vendored SVG (see `static/images/README.md`), painted onto
 * the shared particle canvas as an image - the same approach as the Ted Lasso
 * football. They are flung up from the card in a wide fan, tumble end over
 * end, and drop back off the bottom of the screen. The rarer a ball, the
 * bigger it is thrown, so a Master Ball stands out.
 */
const PokeballAnimation = {
    // Rarest first. `weight` is a percentage; the four sum to 100 and one roll
    // picks a ball. `sizeBoost` makes the scarce ones a touch larger so they
    // read.
    variants: [
        { name: 'master', url: '/static/images/pokeball-master.png', weight: 1, sizeBoost: 1.4 },
        { name: 'hyper', url: '/static/images/pokeball-hyper.png', weight: 5, sizeBoost: 1.18 },
        { name: 'super', url: '/static/images/pokeball-super.png', weight: 14, sizeBoost: 1.06 },
        { name: 'poke', url: '/static/images/pokeball.png', weight: 80, sizeBoost: 1 }
    ],
    images: {},

    /**
     * Load every ball, once. Safe to call at any time and as often as you
     * like; every caller gets the same promise. Adding the show preloads it,
     * so by the time anything celebrates the images are usually already
     * decoded.
     */
    ready() {
        if (!this.readyPromise) {
            this.readyPromise = Promise.all(this.variants.map(variant => new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => {
                    this.images[variant.name] = image;
                    resolve(image);
                };
                image.onerror = () => reject(new Error(variant.name + ' pokeball failed to load'));
                image.src = variant.url;
            })));
        }
        return this.readyPromise;
    },

    // Pick a ball by weight - one roll across the four.
    rollVariant() {
        let roll = Math.random() * 100;
        for (let i = 0; i < this.variants.length; i++) {
            roll -= this.variants[i].weight;
            if (roll < 0) return this.variants[i];
        }
        return this.variants[this.variants.length - 1];
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

        // A proper fistful - more than the seven dragon balls.
        const count = Math.round(11 + intensity * 9);
        const fan = 135 + intensity * 55;

        const particles = Array.from({ length: count }, (_, i) => {
            const spot = (i + 0.5) / count - 0.5;
            const angle = (-90 + spot * fan + (Math.random() - 0.5) * 10) * Math.PI / 180;
            // A wide spread in speed as well as angle, so the balls scatter
            // instead of leaving as one clump.
            const speed = (3.0 + Math.random() * 2.6) * (1 + intensity * 0.35) * scale;
            const variant = this.rollVariant();

            return {
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.07 * scale,
                drag: 0.995,
                // Every ball of a kind the same size - only the rarer
                // variants stand out, and only by their fixed sizeBoost.
                radius: 20 * (0.9 + intensity * 0.3)
                    * Math.max(scale, 0.72) * variant.sizeBoost,
                rotation: Math.random() * Math.PI * 2,
                // A thrown ball tumbles noticeably.
                spin: (Math.random() - 0.5) * 0.14,
                ttl: Math.round(220 + intensity * 40),
                variant: variant.name,
                draw: (ctx, p) => this.drawBall(ctx, p.radius, p.variant)
            };
        });

        // Usually resolves on the spot, the show having been preloaded; a
        // celebration in the same session as a failed load simply does
        // nothing, rather than throwing balls that cannot be drawn.
        this.ready().then(() => {
            ParticleCanvas.add(particles);
        }).catch(error => {
            console.warn('Pokémon easter egg could not be played', error);
        });
    },

    // Draw one ball centred on the current origin.
    drawBall(ctx, radius, variant) {
        const image = this.images[variant] || this.images.poke;
        if (!image) return;
        ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
    }
};
