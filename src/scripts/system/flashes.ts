// Stride Talent's opening on desktop (talent/Photocall.astro): a red carpet. Camera flashes go off in the dark
// behind the photocall, now and then anywhere on the screen, and in a burst as the headline develops and around a
// creator when their shot is taken (photocall.ts). Each is brief, kept off the headline, and lights the wall around it for an
// instant, as a flash does a photocall. Nothing moves with reduced motion, and nothing runs while the section is out
// of view, the tab is hidden or a creator's profile is open over the page (`sheet:open`). Drawn on one canvas, only
// while a flash is alight. Each flash, as it goes off, tells the page where (`talent:flash`, in screen pixels), so the
// wall behind can catch it (TalentWall.astro). Sizes are those of 1920×1080, grown with a larger screen (scale.ts).
// Never more than three a second, a shot's flash included: each takes its turn (flash-limit.ts).
import { uiScale } from './scale';
import { FLASH_GAP, flashCancel, flashTurn } from './flash-limit';
import { whenLoaded } from './loaded';
import { reduced } from './env';

const GAP_MIN = 650; // ms between flashes in the dark
const GAP_MAX = 1900;
const LIFE_MIN = 240; // ms a flash lasts
const LIFE_MAX = 360;
const BURST = 4; // flashes as a new creator steps forward, a turn apart (FLASH_GAP)
const BURST_REST = 600; // ms before another burst can start
const SPRITE = 256;
const SPILL = 3.4; // how far a flash lights the wall, in the flash's own size
const SPILL_LIGHT = 0.2; // and how brightly

type Flash = { x: number; y: number; size: number; born: number; life: number; power: number; lit?: boolean };

const pick = (a: number, b: number) => a + Math.random() * (b - a);

/** The wall lit by a flash: a wide, faint, cool light that falls away to nothing. */
const makeSpill = () => {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = SPRITE;
  const c = sprite.getContext('2d')!;
  const mid = SPRITE / 2;
  const light = c.createRadialGradient(mid, mid, 0, mid, mid, mid);
  light.addColorStop(0, 'rgba(235, 248, 255, 1)');
  light.addColorStop(0.35, 'rgba(195, 225, 245, 0.45)');
  light.addColorStop(1, 'rgba(195, 225, 245, 0)');
  c.fillStyle = light;
  c.fillRect(0, 0, SPRITE, SPRITE);
  return sprite;
};

/** One flash, drawn once: a hot core, a soft glow, and the four thin points a lens gives it. */
const makeSprite = () => {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = SPRITE;
  const c = sprite.getContext('2d')!;
  const mid = SPRITE / 2;
  const glow = c.createRadialGradient(mid, mid, 0, mid, mid, mid);
  glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
  glow.addColorStop(0.09, 'rgba(255, 255, 255, 0.9)');
  glow.addColorStop(0.24, 'rgba(195, 242, 251, 0.3)');
  glow.addColorStop(1, 'rgba(195, 242, 251, 0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, SPRITE, SPRITE);
  const points = (w: number, h: number) => {
    const g = c.createRadialGradient(mid, mid, 0, mid, mid, Math.max(w, h) / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(mid, mid, w / 2, h / 2, 0, 0, Math.PI * 2);
    c.fill();
  };
  points(SPRITE, 5);
  points(5, SPRITE);
  return sprite;
};

export function initFlashes() {
  const root = document.querySelector<HTMLElement>('[data-photocall]');
  const canvas = root?.querySelector<HTMLCanvasElement>('[data-photocall-flashes]');
  const ctx = canvas?.getContext('2d');
  if (!root || !canvas || !ctx || canvas.dataset.ready) return;
  if (reduced()) return;
  canvas.dataset.ready = 'true';

  const sprite = makeSprite();
  const spill = makeSpill();
  const copy = root.querySelector<HTMLElement>('.pc__copy');
  const flashes: Flash[] = [];
  let W = 0;
  let H = 0;
  let raf = 0;
  let inView = false;
  let sheet = false;
  let lastBurst = 0;
  const live = () => inView && !sheet && !document.hidden;

  const size = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(size).observe(canvas);
  size();

  const draw = (now: number) => {
    raf = 0;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const t = (now - f.born) / f.life;
      if (t >= 1) {
        flashes.splice(i, 1);
        continue;
      }
      if (t < 0) continue;
      if (!f.lit) {
        f.lit = true;
        const c = box();
        document.dispatchEvent(new CustomEvent('talent:flash', { detail: { x: c.left + f.x, y: c.top + f.y, size: f.size, power: f.power } }));
      }
      // On at once, then dying away; the wall it lights dies away sooner.
      const on = t < 0.1 ? t / 0.1 : (1 - t) ** 2;
      const lit = f.size * SPILL;
      ctx.globalAlpha = on * on * SPILL_LIGHT;
      ctx.drawImage(spill, f.x - lit / 2, f.y - lit / 2, lit, lit);
      ctx.globalAlpha = on;
      const s = f.size * (1 + t * 0.25);
      ctx.drawImage(sprite, f.x - s / 2, f.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (flashes.length) raf = requestAnimationFrame(draw);
  };

  const add = (x: number, y: number, s: number, delay = 0, power = 0.6) => {
    flashes.push({ x, y, size: s, born: flashTurn(performance.now() + delay), life: pick(LIFE_MIN, LIFE_MAX), power });
    if (!raf) raf = requestAnimationFrame(draw);
  };

  const box = canvas.getBoundingClientRect.bind(canvas);

  /** Somewhere in the dark, clear of the headline. */
  const inTheDark = () => {
    const c = box();
    // The words' column.
    const text = copy?.getBoundingClientRect();
    const clear = 30 * uiScale();
    for (let tries = 0; tries < 8; tries++) {
      const x = pick(0.14, 0.98) * W;
      const y = pick(0.12, 0.96) * H;
      if (!text || x + c.left < text.left - clear || x + c.left > text.right + clear || y + c.top < text.top - clear || y + c.top > text.bottom + clear) return { x, y };
    }
    return null;
  };

  // Now and then, whichever way the visitor is looking; only while there's someone to see it (started again when the
  // section comes back into view, the tab is shown again or the profile closes).
  let timer = 0;
  const next = () => {
    window.clearTimeout(timer);
    timer = 0;
    if (!live()) return;
    timer = window.setTimeout(() => {
      timer = 0;
      if (!live()) return;
      const at = inTheDark();
      if (at) add(at.x, at.y, pick(130, 280) * uiScale());
      next();
    }, pick(GAP_MIN, GAP_MAX));
  };
  document.addEventListener('visibilitychange', () => !timer && next());
  document.addEventListener('sheet:open', () => (sheet = true));
  document.addEventListener('sheet:close', () => {
    sheet = false;
    if (!timer) next();
  });

  // A creator is shot (`at`, their place), or the headline develops: flashes all around.
  const burst = (at?: DOMRect) => {
    const now = performance.now();
    if (!live() || now - lastBurst < BURST_REST) return;
    lastBurst = now;
    const r = at ?? root.querySelector<HTMLElement>('.pc__stage')?.getBoundingClientRect();
    if (!r) return;
    const c = box();
    // In an arc over it and out to its sides.
    const cx = r.left + r.width / 2 - c.left;
    const cy = r.top + r.height / 2 - c.top;
    const k = uiScale();
    const reach = Math.min(r.height * 0.72, 320 * k);
    for (let i = 0; i < BURST; i++) {
      const slice = Math.PI * (1.08 + (0.84 * (i + Math.random())) / BURST);
      const far = reach * pick(0.95, 1.3);
      add(cx + Math.cos(slice) * far * 1.15, cy + Math.sin(slice) * far, pick(210, 360) * k, i * FLASH_GAP, 0.85);
    }
  };

  // The first time it's in view: a burst as the headline develops (Photocall.astro).
  let introduced = false;
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView && !timer) next();
    if (inView && !introduced) {
      introduced = true;
      whenLoaded(() => window.setTimeout(() => burst(), 320));
    }
  }).observe(root);
  // A shot on the photocall (photocall.ts): first the flashes still waiting for their turn are dropped, so the shot's
  // own flash goes off at once (shot.ts), then the burst follows it.
  root.addEventListener('flashes:hush', () => {
    const now = performance.now();
    for (let i = flashes.length - 1; i >= 0; i--) if (flashes[i].born > now) flashes.splice(i, 1);
    flashCancel(now);
  });
  root.addEventListener('flashes:burst', (e) => {
    lastBurst = 0;
    burst((e as CustomEvent<DOMRect>).detail);
  });
}
