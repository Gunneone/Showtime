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
