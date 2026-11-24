// Cards that grow: choosing a [data-grow-card] grows its big card ([data-grow-detail], with the same
// key) out of it, over whatever holds them, with a clip that starts as the small card's outline. The
// close button, Escape or close() shrink it back into the card. The row behind goes inert meanwhile.
// With the script missing, or with a modified click, a card is an ordinary link.
// `hold` is for a big card that fills the screen: opening it brings the section to the top of the screen
// (unless `settle` is false: a wall stays exactly where it is) and the page stays put until it closes, its own
// contents still scrolling. A press anywhere else closes it.
// On every screen an open big card is modal (aria-modal; Tab and Shift+Tab go round inside it, for a tablet with a
// keyboard too). Desktop: with motion allowed it opens like a lens coming into focus, its photo settling and its words following it in, and closes clean: its contents
// fade before it shrinks back into the card. Every one of those animations ends with nothing left set.

import { uiScale } from './scale';
import { desktop, lenis, reduced } from './env';

// A corner of the clip, matching the cards' (22px) and the big card's (26px): on desktop they're in rem and grow with
// the screen past 1920×1080 (scale.ts), so the clip does too.
const corner = (px: number) => `${(px * (desktop() ? uiScale() : 1)).toFixed(2)}px`;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';
const SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** A spread (experience/BigCard.astro, `bigcard--spread`) never scrolls: if what it holds is taller than its room, its
 *  sizes come down (--fit) until it all fits, never below 0.7. A phone reads it as a page, so there it stays as drawn. */
function fit(detail: HTMLElement) {
  const box = detail.querySelector<HTMLElement>('[data-fit]');
  if (!box) return;
  box.style.removeProperty('--fit');
  if (getComputedStyle(box).overflowY !== 'hidden') return;
  // Too tall: the whole, or a column within it (a list running into the room kept for its arrow).
  const over = () => box.scrollHeight > box.clientHeight + 1 || [...box.querySelectorAll<HTMLElement>('.bigcard__block')].some((b) => b.scrollHeight > b.clientHeight + 1);
  let k = 1;
  for (let i = 0; i < 6 && k > 0.7 && over(); i++) {
    k = Math.max(0.7, k * Math.min(0.96, Math.sqrt(box.clientHeight / box.scrollHeight)));
    box.style.setProperty('--fit', k.toFixed(3));
  }
}

/** The big card's contents come in with its clip, as if a camera had just focused (desktop, motion allowed). */
function focusIn(detail: HTMLElement) {
  const run = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    if (!el) return;
    try {
      const a = el.animate(keyframes, { fill: 'backwards', ...options });
      a.finished.then(() => a.cancel(), () => {});
    } catch {
      /* a browser that can't animate this (a pseudo-element) shows it as it stands */
    }
  };
  // A spread opens as one: the photo settles out of a dim close-up, the name and words rise, then the columns come
  // in from the right one after another, each hairline drawing down after it and its lines following in turn.
  if (detail.classList.contains('bigcard--spread')) {
    run(detail.querySelector('.bigcard__image'), [{ transform: 'scale(1.12)', filter: 'brightness(0.7)' }, { transform: 'none', filter: 'none' }], { duration: 1000, easing: SETTLE });
    [...detail.querySelectorAll('.bigcard__eyebrow, .bigcard__name, .bigcard__copy, .bigcard__chips')].forEach((el, i) =>
      run(el, [{ opacity: 0, transform: 'translateY(1rem)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 140 + i * 60, easing: SETTLE }),
    );
    const slots = [...detail.querySelectorAll('.bigcard__slot')].slice(0, 6);
    slots.forEach((slot, i) => {
      const at = 220 + i * 90;
      run(slot, [{ opacity: 0, transform: 'translateX(1.75rem)' }, { opacity: 1, transform: 'none' }], { duration: 640, delay: at, easing: SETTLE });
      run(slot, [{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: 760, delay: at + 60, easing: SETTLE, pseudoElement: '::after' });
      [...slot.querySelectorAll('.bigcard__block-list li')].slice(0, 10).forEach((li, j) =>
        run(li, [{ opacity: 0, transform: 'translateY(0.375rem)' }, { opacity: 1, transform: 'none' }], { duration: 440, delay: at + 160 + j * 35, easing: SETTLE }),
      );
    });
    [...detail.querySelectorAll('.bigcard__rest > :not(.bigcard__blocks)')].forEach((el, i) =>
      run(el, [{ opacity: 0, transform: 'translateY(0.75rem)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 300 + slots.length * 90 + i * 60, easing: SETTLE }),
    );
    run(detail.querySelector('.bigcard__close'), [{ opacity: 0, rotate: '-90deg' }, { opacity: 1, rotate: '0deg' }], {
      duration: 480,
      delay: 160,
      easing: 'cubic-bezier(0.3, 1.25, 0.45, 1)',
    });
    return;
  }
  run(detail.querySelector('.bigcard__image'), [{ transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 900, easing: SETTLE });
  const rise = (els: Element[], start: number, step: number) =>
    els.forEach((el, i) =>
      run(el, [{ opacity: 0, transform: 'translateY(1rem)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: start + i * step, easing: SETTLE }),
    );
  rise([...detail.querySelectorAll('.bigcard__eyebrow, .bigcard__name, .bigcard__copy, .bigcard__chips')], 160, 50);
  rise(
    [...detail.querySelectorAll('.bigcard__rest > :not(.bigcard__blocks)'), ...[...detail.querySelectorAll('.bigcard__slot')].slice(0, 6)],
    240,
    45,
  );
  run(detail.querySelector('.bigcard__close'), [{ opacity: 0, rotate: '-90deg' }, { opacity: 1, rotate: '0deg' }], {
    duration: 480,
    delay: 120,
    easing: 'cubic-bezier(0.3, 1.25, 0.45, 1)',
  });
}

export function initGrow(root: HTMLElement, opts: { canOpen?: (card: HTMLElement) => boolean; hold?: boolean; settle?: boolean } = {}) {
  let openDetail: HTMLElement | null = null;
  let openCard: HTMLElement | null = null;

  const clipOf = (detail: HTMLElement, card: HTMLElement) => {
    const d = detail.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    return `inset(${c.top - d.top}px ${d.right - c.right}px ${d.bottom - c.bottom}px ${c.left - d.left}px round ${corner(22)})`;
  };
  const grow = (detail: HTMLElement, card: HTMLElement, closing: boolean, delay = 0) => {
    const keyframes = [{ clipPath: clipOf(detail, card) }, { clipPath: `inset(0 0 0 0 round ${corner(26)})` }];
    return detail.animate(closing ? keyframes.reverse() : keyframes, { duration: closing ? 380 : 560, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
  };

  // Could this scroll, going this way, move something inside the big card?
  const moves = (from: EventTarget | null, dy: number) => {
    if (!openDetail || !(from instanceof Element) || !openDetail.contains(from)) return false;
    for (let el: Element | null = from; el && openDetail.contains(el); el = el.parentElement) {
      if (!/auto|scroll/.test(getComputedStyle(el).overflowY)) continue;
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : dy < 0 && el.scrollTop > 1) return true;
    }
    return false;
  };
  const onWheel = (e: WheelEvent) => {
    if (e.cancelable && !moves(e.target, e.deltaY)) e.preventDefault();
  };
  const KEYS: Record<string, number> = { ArrowDown: 1, PageDown: 1, End: 1, ' ': 1, ArrowUp: -1, PageUp: -1, Home: -1 };
  const onKey = (e: KeyboardEvent) => {
    const dy = KEYS[e.key];
    if (!dy || (e.target as HTMLElement).closest('input, textarea, select, button, a, video')) return;
    if (!moves(e.target, dy)) e.preventDefault();
  };
  const onPress = (e: PointerEvent) => {
    if (openDetail && !openDetail.contains(e.target as Node)) close(false);
  };
  const hold = () => {
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPress);
    const off = root.getBoundingClientRect().top;
    if (opts.settle === false || Math.abs(off) < 2) return lenis()?.stop();
    const stop = () => openDetail && lenis()?.stop();
    if (lenis()) lenis()?.scrollTo(window.scrollY + off, { force: true, duration: 0.45, onComplete: stop });
    else window.scrollTo({ top: window.scrollY + off, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const release = () => {
    window.removeEventListener('wheel', onWheel, { capture: true });
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onPress);
    lenis()?.start();
  };

  // Tab and Shift+Tab go round the open card, from its last focusable thing to its first and back. Heard on
  // the document, so a click on the card's words (which leaves the focus on the page) can't let Tab out of it.
  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !openDetail) return;
    const all = [...openDetail.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
    if (!all.length) return;
    const first = all[0];
    const end = all[all.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || !openDetail.contains(at))) {
      e.preventDefault();
      end.focus();
    } else if (!e.shiftKey && (at === end || !openDetail.contains(at))) {
      e.preventDefault();
      first.focus();
    }
  };

  const close = (returnFocus = true) => {
    const detail = openDetail;
    const card = openCard;
    if (!detail || !card) return;
    openDetail = null;
    openCard = null;
    if (opts.hold) release();
    detail.removeAttribute('aria-modal');
    document.removeEventListener('keydown', trap);
    detail.querySelectorAll('video').forEach((v) => v.pause());
    const row = card.closest<HTMLElement>('[data-grow-row]');
    row?.removeAttribute('inert');
    root.classList.remove('has-big-card');
    const done = () => {
      if (openDetail === detail) return; // opened again before it had finished closing
      detail.hidden = true;
      detail.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    };
    if (reduced() || card.offsetParent === null) done();
    else {
      // Desktop: the words and the photo fade first, so it closes clean rather than squeezing them.
      let lead = 0;
      if (desktop()) {
        lead = 60;
        detail.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        detail.querySelectorAll('.bigcard__body, .bigcard__image').forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' }));
      }
      grow(detail, card, true, lead).finished.then(done, done);
    }
    if (returnFocus) card.focus({ preventScroll: true });
  };

  const open = (card: HTMLElement) => {
    const detail = root.querySelector<HTMLElement>(`[data-grow-detail="${card.dataset.growCard}"]`);
    if (!detail) return false;
    close(false);
    // A card that's still closing (a quick change of mind) shows whole again.
    detail.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    openDetail = detail;
    openCard = card;
    detail.hidden = false;
    detail.scrollTop = 0;
    fit(detail);
    card.closest('[data-grow-row]')?.setAttribute('inert', '');
    root.classList.add('has-big-card');
    if (opts.hold) hold();
    detail.setAttribute('aria-modal', 'true');
    document.addEventListener('keydown', trap);
    if (!reduced()) {
      grow(detail, card, false);
      if (desktop()) focusIn(detail);
    }
    detail.querySelector<HTMLElement>('[data-grow-close]')?.focus({ preventScroll: true });
    return true;
  };

  root.querySelectorAll<HTMLElement>('[data-grow-card]').forEach((card) =>
    card.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (opts.canOpen && !opts.canOpen(card)) return;
      if (open(card)) e.preventDefault();
    }),
  );
  root.querySelectorAll('[data-grow-close]').forEach((b) => b.addEventListener('click', () => close()));
  // A spread open while the window changes size fits itself again.
  let refit = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(refit);
    refit = requestAnimationFrame(() => openDetail && fit(openDetail));
  });
  root.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape' && openDetail) close();
  });

  return { close };
}
