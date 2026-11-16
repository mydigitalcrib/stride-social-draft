// Helpers for the redesigned pages (components/experience/): the light that follows the pointer
// (Ambient.astro), the tilt and sheen of a held card, and how far through a pinned section the scroll is.
import { DESKTOP, clamp, lenis, reduced } from './env';

/** The light follows the pointer across the screen; on desktop it trails it like a soft lamp (eased each frame,
 *  resting once it's there), while phones and tablets keep it right under the finger as before. The ambient layer
 *  fills the screen from its corner (the backdrop, SiteLayout), so the pointer's place is its own. Hidden (a desktop
 *  page in front of a video), it doesn't follow at all. */
export function initAmbient() {
  document.querySelectorAll<HTMLElement>('[data-ambient]').forEach((el) => {
    if (el.dataset.ready || reduced()) return;
    el.dataset.ready = 'true';
    const desk = window.matchMedia(DESKTOP);
    if (desk.matches && document.querySelector('[data-backvid]')) return;
    let raf = 0;
    let then = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.4;
    let x = tx;
    let y = ty;
    const frame = (now: number) => {
      raf = 0;
      // Desktop: 12% of the way each frame at 60fps, the same at any frame rate. Below it: straight there.
      const k = desk.matches ? 1 - Math.pow(0.88, then ? Math.min(4, ((now - then) / 1000) * 60) : 1) : 1;
      then = now;
      x += (tx - x) * k;
      y += (ty - y) * k;
      if (Math.abs(tx - x) < 0.5 && Math.abs(ty - y) < 0.5) {
        x = tx;
        y = ty;
      }
      el.style.setProperty('--mx', `${x.toFixed(1)}px`);
      el.style.setProperty('--my', `${y.toFixed(1)}px`);
      if (x !== tx || y !== ty) raf = requestAnimationFrame(frame);
      else then = 0;
    };
    window.addEventListener(
      'pointermove',
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
        el.style.setProperty('--spot', '1');
        if (!raf) raf = requestAnimationFrame(frame);
      },
      { passive: true },
    );
    document.documentElement.addEventListener('pointerleave', () => el.style.setProperty('--spot', '0'), { passive: true });
  });
}

/** A card that leans towards the pointer, its sheen following: sets --rx, --ry, --gx, --gy on it. */
export function initTilt(area: HTMLElement, cardOf: () => HTMLElement | null, strength = 14) {
  if (reduced()) return;
  const clear = (el: HTMLElement | null) => {
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  let last: HTMLElement | null = null;
  area.addEventListener(
    'pointermove',
    (e) => {
      const card = cardOf();
      if (last && last !== card) clear(last);
      last = card;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      const over = fx > -0.15 && fx < 1.15 && fy > -0.15 && fy < 1.15;
      if (!over) return clear(card);
      card.style.setProperty('--ry', `${((fx - 0.5) * strength).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - fy) * strength).toFixed(2)}deg`);
      card.style.setProperty('--gx', `${(fx * 100).toFixed(1)}%`);
      card.style.setProperty('--gy', `${(fy * 100).toFixed(1)}%`);
    },
    { passive: true },
  );
  area.addEventListener('pointerleave', () => clear(last), { passive: true });
}

/** How far through a pinned section the scroll is, 0 to 1. */
export const progressOf = (root: HTMLElement) => {
  const travel = root.offsetHeight - window.innerHeight;
  return travel > 0 ? clamp(-root.getBoundingClientRect().top / travel, 0, 1) : 0;
};

/** Scroll to a point in a pinned section. */
export const goToProgress = (root: HTMLElement, f: number, smooth = false) => {
  const travel = root.offsetHeight - window.innerHeight;
  const y = window.scrollY + root.getBoundingClientRect().top + clamp(f, 0, 1) * travel;
  const l = lenis();
  if (l) l.scrollTo(y, smooth && !reduced() ? { duration: 0.8, force: true } : { immediate: true, force: true });
  else window.scrollTo(0, y);
};

/** The step (of `total`) a pinned section is at. */
export const stepOf = (root: HTMLElement, total: number) => Math.min(total - 1, Math.floor(progressOf(root) * total));
/** The middle of a step, to scroll to. */
export const stepPoint = (i: number, total: number) => (total > 1 ? (i + 0.5) / total : 0);
