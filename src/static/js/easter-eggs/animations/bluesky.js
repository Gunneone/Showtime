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
