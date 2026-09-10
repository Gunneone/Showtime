/**
 * How to Sell Drugs Online (Fast): Moritz runs his shop out of his bedroom,
 * so the burst is a shower of round pressed party pills - domed candy-coloured
 * tablets with a bevelled edge, thrown up from the card and left to tumble
 * down. Most are stamped with a little debossed symbol (a smiley, a heart, a
 * star, a bolt); the rest are just scored down the middle.
 *
 * Hand-drawn on the shared particle canvas: each pill is a radial-gradient
 * disc with a highlight ring and a stamp pressed into its face, which a
 * single vendored image could not give per-pill colour and symbol.
 */
const PartyPillAnimation = {
    // Candy palette: a face colour, a lighter shade for the lit top of the
    // dome, and a darker shade for the rim.
    palette: [
        { face: '#ff8fc7', light: '#ffd6ec', dark: '#c74e91' },  // bubblegum
        { face: '#8fd9ff', light: '#d6f1ff', dark: '#3f89b8' },  // sky
        { face: '#b69bff', light: '#e4d9ff', dark: '#6f52c2' },  // lavender
        { face: '#9be7a6', light: '#d8f6dd', dark: '#4c9b5c' },  // mint
        { face: '#ffd36b', light: '#fff0c6', dark: '#c79626' },  // banana
        { face: '#ff9d6b', light: '#ffe0cd', dark: '#c76438' },  // tangerine
        { face: '#f3f0ea', light: '#ffffff', dark: '#b3ab9c' }   // aspirin white
    ],

    // What gets pressed into the face. The smiley - the show's own mark -
    // comes up more often than the rest; 'score' is a plain scored pill.
    stamps: ['smiley', 'smiley', 'smiley', 'heart', 'star', 'bolt', 'score', 'score'],

    /**
     * @param {Object} options
     * @param {number} options.originX         horizontal origin, 0-1 of viewport
     * @param {number} options.originY         vertical origin, 0-1 of viewport
     * @param {number} options.intensityFactor 0-1, scales speed, size and count
     */
    fire(options) {
        const opts = options || {};
        const intensity = Math.min(Math.max(opts.intensityFactor || 0, 0), 1);
        // A handful, like the dragon balls - not a screenful.
        const count = Math.round(8 + intensity * 4.8);

        const before = ParticleCanvas.particles.length;
        EasterEggUtils.fountain(options, count, (i, env) => {
            const entry = this.palette[Math.floor(Math.random() * this.palette.length)];
            const stamp = this.stamps[Math.floor(Math.random() * this.stamps.length)];
            return {
                // A hard, flat throw: strong gravity and a short life, so the
                // whole arc plays out twice as fast as a dragon-ball toss and
                // tops out at ~60% of the height.
                gravity: 0.105 * env.scale,
                ttl: Math.round((220 + intensity * 40) * 0.6),
                spin: (Math.random() - 0.5) * 0.12,
                // Every pill the same size - a tray of identical tablets.
                radius: 19 * Math.max(env.scale, 0.7),
                entry: entry,
                stamp: stamp,
                draw: (ctx, p) => this.drawPill(ctx, p.radius, p.entry, p.stamp)
            };
        });

        // Retune the throw the fountain just gave each pill. The extra upward
        // speed (x1.15) against the far stronger gravity above halves the time
        // to the apex and cuts its height to ~60%; the extra sideways speed
        // roughly keeps up with the shorter airtime, pulled back a little so
        // the fan sits higher and less flat.
        const pills = ParticleCanvas.particles;
        for (let k = before; k < pills.length; k++) {
            pills[k].vx *= 1.45;
            pills[k].vy *= 1.15;
        }
    },

    // One pill, centred on the origin. Kept cheap - a gradient fill and two
    // strokes, no canvas shadows - so a full burst holds 60fps like the
    // dragon balls do.
    drawPill(ctx, r, entry, stamp) {
        ctx.save();

        // Domed body, lit from the top left.
        const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        g.addColorStop(0, entry.light);
        g.addColorStop(0.55, entry.face);
        g.addColorStop(1, entry.dark);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Bevelled edge: a bright inner ring, a darker outer line.
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.lineWidth = Math.max(0.5, r * 0.05);
        ctx.stroke();

        if (stamp === 'score') {
            this.drawScore(ctx, r);
        } else {
            this.drawStamp(ctx, stamp, r * 0.6);
        }

        ctx.restore();
    },

    // An engraved groove across the pill: a dark cut with a light lower lip.
    drawScore(ctx, r) {
        const half = r * 0.65;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-half, r * 0.07);
        ctx.lineTo(half, r * 0.07);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-half, 0);
        ctx.lineTo(half, 0);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.24)';
        ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.stroke();
    },

    /**
     * Press a symbol into the face: the shape filled once in a pale tint
     * nudged downwards, then again dark on top, so it reads as cut into the
     * pill rather than printed on it.
     */
    drawStamp(ctx, symbol, s) {
        ctx.save();
        ctx.lineJoin = 'round';

        ctx.translate(0, s * 0.13);
        this.symbolPath(ctx, symbol, s);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        ctx.translate(0, -s * 0.13);
        this.symbolPath(ctx, symbol, s);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fill();

        ctx.restore();
    },

    // Build the path(s) for one symbol, sized to roughly +/- s. No fill here -
    // drawStamp fills it twice for the debossed look.
    symbolPath(ctx, symbol, s) {
        ctx.beginPath();

        if (symbol === 'smiley') {
            // Two eyes and a grin - the show's own smiley mark.
            [-1, 1].forEach(side => {
                ctx.moveTo(side * 0.34 * s + 0.13 * s, -0.2 * s);
                ctx.arc(side * 0.34 * s, -0.2 * s, 0.13 * s, 0, Math.PI * 2);
            });
            const cy = -0.02 * s;
            const outer = 0.6 * s;
            const inner = 0.44 * s;
            ctx.moveTo(Math.cos(0.16 * Math.PI) * outer, cy + Math.sin(0.16 * Math.PI) * outer);
            ctx.arc(0, cy, outer, 0.16 * Math.PI, 0.84 * Math.PI);
            ctx.arc(0, cy, inner, 0.84 * Math.PI, 0.16 * Math.PI, true);
            ctx.closePath();
            return;
        }

        if (symbol === 'heart') {
            ctx.moveTo(0, 0.58 * s);
            ctx.bezierCurveTo(-0.95 * s, -0.12 * s, -0.5 * s, -0.72 * s, 0, -0.3 * s);
            ctx.bezierCurveTo(0.5 * s, -0.72 * s, 0.95 * s, -0.12 * s, 0, 0.58 * s);
            ctx.closePath();
            return;
        }

        if (symbol === 'star') {
            for (let i = 0; i < 10; i++) {
                const rad = i % 2 === 0 ? 0.62 * s : 0.26 * s;
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(a) * rad;
                const y = Math.sin(a) * rad;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath();
            return;
        }

        // bolt: a zigzag lightning strike.
        const pts = [
            [0.2, -0.62], [-0.36, 0.1], [-0.02, 0.1],
            [-0.18, 0.62], [0.4, -0.14], [0.06, -0.14]
        ];
        pts.forEach(([x, y], i) => (
            i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)
        ));
        ctx.closePath();
    }
};
