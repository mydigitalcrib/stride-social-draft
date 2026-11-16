// Behaviour for talent/CareerBuilder.astro: services are picked and unpicked, the plan fills up, and the link to the
// application form carries what was picked. Phones and tablets: tiles with switches, the plan's list beside them.
// Desktop: a stage in the dark. A soft light follows the pointer (eased, a share of the way each frame) and brings the
// words near it out of the dark (--near); the one under it explains itself on the left; a click puts it in the spotlight
// (the styles do the lamp's flicker); with all of them lit the stage comes up (.is-all). The keyboard gets the same: the
// light goes to the service in focus.
// The lamps behave like lamps (desktop, with motion): switched on, one swings in from the side it hangs on and settles;
// switched off, its filament cuts out and the light dies away, the pool where it fell going last (.is-cooling); the
// last one switched on sends a chase down the rig before the stage comes up; the count beside Apply slides to its new
// figure, up as one is added, down as one goes.
import { uiScale } from './scale';
import { desktop, reduced } from './env';

const FOLLOW = 0.14; // per frame (at 60 a second), the share of the way the light covers
const REACH = 260; // px at 1920×1080 (growing with a larger screen) from the light at which a word is back in the dark
const NEAR_STEP = 0.02; // how finely the light's reach is told to the words (fewer repaints for the same look)
const SWING = 1100; // ms: a lamp swinging into place
const COOL = 900; // ms: a lamp's light dying away
const POOL = 1000; // ms: and the pool where it fell
const CHASE_AFTER = 420; // ms after the last one is lit, the chase starts
const CHASE_STEP = 70; // ms between lamps in the chase
const CHASE = 280; // ms each lamp's pulse

export function initCareers() {
  document.querySelectorAll<HTMLElement>('[data-career]').forEach((root) => {
    if (root.dataset.careerReady) return;
    root.dataset.careerReady = 'true';
    const tiles = [...root.querySelectorAll<HTMLButtonElement>('[data-career-tile]')];
    const list = root.querySelector<HTMLElement>('[data-career-list]');
    const empty = root.querySelector<HTMLElement>('[data-career-empty]');
    const count = root.querySelector<HTMLElement>('[data-career-count]');
    const apply = root.querySelector<HTMLAnchorElement>('[data-career-apply]');
    const base = root.dataset.apply ?? '/talent/apply';

    // How the count and the stage's coming up are shown (the desktop's own, below).
    let showCount = (text: string, _by: number) => {
      if (count) count.textContent = text;
    };
    let showAll = (all: boolean) => {
      root.classList.toggle('is-all', all);
    };
    let lit = 0;

    const render = () => {
      const on = tiles.filter((t) => t.getAttribute('aria-pressed') === 'true').map((t) => t.dataset.careerTile ?? '');
      if (list) {
        // Only new ones are added, so only they pop.
        [...list.children].forEach((li) => {
          if (!on.includes(li.textContent ?? '')) li.remove();
        });
        on.forEach((label) => {
          if ([...list.children].some((li) => li.textContent === label)) return;
          const li = document.createElement('li');
          li.textContent = label;
          list.append(li);
        });
      }
      if (empty) empty.hidden = on.length > 0;
      showCount(`${on.length} / ${tiles.length}`, Math.sign(on.length - lit));
      lit = on.length;
      root.style.setProperty('--plan', String(on.length / Math.max(1, tiles.length)));
      root.classList.toggle('is-planned', on.length > 0);
      showAll(on.length === tiles.length && tiles.length > 0);
      if (apply) apply.href = on.length ? `${base}?needs=${encodeURIComponent(on.join('|'))}` : base;
    };

    tiles.forEach((t) =>
      t.addEventListener('click', () => {
        t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true'));
        render();
      }),
    );
    render();

    if (!desktop()) return;

    // ---------- Desktop ----------
    // The shortlist's tray steps away while the plan is on screen: it sat over Apply for management.
    const shortlist = document.querySelector<HTMLElement>('[data-tray="creators"]');
    if (shortlist) {
      new IntersectionObserver(([entry]) => shortlist.classList.toggle('is-away', entry.isIntersecting), { threshold: 0.35 }).observe(root);
    }

    // ---------- The lamps ----------
    const beamOf = (t: HTMLElement) => t.querySelector<HTMLElement>('.career__beam');
    const cooling = new Map<HTMLElement, { anims: Animation[]; timer: number }>();
    const stopCooling = (t: HTMLElement) => {
      const c = cooling.get(t);
      if (!c) return;
      window.clearTimeout(c.timer);
      c.anims.forEach((a) => a.cancel());
      t.classList.remove('is-cooling');
      cooling.delete(t);
    };
    // Switched on: it swings in from the side it hangs on, past, back, and settles, alongside the styles' flicker.
    const lampOn = (t: HTMLElement) => {
      stopCooling(t);
      const beam = beamOf(t);
      if (!beam) return;
      const d = -Math.sign(parseFloat(t.style.getPropertyValue('--hang')) || 0) || 1;
      beam.animate(
        [{ rotate: `${1.6 * d}deg` }, { rotate: `${-0.7 * d}deg`, offset: 0.45 }, { rotate: `${0.25 * d}deg`, offset: 0.75 }, { rotate: '0deg' }],
        { duration: SWING, easing: 'cubic-bezier(0.25, 0.8, 0.3, 1)' },
      );
    };
    // Switched off: the filament cuts out (a drop to a glow), then the cone dies away and the pool it left goes last.
    // The beam itself is held up while its two parts fade, and let go once they have.
    const lampOff = (t: HTMLElement) => {
      stopCooling(t);
      const beam = beamOf(t);
      if (!beam) return;
      t.classList.add('is-cooling');
      const anims = [
        beam.animate([{ opacity: 1 }, { opacity: 1 }], { duration: POOL }),
        beam.animate([{ opacity: 1 }, { opacity: 0.3, offset: 120 / COOL }, { opacity: 0 }], { duration: COOL, easing: 'ease-out', pseudoElement: '::before', fill: 'forwards' }),
        beam.animate([{ opacity: 1 }, { opacity: 0.6, offset: 0.12 }, { opacity: 0 }], { duration: POOL, easing: 'ease-out', pseudoElement: '::after', fill: 'forwards' }),
      ];
      cooling.set(t, { anims, timer: window.setTimeout(() => stopCooling(t), POOL + 120) });
    };
    tiles.forEach((t) =>
      t.addEventListener('click', () => {
        if (reduced()) return;
        if (t.getAttribute('aria-pressed') === 'true') lampOn(t);
        else lampOff(t);
      }),
    );

    // All of them lit (from one short): a chase down the rig, top to bottom, then the whole stage comes up.
    let finale = 0;
    let chase: Animation[] = [];
    showAll = (all) => {
      window.clearTimeout(finale);
      if (!all) {
        // One switched off: the chase stops where it is (a lamp going off mustn't pulse back on).
        chase.forEach((a) => a.cancel());
        chase = [];
        return root.classList.remove('is-all');
      }
      if (root.classList.contains('is-all')) return;
      if (reduced()) return root.classList.add('is-all');
      finale = window.setTimeout(() => {
        chase = tiles.flatMap((t, i) => beamOf(t)?.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: CHASE, delay: i * CHASE_STEP, easing: 'ease-in-out' }) ?? []);
        finale = window.setTimeout(() => root.classList.add('is-all'), (tiles.length - 1) * CHASE_STEP + CHASE);
      }, CHASE_AFTER);
    };

    // The count slides to its new figure: the old one out (up when one's added, down when one goes), the new one in from
    // the other side. Clicks while it's on its way only change what comes in.
    let countOut: Animation | null = null;
    let countNext = '';
    let countBy = 0;
    showCount = (text, by) => {
      if (!count) return;
      countNext = text;
      countBy = by || countBy;
      if (reduced() || !by) {
        if (!countOut) count.textContent = text;
        return;
      }
      if (countOut) return;
      countOut = count.animate([{ translate: '0 0', opacity: 1 }, { translate: `0 ${-by * 0.3}em`, opacity: 0 }], { duration: 140, easing: 'ease-in', fill: 'forwards' });
      const arrive = () => {
        countOut?.cancel();
        countOut = null;
        count.textContent = countNext;
        count.animate([{ translate: `0 ${countBy * 0.3}em`, opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' });
      };
      countOut.finished.then(arrive, arrive);
    };

    // The one pointed at explains itself on the left.
    const peek = root.querySelector<HTMLElement>('[data-career-peek]');
    const say = (t: HTMLElement | null) => {
      root.classList.toggle('is-peeking', !!t?.dataset.copy);
      if (peek && t?.dataset.copy) peek.textContent = t.dataset.copy;
    };
    tiles.forEach((t) => {
      t.addEventListener('pointerenter', () => say(t));
      t.addEventListener('pointerleave', () => say(null));
      t.addEventListener('focus', () => t.matches(':focus-visible') && say(t));
      t.addEventListener('blur', () => say(null));
    });

    // The light that follows the pointer (or the keyboard), and the words it brings out of the dark.
    const stage = root.querySelector<HTMLElement>('[data-career-stage]');
    const light = root.querySelector<HTMLElement>('[data-career-light]');
    if (!stage || !light || reduced()) return;
    const names = tiles.map((t) => t.querySelector<HTMLElement>('.career__name') ?? t);
    // Where each word is on the stage (they don't move on it; measured again as the pointer comes onto it and when the
    // screen changes size).
    let rects: { l: number; t: number; r: number; b: number }[] | null = null;
    const nears = tiles.map(() => '');
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;
    let last = 0;
    let placed = false;
    let inside = false;
    let pointerIn = false;
    let focusIn = false;
    let client = { x: 0, y: 0 };
    const tell = (i: number, near: number) => {
      const v = (Math.round(near / NEAR_STEP) * NEAR_STEP).toFixed(2);
      if (v === nears[i]) return;
      nears[i] = v;
      tiles[i].style.setProperty('--near', v);
    };
    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(3, (now - last) / (1000 / 60)) : 1;
      last = now;
      const k = placed ? 1 - Math.pow(1 - FOLLOW, dt) : 1;
      placed = true;
      x += (tx - x) * k;
      y += (ty - y) * k;
      light.style.setProperty('--lx', `${x.toFixed(1)}px`);
      light.style.setProperty('--ly', `${y.toFixed(1)}px`);
      // How near each word is to the light: from its nearest point, so a long line lights where the light is.
      if (!rects) {
        const box = stage.getBoundingClientRect();
        rects = names.map((n) => {
          const r = n.getBoundingClientRect();
          return { l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top };
        });
      }
      const reach = REACH * uiScale();
      rects.forEach((r, i) => {
        const dx = Math.max(r.l - x, 0, x - r.r);
        const dy = Math.max(r.t - y, 0, y - r.b);
        const near = inside ? Math.max(0, 1 - Math.hypot(dx, dy) / reach) : 0;
        tell(i, near * near);
      });
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.4) raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const aimAt = (cx: number, cy: number) => {
      const box = stage.getBoundingClientRect();
      tx = cx - box.left;
      ty = cy - box.top;
      run();
    };
    const lightUp = () => {
      inside = true;
      stage.classList.add('is-lit');
    };
    const lightDown = () => {
      if (pointerIn || focusIn) return;
      inside = false;
      stage.classList.remove('is-lit');
      tiles.forEach((_, i) => tell(i, 0));
    };
    stage.addEventListener('pointerenter', (e) => {
      const box = stage.getBoundingClientRect();
      // Measured afresh on each visit (the type may have loaded, or the page moved the section, since the last).
      rects = null;
      if (!placed) {
        x = e.clientX - box.left;
        y = e.clientY - box.top;
      }
      pointerIn = true;
      lightUp();
    });
    stage.addEventListener('pointermove', (e) => {
      client = { x: e.clientX, y: e.clientY };
      aimAt(e.clientX, e.clientY);
    });
    stage.addEventListener('pointerleave', () => {
      pointerIn = false;
      lightDown();
    });
    // The page scrolling under a still pointer: the light stays with the pointer.
    window.addEventListener('scroll', () => pointerIn && aimAt(client.x, client.y), { passive: true });
    window.addEventListener('resize', () => (rects = null), { passive: true });
    // The keyboard: the light goes to the service in focus.
    tiles.forEach((t, i) => {
      t.addEventListener('focus', () => {
        if (!t.matches(':focus-visible')) return;
        focusIn = true;
        const r = names[i].getBoundingClientRect();
        if (!placed) {
          const box = stage.getBoundingClientRect();
          x = r.left + r.width / 2 - box.left;
          y = r.top + r.height / 2 - box.top;
        }
        lightUp();
        aimAt(r.left + r.width / 2, r.top + r.height / 2);
      });
      t.addEventListener('blur', () => {
        focusIn = false;
        lightDown();
      });
    });
  });
}
