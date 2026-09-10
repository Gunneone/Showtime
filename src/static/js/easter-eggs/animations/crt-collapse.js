/**
 * Black Mirror: the celebration is the screen switching itself off. The burst
 * is replaced by an old-CRT power-down over the whole viewport - the picture
 * collapses to a bright line, the line to a dot, the dot goes out - then the
 * page comes back. This one is deliberately full-screen: the whole "screen"
 * is the black mirror, not just the card. Pure DOM, nothing on the canvas.
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
