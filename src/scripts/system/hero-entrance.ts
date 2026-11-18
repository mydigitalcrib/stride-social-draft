// The homepage hero's entrance on desktop (components/home/CoverHero.astro), built from Stride's triangles (the
// owner's choice, 2026-11-12), about 2s (quicker since the owner, 2026-11-17: "We build culture" sooner; it was 2.6s):
//   0.00–0.32s  the Stride mark, its four triangles, appears at the centre of the screen.
//   0.38s       it breaks into hundreds of its own triangles (each the mark's shape, or the same turned over),
//               which fly to the big word, the first letter's first, each on a gentle curve, turning and
//               shrinking to size, and fit together into its letters, so the word stands as a mosaic.
//   ~1.4s       complete, the word turns solid (the real headline takes over as the triangles fade), its depth
//               comes up and a light crosses it; the kicker rises in, letter by letter. The footage behind
//               comes into focus from the navy over the flight (an animation of its own, so the canvas keeps
//               its frames).
// The letters' shapes are measured from the real headline (its type, drawn on a hidden canvas), so the mosaic
// lands exactly on it. Afterwards it says so (`hero:landed`). The light that
// crosses the word as it turns solid is hero-depth.ts's (`hero:light`), so it runs on along the rule into the badges.
// After the opening film (opening.ts, .is-opening on the hero) it waits for `hero:opening`. Handed over from the
// film (`detail.handover`), the film's own mark has already travelled to where this one stands: it starts with the
// mark there, whole, holds it while the film fades over it (`hero:mark` says it's drawn), and breaks it from there,
// so the two read as one. Escape (`hero:skip`,
// from hero-intro.ts) or resizing the window go straight to the finished hero; scrolling on ends it once the type
// has gone. The inline script in the hero decides whether it plays (.is-entrance); reduced motion, phones and
// tablets, returning visits and browsers without it get the plain hero.
// On a very large screen the mark grows with the word, the focus pull and the facets' gaps with the root size
// (scale.ts), and the canvas keeps to a pixel budget, so the first frame doesn't stall on a 5K or 8K screen.
import { uiScale } from './scale';
import { clamp, reduced } from './env';

const APPEAR = 0.32; // s, the mark comes in
const BURST = 0.38; // s, it breaks into its triangles
const FLY = 0.6; // s, each triangle's flight (up to a third longer, varied; it was 0.95)
const SPREAD = 0.4; // s from the first letter's triangles leaving to the last letter's (it was 0.62)
const SOLID = 0.42; // s, the mosaic hands over to the solid word
const LIGHT = 0.85; // s, the light crossing the word
const HOLD = 0.2; // s, handed over from the opening film: the mark held while the film fades over it (it was 0.45)
const INHALE = 0.12; // s, and swelling a touch at the end of that, before it breaks
const SEED = 11; // the same flight every time
const PIXELS = 8.3e6; // the canvas's budget of device pixels (a 4K screen's worth)

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

// A small seeded random generator, so the flight is art-directed rather than different every time.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STRETCH: [number, string][] = [[75, 'condensed'], [87.5, 'semi-condensed'], [100, 'normal'], [112.5, 'semi-expanded'], [125, 'expanded'], [150, 'extra-expanded']];

// One triangle: `turned` is the mark's shape turned over (its right angle at the top left, not the bottom right).
type Tri = {
  turned: boolean;
  ex: number; // where its centre lands
  ey: number;
  sx: number; // where it leaves from
  sy: number;
  cx: number; // the curve's pull
  cy: number;
  r0: number; // its turn when it leaves
  s0: number; // and its size, as a share of its own
  at: number; // when it leaves
  dur: number; // how long it flies
  shade: number; // 0 white, 1 the pale ice of the facets
};

// The mark at the centre: a tenth of the screen's width at most, at least 150px, and as large as the word asks on a
// screen past 1920×1080 (61% of its size: 150px at 1920).
const markSize = (width: number, size: number) => Math.min(width * 0.1, Math.max(150, size * 0.61));

// Where the entrance draws the mark, in the window, and how big: for the opening film's hand-over (opening.ts).
export function entranceMark(hero: HTMLElement) {
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-build]');
  const letter = hero.querySelector<HTMLElement>('.cover__word .cover__char > span');
  const box = canvas?.getBoundingClientRect();
  if (!box?.width || !letter) return null;
  return { x: box.left + box.width / 2, y: box.top + box.height * 0.44, size: markSize(box.width, parseFloat(getComputedStyle(letter).fontSize)) };
}

// The type is preloaded, so this is normally immediate; never wait long for it.
const fontsReady = () => Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 500))]);

// Work for a quiet moment (the gate waiting for "Enter"), or soon if the browser never has one.
const idle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 600 });
  else window.setTimeout(fn, 60);
};

export function initHeroEntrance() {
  const hero = document.querySelector<HTMLElement>('.cover');
  const canvas = hero?.querySelector<HTMLCanvasElement>('[data-hero-build]');
  if (!hero || !canvas || hero.dataset.entranceReady) return;
  if (!hero.classList.contains('is-entrance') || reduced()) {
    hero.classList.remove('is-entrance', 'is-cinematic');
    canvas.remove();
    return;
  }
  hero.dataset.entranceReady = 'true';

  let state: 'waiting' | 'running' | 'done' = 'waiting';
  let raf = 0;
  let focusPull: Animation | null = null;
  const media = hero.querySelector<HTMLElement>('.cover__media');
  const word = hero.querySelector<HTMLElement>('.cover__word');
  const wordChars = [...hero.querySelectorAll<HTMLElement>('.cover__word .cover__char')];
  const kickerChars = [...hero.querySelectorAll<HTMLElement>('.cover__kicker .cover__char')];

  // The finished hero: the real headline, the footage sharp, the triangles gone.
  const end = () => {
    if (state === 'done') return;
    state = 'done';
    cancelAnimationFrame(raf);
    focusPull?.cancel();
    media?.style.removeProperty('filter');
    ['--ex', '--ey'].forEach((p) => word?.style.removeProperty(p));
    hero.classList.add('is-settling');
    hero.classList.remove('is-entrance');
    hero.querySelectorAll('.cover__title .is-landed').forEach((el) => el.classList.remove('is-landed'));
    canvas.remove();
    window.setTimeout(() => hero.classList.remove('is-settling'), 800);
    window.removeEventListener('resize', end);
    window.removeEventListener('scroll', scrolled);
    hero.dispatchEvent(new CustomEvent('hero:landed'));
  };

  // Scrolling on before it has landed: the hero's type fades with the scroll (the triangles with it), and once it
  // has gone the entrance ends there.
  const scrolled = () => {
    if (window.scrollY > window.innerHeight * 0.34) end();
  };

  /* ---------- Measuring: the word's shape and every triangle's flight ----------
     The costly part (it reads the page's layout), so after the opening film it's done while the gate waits for
     "Enter" (`hero:prepare`, opening.ts) and kept, rather than in the moment of the hand-over, where it held the
     mark still and made the film's fade jump (the owner, 2026-11-17: "fix the animation once you click Enter"). */
  const measure = () => {
    const box = canvas.getBoundingClientRect();
    const W = box.width;
    const H = box.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(PIXELS / (W * H)));

    /* ---------- The word's shape, from the real headline ---------- */
    const first = wordChars[0]?.firstElementChild as HTMLElement | null;
    if (!word || !first) throw new Error('no headline');
    const cs = getComputedStyle(first);
    const size = parseFloat(cs.fontSize);
    // The baselines: an empty inline box sits on each. All placed before any is read, so the page is laid out once.
    const inners = wordChars.map((el) => el.firstElementChild as HTMLElement);
    const probes = inners.map((inner) => {
      const probe = document.createElement('i');
      probe.style.cssText = 'display:inline-block;width:0;height:0';
      inner.append(probe);
      return probe;
    });
    const letters = inners.map((inner, i) => {
      const r = inner.getBoundingClientRect();
      const baseline = probes[i].getBoundingClientRect().top - box.top;
      return { text: (inner.textContent ?? '').toUpperCase(), baseline, left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, bottom: r.bottom - box.top };
    });
    probes.forEach((probe) => probe.remove());
    const left = Math.floor(Math.min(...letters.map((l) => l.left)) - size * 0.05);
    const right = Math.ceil(Math.max(...letters.map((l) => l.right)) + size * 0.05);
    const top = Math.floor(Math.min(...letters.map((l) => l.top)) - size * 0.1);
    const bottom = Math.ceil(Math.max(...letters.map((l) => l.bottom)) + size * 0.1);
    // The letters drawn on a hidden canvas the size of the word's box only (not the screen's), to read which points
    // are inside them.
    const mask = document.createElement('canvas');
    mask.width = Math.max(1, right - left);
    mask.height = Math.max(1, bottom - top);
    const m = mask.getContext('2d', { willReadFrequently: true })!;
    const stretch = parseFloat(cs.getPropertyValue('font-stretch')) || 100;
    m.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    m.fontStretch = STRETCH.reduce((a, b) => (Math.abs(b[0] - stretch) < Math.abs(a[0] - stretch) ? b : a))[1] as CanvasFontStretch;
    m.fillStyle = '#fff';
    m.textBaseline = 'alphabetic';
    letters.forEach((l) => m.fillText(l.text, l.left - left, l.baseline - top));
    const pix = m.getImageData(0, 0, mask.width, mask.height).data;
    const ink = (x: number, y: number) => {
      const xi = Math.round(x) - left;
      const yi = Math.round(y) - top;
      if (xi < 0 || yi < 0 || xi >= mask.width || yi >= mask.height) return false;
      return pix[(yi * mask.width + xi) * 4 + 3] > 110;
    };

    /* ---------- The mosaic: each cell of a grid over the word, split corner to corner ---------- */
    const c = Math.max(8, Math.round(size / 11)); // a triangle's side
    const rand = random(SEED);
    const mark = markSize(W, size); // the mark at the centre
    const mx = W / 2;
    const my = H * 0.44;
    const wordMid = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const tris: Tri[] = [];
    for (let y = top; y < bottom; y += c) {
      for (let x = left; x < right; x += c) {
        for (const turned of [false, true]) {
          // Its centre, and three points between the centre and its corners: in the letter if most of them are.
          const gx = turned ? x + c / 3 : x + (2 * c) / 3;
          const gy = turned ? y + c / 3 : y + (2 * c) / 3;
          const corners = turned ? [[x, y], [x + c, y], [x, y + c]] : [[x + c, y], [x + c, y + c], [x, y + c]];
          let hits = ink(gx, gy) ? 1 : 0;
          corners.forEach(([px, py]) => (hits += ink(gx + (px - gx) * 0.55, gy + (py - gy) * 0.55) ? 1 : 0));
          if (hits < 2) continue;
          // Which letter it belongs to, for the order they leave in.
          let li = letters.findIndex((l) => gx >= l.left && gx <= l.right);
          if (li < 0) li = gx < left + (right - left) / 2 ? 0 : letters.length - 1;
          // It leaves from inside the quarter of the mark on its side of the word.
          const qx = gx < wordMid.x ? 0 : 1;
          const qy = gy < wordMid.y ? 0 : 1;
          let u = rand();
          let v = rand();
          if (u + v < 1) [u, v] = [1 - u, 1 - v]; // inside the mark's triangle (its right angle bottom right)
          const half = mark / 2;
          const sx = mx - half + qx * half + u * half;
          const sy = my - half + qy * half + v * half;
          // A gentle curve: pulled sideways and up a little, more for the ones going further.
          const dx = gx - sx;
          const dy = gy - sy;
          const bend = (rand() - 0.5) * 0.7;
          tris.push({
            turned,
            ex: gx,
            ey: gy,
            sx,
            sy,
            cx: sx + dx * 0.5 - dy * bend,
            cy: sy + dy * 0.5 + dx * bend - Math.hypot(dx, dy) * 0.18,
            r0: (rand() - 0.5) * 2.4 + (turned ? Math.PI : 0),
            s0: 0.5 + rand() * 1.4,
            at: BURST + (li / Math.max(1, letters.length - 1)) * SPREAD + rand() * 0.1,
            dur: FLY * (1 + rand() * 0.34),
            shade: turned ? rand() * 0.25 : 0.55 + rand() * 0.45,
          });
        }
      }
    }
    if (!tris.length) throw new Error('no triangles');
    const landed = Math.max(...tris.map((t) => t.at + t.dur));
    return { W, H, dpr, c, tris, mark, mx, my, landed };
  };

  // Measured while the gate waits; measured again at the start if the window has changed size since.
  let kept: ReturnType<typeof measure> | null = null;
  const prepare = () => {
    if (state !== 'waiting' || kept) return;
    try {
      kept = measure();
    } catch {
      kept = null;
    }
  };
  hero.addEventListener('hero:prepare', () => idle(prepare), { once: true });

  const play = (handover: boolean) => {
    const box = canvas.getBoundingClientRect();
    const b = kept && kept.W === box.width && kept.H === box.height ? kept : measure();
    kept = null;
    const { W, H, dpr, c, tris, mark, mx, my, landed } = b;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const solidAt = landed + 0.08;
    const finishAt = solidAt + Math.max(LIGHT, SOLID) + 0.15;

    // One triangle, its right angle where its kind says, about its centre, turned and scaled.
    const shape = (turned: boolean) => {
      const k = c / 3;
      return turned
        ? [
            [-k, -k],
            [2 * k, -k],
            [-k, 2 * k],
          ]
        : [
            [k, -2 * k],
            [k, k],
            [-2 * k, k],
          ];
    };
    const shapes = [shape(false), shape(true)];
    const gap = Math.max(0.82, 1 - (1.4 * uiScale()) / c); // landed, each is drawn a hair smaller, so the facets show

    /* ---------- Each frame ---------- */
    const grade = 'contrast(1.16) saturate(0.94)';
    const focus = 14 * uiScale(); // px, the footage's blur before it comes into focus (0.875rem, as the CSS)
    // Handed over, the clock starts with the mark already whole, a hold before it breaks.
    const t0 = handover ? APPEAR - HOLD : 0;
    let start = 0;
    let solid = false;
    const frame = (now: number) => {
      if (state !== 'running') return;
      const drawn = !!start;
      if (!start) {
        start = now;
        // The footage comes into focus from the navy over the flight: one animation the browser runs by itself
        // (on the compositor where it can), rather than a new filter written every frame, which cost the triangles
        // their frames.
        if (media) {
          const from = `${grade} brightness(0.42) blur(${focus.toFixed(2)}px)`;
          const to = `${grade} brightness(0.9) blur(0px)`;
          focusPull = media.animate([{ filter: from }, { filter: to }], {
            duration: (solidAt - BURST) * 1000,
            delay: Math.max(0, (BURST - t0) * 1000),
            easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
            fill: 'both',
          });
        }
      }
      const t = t0 + (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      // The mark: comes in (or is there, handed over, swelling a touch before it goes), then breaks.
      if (t < BURST + 0.12) {
        const k = handover ? 1 : easeOut(clamp(t / APPEAR));
        const gone = clamp((t - BURST) / 0.12);
        const s = handover ? mark * (1 + 0.035 * easeInOut(clamp((t - (APPEAR - INHALE)) / INHALE))) : mark * (0.7 + 0.3 * k);
        ctx.globalAlpha = k * (1 - gone);
        ctx.fillStyle = '#ffffff';
        const x0 = mx - s / 2;
        const y0 = my - s / 2;
        const h = s / 2;
        for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const ox = x0 + qx * h;
          const oy = y0 + qy * h;
          ctx.beginPath();
          ctx.moveTo(ox + h, oy);
          ctx.lineTo(ox + h, oy + h);
          ctx.lineTo(ox, oy + h);
          ctx.closePath();
          ctx.fill();
        }
      }

      // The triangles, gathered by their shade and opacity (rounded a little, which doesn't show) into a few
      // paths, each filled once, rather than hundreds of fills a frame.
      const groups = new Map<number, Path2D>();
      for (const tri of tris) {
        if (t < tri.at) continue;
        const p = clamp((t - tri.at) / tri.dur);
        const e = easeOut(p);
        const q = 1 - e;
        const x = q * q * tri.sx + 2 * q * e * tri.cx + e * e * tri.ex;
        const y = q * q * tri.sy + 2 * q * e * tri.cy + e * e * tri.ey;
        const rot = tri.r0 * (1 - easeInOut(p));
        const sc = (p < 1 ? tri.s0 + (1 - tri.s0) * backOut(p) : 1) * (p < 1 ? 1 : gap);
        const cos = Math.cos(rot) * sc;
        const sin = Math.sin(rot) * sc;
        const pts = shapes[tri.turned ? 1 : 0];
        // White, and the facets settling into a pale ice as they land.
        const ice = tri.shade * 0.7 * e;
        const alpha = 0.35 + 0.65 * clamp(p * 2.2);
        const key = Math.round(alpha * 20) * 16 + Math.round(ice * 15);
        let path = groups.get(key);
        if (!path) groups.set(key, (path = new Path2D()));
        for (let i = 0; i < 3; i++) {
          const [px, py] = pts[i];
          const X = x + px * cos - py * sin;
          const Y = y + px * sin + py * cos;
          if (i) path.lineTo(X, Y);
          else path.moveTo(X, Y);
        }
        path.closePath();
      }
      for (const [key, path] of groups) {
        const ice = (key % 16) / 15;
        ctx.globalAlpha = Math.floor(key / 16) / 20;
        ctx.fillStyle = `rgb(${Math.round(255 - 59 * ice)}, ${Math.round(255 - 29 * ice)}, ${Math.round(255 - 5 * ice)})`;
        ctx.fill(path);
      }
      ctx.globalAlpha = 1;

      // Complete: the word turns solid, its depth comes up, a light crosses it (hero-depth.ts); the kicker rises in.
      if (!solid && t >= solidAt) {
        solid = true;
        wordChars.forEach((el) => el.classList.add('is-landed'));
        kickerChars.forEach((el) => el.classList.add('is-landed'));
        canvas.classList.add('is-solid');
        hero.dispatchEvent(new CustomEvent('hero:light', { detail: { from: -20, length: LIGHT } }));
      }
      if (solid && word) {
        const d = easeOut(clamp((t - solidAt) / 0.55));
        word.style.setProperty('--ex', (0.5 * d).toFixed(3));
        word.style.setProperty('--ey', (0.7 * d).toFixed(3));
      }
      if (t >= finishAt) {
        end();
        return;
      }
      raf = requestAnimationFrame(frame);
      // The first frame is drawn: the film handing over can fade now.
      if (!drawn && handover) hero.dispatchEvent(new CustomEvent('hero:mark'));
    };
    raf = requestAnimationFrame(frame);
  };

  // Skipping or resizing: straight to the finished hero. Scrolling away: the finished hero once the type has gone.
  hero.addEventListener('hero:skip', end);
  window.addEventListener('resize', end);
  window.addEventListener('scroll', scrolled, { passive: true });

  // Start as soon as the type is ready, so the letters measure true; after the opening film, when it hands over.
  const start = (e?: Event) =>
    fontsReady()
      .then(() => {
        if (state !== 'waiting') return;
        state = 'running';
        const handover = !!(e as CustomEvent<{ handover?: boolean }> | undefined)?.detail?.handover;
        requestAnimationFrame(() => {
          try {
            play(handover);
          } catch {
            end(); // never leave the headline hidden
          }
        });
      })
      .catch(end);
  if (hero.classList.contains('is-opening')) hero.addEventListener('hero:opening', start, { once: true });
  else start();
}
