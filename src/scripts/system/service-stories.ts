// Stride Social's services as stories (social/ServiceStories.astro, desktop). The one on plays for a few seconds, its
// bar filling (and the line of light round its ring with it), then the next follows (round and round). A press on its
// left third goes back, on the rest on (not on its buttons or links); a service either side, a ring, the arrows or the
// arrow keys go to that one; so does a drag (mouse or pen: the cards follow the hand, and a long or quick enough one
// moves on) or a sideways swipe on a trackpad, one story a swipe. The rings already seen go grey. A story coming on
// has its words and stickers come in (.is-entering).
// It waits, and goes on from where it was, while the pointer is on it, while something in it has the keyboard's focus
// (so nothing focused is hidden under the visitor), while it's mostly out of view, in a hidden tab, or dragged.
// Still under reduced motion: nothing moves on by itself, and nothing comes in.
import { uiScale } from './scale';
import { reduced } from './env';

const PLAY = 6500; // ms a story stays on
const ENTER = 950; // ms a story's coming on lasts
const SAME_GESTURE = 140; // ms: a wheel closer than this to the last one is the same swipe
const SWIPE_REST = 550; // ms after a swipe before another can move it
const SWIPE = 40; // px of sideways swipe that move one story
const KEYS_ELSEWHERE = "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='tablist'], [role='menu'], [role='menubar'], [role='listbox'], [role='slider'], [role='dialog']";

export function initServiceStories() {
  const root = document.querySelector<HTMLElement>('[data-service-stories]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const cards = [...root.querySelectorAll<HTMLElement>('[data-story-card]')];
  const rings = [...root.querySelectorAll<HTMLButtonElement>('[data-story-ring]')];
  const stage = root.querySelector<HTMLElement>('[data-stories-stage]');
  const status = root.querySelector<HTMLElement>('[data-stories-status]');
  const n = cards.length;
  if (!n || !stage) return;
  // Each card's bars, and the one that's its own.
  const bars = cards.map((c) => [...c.querySelectorAll<HTMLElement>('[data-story-bar]')]);
  const motion = !reduced();
  let at = 0;
  let started = performance.now();
  let raf = 0;
  let drag = 0; // while dragged: how far the cards have followed the hand, in places
  let entering = 0;

  /* ---------- Placing the cards ---------- */
  const placeCards = () => {
    cards.forEach((c, k) => {
      // Its place from the one on, the shorter way round, and as far as the hand has taken it.
      let d = k - at;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const now = d + drag;
      c.style.setProperty('--d', drag ? now.toFixed(4) : String(d));
      c.style.setProperty('--a', drag ? Math.abs(now).toFixed(4) : String(Math.abs(d)));
      c.classList.toggle('is-on', d === 0);
      c.classList.toggle('is-far', Math.abs(now) > (drag ? 2.6 : 2));
      if (d === 0) c.removeAttribute('aria-hidden');
      else c.setAttribute('aria-hidden', 'true');
    });
  };

  const go = (i: number, said = false) => {
    const from = at;
    at = (i + n) % n;
    drag = 0;
    // Each story starts again from its first picture (and the one it leaves goes back to its own).
    showFrame(from, 0);
    showFrame(at, 0);
    frameOn = 0;
    started = performance.now();
    if (holds.size) pausedAt = started;
    placeCards();
    // Its bars: those before it full, the rest empty (the one on fills as it plays).
    bars.forEach((list) => list.forEach((b, j) => b.style.setProperty('--fill', j < at ? '1' : '0')));
    rings.forEach((r, k) => {
      r.classList.toggle('is-on', k === at);
      r.setAttribute('aria-pressed', String(k === at));
      if (k === at) {
        r.classList.add('is-seen');
        r.style.setProperty('--p', '0');
      }
    });
    if (motion && at !== from) {
      const card = cards[at];
      cards.forEach((c) => c.classList.remove('is-entering'));
      card.classList.add('is-entering');
      window.clearTimeout(entering);
      entering = window.setTimeout(() => card.classList.remove('is-entering'), ENTER);
    }
    // A change the visitor made is said, as the card says it.
    if (said && status) status.textContent = `${cards[at].getAttribute('aria-label') ?? ''} ${cards[at].querySelector('.story-card__n')?.textContent ?? ''}`.trim();
  };

  /* ---------- Its pictures: the story moves on through them as its bar fills ---------- */
  const frames = cards.map((c) => [...c.querySelectorAll<HTMLImageElement>('[data-story-frame]')]);
  let frameOn = 0;
  const showFrame = (card: number, f: number) => frames[card]?.forEach((im, j) => im.classList.toggle('is-shown', j === f));

  /* ---------- The clock: one, with everything that holds it ---------- */
  const holds = new Set<string>(['view']); // until it's known to be in view
  let pausedAt = started;
  // The one on plays: its bar and its ring fill, then the next follows.
  const tick = () => {
    raf = 0;
    const k = Math.min(1, Math.max(0, (performance.now() - started) / PLAY));
    const fill = k.toFixed(4);
    // Its pictures share its time, one after another.
    const own = frames[at]?.length ?? 0;
    if (own > 1) {
      const f = Math.min(own - 1, Math.floor(k * own));
      if (f !== frameOn) showFrame(at, (frameOn = f));
    }
    bars[at][at]?.style.setProperty('--fill', fill);
    rings[at]?.style.setProperty('--p', fill);
    if (k >= 1) go(at + 1);
    if (!holds.size) raf = requestAnimationFrame(tick);
  };
  const hold = (why: string, on: boolean) => {
    const was = holds.size > 0;
    if (on) holds.add(why);
    else holds.delete(why);
    const is = holds.size > 0;
    if (!motion || was === is) return;
    if (is) {
      pausedAt = performance.now();
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      started += performance.now() - pausedAt;
      if (!raf) raf = requestAnimationFrame(tick);
    }
  };

  go(0);
  stage.addEventListener('pointerenter', () => hold('pointer', true));
  stage.addEventListener('pointerleave', () => hold('pointer', false));
  // Focus from the keyboard holds it (a click's focus doesn't, or a story clicked once would never move on again).
  stage.addEventListener('focusin', (e) => {
    if ((e.target as Element).matches(':focus-visible')) hold('focus', true);
  });
  stage.addEventListener('focusout', (e) => {
    if (!stage.contains(e.relatedTarget as Node | null)) hold('focus', false);
  });
  document.addEventListener('visibilitychange', () => hold('tab', document.hidden));
  let inView = false;
  new IntersectionObserver(
    (entries) => {
      // The latest of them (several can come at once, the older first).
      inView = entries[entries.length - 1].isIntersecting;
      hold('view', !inView);
    },
    { threshold: 0.4 },
  ).observe(stage);

  /* ---------- Presses ---------- */
  let dragged = false; // a drag just ended: the click it makes is not a press
  cards.forEach((c, k) =>
    c.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a, button')) return;
      if (k !== at) return go(k, true);
      const r = c.getBoundingClientRect();
      go(at + (e.clientX - r.left < r.width / 3 ? -1 : 1), true);
    }),
  );
  stage.addEventListener(
    'click',
    (e) => {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
  rings.forEach((r, k) => r.addEventListener('click', () => go(k, true)));
  root.querySelector('[data-stories-prev]')?.addEventListener('click', () => go(at - 1, true));
  root.querySelector('[data-stories-next]')?.addEventListener('click', () => go(at + 1, true));

  /* ---------- Dragging (mouse or pen) ---------- */
  // Past a few pixels sideways the cards follow the hand one to one (beyond a whole card, reluctantly). Let go past
  // about a fifth of a card, or quickly, and the next one that way comes on; otherwise it settles back.
  let press: { x: number; id: number; width: number } | null = null;
  let lastX = 0;
  let lastT = 0;
  let speed = 0;
  stage.addEventListener('pointerdown', (e) => {
    dragged = false;
    if (e.button !== 0 || e.pointerType === 'touch' || (e.target as Element).closest('a, button')) return;
    press = { x: e.clientX, id: e.pointerId, width: cards[at].offsetWidth || 1 };
    lastX = e.clientX;
    lastT = e.timeStamp;
    speed = 0;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x;
    if (!stage.classList.contains('is-dragging')) {
      // Let go off the stories before it became a drag (nothing was holding the pointer): no drag comes of it.
      if (!(e.buttons & 1)) {
        press = null;
        return;
      }
      if (Math.abs(dx) < 6 * uiScale()) return;
      stage.classList.add('is-dragging');
      hold('drag', true);
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* the pointer is already gone */
      }
    }
    const dt = e.timeStamp - lastT;
    if (dt > 0) speed = (e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = e.timeStamp;
    const u = dx / (press.width * 0.74);
    drag = Math.abs(u) > 1 ? Math.sign(u) * (1 + (Math.abs(u) - 1) * 0.35) : u;
    placeCards();
  });
  const letGo = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;
    const { x, width } = press;
    press = null;
    if (!stage.classList.contains('is-dragging')) return;
    stage.classList.remove('is-dragging');
    // The click this release makes comes straight after it; only that one is swallowed.
    dragged = true;
    window.setTimeout(() => (dragged = false), 0);
    hold('drag', false);
    const dx = e.clientX - x;
    const quick = e.type === 'pointerup' && e.timeStamp - lastT < 100 && Math.abs(speed) > 0.5 * uiScale();
    if (e.type === 'pointerup' && Math.abs(dx) > width * 0.18) go(at - Math.sign(dx), true);
    else if (quick) go(at - Math.sign(speed), true);
    else {
      drag = 0;
      placeCards();
    }
  };
  stage.addEventListener('pointerup', letGo);
  stage.addEventListener('pointercancel', letGo);

  /* ---------- A sideways swipe on a trackpad: one story a swipe ---------- */
  let swept = 0;
  let wheelAt = -Infinity;
  let movedAt = -Infinity;
  let moved = false;
  stage.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // up and down: the page's
      e.preventDefault();
      e.stopPropagation(); // before the smooth scroll hears it
      const gap = e.timeStamp - wheelAt;
      wheelAt = e.timeStamp;
      if (gap > SAME_GESTURE) {
        swept = 0;
        moved = false;
      }
      if (moved || e.timeStamp - movedAt < SWIPE_REST) return;
      swept += e.deltaX * (e.deltaMode === 1 ? 16 : 1);
      if (Math.abs(swept) < SWIPE) return;
      go(at + Math.sign(swept), true);
      movedAt = e.timeStamp;
      moved = true;
      swept = 0;
    },
    { passive: false },
  );

  /* ---------- Keys ---------- */
  // The arrow keys, while the stories are in view and nothing else has asked for them: not with a modifier (Alt and
  // an arrow go back a page), not in a field, a menu, a dialog or a set of tabs, and only from the page itself or
  // from within the stories.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (!inView || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if ((e.target as Element | null)?.closest?.(KEYS_ELSEWHERE)) return;
    const focus = document.activeElement;
    if (focus && focus !== document.body && !root.contains(focus)) return;
    go(at + (e.key === 'ArrowRight' ? 1 : -1), true);
  });
}
