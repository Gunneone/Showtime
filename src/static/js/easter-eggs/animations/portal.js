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
