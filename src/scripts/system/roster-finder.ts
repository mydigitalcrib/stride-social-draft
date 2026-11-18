// The roster's viewfinder (talent/RosterBrowser.astro with its tools: /talent/roster, every screen; a tap aims on touch, a
// second tap takes the shot), the photocall's camera
// on the roster: over the photographs the pointer is a viewfinder that locks onto the one under it, with their name and
// what a click does. A click on a photograph, or on a name, opens their profile over the page (creator-sheet.ts, by way of
// the card's name link); the card's own buttons and links work as ever. (Creators used to be added to a tray with a
// shot; that went on 2026-11-18, the owner.)
// - The keyboard gets the same camera: focus on a card's name or button aims the viewfinder at it.
// - A press on a photograph half-presses the shutter: the viewfinder closes in and the photo hunts for focus once.
// - No camera flash, on the photo or the wall (the owner, 2026-11-18: "very distracting").
import { uiScale } from './scale';
import { reduced, tapWords } from './env';

const FOLLOW = 0.24;

/** A click on a photograph in a roster's grid (not on a name, a button or a link) opens that creator's profile, as their
    name does: the click goes on to the card's name link, which creator-sheet.ts takes. */
export function openOnClick(grid: HTMLElement, after?: () => void) {
  grid.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = e.target as Element;
    if (target.closest('a, button')) return;
    const name = target.closest<HTMLElement>('[data-roster-card]')?.querySelector<HTMLAnchorElement>('.ccc__name a');
    if (!name) return;
    e.preventDefault();
    after?.();
    name.click();
  });
}

export function initRosterFinders() {
  document.querySelectorAll<HTMLElement>('[data-roster]:not([data-glimpse])').forEach((root) => {
    const grid = root.querySelector<HTMLElement>('[data-roster-grid]');
    const finder = root.querySelector<HTMLElement>('[data-roster-finder]');
    const dot = root.querySelector<HTMLElement>('[data-roster-dot]');
    const nameEl = finder?.querySelector<HTMLElement>('[data-rf-name]');
    const actionEl = finder?.querySelector<HTMLElement>('[data-rf-action]');
    if (!grid || !finder || !dot || !nameEl || !actionEl || finder.dataset.ready) return;
    finder.dataset.ready = 'true';
    grid.setAttribute('data-own-cursor', '');
    const words = { shoot: tapWords(finder.dataset.shoot ?? ''), open: finder.dataset.open ?? '' };

    let card: HTMLElement | null = null;
    let over = false;
    let focused = false;
    let what: 'photo' | 'name' | 'other' = 'photo';
    const cur = { x: 0, y: 0, w: 0, h: 0 };
    let placed = false;
    let raf = 0;
    let last = 0;

    const say = () => {
      nameEl.textContent = card?.getAttribute('aria-label') ?? '';
      actionEl.textContent = !card ? '' : what === 'name' ? words.open : what === 'other' ? '' : words.shoot;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!card) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const k = uiScale();
      const b = root.getBoundingClientRect();
      const r = (card.querySelector('.ccc__photo') ?? card).getBoundingClientRect();
      const t = { x: r.left - b.left - 8 * k, y: r.top - b.top - 8 * k, w: r.width + 16 * k, h: r.height + 16 * k };
      const f = reduced() || !placed ? 1 : 1 - Math.pow(1 - FOLLOW, dt * 60);
      placed = true;
      cur.x += (t.x - cur.x) * f;
      cur.y += (t.y - cur.y) * f;
      cur.w += (t.w - cur.w) * f;
      cur.h += (t.h - cur.h) * f;
      finder.style.setProperty('--x', `${cur.x.toFixed(1)}px`);
      finder.style.setProperty('--y', `${cur.y.toFixed(1)}px`);
      finder.style.setProperty('--w', `${cur.w.toFixed(1)}px`);
      finder.style.setProperty('--h', `${cur.h.toFixed(1)}px`);
      if (over || Math.abs(t.x - cur.x) + Math.abs(t.y - cur.y) > 0.5) raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const aim = (c: HTMLElement | null) => {
      if (c === card) return;
      card?.classList.remove('is-aimed');
      card = c;
      card?.classList.add('is-aimed');
      if (card && !reduced()) {
        finder.classList.remove('is-locking');
        void finder.offsetWidth;
        finder.classList.add('is-locking');
        window.setTimeout(() => finder.classList.remove('is-locking'), 240);
      }
    };

    // Half-pressing the shutter: the viewfinder closes in, and the photo hunts for focus once.
    const half = (on: boolean) => {
      if (on === finder.classList.contains('is-half')) return;
      finder.classList.toggle('is-half', on);
      if (!on || reduced()) return;
      const k = uiScale();
      card?.querySelector('.ccc__photo img')?.animate(
        [{ filter: 'blur(0px)' }, { filter: `blur(${1.6 * k}px)`, offset: 0.35 }, { filter: `blur(${0.4 * k}px)`, offset: 0.7 }, { filter: 'blur(0px)' }],
        { duration: 280, easing: 'ease-out' },
      );
    };

    grid.addEventListener('pointerenter', () => {
      over = true;
      finder.classList.add('is-on');
      root.classList.add('is-aiming');
    });
    grid.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return; // a finger lifting leaves the viewfinder locked where it touched
      over = false;
      half(false);
      root.classList.remove('is-aiming');
      if (focused) return;
      finder.classList.remove('is-on');
      aim(null);
    });
    grid.addEventListener('pointermove', (e) => {
      const b = root.getBoundingClientRect();
      dot.style.transform = `translate(${e.clientX - b.left}px, ${e.clientY - b.top}px)`;
      const target = e.target as Element;
      const c = target.closest<HTMLElement>('[data-roster-card]');
      if (!c || c.hidden || c.classList.contains('is-out')) return;
      what = target.closest('.ccc__name') ? 'name' : target.closest('a, button') ? 'other' : 'photo';
      if (c !== card) half(false);
      aim(c);
      say();
      run();
    });
    // A finger: its tap locks the viewfinder onto the photograph it touched, with its name and what a second tap does;
    // that second tap takes the shot (the first one's click is held back here, before openOnClick).
    let aimedBefore = false;
    let byTouch = false;
    grid.addEventListener('pointerdown', (e) => {
      byTouch = e.pointerType === 'touch';
      const target = e.target as Element;
      if (byTouch) {
        const c = target.closest<HTMLElement>('[data-roster-card]');
        aimedBefore = !!c && c === card;
        if (c && !c.hidden && !c.classList.contains('is-out') && !target.closest('a, button')) {
          over = true;
          finder.classList.add('is-on');
          what = 'photo';
          aim(c);
          say();
          run();
        }
        if (!aimedBefore) return;
      }
      if (e.button !== 0 || !card || target.closest('a, button')) return;
      half(true);
    });
    grid.addEventListener('click', (e) => {
      if (!byTouch || aimedBefore || (e.target as Element).closest('a, button')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || grid.contains(e.target as Node) || !card) return;
      over = false;
      finder.classList.remove('is-on');
      aim(null);
    });
    grid.addEventListener('pointerup', () => half(false));
    grid.addEventListener('pointercancel', () => half(false));

    // The keyboard: the viewfinder on the card in focus (its name opens the profile; its buttons say what they do).
    grid.addEventListener('focusin', (e) => {
      const target = e.target as Element;
      const c = target.closest<HTMLElement>('[data-roster-card]');
      if (!c) return;
      // Only the keyboard's focus: a button the pointer pressed keeps focus, and mustn't keep the viewfinder up.
      focused = target.matches(':focus-visible');
      if (!focused) return;
      what = target.closest('.ccc__name') ? 'name' : 'other';
      finder.classList.add('is-on');
      aim(c);
      say();
      run();
    });
    grid.addEventListener('focusout', (e) => {
      if (grid.contains(e.relatedTarget as Node | null)) return;
      focused = false;
      half(false);
      if (over) return;
      finder.classList.remove('is-on');
      aim(null);
    });
    // A click on the photograph itself: their profile.
    openOnClick(grid, () => half(false));
  });
}
