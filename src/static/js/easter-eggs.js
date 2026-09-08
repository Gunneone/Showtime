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
            AvatarElementsAnimation.play(options);
        }
    },

    /**
     * Celebrations that have something to fetch before they can run. Calling
     * this as soon as we know which show is celebrating gives the fetch a head
     * start over the API round trip that precedes the animation.
     */
    preloaders: {
        elementBending() {
            AvatarElementsAnimation.ready();
        }
    },

    /** Give a show's celebration a chance to load whatever it needs. */
    preload(showId) {
        const egg = this.forShow(showId);
        const preloader = egg && egg.celebration && this.preloaders[egg.celebration];
        if (!preloader) return;

        try {
            preloader.call(this);
        } catch (error) {
            // Preloading is an optimisation; failing it must break nothing.
            console.warn('Easter egg preload failed', error);
        }
    }
};

/** Small helpers shared by the celebration animations. */
const EasterEggUtils = {
    /** How much to shrink a desktop-sized effect for this window. */
    scale() {
        return Math.min(1, window.innerWidth / 900);
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
        const spots = this.corners.map(corner => ({
            x: bounds.left + bounds.width / 2 + corner.x * (bounds.width / 2 - inset - size / 2),
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
