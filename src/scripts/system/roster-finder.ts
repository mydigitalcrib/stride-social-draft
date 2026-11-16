// The roster's viewfinder (talent/RosterBrowser.astro with its tools: /talent/roster, every screen; a tap aims on touch, a
// second tap takes the shot), the photocall's camera
// on the roster: over the photographs the pointer is a viewfinder that locks onto the one under it, with their name and
// what a click does. A click on a photograph takes the shot: the creator goes into the shortlist (the card's own keep
// button, so shortlist.ts keeps the list) with a flash, the shutter and their print flying into the tray (shot.ts); a
// second click takes them out. A click on a name opens their profile over the page (creator-sheet.ts); the card's own
// buttons and links work as ever.
// - The keyboard gets the same camera: focus on a card's name or button aims the viewfinder at it.
// - A press on a photograph (or Space and Enter on a card's button) half-presses the shutter: the viewfinder closes in
//   and the photo hunts for focus once; the release takes the shot.
// - The flash on a photo comes once the viewfinder has settled on it, and never more than about two a second.
// - A creator added in any roster on the page gets their ring drawn round them, and taken out it unwinds (the styles are
//   RosterBrowser.astro's: .is-selecting, .is-blooming, .is-unselecting).
import { takeShot } from './shot';
import { uiScale } from './scale';
import { reduced, tapWords } from './env';

const FOLLOW = 0.24;
const FLASH_DWELL = 140; // ms the viewfinder rests on a photo before its flash
const FLASH_REST = 450; // ms: at most one flash in this long
const SWEEP = 520; // ms: the ring drawn round a creator added (as in the component)
const UNSWEEP = 300; // ms: and unwound

/** The ring round a creator's card as they're added, or unwound as they're taken out. */
const rings = new WeakMap<HTMLElement, number>();
function ringFor(card: HTMLElement, kept: boolean) {
  if (reduced()) return;
  window.clearTimeout(rings.get(card));
  card.classList.remove('is-selecting', 'is-blooming', 'is-unselecting');
  if (kept) {
    card.classList.add('is-selecting');
    rings.set(
      card,
      window.setTimeout(() => {
        // The steady ring, without its glow for a frame, then the glow blooms in.
        card.classList.replace('is-selecting', 'is-blooming');
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('is-blooming')));
      }, SWEEP),
    );
  } else {
    card.classList.add('is-unselecting');
    rings.set(card, window.setTimeout(() => card.classList.remove('is-unselecting'), UNSWEEP));
  }
}

// Every way of adding a creator in a roster ends in a click on their card's keep button (a click on the photo presses
// it, shootOnClick); shortlist.ts takes that click on the document, before it goes any further, so it's caught here on
// its way down, just ahead of it, while it still says what it was.
let ringing = false;
function initRings() {
  if (ringing) return;
  ringing = true;
  window.addEventListener(
    'click',
    (e) => {
      const keep = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-roster-grid] .ccc__keep[data-keep]') : null;
      const card = keep?.closest<HTMLElement>('[data-roster-card]');
      if (keep && card) ringFor(card, keep.getAttribute('aria-pressed') !== 'true');
    },
    true,
  );
}

/** A click on a photograph in a roster's grid (not on a name, a button or a link) adds the creator, or takes them out:
    the card's own keep button, so shortlist.ts keeps the list, and when added, the shot. */
export function shootOnClick(grid: HTMLElement, after?: () => void) {
  initRings();
  grid.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = e.target as Element;
    if (target.closest('a, button')) return;
    const c = target.closest<HTMLElement>('[data-roster-card]');
    const keep = c?.querySelector<HTMLButtonElement>('.ccc__keep');
    if (!c || !keep) return;
    e.preventDefault();
    keep.click();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        after?.();
        if (keep.getAttribute('aria-pressed') !== 'true' || reduced()) return;
        const photo = c.querySelector<HTMLImageElement>('.ccc__photo img');
        const rect = (c.querySelector('.ccc__photo') ?? c).getBoundingClientRect();
        takeShot({ rect, src: photo?.currentSrc || photo?.src || '', name: c.getAttribute('aria-label') ?? '', id: keep.dataset.keepId });
        // The wall behind catches the flash (TalentWall.astro).
        document.dispatchEvent(new CustomEvent('talent:flash', { detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: Math.max(rect.width, 200 * uiScale()), power: 1 } }));
        c.querySelector('.ccc__photo')?.animate([{ scale: '1' }, { scale: '1.05' }, { scale: '1' }], { duration: 420, easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)' });
      }),
    );
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
    const words = { shoot: tapWords(finder.dataset.shoot ?? ''), kept: tapWords(finder.dataset.kept ?? ''), open: finder.dataset.open ?? '' };

    let card: HTMLElement | null = null;
    let over = false;
    let focused = false;
    let what: 'photo' | 'name' | 'other' = 'photo';
    const cur = { x: 0, y: 0, w: 0, h: 0 };
    let placed = false;
    let raf = 0;
    let last = 0;
    let dwell = 0;
    let flashed = -Infinity;

    const say = () => {
      nameEl.textContent = card?.getAttribute('aria-label') ?? '';
      const kept = card?.querySelector('.ccc__keep')?.getAttribute('aria-pressed') === 'true';
      actionEl.textContent = !card ? '' : what === 'name' ? words.open : what === 'other' ? '' : kept ? words.kept : words.shoot;
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

    // The flash on a photo, once the viewfinder has settled there (and not too soon after the last).
    const flash = (c: HTMLElement) => {
      if (c !== card) return;
      flashed = performance.now();
      c.classList.remove('is-flashing');
      c.classList.add('is-flashing');
      window.setTimeout(() => c.classList.remove('is-flashing'), 460);
    };

    const aim = (c: HTMLElement | null) => {
      if (c === card) return;
      card?.classList.remove('is-aimed');
      card = c;
      card?.classList.add('is-aimed');
      window.clearTimeout(dwell);
      if (card && !reduced()) {
        finder.classList.remove('is-locking');
        void finder.offsetWidth;
        finder.classList.add('is-locking');
        window.setTimeout(() => finder.classList.remove('is-locking'), 240);
        const settled = card;
        dwell = window.setTimeout(() => flash(settled), Math.max(FLASH_DWELL, flashed + FLASH_REST - performance.now()));
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
    // that second tap takes the shot (the first one's click is held back here, before shootOnClick).
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
    grid.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && (e.target as Element).closest('.ccc__keep')) half(true);
    });
    grid.addEventListener('keyup', () => half(false));

    // The shot: a click on the photograph itself.
    shootOnClick(grid, () => {
      half(false);
      say();
    });
  });
}
