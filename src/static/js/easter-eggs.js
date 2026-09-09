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
        // Ted Lasso is about a football team, so it kicks footballs.
        tedLasso: {
            celebration: 'footballs'
        },
        // Shows whose name belongs on a seven-segment display: 24's ticking
        // clock, and the IT Crowd's basement-dwelling nerdery.
        segmentDisplay: {
            cardClass: 'easter-egg-segment-display'
        },
        // Breaking Bad: the title card boxes the letters that are element
        // symbols, so "Br" and "Ba" become periodic-table tiles inside the
        // show's own name. The celebration rains shards of Walt's blue product.
        breakingBad: {
            cardClass: 'easter-egg-breaking-bad',
            decorator: 'breakingBadTitle',
            celebration: 'blueSky'
        },
        // Stranger Things: the right-hand side of the card slips into the
        // Upside Down, and the celebration spells a word out on Joyce's
        // Christmas-light alphabet wall.
        strangerThings: {
            cardClass: 'easter-egg-upside-down',
            celebration: 'alphabetWall'
        },
        // The Office: Jim encased Dwight's stapler in jello, so the card's
        // poster sits wobbling inside a block of it.
        office: {
            cardClass: 'easter-egg-office'
        },
        // Rick and Morty: a portal-gun portal swirls open and splatters
        // green goo instead of confetti.
        rickAndMorty: {
            celebration: 'portal'
        },
        // The Simpsons: it rains Homer's pink sprinkled donuts.
        simpsons: {
            celebration: 'donuts'
        },
        // Friends: the title-sequence fountain, so umbrellas rain down.
        friends: {
            celebration: 'umbrellas'
        },
        // Squid Game: circle, triangle and square rain down - then a red
        // light freezes every one of them in mid-air before green frees them.
        squidGame: {
            celebration: 'redLightGreenLight'
        },
        // Sherlock: the show's on-screen deductions flash up inside the card.
        sherlock: {
            celebration: 'deduction'
        },
        // The X-Files: a saucer drops over the total, opens a beam and lifts
        // the celebration away upwards instead of letting it fall.
        xFiles: {
            celebration: 'abduction'
        },
        // Black Mirror: the poster wears the title-card crack, and the
        // celebration is the screen switching itself off, CRT-style.
        blackMirror: {
            cardClass: 'easter-egg-black-mirror',
            decorator: 'blackMirrorCrack',
            celebration: 'crtCollapse'
        },
        // Lost: the watch-time reads off the Swan hatch's split-flap counter,
        // and the celebration is the timer running out - 108:00 down to zero,
        // then system failure - while the numbers rain down.
        lost: {
            cardClass: 'easter-egg-swan',
            celebration: 'hatchTimer'
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
        97546: 'tedLasso',     // Ted Lasso (2020)
        1973: 'segmentDisplay',  // 24 (2001)
        2490: 'segmentDisplay',  // The IT Crowd (2006)
        1396: 'breakingBad',     // Breaking Bad (2008)
        66732: 'strangerThings', // Stranger Things (2016)
        2316: 'office',          // The Office (US) (2005)
        60625: 'rickAndMorty',   // Rick and Morty (2013)
        456: 'simpsons',         // The Simpsons (1989)
        1668: 'friends',         // Friends (1994)
        93405: 'squidGame',      // Squid Game (2021)
        19885: 'sherlock',       // Sherlock (2010)
        4087: 'xFiles',          // The X-Files (1993)
        42009: 'blackMirror',    // Black Mirror (2011)
        4607: 'lost'             // Lost (2004)
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
     * Give a show's easter egg a chance to reach into its freshly built card
     * element - to restyle part of the title, say. Runs once per render; the
     * decorator guards against doing its work twice.
     */
    decorateCard(showId, cardEl) {
        const egg = this.forShow(showId);
        const decorator = egg && egg.decorator && this.decorators[egg.decorator];
        if (!decorator || !cardEl) return;

        try {
            decorator.call(this, cardEl);
        } catch (error) {
            console.warn('Easter egg card decoration failed', error);
        }
    },

    // Card decorators, keyed by name.
    decorators: {
        /**
         * Breaking Bad: rebuild the title so the chemical-symbol letters - Br
         * and Ba - sit in green periodic-table tiles, the way the show's own
         * logo does, inside the name rather than beside it.
         */
        breakingBadTitle(cardEl) {
            const h4 = cardEl.querySelector('.watched-show-info h4');
            if (!h4 || h4.dataset.bbDecorated) return;

            const escape = (s) => s.replace(/[&<>"]/g, (c) => (
                { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
            ));
            const tile = (symbol) => '<span class="bb-element" aria-hidden="true">' + symbol + '</span>';

            let html = escape(h4.textContent);
            let changed = false;
            html = html.replace(/Br/, () => { changed = true; return tile('Br'); });
            html = html.replace(/Ba(?![a-z]*<\/span>)/, () => { changed = true; return tile('Ba'); });
            if (!changed) return;

            h4.innerHTML = html;
            h4.dataset.bbDecorated = '1';
        },

        /**
         * Black Mirror: lay the title-card crack over the poster. A vendored
         * SVG (see static/images/README.md), blended so it looks like the
         * glass, not a sticker on top of it.
         */
        blackMirrorCrack(cardEl) {
            const poster = cardEl.querySelector('.watched-show-poster');
            if (!poster || poster.dataset.bmCracked) return;

            const crack = document.createElement('img');
            crack.className = 'bm-crack';
            crack.src = '/static/images/screen-crack.svg';
            crack.alt = '';
            crack.setAttribute('aria-hidden', 'true');
            poster.appendChild(crack);
            poster.dataset.bmCracked = '1';
        }
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
            // Hand the show id along so a celebration can find its own card.
            celebration.call(this, Object.assign({ showId: showId }, options));
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
        },
        footballs(options) {
            FootballAnimation.fire(options);
        },
        blueSky(options) {
            BlueSkyAnimation.fire(options);
        },
        alphabetWall(options) {
            AlphabetWallAnimation.play(options);
        },
        portal(options) {
            PortalAnimation.fire(options);
        },
        donuts(options) {
            DonutAnimation.fire(options);
        },
        umbrellas(options) {
            UmbrellaAnimation.fire(options);
        },
        redLightGreenLight(options) {
            RedLightGreenLightAnimation.play(options);
        },
        deduction(options) {
            DeductionAnimation.play(options);
        },
        abduction(options) {
            AbductionAnimation.fire(options);
        },
        crtCollapse(options) {
            CrtCollapseAnimation.play(options);
        },
        hatchTimer(options) {
            HatchTimerAnimation.play(options);
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
        },
        footballs() {
            FootballAnimation.ready();
        },
        donuts() {
            DonutAnimation.ready();
        },
        abduction() {
            AbductionAnimation.ready();
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
    },

    /**
     * The shape shared by most confetti-replacing celebrations: `count` pieces
     * kicked up from the card in an upward fan, then left to fall under
     * gravity. `build(i, env)` returns the per-piece bits that differ - at
     * least a `draw`, plus anything it wants to override - and gets `env.scale`
     * and `env.intensity` to size things by.
     */
    fountain(options, count, build) {
        const opts = options || {};
        const originX = (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth;
        const originY = (opts.originY !== undefined ? opts.originY : 0.5) * window.innerHeight;
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const scale = this.scale();
        const fan = 120 + intensity * 45;

        const particles = [];
        for (let i = 0; i < count; i++) {
            const spot = (i + 0.5) / count - 0.5;
            const angle = (-90 + spot * fan + (Math.random() - 0.5) * 8) * Math.PI / 180;
            const speed = (3.1 + Math.random() * 1.8) * (1 + intensity * 0.35) * scale;

            particles.push(Object.assign({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.07 * scale,
                drag: 0.995,
                rotation: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.1,
                ttl: Math.round(220 + intensity * 40)
            }, build(i, { scale: scale, intensity: intensity })));
        }

        ParticleCanvas.add(particles);
        return { originX: originX, originY: originY, intensity: intensity, scale: scale };
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

        // Walk a snapshot and rebuild the list. A particle whose `update`
        // emits more particles - a fire trail, a spray of goo - then adds
        // them to the live array instead of to a copy that a filter would
        // throw away when it reassigns `this.particles`.
        const current = this.particles;
        this.particles = [];

        for (let i = 0; i < current.length; i++) {
            const p = current[i];
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
                radius: (16 + Math.random() * 8) * (0.9 + intensity * 0.3) * Math.max(scale, 0.72),
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

/**
 * Squid Game: circle, triangle and square rain down like ordinary confetti -
 * until a red light freezes every piece in mid-air. Green sets them falling
 * again. One cycle, timed to land inside the celebration.
 */
const RedLightGreenLightAnimation = {
    frozen: false,

    play(options) {
        const opts = options || {};
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        const count = Math.round(18 + intensity * 12);
        const shapes = ['circle', 'triangle', 'square'];
        this.frozen = false;

        EasterEggUtils.fountain(options, count, (i, env) => {
            const size = (11 + Math.random() * 9) * Math.max(env.scale, 0.7);
            return {
                gravity: 0.09 * env.scale,
                spin: (Math.random() - 0.5) * 0.04,
                ttl: 340,
                size: size,
                shape: shapes[i % shapes.length],
                update: (p) => {
                    if (RedLightGreenLightAnimation.frozen) return;
                    p.vx *= p.drag;
                    p.vy = p.vy * p.drag + p.gravity;
                    p.x += p.vx;
                    p.y += p.vy;
                },
                draw: (ctx, p) => this.drawShape(ctx, p.size, p.shape)
            };
        });

        setTimeout(() => { this.frozen = true; this.flash('#c0143c'); }, 650);
        setTimeout(() => { this.frozen = false; this.flash('#1f9e57'); }, 1750);
    },

    // A brief full-screen colour wash for the light change.
    flash(colour) {
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100;opacity:0;' +
            'transition:opacity .16s ease;mix-blend-mode:multiply;background:' + colour + ';';
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '0.32'; });
        setTimeout(() => { el.style.opacity = '0'; }, 300);
        setTimeout(() => el.remove(), 650);
    },

    drawShape(ctx, size, shape) {
        ctx.strokeStyle = '#ff4d9d';
        ctx.lineWidth = Math.max(1, size * 0.28);
        ctx.lineJoin = 'round';
        if (shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.stroke();
        } else if (shape === 'square') {
            ctx.strokeRect(-size * 0.85, -size * 0.85, size * 1.7, size * 1.7);
        } else {
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.9, size * 0.7);
            ctx.lineTo(-size * 0.9, size * 0.7);
            ctx.closePath();
            ctx.stroke();
        }
    }
};

/**
 * Rick and Morty: a portal-gun portal swirls open over the card, holds, then
 * collapses - flinging a few blobs of green goo as it goes.
 *
 * The ring is a band of glowing blobs whose `update` spins them round the
 * origin while the radius eases up and back down over the particle's life.
 */
const PortalAnimation = {
    fire(options) {
        const opts = options || {};
        const cx = (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth;
        const cy = (opts.originY !== undefined ? opts.originY : 0.5) * window.innerHeight;
        const scale = Math.max(EasterEggUtils.scale(), 0.6);
        const R = 108 * scale;
        const ttl = 112;

        // One particle paints the whole vortex and sheds sparks off its rim
        // for as long as it is open.
        ParticleCanvas.add([{
            x: cx, y: cy, cx: cx, cy: cy, R: R, ttl: ttl,
            spinAngle: Math.random() * Math.PI * 2,
            update: (p) => {
                p.spinAngle += 0.3;
                const grow = PortalAnimation.envelope(p.life / p.ttl);
                if (grow > 0.35 && p.life % 2 === 0) {
                    const a = Math.random() * Math.PI * 2;
                    const rr = p.R * grow * (0.9 + Math.random() * 0.22);
                    ParticleCanvas.add([PortalAnimation.spark(
                        p.cx + Math.cos(a) * rr, p.cy + Math.sin(a) * rr * 0.92, a, scale
                    )]);
                }
            },
            draw: (ctx, p) => PortalAnimation.drawVortex(
                ctx, p.R * PortalAnimation.envelope(p.life / p.ttl), p.spinAngle
            )
        }]);

        // A little goo flung out as the portal punches open.
        const splats = [];
        for (let i = 0; i < 18; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = (2.5 + Math.random() * 4.5) * scale;
            const rad = (3 + Math.random() * 6) * scale;
            splats.push({
                x: cx, y: cy,
                vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                gravity: 0.09, drag: 0.96,
                ttl: 34 + Math.floor(Math.random() * 22),
                draw: (ctx) => {
                    ctx.fillStyle = 'rgba(150, 245, 120, 0.9)';
                    ctx.shadowColor = 'rgba(120, 240, 110, 0.9)';
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.arc(0, 0, rad, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
        ParticleCanvas.add(splats);
    },

    spark(x, y, angle, scale) {
        // Tangential flick, so sparks spiral off the rim.
        const t = angle + Math.PI / 2;
        const speed = (1.5 + Math.random() * 3) * scale;
        const rad = (1.5 + Math.random() * 2.5) * scale;
        return {
            x: x, y: y,
            vx: Math.cos(t) * speed + (Math.random() - 0.5),
            vy: Math.sin(t) * speed + (Math.random() - 0.5),
            drag: 0.94, gravity: 0.02,
            ttl: 16 + Math.floor(Math.random() * 14),
            draw: (ctx) => {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(198, 255, 130, 0.95)';
                ctx.shadowColor = 'rgba(160, 255, 110, 0.95)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, rad, 0, Math.PI * 2);
                ctx.fill();
            }
        };
    },

    drawVortex(ctx, r, spin) {
        if (r < 2) return;
        ctx.save();
        // Squashed a touch, as if the hole is seen at a slight angle.
        ctx.scale(1, 0.92);

        const rim = (rad) => {
            ctx.beginPath();
            for (let i = 0; i <= 40; i++) {
                const a = (i / 40) * Math.PI * 2;
                const wob = 1 + Math.sin(a * 6 + spin * 2) * 0.05 + Math.sin(a * 11 - spin) * 0.03;
                const x = Math.cos(a) * rad * wob;
                const y = Math.sin(a) * rad * wob;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath();
        };

        // Body: hot yellow-green core fading to a deep green rim.
        const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
        grad.addColorStop(0, 'rgba(226, 255, 158, 0.98)');
        grad.addColorStop(0.35, 'rgba(140, 240, 110, 0.95)');
        grad.addColorStop(0.75, 'rgba(46, 170, 60, 0.9)');
        grad.addColorStop(1, 'rgba(18, 92, 30, 0.12)');
        rim(r);
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(120, 240, 110, 0.9)';
        ctx.shadowBlur = r * 0.5;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Three spiral arms swept around the centre.
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let arm = 0; arm < 3; arm++) {
            ctx.beginPath();
            const base = spin + arm * (Math.PI * 2 / 3);
            for (let s = 0; s <= 30; s++) {
                const f = s / 30;
                const a = base + f * 3.2;
                const rad = r * (0.12 + f * 0.82);
                const x = Math.cos(a) * rad;
                const y = Math.sin(a) * rad;
                s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.strokeStyle = 'rgba(210, 255, 150, 0.5)';
            ctx.lineWidth = Math.max(1, r * 0.05);
            ctx.stroke();
        }

        // Flickering hot centre.
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.14 + Math.abs(Math.sin(spin * 3)) * 0.05), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(240, 255, 210, 0.95)';
        ctx.fill();

        // Crisp rim.
        ctx.globalCompositeOperation = 'source-over';
        rim(r * 0.99);
        ctx.strokeStyle = 'rgba(216, 255, 150, 0.7)';
        ctx.lineWidth = Math.max(1, r * 0.04);
        ctx.stroke();

        ctx.restore();
    },

    // 0 -> 1 -> 1 -> 0: opens over the first quarter, holds, shuts at the end.
    envelope(t) {
        if (t < 0.28) return t / 0.28;
        if (t > 0.82) return Math.max(0, (1 - t) / 0.18);
        return 1;
    }
};

/**
 * Stranger Things: Joyce's Christmas-light alphabet wall. A full A-Z painted
 * across the top of the screen on a drooping wire of bulbs. A few bulbs
 * flicker first, then the word is spelt out one glowing bulb at a time, held,
 * pulsed and faded away. Pure DOM - no canvas.
 */
const AlphabetWallAnimation = {
    word: 'RUN',
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    colours: ['#ff5a5a', '#ffd23f', '#4dff6a', '#4db8ff', '#ff7ad2', '#ffa64d'],

    play() {
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const wrap = document.createElement('div');
        wrap.setAttribute('aria-hidden', 'true');
        // Above the site header (z-index 1000), which is fixed and tall enough
        // to hide anything pinned to the top of the viewport.
        wrap.style.cssText = [
            'position:fixed', 'left:0', 'right:0', 'top:0', 'z-index:1001',
            'pointer-events:none', 'padding:26px 3vw 30px', 'opacity:0',
            'transition:opacity .35s ease', 'font-family:Georgia,"Times New Roman",serif',
            'background:linear-gradient(180deg,rgba(6,8,14,0.92),rgba(6,8,14,0.55) 68%,transparent)'
        ].join(';');

        const letters = this.alphabet.split('');
        const n = letters.length;

        // A wire that sags between every bulb.
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 1000 46');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.cssText = 'position:absolute;left:3vw;width:94vw;top:18px;height:46px;';
        let d = 'M 0 10';
        for (let i = 0; i < n; i++) {
            const x = ((i + 0.5) / n) * 1000;
            const prevX = i === 0 ? 0 : ((i - 0.5) / n) * 1000;
            d += ' Q ' + ((prevX + x) / 2).toFixed(1) + ' 40 ' + x.toFixed(1) + ' 12';
        }
        d += ' Q 999 40 1000 10';
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(28,30,38,0.95)');
        path.setAttribute('stroke-width', '3');
        svg.appendChild(path);
        wrap.appendChild(svg);

        const row = document.createElement('div');
        row.style.cssText = 'position:relative;display:flex;justify-content:space-between;align-items:flex-end;';
        const cells = letters.map((ch, i) => {
            const cell = document.createElement('div');
            cell.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:14px;';

            const bulb = document.createElement('div');
            bulb.style.cssText = [
                'width:clamp(10px,1.9vw,18px)', 'height:clamp(13px,2.4vw,23px)',
                'border-radius:50% 50% 50% 50% / 60% 60% 40% 40%',
                'background:#2c2c31', 'transition:background .1s ease,box-shadow .1s ease'
            ].join(';');

            const letter = document.createElement('div');
            letter.textContent = ch;
            letter.style.cssText = [
                'font-size:clamp(12px,2.5vw,22px)', 'font-weight:700',
                'color:rgba(210,200,190,0.22)', 'letter-spacing:0.02em',
                'transition:color .12s ease,text-shadow .12s ease'
            ].join(';');

            cell.appendChild(bulb);
            cell.appendChild(letter);
            row.appendChild(cell);
            return { bulb: bulb, letter: letter, colour: this.colours[i % this.colours.length] };
        });
        wrap.appendChild(row);
        document.body.appendChild(wrap);
        requestAnimationFrame(() => { wrap.style.opacity = '1'; });

        const on = (c, lit, strong) => {
            c.bulb.style.background = lit ? c.colour : '#2c2c31';
            c.bulb.style.boxShadow = lit
                ? '0 0 ' + (strong ? '22px 8px ' : '12px 4px ') + c.colour
                : 'none';
            c.letter.style.color = lit ? '#fff' : 'rgba(210,200,190,0.22)';
            c.letter.style.textShadow = lit ? '0 0 16px ' + c.colour : 'none';
        };

        const at = (ch) => cells[this.alphabet.indexOf(ch)];
        const timers = [];
        const after = (ms, fn) => timers.push(setTimeout(fn, ms));
        const done = () => { timers.forEach(clearTimeout); wrap.remove(); };

        if (reduce) {
            this.word.split('').forEach(ch => on(at(ch), true, true));
            after(1900, () => { wrap.style.transition = 'opacity 1s ease'; wrap.style.opacity = '0'; });
            after(3000, done);
            return;
        }

        // 1. A few bulbs flicker first - the lights are trying to talk.
        for (let f = 0; f < 6; f++) {
            const c = cells[Math.floor(Math.random() * cells.length)];
            after(150 + f * 170, () => on(c, true));
            after(150 + f * 170 + 85, () => on(c, false));
        }

        // 2. Spell the word, one glowing bulb at a time.
        const start = 1300;
        const step = 520;
        this.word.split('').forEach((ch, i) => {
            after(start + i * step, () => on(at(ch), true, true));
        });

        // 3. Hold, pulse once, fade the wall away.
        const held = start + this.word.length * step;
        after(held + 650, () => this.word.split('').forEach(ch => on(at(ch), true)));
        after(held + 800, () => this.word.split('').forEach(ch => on(at(ch), true, true)));
        after(held + 1600, () => { wrap.style.transition = 'opacity 1.1s ease'; wrap.style.opacity = '0'; });
        after(held + 2800, done);
    }
};

/**
 * Sherlock: the show's on-screen deductions - but about the person on the
 * sofa. Like every celebration it plays on the running-total card at the top:
 * four verdicts flash up down its left and right sides, flanking the big
 * number, each sliding in as it fades. Pure DOM, clipped to that card's box.
 */
const DeductionAnimation = {
    notes: [
        'BINGE-WATCHER', 'SKIPS THE RECAP', "LIED: 'ONE MORE'", 'SUBTITLES: ON',
        'CRIED AT EPISODE SIX', 'ALREADY KNOWS THE TWIST', 'STILL IN PYJAMAS',
        'SEVENTH REWATCH', 'PAUSED TO GOOGLE AN ACTOR', 'AVOIDS ALL SPOILERS',
        'SHOULD BE ASLEEP', 'TELLS NO ONE THE ENDING', 'WATCHES AT 1.5x',
        'READ THE PLOT ON WIKIPEDIA FIRST', 'ONE EYE ON A SECOND SCREEN'
    ],

    play(options) {
        const opts = options || {};
        // The bounds handed over are the running-total card at the top - the
        // one every celebration plays on. Never the individual show card.
        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: (opts.originX !== undefined ? opts.originX : 0.5) * window.innerWidth - 260,
            top: (opts.originY !== undefined ? opts.originY : 0.28) * window.innerHeight - 90,
            width: 520, height: 180
        };

        const host = document.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText = 'position:fixed;pointer-events:none;z-index:100;overflow:hidden;left:' +
            Math.round(b.left) + 'px;top:' + Math.round(b.top) + 'px;width:' +
            Math.round(b.width) + 'px;height:' + Math.round(b.height) + 'px;';
        document.body.appendChild(host);
        this.spawn(host, () => host.remove());
    },

    // Two down each side, flanking the centred total - clear of the heading,
    // the big number and the caption. A max width per spot keeps each line in.
    spots: [
        { left: 2, top: 24, maxw: 30 },
        { left: 2, top: 58, maxw: 30 },
        { left: 68, top: 28, maxw: 30 },
        { left: 66, top: 62, maxw: 32 }
    ],

    // Drop four deductions into `host`, which clips them. `onDone` fires once
    // the last one has gone. Paced slowly enough to actually read each line.
    spawn(host, onDone) {
        const picks = EasterEggUtils.shuffle(this.notes.slice()).slice(0, 4);
        const spots = EasterEggUtils.shuffle(this.spots.slice());
        const stagger = 480;   // between one line appearing and the next
        const hold = 2600;     // how long a line stays fully readable
        let remaining = picks.length;

        picks.forEach((text, i) => {
            const spot = spots[i];
            setTimeout(() => {
                const el = document.createElement('div');
                el.textContent = text;
                el.style.cssText = [
                    'position:absolute',
                    'left:' + spot.left + '%', 'top:' + spot.top + '%',
                    'max-width:' + spot.maxw + '%',
                    'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
                    'font-family:"Courier New",monospace', 'font-size:12px',
                    'letter-spacing:0.1em', 'text-transform:uppercase',
                    'color:#eaf2f8', 'text-shadow:0 1px 6px rgba(0,0,0,0.85)',
                    'border-left:2px solid rgba(130,195,255,0.95)', 'padding-left:7px',
                    'opacity:0', 'transform:translateX(-8px)',
                    'transition:opacity .3s ease,transform .3s ease'
                ].join(';');
                host.appendChild(el);

                requestAnimationFrame(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateX(0)';
                });
                setTimeout(() => {
                    el.style.opacity = '0';
                    el.style.transform = 'translateX(6px)';
                }, hold);
                setTimeout(() => {
                    el.remove();
                    if (--remaining === 0) onDone();
                }, hold + 500);
            }, i * stagger);
        });
    }
};

/**
 * The X-Files: a saucer drops over the running-total card, opens a beam, and
 * lifts the celebration away - the pieces are pulled *up* into its belly
 * instead of falling - then blinks white and streaks off. A vendored saucer
 * SVG (see static/images/README.md) painted onto the shared particle canvas;
 * the debris is drawn by hand.
 *
 * `_ship` is shared module state: the saucer particle writes its position
 * there every frame so the debris particles know what to home in on.
 */
const AbductionAnimation = {
    ufoUrl: '/static/images/ufo.svg',
    colours: ['#8be9c4', '#5ad1ff', '#ffe27a', '#ff8db4', '#c9a7ff', '#a0f0d0'],
    _ship: null,

    /** Load the saucer, once. Same promise for every caller. */
    ready() {
        if (!this.readyPromise) {
            this.readyPromise = new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => { this.image = image; resolve(image); };
                image.onerror = () => reject(new Error('saucer failed to load'));
                image.src = this.ufoUrl;
            });
        }
        return this.readyPromise;
    },

    fire(options) {
        const opts = options || {};
        const scale = Math.max(EasterEggUtils.scale(), 0.6);
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Anchor to the running-total card (every celebration plays on it).
        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: window.innerWidth * 0.5 - 220, top: window.innerHeight * 0.24,
            width: 440, height: 160
        };
        const cardX = b.left + b.width / 2;
        const cardY = b.top + b.height / 2;

        // Saucer size, and where it hovers: above the card, clear of the very
        // top of the viewport.
        const radius = Math.min(b.width * 0.62, 260) * scale / 1.84;
        const hoverY = Math.max(radius * 0.9 + 12, b.top - radius * 0.35);

        this._ship = { x: cardX, y: hoverY, belly: radius * 0.16, open: 0 };

        // Usually already decoded, the show having been preloaded when it was
        // added; a session in which the load failed simply does nothing.
        this.ready().then(() => {
            this.launch(cardX, cardY, hoverY, radius, scale, reduce);
        }).catch((error) => {
            console.warn('X-Files easter egg could not be played', error);
        });

        this.caption(b, reduce);
    },

    launch(cardX, cardY, hoverY, radius, scale, reduce) {
        const ship = this._ship;
        const dropFrom = reduce ? hoverY : hoverY - 260 * scale;
        const ttl = reduce ? 150 : 210;
        const ease = (t) => 1 - Math.pow(1 - t, 3);

        ship.x = cardX;
        ship.y = dropFrom;

        ParticleCanvas.add([{
            x: cardX, y: dropFrom, ttl: ttl, spin: 0,
            update: (p) => {
                const t = p.life / p.ttl;
                if (reduce) {
                    ship.y = hoverY;
                    ship.open = Math.min(1, p.life / 12);
                    if (t > 0.7) ship.open = Math.max(0, (1 - t) / 0.3);
                } else if (t < 0.16) {
                    ship.y = dropFrom + (hoverY - dropFrom) * ease(t / 0.16);
                } else if (t < 0.72) {
                    ship.y = hoverY + Math.sin(p.life * 0.12) * 3 * scale;
                    ship.open = Math.min(1, (t - 0.16) / 0.09);
                } else if (t < 0.86) {
                    ship.y = hoverY - (t - 0.72) / 0.14 * 26 * scale;
                    ship.open = Math.max(0, 1 - (t - 0.72) / 0.14);
                } else {
                    // Streak away, up and to one side.
                    ship.open = 0;
                    ship.x += 5.4 * scale;
                    ship.y -= 7.2 * scale;
                }
                p.x = ship.x;
                p.y = ship.y;
            },
            draw: (ctx, p) => this.drawShip(ctx, p, radius, scale)
        }]);

        // Debris kicked up from the card, then reeled in.
        const count = reduce ? 10 : 26;
        const debris = [];
        for (let i = 0; i < count; i++) {
            const a = (-90 + (Math.random() - 0.5) * 150) * Math.PI / 180;
            const speed = (1.6 + Math.random() * 2.4) * scale;
            debris.push({
                x: cardX + (Math.random() - 0.5) * 40,
                y: cardY,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed - (reduce ? 1.1 * scale : 0),
                ttl: reduce ? 90 : 150,
                colour: this.colours[i % this.colours.length],
                len: (7 + Math.random() * 7) * scale,
                update: (p) => {
                    if (reduce) {
                        p.vy -= 0.02 * scale;
                        p.x += p.vx; p.y += p.vy;
                        p.rotation = Math.atan2(p.vy, p.vx);
                        return;
                    }
                    if (p.life > 18 && ship.open > 0.15) {
                        const tx = ship.x;
                        const ty = ship.y + ship.belly;
                        const dx = tx - p.x;
                        const dy = ty - p.y;
                        const dist = Math.hypot(dx, dy) || 1;
                        const pull = 0.5 + (p.life - 18) * 0.02;
                        p.vx += (dx / dist) * pull - p.vx * 0.06;
                        p.vy += (dy / dist) * pull - p.vy * 0.06;
                        if (dist < 18 * scale) p.life = p.ttl;
                    } else {
                        p.vy += 0.05 * scale;
                    }
                    p.x += p.vx;
                    p.y += p.vy;
                    p.rotation = Math.atan2(p.vy, p.vx);
                },
                draw: (ctx, p) => {
                    const stretch = 1 + Math.min(2.4, Math.hypot(p.vx, p.vy) * 0.16);
                    ctx.fillStyle = p.colour;
                    ctx.shadowColor = p.colour;
                    ctx.shadowBlur = 6;
                    const w = p.len * stretch;
                    const h = p.len * 0.5;
                    ctx.beginPath();
                    (ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, h / 2)
                        : ctx.rect(-w / 2, -h / 2, w, h));
                    ctx.fill();
                }
            });
        }
        ParticleCanvas.add(debris);
    },

    drawShip(ctx, p, radius, scale) {
        const ship = this._ship;
        // Beam: a translucent green cone from the belly down past the card.
        if (ship.open > 0.02) {
            const spread = radius * 1.15;
            const reach = radius * 4.2;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const pulse = 0.12 + 0.05 * Math.sin(p.life * 0.4);
            const grad = ctx.createLinearGradient(0, ship.belly, 0, ship.belly + reach);
            grad.addColorStop(0, 'rgba(150, 255, 190, ' + (pulse + 0.18) * ship.open + ')');
            grad.addColorStop(1, 'rgba(120, 240, 150, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-radius * 0.28, ship.belly);
            ctx.lineTo(radius * 0.28, ship.belly);
            ctx.lineTo(spread, ship.belly + reach);
            ctx.lineTo(-spread, ship.belly + reach);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // A blink of white just as it leaves.
        const t = p.life / p.ttl;
        if (t > 0.84 && t < 0.9) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(0, 0, radius * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.image) {
            ctx.drawImage(this.image, -radius, -radius, radius * 2, radius * 2);
        }
    },

    // "THE TRUTH IS OUT THERE", typed out under the card once the saucer is
    // hovering.
    caption(b, reduce) {
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = [
            'position:fixed', 'z-index:100', 'pointer-events:none',
            'left:' + Math.round(b.left) + 'px',
            'top:' + Math.round(b.top + b.height + 14) + 'px',
            'width:' + Math.round(b.width) + 'px',
            'text-align:center', 'font-family:"Courier New",monospace',
            'font-size:13px', 'letter-spacing:0.34em', 'text-transform:uppercase',
            'color:#9ff0c8', 'text-shadow:0 0 12px rgba(120,240,170,0.7)',
            'opacity:0', 'transition:opacity .3s ease'
        ].join(';');
        document.body.appendChild(el);

        const text = 'The truth is out there';
        const done = () => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); };

        if (reduce) {
            el.textContent = text;
            setTimeout(() => { el.style.opacity = '1'; }, 350);
            setTimeout(done, 2600);
            return;
        }

        let i = 0;
        setTimeout(() => {
            el.style.opacity = '1';
            const tick = setInterval(() => {
                el.textContent = text.slice(0, ++i);
                if (i >= text.length) clearInterval(tick);
            }, 55);
        }, 700);
        setTimeout(done, 3200);
    }
};

/**
 * Black Mirror: the celebration is the screen switching itself off. The burst
 * is replaced by an old-CRT power-down over the whole viewport - the picture
 * collapses to a bright line, the line to a dot, the dot goes out - then the
 * page comes back. Pure DOM, nothing on the canvas.
 */
const CrtCollapseAnimation = {
    play() {
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // A re-fire before the last one cleared: drop the old overlay.
        const stale = document.querySelector('.crt-collapse');
        if (stale) stale.remove();

        const outer = document.createElement('div');
        outer.className = 'crt-collapse';
        outer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(outer);

        if (reduce) {
            outer.style.background = '#000';
            requestAnimationFrame(() => { outer.style.opacity = '0.92'; });
            setTimeout(() => { outer.style.opacity = '0'; }, 380);
            setTimeout(() => outer.remove(), 700);
            return;
        }

        const bar = document.createElement('div');
        bar.className = 'crt-collapse-bar';
        outer.appendChild(bar);

        // 1. Snap to black with a bright line across the middle.
        outer.style.background = '#000';
        outer.style.opacity = '1';
        // 2. Line collapses horizontally to a dot.
        setTimeout(() => { bar.style.transform = 'translateY(-50%) scaleX(0.004)'; }, 110);
        // 3. Dot fades.
        setTimeout(() => { bar.style.opacity = '0'; }, 270);
        // 4. Black lifts - the page is "back".
        setTimeout(() => { outer.style.opacity = '0'; }, 520);
        setTimeout(() => outer.remove(), 850);
    }
};

/**
 * Lost: the Swan hatch. The celebration is the timer running out - the
 * split-flap counter over the running-total card falls from 108:00 to
 * 000:00, accelerating, then SYSTEM FAILURE, then resets. Pure DOM.
 */
const HatchTimerAnimation = {
    play(options) {
        const opts = options || {};
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: window.innerWidth * 0.5 - 200, top: window.innerHeight * 0.24,
            width: 400, height: 150
        };

        this.counter(b, reduce);
    },

    counter(b, reduce) {
        const glyphs = '108:00'.split('');
        const row = document.createElement('div');
        row.className = 'hatch-timer';
        row.setAttribute('aria-hidden', 'true');
        row.style.cssText = [
            'position:fixed', 'z-index:100', 'pointer-events:none',
            'left:' + Math.round(b.left + b.width / 2) + 'px',
            'top:' + Math.round(b.top + b.height / 2) + 'px',
            'transform:translate(-50%,-50%)', 'display:flex', 'gap:4px',
            'opacity:0', 'transition:opacity .4s ease'
        ].join(';');

        const cells = glyphs.map(ch => {
            const cell = document.createElement('span');
            cell.className = 'hatch-cell';
            cell.textContent = ch;
            row.appendChild(cell);
            return cell;
        });

        const caption = document.createElement('div');
        caption.className = 'hatch-caption';
        caption.textContent = '';
        row.appendChild(caption);

        document.body.appendChild(row);
        requestAnimationFrame(() => { row.style.opacity = '1'; });

        const format = (secs) => {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return String(m).padStart(3, '0') + ':' + String(s).padStart(2, '0');
        };
        const setGlyphs = (str, flip) => {
            str.split('').forEach((ch, i) => {
                if (!cells[i] || cells[i].textContent === ch) return;
                cells[i].textContent = ch;
                if (flip) {
                    cells[i].classList.remove('flip');
                    void cells[i].offsetWidth;
                    cells[i].classList.add('flip');
                }
            });
        };

        const fail = () => {
            cells.forEach(c => c.classList.add('alarm'));
            this.edgeFlash();
            caption.textContent = 'SYSTEM FAILURE';
            setTimeout(() => {
                cells.forEach(c => c.classList.remove('alarm'));
                setGlyphs('108:00', false);
                caption.textContent = '';
                row.style.opacity = '0';
            }, reduce ? 900 : 800);
            setTimeout(() => row.remove(), (reduce ? 900 : 800) + 600);
        };

        if (reduce) {
            setTimeout(() => setGlyphs('000:00', false), 700);
            setTimeout(fail, 1300);
            return;
        }

        const startSecs = 108 * 60;
        const dur = 2400;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / dur);
            const secs = Math.round(startSecs * (1 - t * t));   // accelerating
            setGlyphs(format(secs), true);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                setGlyphs('000:00', true);
                setTimeout(fail, 260);
            }
        };
        requestAnimationFrame(step);
    },

    // A brief amber pulse round the edge of the screen.
    edgeFlash() {
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = [
            'position:fixed', 'inset:0', 'pointer-events:none', 'z-index:100',
            'opacity:0', 'transition:opacity .16s ease',
            'box-shadow:inset 0 0 120px 40px rgba(255,150,40,0.75)'
        ].join(';');
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; }, 220);
        setTimeout(() => { el.style.opacity = '1'; }, 380);
        setTimeout(() => { el.style.opacity = '0'; }, 560);
        setTimeout(() => el.remove(), 900);
    }
};
