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
