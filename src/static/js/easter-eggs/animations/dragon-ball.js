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
