/**
 * Stranger Things: Joyce's Christmas-light alphabet wall. A full A-Z painted
 * across the running-total card on a drooping wire of bulbs. A few bulbs
 * flicker first, then the word is spelt out one glowing bulb at a time, held,
 * pulsed and faded away. Pure DOM - no canvas.
 */
const AlphabetWallAnimation = {
    word: 'RUN',
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    colours: ['#ff5a5a', '#ffd23f', '#4dff6a', '#4db8ff', '#ff7ad2', '#ffa64d'],

    play(options) {
        const opts = options || {};
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Like every celebration, the wall hangs off the running-total card at
        // the top - never the individual show card, and never just pinned to
        // the viewport.
        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: window.innerWidth * 0.5 - 260, top: window.innerHeight * 0.24,
            width: 520, height: 180
        };

        const letters = this.alphabet.split('');
        const n = letters.length;

        // Everything is sized off one cell's width, so 26 bulbs and their
        // letters fit across the card however wide it is.
        const cell = b.width / n;
        const bulbW = Math.max(6, Math.min(16, cell * 0.62));
        const fontPx = Math.max(9, Math.min(20, cell * 0.82));
        const gapPx = Math.max(4, Math.round(fontPx * 0.5));
        const padY = Math.round(fontPx * 1.3);

        const wrap = document.createElement('div');
        wrap.setAttribute('aria-hidden', 'true');
        wrap.style.cssText = [
            'position:fixed', 'box-sizing:border-box', 'z-index:100',
            'left:' + Math.round(b.left) + 'px', 'top:' + Math.round(b.top) + 'px',
            'width:' + Math.round(b.width) + 'px',
            'pointer-events:none', 'padding:' + padY + 'px 4px ' + Math.round(padY * 1.2) + 'px',
            'opacity:0', 'transition:opacity .35s ease',
            'font-family:Georgia,"Times New Roman",serif',
            'background:linear-gradient(180deg,rgba(6,8,14,0.92),rgba(6,8,14,0.55) 68%,transparent)'
        ].join(';');

        // A wire that sags between every bulb.
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 1000 46');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.cssText = 'position:absolute;left:0;width:100%;top:' +
            Math.round(padY * 0.5) + 'px;height:' + Math.round(fontPx * 2) + 'px;';
        let d = 'M 0 10';
        for (let i = 0; i < n; i++) {
            const x = ((i + 0.5) / n) * 1000;
            const prevX = i === 0 ? 0 : ((i - 0.5) / n) * 1000;
            d += ' Q ' + ((prevX + x) / 2).toFixed(1) + ' 40 ' + x.toFixed(1) + ' 12';
        }
        d += ' Q 999 40 1000 10';
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(28,30,38,0.95)');
        path.setAttribute('stroke-width', '3');
        svg.appendChild(path);
        wrap.appendChild(svg);

        const row = document.createElement('div');
        row.style.cssText = 'position:relative;display:flex;justify-content:space-between;align-items:flex-end;';
        const cells = letters.map((ch, i) => {
            const cell = document.createElement('div');
            cell.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:' + gapPx + 'px;';

            const bulb = document.createElement('div');
            bulb.style.cssText = [
                'width:' + bulbW.toFixed(1) + 'px', 'height:' + (bulbW * 1.3).toFixed(1) + 'px',
                'border-radius:50% 50% 50% 50% / 60% 60% 40% 40%',
                'background:#2c2c31', 'transition:background .1s ease,box-shadow .1s ease'
            ].join(';');

            const letter = document.createElement('div');
            letter.textContent = ch;
            letter.style.cssText = [
                'font-size:' + fontPx.toFixed(1) + 'px', 'font-weight:700',
                'color:rgba(210,200,190,0.22)', 'letter-spacing:0.02em',
                'transition:color .12s ease,text-shadow .12s ease'
            ].join(';');

            cell.appendChild(bulb);
            cell.appendChild(letter);
            row.appendChild(cell);
            return { bulb: bulb, letter: letter, colour: this.colours[i % this.colours.length] };
        });
        wrap.appendChild(row);
        document.body.appendChild(wrap);
        requestAnimationFrame(() => { wrap.style.opacity = '1'; });

        const on = (c, lit, strong) => {
            c.bulb.style.background = lit ? c.colour : '#2c2c31';
            c.bulb.style.boxShadow = lit
                ? '0 0 ' + (strong ? '22px 8px ' : '12px 4px ') + c.colour
                : 'none';
            c.letter.style.color = lit ? '#fff' : 'rgba(210,200,190,0.22)';
            c.letter.style.textShadow = lit ? '0 0 16px ' + c.colour : 'none';
        };

        const at = (ch) => cells[this.alphabet.indexOf(ch)];
        const timers = [];
        const after = (ms, fn) => timers.push(setTimeout(fn, ms));
        const done = () => { timers.forEach(clearTimeout); wrap.remove(); };

        if (reduce) {
            this.word.split('').forEach(ch => on(at(ch), true, true));
            after(1900, () => { wrap.style.transition = 'opacity 1s ease'; wrap.style.opacity = '0'; });
            after(3000, done);
            return;
        }

        // 1. A few bulbs flicker first - the lights are trying to talk.
        for (let f = 0; f < 6; f++) {
            const c = cells[Math.floor(Math.random() * cells.length)];
            after(150 + f * 170, () => on(c, true));
            after(150 + f * 170 + 85, () => on(c, false));
        }

        // 2. Spell the word, one glowing bulb at a time.
        const start = 1300;
        const step = 520;
        this.word.split('').forEach((ch, i) => {
            after(start + i * step, () => on(at(ch), true, true));
        });

        // 3. Hold, pulse once, fade the wall away.
        const held = start + this.word.length * step;
        after(held + 650, () => this.word.split('').forEach(ch => on(at(ch), true)));
        after(held + 800, () => this.word.split('').forEach(ch => on(at(ch), true, true)));
        after(held + 1600, () => { wrap.style.transition = 'opacity 1.1s ease'; wrap.style.opacity = '0'; });
        after(held + 2800, done);
    }
};
