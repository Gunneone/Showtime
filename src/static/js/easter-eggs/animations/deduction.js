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
