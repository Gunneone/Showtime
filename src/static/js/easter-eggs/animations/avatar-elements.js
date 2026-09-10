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
