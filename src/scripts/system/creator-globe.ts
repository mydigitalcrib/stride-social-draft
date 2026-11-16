// Behaviour for social/CreatorGlobe.astro.
// - Draws the globe on a canvas, with a cyan beam rising from the selected region into the phone. Redrawn
//   only while it moves. On desktop, over the stars: a night planet rising as a horizon (drawNight). On
//   phones and tablets: a dotted world on the cap of a large sphere, sliced across near the bottom (a lit
//   rim and a layered cross-section under it).
// - Selecting a region turns the globe (longitude) and rolls it (latitude) until that region sits
//   at the marker, then the phone slides that region's reel in. Ways to select: drag or swipe the
//   globe (a swipe moves to the next region that way; a spring settles it), scroll through the pinned section (one
//   region per step), or the region tabs (click, arrow keys, Home/End).
// - The phone plays only the selected reel, only while on screen; its button pauses it (WCAG 2.2.2). Its sound
//   starts off, as browsers require, and a button turns it on. On desktop, scrolling over the phone moves through
//   the region's reels; past the first or the last, the page takes over.
//   Under reduced motion the globe jumps instead of turning and nothing autoplays.
// - Desktop, with a close ([data-globe-close]): one more stretch of scroll after the last region, --end from 0 to 1
//   (.is-closing, then .is-closed once its way in can be pressed): the planet turns away and sinks, its foot melting
//   into the page (drawn here, not a mask), light comes up behind it like a dawn and settles back into its lit edge,
//   and the closing line rises over it (--close-in).
// - Desktop night planet, with motion: a region chosen pings from its light, a signal runs up the beam and the phone
//   catches it (.is-receiving on the phone). Pointing at a light swells it and lights its number in the list
//   (.is-pointed), and pointing at a number swells its light; a click on a light travels there. The drawing scales
//   with the screen (scale.ts), its backing store is capped for 4K and 8K screens, and while it turns the brightest
//   lights draw a cheaper glow (the real one once it's still).

import { playChime } from './chime';
import { uiScale } from './scale';
import { DESKTOP, lenis, reduced } from './env';

type Region = { key: string; label: string; lat: number; lon: number };

const D = Math.PI / 180;
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const SPIN = -120; // degrees the planet turns away as the page closes (westward, over the lit land)
const PULSE = 900; // ms: a region chosen, its ping and the signal up the beam
const CAUGHT = 430; // ms into it the phone catches the signal
const POINT = 180; // ms: a light swelling as it's pointed at
const HIT = 22; // px at 1920×1080: how near the pointer has to be to a light

// Stylised continent outlines (longitude, latitude) for the dot map: coarse shapes, not cartography.
const LAND: number[][][] = [
  // North America, Central America, Greenland
  [[-165, 68], [-140, 70], [-110, 73], [-85, 73], [-75, 63], [-62, 58], [-55, 50], [-65, 45], [-70, 42], [-76, 37], [-81, 31], [-80, 25], [-87, 30], [-95, 29], [-97, 25], [-100, 20], [-106, 23], [-110, 24], [-117, 32], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  [[-105, 20], [-97, 16], [-88, 13], [-83, 9], [-77, 8], [-80, 10], [-84, 15], [-88, 17], [-90, 21], [-97, 21]],
  [[-55, 60], [-45, 60], [-20, 70], [-20, 80], [-60, 82], [-70, 77]],
  // South America
  [[-80, 10], [-72, 12], [-60, 10], [-50, 0], [-35, -6], [-38, -15], [-48, -25], [-58, -35], [-65, -45], [-70, -55], [-75, -50], [-72, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0], [-78, 7]],
  // Europe, Britain, Ireland, Iceland
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [8, 57], [5, 62], [15, 69], [28, 71], [40, 68], [45, 60], [40, 50], [30, 45], [28, 41], [22, 36], [15, 38], [12, 44], [8, 44], [3, 42], [-4, 37]],
  [[-6, 50], [2, 51], [1, 53], [-2, 56], [-3, 58.5], [-6, 58], [-5, 55], [-3, 54], [-5, 52]],
  [[-10, 52], [-6, 52], [-6, 55], [-8, 55.3], [-10, 54]],
  [[-24, 64], [-14, 64], [-14, 66.5], [-22, 66.5]],
  // Africa, Arabia, Madagascar
  [[-17, 21], [-10, 30], [-6, 35], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [42, -2], [40, -15], [35, -25], [28, -34], [18, -34], [12, -18], [9, -1], [8, 4], [-8, 5], [-17, 14]],
  [[35, 30], [48, 30], [56, 25], [58, 21], [52, 15], [43, 12], [39, 20], [35, 28]],
  [[44, -16], [50, -14], [48, -25], [44, -24]],
  // Asia, Japan, South-East Asian islands
  [[30, 45], [40, 68], [60, 70], [80, 73], [100, 77], [120, 73], [140, 72], [160, 70], [180, 68], [180, 62], [163, 58], [156, 51], [143, 50], [140, 45], [135, 42], [130, 42], [122, 40], [121, 31], [117, 23], [108, 21], [109, 12], [104, 9], [100, 13], [99, 8], [103, 1], [98, 8], [94, 16], [91, 22], [87, 21], [80, 15], [77, 8], [72, 21], [67, 25], [60, 25], [57, 27], [50, 30], [44, 38], [40, 42]],
  [[130, 31], [136, 34], [141, 38], [141, 45], [140, 41], [135, 35]],
  [[95, 5], [106, -6], [115, -8], [120, -9], [119, 0], [118, 6], [109, 2], [104, -2]],
  [[131, -1], [141, -3], [150, -7], [143, -9], [135, -4]],
  // Australia, New Zealand
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -25], [151, -34], [145, -38], [138, -35], [131, -31], [124, -33], [116, -35], [114, -27]],
  [[172, -35], [178, -38], [174, -41], [170, -46], [167, -46], [173, -40]],
];

const inside = (x: number, y: number, poly: number[][]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

let dotCache: Float32Array | null = null;
/** Land as an even dot grid: [lon, lat, lon, lat, …] in degrees, built once. */
const landDots = () => {
  if (dotCache) return dotCache;
  const out: number[] = [];
  for (let lat = -56; lat <= 82; lat += 2) {
    const step = 2 / Math.max(0.2, Math.cos(lat * D));
    for (let lon = -180; lon < 180; lon += step) if (LAND.some((p) => inside(lon, lat, p))) out.push(lon, lat);
  }
  return (dotCache = new Float32Array(out));
};

function initGlobe(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-globe-canvas]');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const regions: Region[] = JSON.parse(root.dataset.regions ?? '[]');
  if (!regions.length) return;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-globe-tab]')];
  const screens = [...root.querySelectorAll<HTMLElement>('[data-globe-screen]')];
  const nows = [...root.querySelectorAll<HTMLElement>('[data-globe-now]')];
  const messages = [...root.querySelectorAll<HTMLElement>('[data-globe-message]')];
  const phone = root.querySelector<HTMLElement>('[data-globe-phone]');
  const status = root.querySelector<HTMLElement>('[data-globe-status]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-globe-toggle]');
  const soundButton = root.querySelector<HTMLButtonElement>('[data-globe-sound]');
  const phoneBody = phone?.querySelector<HTMLElement>('.phone__body');
  const dots = landDots();
  // The night planet projects each light once a frame: each one's latitude, as sine and cosine, worked out once.
  const dotSin = new Float64Array(dots.length / 2);
  const dotCos = new Float64Array(dots.length / 2);
  for (let j = 0; j < dotSin.length; j++) {
    dotSin[j] = Math.sin(dots[j * 2 + 1] * D);
    dotCos[j] = Math.cos(dots[j * 2 + 1] * D);
  }
  // And sorts them into its three tones, brightest towards the viewer: x, y pairs.
  const binned = [0, 1, 2].map(() => new Float64Array(dots.length));
  const binCount = [0, 0, 0];

  // View state: the point of the globe at the centre of the view (degrees), and where it's heading.
  let index = 0;
  let tilt = 40;
  let lon = regions[0].lon;
  let lat = regions[0].lat - tilt;
  let tLon = lon;
  let tLat = lat;
  let vLon = 0;
  let vLat = 0;
  let raf = 0;
  let inView = false;
  let userPaused = reduced();
  let soundOn = false;
  // The close: how far into it the page has scrolled (0 to 1), and where the planet would sit without it.
  let endNow = 0;
  let baseLon = lon;

  // Geometry, in CSS pixels: the sphere's centre sits far below the canvas, so only its cap shows.
  let W = 0;
  let H = 0;
  let R = 0;
  let cx = 0;
  let cy = 0;
  let cutY = 0;
  let rimA = 0;
  let markerY = 0;
  let night = false;
  let k = 1; // the screen's scale (scale.ts), for the night planet's lights, lines and glows

  // A region just chosen (desktop night planet): when, which, and where the phone's foot is on the canvas.
  let pulseAt = -Infinity;
  let pulseIndex = 0;
  let footY = 0;
  // A light pointed at (on the planet, or by its number in the list), and the one it was before, easing over.
  let pointed = -1;
  let pointedFrom = -1;
  let pointedAt = -Infinity;
  let pointedBy: '' | 'canvas' | 'tab' = '';
  let dragging = false;

  const layout = () => {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    // No more than about 4096 pixels across: on a 4K or 8K screen the blurred planet needs no more, and every turn
    // redraws all of it.
    const dpr = Math.min(2, window.devicePixelRatio || 1, 4096 / Math.max(1, W));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Over the stars (every screen since 2026-11-13): a night planet, far larger, rising from the foot of the screen
    // as a horizon. Its lights, lines and glows grow with the screen, as the page around it does.
    night = !!root.querySelector('.globe__haze');
    k = night ? uiScale() : 1;
    // Otherwise a round planet: nearly its whole upper half shows, about three quarters of the screen wide.
    const top = H * (night ? 0.16 : 0.1);
    cutY = night ? H : H * 0.82;
    const capH = cutY - top;
    // On a phone or tablet the stage is taller than wide, so the night planet is made wider still than the screen,
    // a horizon as on desktop rather than a ball (desktop keeps its own proportions).
    const halfWidth = night ? (window.matchMedia(DESKTOP).matches ? W * 0.66 : Math.max(W * 0.66, capH * 1.9)) : Math.min(W * 0.36, 640);
    R = Math.max(capH, (halfWidth ** 2 + capH ** 2) / (2 * capH));
    cx = W / 2;
    cy = top + R;
    rimA = Math.sqrt(Math.max(0, R ** 2 - (cy - cutY) ** 2));
    // The marker (where the selected region sits) is low on the planet, just clear of the phone above it.
    markerY = top + capH * 0.76;
    tilt = Math.asin(Math.min(0.97, (cy - markerY) / R)) / D;
    tLat = regions[index].lat - tilt;
    if (!raf) lat = tLat;
    // Where the planet is, for the meteors that land on it (meteors.ts).
    canvas.dataset.cx = String(cx);
    canvas.dataset.cy = String(cy);
    canvas.dataset.r = String(R);
  };

  const project = (pLon: number, pLat: number) => {
    const l = (pLon - lon) * D;
    const p = pLat * D;
    const c = lat * D;
    const cosP = Math.cos(p);
    const x = cosP * Math.sin(l);
    const y = Math.cos(c) * Math.sin(p) - Math.sin(c) * cosP * Math.cos(l);
    const z = Math.sin(c) * Math.sin(p) + Math.cos(c) * cosP * Math.cos(l);
    return [cx + R * x, cy - R * y, z];
  };

  const nearest = () => {
    let best = 0;
    regions.forEach((r, i) => {
      if (Math.abs(wrap(r.lon - lon)) < Math.abs(wrap(regions[best].lon - lon))) best = i;
    });
    return best;
  };

  /* ---------- Drawing ---------- */
  // How strongly light i is pointed at, easing in (and the one before easing out).
  const pointWeight = (i: number, now: number) => {
    const e = easeOut(clamp01((now - pointedAt) / POINT));
    return i === pointed ? e : i === pointedFrom ? 1 - e : 0;
  };

  // The night planet: a dark body barely apart from space, a thin lit edge of atmosphere, and the land as lights.
  // `moving`: while it turns, the brightest lights draw their glow as two soft rings instead of a blur (much
  // cheaper, and much the same in motion); the planet at rest always gets the real one.
  const drawNight = (moving = false) => {
    const now = performance.now();
    const motion = !reduced();
    ctx.clearRect(0, 0, W, H);

    // The atmosphere, glowing out into space.
    const halo = ctx.createRadialGradient(cx, cy, R * 0.985, cx, cy, R * 1.11);
    halo.addColorStop(0, 'rgba(195, 242, 251, 0.5)');
    halo.addColorStop(0.3, 'rgba(120, 190, 235, 0.16)');
    halo.addColorStop(1, 'rgba(120, 190, 235, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // The close: light coming up behind the planet as the closing line rises, settling back into its lit edge as
    // the line lands (0 at both ends, so the finished close is as it was).
    const dawnIn = ease(0.45, 1, endNow);
    const bloom = motion && endNow > 0 ? Math.sin(Math.PI * dawnIn) : 0;
    if (bloom > 0.001) {
      const dawn = ctx.createRadialGradient(cx, cy - R, 0, cx, cy - R, R * (0.25 + 0.3 * dawnIn));
      dawn.addColorStop(0, `rgba(235, 252, 255, ${(0.32 * bloom).toFixed(3)})`);
      dawn.addColorStop(0.45, `rgba(150, 215, 245, ${(0.1 * bloom).toFixed(3)})`);
      dawn.addColorStop(1, 'rgba(150, 215, 245, 0)');
      ctx.fillStyle = dawn;
      ctx.fillRect(0, 0, W, H);
    }

    // The body: dark, lifting to blue only just inside its edge.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    const body = ctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R);
    body.addColorStop(0, '#040e20');
    body.addColorStop(0.72, '#06142b');
    body.addColorStop(0.93, '#123058');
    body.addColorStop(1, '#4c7ea8');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.clip();

    // A faint graticule, to feel the turn.
    ctx.strokeStyle = 'rgba(207, 237, 248, 0.07)';
    ctx.lineWidth = 1;
    const line = (pts: number[][]) => {
      ctx.beginPath();
      let pen = false;
      for (const [a, b] of pts) {
        const [x, y, z] = project(a, b);
        if (z <= 0) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    };
    for (let m = -180; m < 180; m += 30) line(Array.from({ length: 46 }, (_, i) => [m, -90 + i * 4]));
    for (let p = -60; p <= 60; p += 30) line(Array.from({ length: 91 }, (_, i) => [-180 + i * 4, p]));

    // The land as city lights, brightest towards the viewer: each projected once, sorted into its tone.
    binCount[0] = binCount[1] = binCount[2] = 0;
    const sinC = Math.sin(lat * D);
    const cosC = Math.cos(lat * D);
    const cull = H + 4 * k;
    for (let i = 0, j = 0; i < dots.length; i += 2, j++) {
      const l = (dots[i] - lon) * D;
      const cosL = Math.cos(l);
      const z = sinC * dotSin[j] + cosC * dotCos[j] * cosL;
      if (z <= 0.02) continue;
      const y = cy - R * (cosC * dotSin[j] - sinC * dotCos[j] * cosL);
      if (y > cull) continue;
      const bin = Math.min(2, Math.floor(z * 3));
      const out = binned[bin];
      out[binCount[bin]++] = cx + R * (dotCos[j] * Math.sin(l));
      out[binCount[bin]++] = y;
    }
    const lights = (bin: number, size: number) => {
      const pts = binned[bin];
      ctx.beginPath();
      for (let i = 0; i < binCount[bin]; i += 2) {
        ctx.moveTo(pts[i] + size, pts[i + 1]);
        ctx.arc(pts[i], pts[i + 1], size, 0, Math.PI * 2);
      }
    };
    const bins: [string, number][] = [
      ['rgba(150, 215, 245, 0.42)', 1.2],
      ['rgba(195, 242, 251, 0.78)', 1.6],
      ['rgba(235, 252, 255, 1)', 2.1],
    ];
    bins.forEach(([fill, size], bin) => {
      if (bin === 2 && moving) {
        // The glow, roughly as the blur makes it, while it turns.
        ctx.fillStyle = 'rgba(195, 242, 251, 0.07)';
        lights(bin, 4.6 * k);
        ctx.fill();
        lights(bin, 3.3 * k);
        ctx.fill();
      }
      lights(bin, size * k);
      ctx.fillStyle = fill;
      ctx.shadowColor = 'rgba(195, 242, 251, 0.9)';
      ctx.shadowBlur = bin === 2 && !moving ? 7 * k : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Region markers, the selected one strongest, with a ring; one pointed at swells, with a fainter ring. No names
    // here: the region is named once, beside the list.
    const active = nearest();
    regions.forEach((r, i) => {
      const [x, y, z] = project(r.lon, r.lat);
      if (z <= 0.05) return;
      const on = i === active;
      const w = on ? 0 : pointWeight(i, now);
      ctx.beginPath();
      ctx.arc(x, y, (on ? 6 : 4 + 1.5 * w) * k, 0, Math.PI * 2);
      const alpha = w ? 0.5 + z * 0.4 + (0.5 - z * 0.4) * w : 0.5 + z * 0.4;
      ctx.fillStyle = on ? '#ffffff' : `rgba(207, 237, 248, ${alpha})`;
      ctx.shadowColor = 'rgba(195, 242, 251, 1)';
      ctx.shadowBlur = (on ? 22 : 10 + 8 * w) * k;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (on) {
        ctx.beginPath();
        ctx.arc(x, y, 14 * k, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(207, 237, 248, 0.85)';
        ctx.lineWidth = 1.5 * k;
        ctx.stroke();
      } else if (w > 0.01) {
        ctx.beginPath();
        ctx.arc(x, y, 10 * k, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(207, 237, 248, ${(0.5 * w).toFixed(3)})`;
        ctx.lineWidth = k;
        ctx.stroke();
      }
    });

    // A region just chosen: two rings opening out from its light, the second a moment later.
    const since = now - pulseAt;
    if (since >= 0 && since < PULSE) {
      const [x, y, z] = project(regions[pulseIndex].lon, regions[pulseIndex].lat);
      if (z > 0.05) {
        [
          [0, 46],
          [120, 64],
        ].forEach(([delay, to]) => {
          const u = clamp01((since - delay) / (PULSE - delay));
          if (u <= 0 || u >= 1) return;
          ctx.beginPath();
          ctx.arc(x, y, (14 + (to - 14) * easeOut(u)) * k, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(207, 237, 248, ${(0.85 * (1 - u)).toFixed(3)})`;
          ctx.lineWidth = (1.5 - u) * k;
          ctx.stroke();
        });
      }
    }
    ctx.restore();

    // The lit edge, strongest towards the upper left, where the light comes from (the dawn widens its brightest
    // part for a moment).
    const edge = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
    edge.addColorStop(0.3 + 0.2 * bloom, 'rgba(255, 255, 255, 1)');
    edge.addColorStop(0.55, 'rgba(195, 242, 251, 0.9)');
    edge.addColorStop(0.8, 'rgba(150, 215, 245, 0.55)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = edge;
    ctx.lineWidth = (1.75 + endNow * 1.5) * k;
    ctx.shadowColor = 'rgba(195, 242, 251, 0.95)';
    ctx.shadowBlur = (26 + endNow * 44) * k;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // The beam from the marker up towards the phone, once the phone has arrived (meteors.ts), and until it goes. A
    // region just chosen sends a signal up it into the phone, the beam brightening as it passes.
    if (!root.classList.contains('is-arriving') && endNow < 0.3) {
      const rise = clamp01((since / PULSE - 0.08) / 0.42);
      const sending = since >= 0 && since < PULSE && rise > 0 && rise < 1 && footY < markerY;
      const lift = sending ? Math.sin(Math.PI * rise) : 0;
      const beam = ctx.createLinearGradient(0, markerY, 0, 0);
      beam.addColorStop(0, `rgba(235, 252, 255, ${(0.9 + 0.1 * lift) * (1 - endNow / 0.3)})`);
      beam.addColorStop(1, 'rgba(235, 252, 255, 0)');
      ctx.fillStyle = beam;
      ctx.fillRect(cx - k, 0, 2 * k, markerY);
      if (sending) {
        const seg = 90 * k;
        const mid = markerY + (footY - seg / 2 - markerY) * easeInOut(rise);
        const signal = ctx.createLinearGradient(0, mid + seg / 2, 0, mid - seg / 2);
        signal.addColorStop(0, 'rgba(255, 255, 255, 0)');
        signal.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        signal.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = signal;
        ctx.shadowColor = 'rgba(195, 242, 251, 0.95)';
        ctx.shadowBlur = 12 * k;
        ctx.fillRect(cx - 1.5 * k, mid - seg / 2, 3 * k, seg);
        ctx.shadowBlur = 0;
      }
    }

    // It melts into the page at the foot, whatever follows; as the page closes and it sinks, the melt rises with
    // it, so the footer never cuts it off.
    ctx.globalCompositeOperation = 'destination-in';
    const foot = ctx.createLinearGradient(0, H * 0.84, 0, H);
    foot.addColorStop(0, 'rgba(0, 0, 0, 1)');
    foot.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = foot;
    ctx.fillRect(0, 0, W, H);
    if (endNow > 0 && motion) {
      const sink = endNow * 0.34;
      const melt = ctx.createLinearGradient(0, H * (0.8 - sink), 0, H * (1 - sink));
      melt.addColorStop(0, 'rgba(0, 0, 0, 1)');
      melt.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = melt;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  const draw = (moving = false) => {
    if (night) return drawNight(moving);
    ctx.clearRect(0, 0, W, H);
    const rimB = rimA * 0.085;

    // A soft halo of atmosphere around the planet, behind everything else, fading out towards
    // the cut so it never ends in a hard line.
    const halo = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.25);
    halo.addColorStop(0, 'rgba(207, 237, 248, 0.35)');
    halo.addColorStop(0.35, 'rgba(207, 237, 248, 0.12)');
    halo.addColorStop(1, 'rgba(207, 237, 248, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);
    const fade = ctx.createLinearGradient(0, cutY - H * 0.25, 0, cutY);
    fade.addColorStop(0, 'rgba(0, 0, 0, 1)');
    fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // The cross-section: a layered slab under the rim, as if the globe were cut through.
    const depth = H - cutY;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cutY, rimA, rimB, 0, 0, Math.PI);
    ctx.lineTo(cx - rimA, cutY);
    ctx.ellipse(cx, cutY + depth, rimA * 0.96, rimB, 0, Math.PI, 0, true);
    ctx.closePath();
    const slab = ctx.createLinearGradient(0, cutY, 0, H);
    slab.addColorStop(0, '#7892ab');
    slab.addColorStop(0.55, '#294368');
    slab.addColorStop(1, 'rgba(6, 20, 43, 0)');
    ctx.fillStyle = slab;
    ctx.fill();
    ctx.clip();
    // The core, glowing through the cut.
    const core = ctx.createRadialGradient(cx, cutY + depth * 0.25, 0, cx, cutY + depth * 0.25, rimA * 0.55);
    core.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    core.addColorStop(0.4, 'rgba(207, 237, 248, 0.2)');
    core.addColorStop(1, 'rgba(207, 237, 248, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(cx - rimA, cutY, rimA * 2, depth + rimB);
    for (let k = 1; k <= 6; k++) {
      ctx.beginPath();
      ctx.ellipse(cx, cutY + (depth * k) / 7, rimA * (1 - k * 0.006), rimB, 0, 0, Math.PI);
      ctx.strokeStyle = `rgba(207, 237, 248, ${0.45 - k * 0.06})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    // The cap: clipped to the sphere and to the front edge of the cut.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, cutY);
    ctx.lineTo(cx + rimA, cutY);
    ctx.ellipse(cx, cutY, rimA, rimB, 0, 0, Math.PI);
    ctx.lineTo(0, cutY);
    ctx.closePath();
    ctx.clip();

    const sheen = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.85, 0, cx, cy - R * 0.4, R * 1.05);
    sheen.addColorStop(0, '#e9fafd');
    sheen.addColorStop(0.35, '#cfedf8');
    sheen.addColorStop(0.75, '#7892ab');
    sheen.addColorStop(1, '#294368');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    // Light catching the upper left of the planet.
    const shine = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.8, 0, cx - R * 0.45, cy - R * 0.8, R * 0.7);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, W, H);

    // Graticule.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    const line = (pts: number[][]) => {
      ctx.beginPath();
      let pen = false;
      for (const [a, b] of pts) {
        const [x, y, z] = project(a, b);
        if (z <= 0) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    };
    for (let m = -180; m < 180; m += 30) line(Array.from({ length: 46 }, (_, i) => [m, -90 + i * 4]));
    for (let p = -60; p <= 60; p += 30) line(Array.from({ length: 91 }, (_, i) => [-180 + i * 4, p]));

    // Land dots, stronger towards the viewer, batched into three tones.
    const bins: [string, number][] = [
      ['rgba(255, 255, 255, 0.5)', 1.3],
      ['rgba(255, 255, 255, 0.8)', 1.7],
      ['rgba(255, 255, 255, 1)', 2],
    ];
    bins.forEach(([fill, size], bin) => {
      ctx.beginPath();
      for (let i = 0; i < dots.length; i += 2) {
        const [x, y, z] = project(dots[i], dots[i + 1]);
        if (z <= 0.02 || y > cutY + 4) continue;
        if (Math.min(2, Math.floor(z * 3)) !== bin) continue;
        ctx.moveTo(x + size, y);
        ctx.arc(x, y, size, 0, Math.PI * 2);
      }
      ctx.fillStyle = fill;
      ctx.fill();
    });

    // Region markers and names; the selected one strongest, with a ring.
    const active = nearest();
    ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    regions.forEach((r, i) => {
      const [x, y, z] = project(r.lon, r.lat);
      if (z <= 0.05) return;
      const on = i === active;
      ctx.beginPath();
      ctx.arc(x, y, on ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#ffffff' : `rgba(255, 255, 255, ${0.5 + z * 0.4})`;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = on ? 18 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (on) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = on ? '#ffffff' : `rgba(255, 255, 255, ${0.45 + z * 0.4})`;
      ctx.fillText(r.label.toUpperCase(), x + 20, y);
    });
    ctx.restore();

    // Atmosphere along the cap's edge, and the lit front edge of the cut.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, cutY);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(207, 237, 248, 0.75)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(207, 237, 248, 0.8)';
    ctx.shadowBlur = 36;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cutY, rimA, rimB, 0, 0, Math.PI);
    ctx.strokeStyle = 'rgba(207, 237, 248, 0.95)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(207, 237, 248, 0.8)';
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();

    // The beam from the marker up towards the phone.
    const beam = ctx.createLinearGradient(0, markerY, 0, 0);
    beam.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    beam.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(cx - 1, 0, 2, markerY);
  };

  /* ---------- Motion ---------- */
  // Redrawn only while something moves: the turn, a region's ping, or a light easing as it's pointed at.
  const loop = () => {
    raf = 0;
    vLon = vLon * 0.74 + (tLon - lon) * 0.08;
    vLat = vLat * 0.74 + (tLat - lat) * 0.08;
    lon += vLon;
    lat += vLat;
    const settled = Math.abs(tLon - lon) < 0.02 && Math.abs(tLat - lat) < 0.02 && Math.abs(vLon) < 0.02 && Math.abs(vLat) < 0.02;
    if (settled) {
      lon = tLon;
      lat = tLat;
      vLon = vLat = 0;
    }
    draw(!settled);
    const now = performance.now();
    if (!settled || now - pulseAt < PULSE || now - pointedAt < POINT) raf = requestAnimationFrame(loop);
  };
  const run = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  /* ---------- The phone and the labels ---------- */
  const syncVideo = () => {
    screens.forEach((s, i) => {
      s.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
        const current = i === index && !!v.closest('.is-active[data-globe-clip]');
        v.muted = !soundOn;
        if (current && inView && !userPaused && !root.closest('.is-media-held')) {
          if (v.preload === 'none') v.preload = 'auto';
          v.play().catch(() => {
            // The browser refused the sound: keep the picture.
            if (!v.muted) {
              v.muted = true;
              v.play().catch(() => {});
            }
          });
        } else v.pause();
      });
    });
    const hasVideo = !!screens[index]?.querySelector('.is-active[data-globe-clip] video');
    phone?.classList.toggle('has-no-video', !hasVideo);
    phone?.classList.toggle('is-paused', userPaused);
    toggle?.setAttribute('aria-label', userPaused ? 'Play video' : 'Pause video');
    phone?.classList.toggle('has-sound', soundOn);
    soundButton?.setAttribute('aria-pressed', String(soundOn));
    soundButton?.setAttribute('aria-label', soundOn ? 'Turn the sound off' : 'Turn the sound on');
  };

  // A region with several reels: one in front, those before it above, those after it below.
  const clipsOf = (s: HTMLElement) => [...s.querySelectorAll<HTMLElement>('[data-globe-clip]')];
  const showClip = (s: HTMLElement, k: number) => {
    clipsOf(s).forEach((c, n) => {
      c.classList.toggle('is-active', n === k);
      c.classList.toggle('is-before', n < k);
      c.setAttribute('aria-hidden', String(n !== k));
      if (n === k) {
        const video = c.querySelector('video');
        if (video) video.currentTime = 0;
      }
    });
    s.querySelectorAll<HTMLElement>('[data-globe-dot]').forEach((d, n) => d.classList.toggle('is-on', n === k));
    syncVideo();
  };
  // When one ends, the next slides up, and after the last, the first.
  screens.forEach((s) => {
    const clips = clipsOf(s);
    if (clips.length < 2) return;
    clips.forEach((clip, k) => clip.querySelector('video')?.addEventListener('ended', () => showClip(s, (k + 1) % clips.length)));
  });

  const showRegion = (i: number) => {
    const from = index;
    index = i;
    tabs.forEach((t, n) => {
      t.setAttribute('aria-selected', String(n === i));
      t.tabIndex = n === i ? 0 : -1;
    });
    phone?.setAttribute('aria-labelledby', tabs[i]?.id ?? '');
    // On phones the tabs are a sideways row: keep the selected one in view.
    const row = tabs[i]?.parentElement;
    if (row && row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: tabs[i].offsetLeft - (row.clientWidth - tabs[i].offsetWidth) / 2, behavior: reduced() ? 'auto' : 'smooth' });
    }
    screens.forEach((s, n) => {
      s.classList.toggle('is-active', n === i);
      s.classList.toggle('is-before', n === from && n !== i);
      s.setAttribute('aria-hidden', String(n !== i));
    });
    nows.forEach((n, k) => n.classList.toggle('is-active', k === i));
    // Fewer messages than regions: they share the regions out in order, so none comes back (every screen).
    const said = Math.min(messages.length - 1, Math.floor((i * messages.length) / regions.length));
    messages.forEach((m, k) => {
      const on = k === said;
      m.classList.toggle('is-active', on);
      if (on) m.removeAttribute('aria-hidden');
      else m.setAttribute('aria-hidden', 'true');
    });
    if (status) status.textContent = `${regions[i].label} selected`;
    syncVideo();
  };

  /* ---------- The beam carries the reel (desktop night planet, with motion) ---------- */
  // A region chosen pings from its light, a signal runs up the beam, and the phone catches it as its reel slides in.
  let caught = 0;
  let catchDone = 0;
  const ping = (i: number) => {
    if (!night || reduced() || !phone || !phoneBody || endNow >= 0.3 || root.classList.contains('is-arriving')) return;
    // Where the phone's foot (with its bezel) is on the canvas: the signal goes in there.
    footY = phoneBody.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top + 10 * k;
    pulseAt = performance.now();
    pulseIndex = i;
    window.clearTimeout(caught);
    window.clearTimeout(catchDone);
    phone.classList.remove('is-receiving');
    caught = window.setTimeout(() => {
      phone.classList.add('is-receiving');
      catchDone = window.setTimeout(() => phone.classList.remove('is-receiving'), 600);
    }, CAUGHT);
  };

  /* ---------- Pointing at the lights (desktop night planet) ---------- */
  // Pointed at on the planet, a light swells and its number in the list lights up (.is-pointed), and the cursor
  // shows it can be pressed (data-press); pointed at in the list, a number swells its light. Never while the
  // planet is dragged, the phone is landing or the page is closing.
  const point = (i: number, by: 'canvas' | 'tab') => {
    if (i < 0 && pointedBy && pointedBy !== by) return; // only what pointed at it lets it go
    if (i === pointed) {
      if (i >= 0) pointedBy = by;
      return;
    }
    pointedFrom = pointed;
    pointed = i;
    pointedBy = i < 0 ? '' : by;
    pointedAt = reduced() ? -Infinity : performance.now();
    tabs.forEach((t, n) => t.classList.toggle('is-pointed', by === 'canvas' && n === i));
    canvas.toggleAttribute('data-press', by === 'canvas' && i >= 0);
    // While it's dragged the drag draws it; otherwise the loop eases the light over.
    if (reduced() || dragging) draw(dragging);
    else run();
  };
  const canPoint = () =>
    night && !dragging && endNow === 0 && !root.classList.contains('is-landing') && !root.classList.contains('is-arriving');
  /** The light (other than the selected region's) nearest a point on the canvas, if it's near enough. */
  const lightAt = (x: number, y: number) => {
    let best = -1;
    let near = HIT * k;
    regions.forEach((r, i) => {
      if (i === index) return;
      const [mx, my, z] = project(r.lon, r.lat);
      if (z <= 0.05) return;
      const d = Math.hypot(mx - x, my - y);
      if (d < near) {
        near = d;
        best = i;
      }
    });
    return best;
  };

  /** Turn the globe to region i (the shortest way round) and show it in the phone. */
  const select = (i: number) => {
    i = Math.min(regions.length - 1, Math.max(0, i));
    baseLon = lon + wrap(regions[i].lon - lon);
    tLon = baseLon + (reduced() ? 0 : endNow * SPIN);
    tLat = regions[i].lat - tilt;
    if (i !== index) {
      ping(i);
      showRegion(i);
      if (pointed === i) point(-1, pointedBy || 'canvas');
    }
    if (reduced()) {
      lon = tLon;
      lat = tLat;
      draw();
      return;
    }
    run();
  };

  // A meteor's hit spins the globe a little; the spring brings it back (meteors.ts).
  root.addEventListener('globe:kick', (e) => {
    vLon += (e as CustomEvent<number>).detail;
    run();
  });
  root.addEventListener('globe:redraw', () => draw());

  /* ---------- Drag and swipe, and a click on a light ---------- */
  let lastX = 0;
  let startLon = 0;
  let startIndex = 0;
  let downX = 0;
  let downY = 0;
  let downAt = 0;
  let downOn = -1;
  let hover: { x: number; y: number } | null = null;
  let hoverRaf = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    // A press on a light (mouse or pen) may be a click on it: kept to tell on release.
    const c = canvas.getBoundingClientRect();
    downOn = e.pointerType !== 'touch' && canPoint() ? lightAt(e.clientX - c.left, e.clientY - c.top) : -1;
    downX = e.clientX;
    downY = e.clientY;
    downAt = e.timeStamp;
    dragging = true;
    lastX = e.clientX;
    startLon = lon;
    startIndex = index;
    cancelAnimationFrame(raf);
    raf = 0;
    root.classList.add('is-dragging');
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone */
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      // A press that turns into a drag lets go of the light it was on.
      if (pointed >= 0 && Math.hypot(e.clientX - downX, e.clientY - downY) >= 4 * k) point(-1, pointedBy || 'canvas');
      const dx = e.clientX - lastX;
      lon -= (dx / R) * (180 / Math.PI) * 1.4;
      tLon = lon;
      lastX = e.clientX;
      draw(true);
      return;
    }
    if (e.pointerType === 'touch' || !night) return;
    hover = { x: e.clientX, y: e.clientY };
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      if (!hover || !canPoint()) return point(-1, 'canvas');
      const c = canvas.getBoundingClientRect();
      point(lightAt(hover.x - c.left, hover.y - c.top), 'canvas');
    });
  });
  canvas.addEventListener('pointerleave', () => {
    hover = null;
    point(-1, 'canvas');
  });
  // A deliberate swipe always moves on: to the region nearest the view, or at least the next one
  // in the direction of the swipe (regions can be far apart). The spring carries it the rest of the way.
  // A quick click on a light, hardly moved, goes to that region.
  const release = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
    if (e.type === 'pointerup' && downOn >= 0 && Math.hypot(e.clientX - downX, e.clientY - downY) < 4 * k && e.timeStamp - downAt < 300) {
      select(downOn);
      return;
    }
    const moved = lon - startLon;
    let target = nearest();
    if (target === startIndex && Math.abs(moved) > 12) target = (startIndex + Math.sign(moved) + regions.length) % regions.length;
    select(target);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* ---------- Tabs ---------- */
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    // Its number pointed at, or reached by keyboard, swells its light on the planet (when it's on this side; the
    // selected region's light is already the strongest, as on the planet itself).
    t.addEventListener('pointerenter', () => canPoint() && i !== index && point(i, 'tab'));
    t.addEventListener('pointerleave', () => point(-1, 'tab'));
    t.addEventListener('focus', () => canPoint() && i !== index && t.matches(':focus-visible') && point(i, 'tab'));
    t.addEventListener('blur', () => point(-1, 'tab'));
  });
  root.querySelector('[data-globe-tabs]')?.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
    let i: number | null = step !== undefined ? (index + step + regions.length) % regions.length : null;
    if (ev.key === 'Home') i = 0;
    if (ev.key === 'End') i = regions.length - 1;
    if (i === null) return;
    ev.preventDefault();
    select(i);
    tabs[i]?.focus();
  });

  toggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    syncVideo();
  });

  soundButton?.addEventListener('click', () => {
    soundOn = !soundOn;
    syncVideo();
  });

  /* ---------- Scroll: one region per step while the stage is pinned ---------- */
  let scrollIndex = 0;
  let leaving = false; // on the way out from the last region: the stage holds still until it's gone
  const closer = root.querySelector<HTMLElement>('[data-globe-close]');
  const setEnd = (end: number) => {
    if (end === endNow) return;
    endNow = end;
    root.style.setProperty('--end', end.toFixed(3));
    root.style.setProperty('--close-in', ease(0.42, 0.86, end).toFixed(3));
    root.classList.toggle('is-closing', end > 0);
    root.classList.toggle('is-closed', end > 0.8);
    // Nothing stays pointed at as the planet turns away.
    if (end > 0 && pointed >= 0) point(-1, pointedBy || 'canvas');
    if (reduced()) return;
    tLon = baseLon + end * SPIN;
    run();
  };
  // One read of the section a scroll, shared with the header's (below). Scroll events come once a frame already.
  const onScroll = () => {
    const rect = root.getBoundingClientRect();
    updateHeader(rect);
    if (leaving) return;
    const travel = rect.height - window.innerHeight;
    if (travel <= 0) return;
    // With a close (every screen): its stretch is the last of the section (about a screen, its CSS height).
    const tail = closer ? Math.min(travel * 0.5, window.innerHeight * 0.9) : 0;
    const span = travel - tail;
    const progress = Math.min(0.999, Math.max(0, -rect.top / span));
    const i = Math.floor(progress * regions.length);
    if (i !== scrollIndex) {
      scrollIndex = i;
      select(i);
    }
    setEnd(tail ? clamp01((-rect.top - span) / tail) : 0);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Desktop: up from the last region goes straight to the section before ---------- */
  // No going back through every region (the list still reaches them). The scroll drops to the stage's
  // start unseen, since the stage is pinned, and the page glides from there. Wheel only; keys and the
  // scrollbar move as usual. A wheel still running up from the footer carries on through the regions;
  // only a new one, after a pause, goes straight up.
  const desk = window.matchMedia(DESKTOP);

  /* ---------- Desktop: scrolling over the phone moves through the region's reels ---------- */
  // One gesture, one reel, however long a trackpad keeps sending it. Only while the stage is pinned, and
  // past the first or the last reel a new gesture moves the page, so nobody gets stuck on the phone.
  const REEL_REST = 550; // ms before another reel can come
  const SAME_GESTURE = 140; // ms: a wheel closer than this to the last one is still the same gesture
  let reelMovedAt = -Infinity;
  let phoneWheelAt = -Infinity;
  const reelFrom = (dir: number) => {
    const clips = clipsOf(screens[index]);
    const next = clips.findIndex((c) => c.classList.contains('is-active')) + dir;
    return next >= 0 && next < clips.length ? next : -1;
  };
  const stillSettling = (t: number) => t - reelMovedAt < REEL_REST;
  phone?.addEventListener('wheel', (e) => {
    const gap = e.timeStamp - phoneWheelAt;
    phoneWheelAt = e.timeStamp;
    const rect = root.getBoundingClientRect();
    if (!desk.matches || e.ctrlKey || !e.deltaY || endNow > 0 || rect.top > 1 || rect.bottom < window.innerHeight - 1) return;
    const next = reelFrom(Math.sign(e.deltaY));
    const same = gap < SAME_GESTURE && reelMovedAt > e.timeStamp - 1500;
    if (next < 0 && !same && !stillSettling(e.timeStamp)) return; // the page's turn
    e.preventDefault();
    e.stopPropagation(); // before the smooth scroll hears it
    if (next < 0 || same || stillSettling(e.timeStamp)) return;
    reelMovedAt = e.timeStamp;
    showClip(screens[index], next);
  }, { passive: false });

  let lastWheel = 0;
  let fromBelow = false;
  window.addEventListener('wheel', (e) => {
    const gap = e.timeStamp - lastWheel;
    lastWheel = e.timeStamp;
    // The phone's own reels come first.
    if (phone?.contains(e.target as Node) && (reelFrom(Math.sign(e.deltaY)) >= 0 || stillSettling(e.timeStamp))) return;
    const smooth = lenis();
    const before = root.previousElementSibling;
    if (leaving || !smooth || !before || !desk.matches) return;
    const rect = root.getBoundingClientRect();
    if (rect.bottom < window.innerHeight - 1) {
      fromBelow = true;
      return;
    }
    if (rect.top > 1) return;
    if (fromBelow && gap < 200) return;
    fromBelow = false;
    if (e.deltaY >= 0 || e.ctrlKey || index !== regions.length - 1 || endNow > 0) return;
    e.preventDefault();
    e.stopPropagation(); // before the smooth scroll hears it
    leaving = true;
    smooth.scrollTo(rect.top + window.scrollY, { immediate: true, force: true });
    smooth.scrollTo(before.getBoundingClientRect().top + window.scrollY, {
      duration: 0.9,
      force: true,
      lock: true,
      onComplete: () => {
        leaving = false;
        onScroll();
      },
    });
  }, { capture: true, passive: false });

  /* ---------- The notification: once ---------- */
  // Arrived means in view (and, inside a [data-media-hold], once it lets go).
  // It comes on arrival and stays a few seconds, or until the visitor takes hold of the globe.
  // At the top of the screen, outside the phone (the owner, 2026-11-13; phones and tablets too since that day), once
  // the phone is there (meteors.ts); the header steps aside meanwhile (html.has-notes, as for the homepage's), and it
  // goes with the visitor's first gesture after a moment to read it.
  const notice = root.querySelector<HTMLElement>('[data-globe-note]');
  const landed = () => !root.classList.contains('is-landing') && !root.classList.contains('is-arriving');
  const arrived = () => inView && landed();
  const GESTURES = ['wheel', 'pointerdown', 'keydown', 'touchstart'];
  const putAway = () => {
    if (notice?.classList.contains('is-shown')) document.documentElement.classList.remove('has-notes');
    notice?.classList.remove('is-shown');
    GESTURES.forEach((t) => window.removeEventListener(t, putAway, true));
  };
  let noticed = false;
  const maybeNotify = () => {
    if (noticed || !notice || !arrived()) return;
    noticed = true;
    window.setTimeout(() => {
      notice.classList.add('is-shown');
      document.documentElement.classList.add('has-notes');
      playChime(); // the same chime as the homepage's notifications, if the browser allows sound yet
      window.setTimeout(putAway, 7000);
      window.setTimeout(() => GESTURES.forEach((t) => window.addEventListener(t, putAway, { capture: true, passive: true })), 1800);
    }, 500);
  };
  // The phone's arrival is a class on the section (meteors.ts).
  new MutationObserver(maybeNotify).observe(root, { attributes: true, attributeFilter: ['class'] });
  canvas.addEventListener('pointerdown', putAway);

  /* ---------- No header while the stage is pinned ---------- */
  // The logo stripe runs along the top of the screen, where the header would cover it (with motion, where the
  // stripe shows; every screen). It returns as the stage leaves.
  const withStripe = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const updateHeader = (rect = root.getBoundingClientRect()) => {
    document.documentElement.classList.toggle('is-on-globe', withStripe.matches && rect.top <= 1 && rect.bottom >= window.innerHeight);
  };
  window.addEventListener('resize', () => updateHeader(), { passive: true });
  updateHeader();

  new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    syncVideo();
    maybeNotify();
  }, { threshold: 0.2 }).observe(root);
  // Inside a [data-media-hold] it waits until that lets go.
  root.closest('[data-media-hold]')?.addEventListener('media:hold', syncVideo);
  new ResizeObserver(() => {
    layout();
    draw();
  }).observe(canvas);

  layout();
  showRegion(0);
  draw();
  onScroll();
}

export function initCreatorGlobes() {
  document.querySelectorAll<HTMLElement>('[data-creator-globe]').forEach((root) => {
    if (root.dataset.globeReady) return;
    root.dataset.globeReady = 'true';
    initGlobe(root);
  });
}
