/**
 * Lost: the Swan hatch. The celebration is the timer running out - the
 * split-flap counter over the running-total card falls from 108:00 to
 * 000:00, accelerating, then SYSTEM FAILURE, then resets. Pure DOM.
 */
const HatchTimerAnimation = {
    play(options) {
        const opts = options || {};
        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const b = (opts.bounds && opts.bounds.width) ? opts.bounds : {
            left: window.innerWidth * 0.5 - 200, top: window.innerHeight * 0.24,
            width: 400, height: 150
        };

        this.counter(b, reduce);
    },

    counter(b, reduce) {
        const glyphs = '108:00'.split('');
        const row = document.createElement('div');
        row.className = 'hatch-timer';
        row.setAttribute('aria-hidden', 'true');
        row.style.cssText = [
            'position:fixed', 'z-index:100', 'pointer-events:none',
            'left:' + Math.round(b.left + b.width / 2) + 'px',
            'top:' + Math.round(b.top + b.height / 2) + 'px',
            'transform:translate(-50%,-50%)', 'display:flex', 'gap:4px',
            'opacity:0', 'transition:opacity .4s ease'
        ].join(';');

        const cells = glyphs.map(ch => {
            const cell = document.createElement('span');
            cell.className = 'hatch-cell';
            cell.textContent = ch;
            row.appendChild(cell);
            return cell;
        });

        const caption = document.createElement('div');
        caption.className = 'hatch-caption';
        caption.textContent = '';
        row.appendChild(caption);

        document.body.appendChild(row);
        requestAnimationFrame(() => { row.style.opacity = '1'; });

        const format = (secs) => {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return String(m).padStart(3, '0') + ':' + String(s).padStart(2, '0');
        };
        const setGlyphs = (str, flip) => {
            str.split('').forEach((ch, i) => {
                if (!cells[i] || cells[i].textContent === ch) return;
                cells[i].textContent = ch;
                if (flip) {
                    cells[i].classList.remove('flip');
                    void cells[i].offsetWidth;
                    cells[i].classList.add('flip');
                }
            });
        };

        const fail = () => {
            cells.forEach(c => c.classList.add('alarm'));
            this.edgeFlash();
            caption.textContent = 'SYSTEM FAILURE';
            setTimeout(() => {
                cells.forEach(c => c.classList.remove('alarm'));
                setGlyphs('108:00', false);
                caption.textContent = '';
                row.style.opacity = '0';
            }, reduce ? 900 : 800);
            setTimeout(() => row.remove(), (reduce ? 900 : 800) + 600);
        };

        if (reduce) {
            setTimeout(() => setGlyphs('000:00', false), 700);
            setTimeout(fail, 1300);
            return;
        }

        const startSecs = 108 * 60;
        const dur = 2400;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / dur);
            const secs = Math.round(startSecs * (1 - t * t));   // accelerating
            setGlyphs(format(secs), true);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                setGlyphs('000:00', true);
                setTimeout(fail, 260);
            }
        };
        requestAnimationFrame(step);
    },

    // A brief amber pulse round the edge of the screen.
    edgeFlash() {
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = [
            'position:fixed', 'inset:0', 'pointer-events:none', 'z-index:100',
            'opacity:0', 'transition:opacity .16s ease',
            'box-shadow:inset 0 0 120px 40px rgba(255,150,40,0.75)'
        ].join(';');
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; }, 220);
        setTimeout(() => { el.style.opacity = '1'; }, 380);
        setTimeout(() => { el.style.opacity = '0'; }, 560);
        setTimeout(() => el.remove(), 900);
    }
};
