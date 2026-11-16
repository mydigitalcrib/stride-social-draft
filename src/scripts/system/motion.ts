// Pointer motion for the Stride motion language (src/styles/system/motion.css): a subtle parallax
// for [data-parallax] elements, a magnetic lean for [data-magnetic] ones, and on desktop the light
// that catches on the glass buttons (styles/system/glass.css). Fine pointers only, and nothing at
// all under reduced motion. The lean uses the CSS `translate` property, so it composes with any
// transform a reveal or hover already applies, and with a press's `scale`.
import { uiScale } from './scale';
import { DESKTOP, reduced } from './env';

const allowed = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced();

// On desktop the distances grow with the screen past 1920×1080, as the CSS around them does (scale.ts); below
// desktop they stay in px. One query, asked every frame.
let wide: MediaQueryList | undefined;
const isWide = () => (wide ??= window.matchMedia(DESKTOP)).matches;
const scale = () => (isWide() ? uiScale() : 1);

/** [data-parallax="12"]: drifts up to 12px against the pointer (eased; only while on screen; more on a larger screen). */
export function initParallax() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  if (!els.length || !allowed()) return;
  const onScreen = new Set<HTMLElement>();
  const io = new IntersectionObserver((entries) =>
    entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target as HTMLElement) : onScreen.delete(e.target as HTMLElement))),
  );
  els.forEach((el) => io.observe(el));

  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  const frame = () => {
    raf = 0;
    x += (tx - x) * 0.07;
    y += (ty - y) * 0.07;
    const k = scale();
    onScreen.forEach((el) => {
      const s = (parseFloat(el.dataset.parallax ?? '') || 10) * k;
      el.style.translate = `${(-x * s).toFixed(2)}px ${(-y * s * 0.6).toFixed(2)}px`;
    });
    if (Math.abs(tx - x) > 0.0005 || Math.abs(ty - y) > 0.0005) raf = requestAnimationFrame(frame);
  };
  window.addEventListener(
    'pointermove',
    (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(frame);
    },
    { passive: true },
  );
}

// [data-magnetic="0.3"] (desktop): leans towards the pointer by that share of its offset while hovered, on a spring
// that settles with the slightest overshoot, and back. A page's main calls to action only. On Stride Talent's pages
// every pill is a magnet too (the owner's brief, 2026-11-12: more to play with).
const MAGNETS = "[data-magnetic], html[data-division='talent'] .exp-pill";
// The glass buttons (glass.css): the light under the pointer catches on them. Those that only wear the glass's place
// (big words with no fill of their own: Insights' topics, Team's departments) are left alone.
const GLASS =
  '.exp-pill, .btn--primary, .btn--secondary, .bigcard__action, .eclose__action, .ccc__enquire, .exp-pill--ghost, .exp-round, .exp-chip, .chat__answer, .consent__btn, .glass-btn, .js .deck--made .deck__tab--link';
const STIFFNESS = 180;
const DAMPING = 2 * Math.sqrt(STIFFNESS) * 0.62;

type Magnet = { el: HTMLElement; box: DOMRect | null; x: number; y: number; vx: number; vy: number; tx: number; ty: number };

/** Magnets and the light on the glass: one listener for the whole site, its writes coalesced to one frame. */
export function initMagnetic() {
  if (!allowed()) return;
  const magnets = new Map<HTMLElement, Magnet>();
  let over: Magnet | null = null;
  let lit: HTMLElement | null = null;
  let litBox: DOMRect | null = null;
  const plain = new WeakMap<HTMLElement, boolean>(); // no fill of its own: no light
  const fading = new WeakMap<HTMLElement, number>();
  let px = 0;
  let py = 0;
  let raf = 0;
  let then = 0;

  // The box as laid out, without the lean the magnet has given it, so the pull aims at the button's true centre.
  const boxOf = (m: Magnet) => {
    const r = m.el.getBoundingClientRect();
    return new DOMRect(r.left - m.x, r.top - m.y, r.width, r.height);
  };
  const aim = (m: Magnet) => {
    m.box ??= boxOf(m);
    const k = scale();
    const pull = parseFloat(m.el.dataset.magnetic ?? '') || 0.25;
    m.tx = Math.max(-14 * k, Math.min(14 * k, (px - (m.box.left + m.box.width / 2)) * pull));
    m.ty = Math.max(-10 * k, Math.min(10 * k, (py - (m.box.top + m.box.height / 2)) * pull));
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = then ? Math.min(0.034, (now - then) / 1000) : 1 / 60;
    then = now;
    let busy = false;
    // Measuring (only after a scroll or a resize) comes before this frame's writes.
    if (over) aim(over);
    if (lit) {
      litBox ??= glassBox(lit);
      const lean = magnets.get(lit);
      lit.style.setProperty('--gb-gx', `${(px - litBox.left - (lean?.x ?? 0)).toFixed(1)}px`);
      lit.style.setProperty('--gb-gy', `${(py - litBox.top - (lean?.y ?? 0)).toFixed(1)}px`);
    }
    magnets.forEach((m) => {
      m.vx += (STIFFNESS * (m.tx - m.x) - DAMPING * m.vx) * dt;
      m.vy += (STIFFNESS * (m.ty - m.y) - DAMPING * m.vy) * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const still = Math.abs(m.tx - m.x) < 0.05 && Math.abs(m.ty - m.y) < 0.05 && Math.abs(m.vx) < 0.5 && Math.abs(m.vy) < 0.5;
      if (still) {
        m.x = m.tx;
        m.y = m.ty;
        m.vx = m.vy = 0;
      } else busy = true;
      m.el.style.translate = m.x || m.y ? `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px` : '';
      if (still && m !== over && !m.x && !m.y) magnets.delete(m.el);
    });
    if (busy) raf = requestAnimationFrame(frame);
    else then = 0;
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const leaveMagnet = () => {
    if (!over) return;
    over.tx = over.ty = 0;
    over = null;
  };
  const enterMagnet = (el: HTMLElement) => {
    let m = magnets.get(el);
    if (!m) {
      m = { el, box: null, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
      magnets.set(el, m);
    }
    m.box = boxOf(m);
    over = m;
  };

  // The button's box as laid out (without a magnet's lean), for placing the light on it.
  const glassBox = (el: HTMLElement) => {
    const lean = magnets.get(el);
    const r = el.getBoundingClientRect();
    return new DOMRect(r.left - (lean?.x ?? 0), r.top - (lean?.y ?? 0), r.width, r.height);
  };

  // The light fades out where it was (glass.css), and only then goes back to its resting place, so keyboard focus
  // finds it at the top of the rim.
  const unlight = () => {
    if (!lit) return;
    const el = lit;
    lit = null;
    litBox = null;
    el.classList.remove('has-glint');
    fading.set(
      el,
      window.setTimeout(() => {
        if (el.classList.contains('has-glint')) return;
        el.style.removeProperty('--gb-gx');
        el.style.removeProperty('--gb-gy');
      }, 460),
    );
  };
  const light = (el: HTMLElement) => {
    if (!plain.has(el)) plain.set(el, getComputedStyle(el).backgroundImage === 'none');
    if (plain.get(el)) return;
    window.clearTimeout(fading.get(el));
    litBox = glassBox(el);
    lit = el;
    el.classList.add('has-glint');
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !isWide()) return;
      px = e.clientX;
      py = e.clientY;
      const target = e.target instanceof Element ? e.target : null;
      const magnet = target?.closest<HTMLElement>(MAGNETS) ?? null;
      if (magnet !== (over?.el ?? null)) {
        leaveMagnet();
        if (magnet) enterMagnet(magnet);
      }
      const glass = target?.closest<HTMLElement>(GLASS) ?? null;
      if (glass !== lit) {
        unlight();
        if (glass) light(glass);
      }
      if (over || lit || magnets.size) kick();
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    leaveMagnet();
    unlight();
    kick();
  });
  // Something scrolled or resized: the boxes are measured again on the next frame that needs them, not here.
  const stale = () => {
    magnets.forEach((m) => (m.box = null));
    litBox = null;
  };
  window.addEventListener('scroll', stale, { passive: true });
  window.addEventListener('resize', stale, { passive: true });
}
