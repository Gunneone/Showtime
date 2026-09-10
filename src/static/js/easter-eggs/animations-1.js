// Showtime easter eggs - Celebrations: Dragon Ball, Pokeball, Avatar element-bending


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
        const scale = EasterEggUtils.scale();

        // Spread the seven evenly across an upward fan so none of them hides
        // behind another, and shuffle which star count goes where.
        const stars = EasterEggUtils.shuffle([1, 2, 3, 4, 5, 6, 7]);
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

/**
 * Plays the four Avatar element emblems, drawn by hand in the source
 * animation, as a short celebration.
 *
 * The source draws water, then earth, then fire, then air, one after another
 * in the same place, over about eight seconds. Here each element is taken as
 * its own segment and given its own spot on the page, played faster and
 * started before the one before it has gone, so the four of them are done in
 * three seconds.
 *
 * lottie-web and the animation are both fetched on demand: they are a
 * quarter of a megabyte between them, which nobody who never watches Avatar
 * should have to download.
 */
const AvatarElementsAnimation = {
    libraryUrl: '/static/js/vendor/lottie_light.min.js',
    animationUrl: '/static/animations/avatar-elements.json',

    // Frame ranges of the four elements in the source file. Each one draws
    // itself on, holds, and fades out inside its own range.
    segments: {
        water: [0, 60],
        earth: [53, 113],
        fire: [107, 167],
        air: [160, 220]
    },
    order: ['water', 'earth', 'fire', 'air'],

    // A segment runs two seconds at the source's own speed. Played in 0.9s
    // and started every 0.7s, the four take 3.0s in total, and each element
    // is still on screen for 0.2s after the next one starts to draw.
    sourceSegmentSeconds: 2,
    elementSeconds: 0.9,
    staggerSeconds: 0.7,

    // The four corners inside the card, as multiples of half its width and
    // height: top left, top right, bottom left, bottom right, in the order the
    // elements are bent.
    corners: [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: 1 }
    ],

    // Below this the card is too narrow to pull the emblems in from its edges.
    roomyCardWidth: 520,

    /**
     * Fetch the library and the animation, once. Safe to call at any time and
     * as often as you like; every caller gets the same promise.
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
                if (!response.ok) throw new Error('animation failed to load');
                return response.json();
            })
            .then(data => {
                this.data = data;
                return data;
            });
    },

    /**
     * @param {Object} options
     * @param {number} options.originX horizontal origin, 0-1 of viewport
     * @param {number} options.originY vertical origin, 0-1 of viewport
     */
    play(options) {
        const opts = options || {};
        const bounds = opts.bounds || this.boundsAround(opts);

        // Big enough to be read, small enough that four of them sit inside the
        // card without touching each other or its edges.
        const size = Math.round(Math.max(34, Math.min(bounds.height * 0.42, bounds.width * 0.2, 104)));
        const inset = Math.max(8, size * 0.18);

        // How far out from the middle of the card the emblems sit. On a card
        // with room they stop halfway between the total in the middle and the
        // edge, which keeps the last of them off the share button in the
        // corner. A narrow card has no such room: there they go as far out as
        // they fit, to stay clear of the total itself.
        const outermost = bounds.width / 2 - inset - size / 2;
        const reach = bounds.width >= this.roomyCardWidth
            ? Math.min(bounds.width * 0.25, outermost)
            : outermost;

        const spots = this.corners.map(corner => ({
            x: bounds.left + bounds.width / 2 + corner.x * reach,
            y: bounds.top + bounds.height / 2 + corner.y * (bounds.height / 2 - inset - size / 2)
        }));

        // Usually already loaded, because adding the show preloaded it, in
        // which case this resolves on the spot.
        this.ready().then(() => {
            this.order.forEach((element, i) => {
                setTimeout(
                    () => this.showElement(element, spots[i], size),
                    i * this.staggerSeconds * 1000
                );
            });
        }).catch(error => {
            console.warn('Avatar easter egg could not be played', error);
        });
    },

    /** A card-sized box around the origin, for callers that pass no bounds. */
    boundsAround(opts) {
        const width = Math.min(window.innerWidth * 0.8, 720);
        const height = 160;
        return {
            left: (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth - width / 2,
            top: (opts.originY !== undefined ? opts.originY : 0.5) * window.innerHeight - height / 2,
            width: width,
            height: height
        };
    },

    // Draw one element at one spot, and clear it away once it has played.
    showElement(element, spot, size) {
        const host = document.createElement('div');
        // The element's own class is what lets the stylesheet lift the earth
        // emblem, which is drawn in a green too dark for a dark page.
        host.className = 'easter-egg-lottie easter-egg-lottie--' + element;
        host.setAttribute('aria-hidden', 'true');
        host.style.width = size + 'px';
        host.style.height = size + 'px';
        host.style.left = this.place(spot.x, size, window.innerWidth) + 'px';
        host.style.top = this.place(spot.y, size, window.innerHeight) + 'px';
        document.body.appendChild(host);

        const animation = window.lottie.loadAnimation({
            container: host,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            // Each instance gets its own copy of the data, which lottie-web
            // writes its playback state into.
            animationData: JSON.parse(JSON.stringify(this.data))
        });

        let cleaned = false;
        const clean = () => {
            if (cleaned) return;
            cleaned = true;
            animation.destroy();
            host.remove();
        };

        animation.addEventListener('complete', clean);
        // A stray emblem left on the page would be worse than a missed frame.
        setTimeout(clean, this.elementSeconds * 1000 + 1500);

        animation.setSpeed(this.sourceSegmentSeconds / this.elementSeconds);
        animation.playSegments(this.segments[element], true);
    },

    // Keep an element on screen, whatever bounds it was given.
    place(centre, size, limit) {
        const margin = 8;
        return Math.round(Math.min(Math.max(centre - size / 2, margin), Math.max(margin, limit - size - margin)));
    }
};
