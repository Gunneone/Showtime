// Showtime easter eggs - EasterEggs registry + per-show dispatch, and shared helpers

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
        // The Pokémon shows throw a fistful of Poké Balls, the same idea as
        // Dragon Ball's seven spheres but a whole handful of them.
        pokemon: {
            celebration: 'pokeballs'
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
        // Black Mirror: the celebration is the screen switching itself off,
        // CRT-style.
        blackMirror: {
            celebration: 'crtCollapse'
        },
        // Lost: the watch-time reads off the Swan hatch's split-flap counter,
        // and the celebration is the timer running out - 108:00 down to zero,
        // then system failure - while the numbers rain down.
        lost: {
            cardClass: 'easter-egg-swan',
            celebration: 'hatchTimer'
        },
        // Game of Thrones and House of the Dragon: the confetti flies up as
        // usual, then a dragon off-screen breathes fire across it from the
        // side - and every piece it touches chars to a coal and drops like a
        // stone.
        gameOfThrones: {
            celebration: 'dragonfire'
        },
        // How to Sell Drugs Online (Fast): Moritz's bedroom operation, so the
        // burst is a shower of round pressed party pills - candy colours, a
        // score line, and a different symbol stamped into each one.
        howToSellDrugsOnline: {
            celebration: 'partyPills'
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
        4607: 'lost',            // Lost (2004)
        1399: 'gameOfThrones',   // Game of Thrones (2011)
        94997: 'gameOfThrones',  // House of the Dragon (2022)
        88236: 'howToSellDrugsOnline',  // How to Sell Drugs Online (Fast) (2019)
        60572: 'pokemon',        // Pokémon (1997)
        13230: 'pokemon',        // Pokémon Chronicles (2002)
        61295: 'pokemon',        // Pokémon Origins (2013)
        67882: 'pokemon',        // Pokémon Generations (2016)
        96420: 'pokemon',        // Pokémon: Twilight Wings (2020)
        104518: 'pokemon',       // POKÉTOON (2020)
        132636: 'pokemon',       // Pokémon Evolutions (2021)
        199966: 'pokemon',       // Pokémon: Hisuian Snow (2022)
        207567: 'pokemon',       // Pokémon: The Arceus Chronicles (2022)
        220150: 'pokemon',       // Pokémon Horizons: The Series (2023)
        221301: 'pokemon',       // Pokémon Concierge (2023)
        232214: 'pokemon',       // Pokémon: Paldean Winds (2023)
        232215: 'pokemon'        // Pokémon: Path to the Peak (2023)
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
        pokeballs(options) {
            PokeballAnimation.fire(options);
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
        },
        dragonfire(options) {
            DragonfireAnimation.play(options);
        },
        partyPills(options) {
            PartyPillAnimation.fire(options);
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
        pokeballs() {
            PokeballAnimation.ready();
        },
        donuts() {
            DonutAnimation.ready();
        },
        abduction() {
            AbductionAnimation.ready();
        },
        dragonfire() {
            DragonfireAnimation.ready();
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
