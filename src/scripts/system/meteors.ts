// Stride Social, from the menu to the globe (desktop): the transition the owner chose. As the page scrolls, the
// menu's photos come loose and fall as meteors onto the planet rising from below. Each hits with a flash, a ripple
// and a region's name, spinning the globe a little, and leaves its spot lit on the planet; with the last the phone
// arrives, and only then the words (the region, the list, the message and the logos: .is-landing on the globe until
// then, so nothing falls across them). It follows the scroll both ways, so scrolling back up lifts the photos into
// place. The impacts only play going down.
// Only on desktop, with the menu right above the globe (SocialPage.astro), and with motion allowed.
// Each frame reads the page once, then writes; it rests once everything has landed (or nothing has come loose). Its
// sizes grow with the screen (scale.ts), and on a screen wider than 16:9 (21:9, 32:9) the landings keep to the
// content's width, so their names stay clear of the radial navigation in the margin and of the screen's edges.
// A name that lands where the words beside the phone will be (a narrow desktop, where they reach down to the planet's
// top) steps aside as they come in (.is-crowded, SocialPage.astro), so the two never sit on top of each other.
import { uiScale } from './scale';
import { clamp, desktop, reduced } from './env';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const START = 0.04; // the first photo comes loose, as a share of the scroll to the globe
const START_GAP = 0.04; // and each of the others this much later
const LAND_FIRST = 0.66; // the first lands, once the planet is far enough up to see it
const LAND_LAST = 0.9; // the last lands
const PHONE_AT = 0.9; // the phone arrives from here to the end
const WORDS_AT = 0.985; // and the words come in once it has (about when the stage reaches the top)
const SPOTS_OUT = 0.94; // the lit spots hand over to the region's marker from here
const SPREAD = 20; // degrees either side of the planet's top (it's a large planet: that's most of the screen)
const REACH = 0.36; // but never further out than this share of the screen's width, either side
const ROOM = 72; // px at 1920×1080: and never nearer the content's margin than this (half a region's name)
const INSET = 0.96; // how far in from its edge they land
const HEAD = 54; // px at 1920×1080, a meteor's width when it lands
const KICK = 5; // degrees of spin per hit

type Base = { cx: number; cy: number; w: number; h: number; trail: HTMLElement };
// `inner`: how far either side of the middle a landing may be, inside the content's margins.
type Planet = { left: number; top: number; width: number; cx: number; cy: number; r: number; inner: number };

export function initMeteors() {
  const deck = document.getElementById('social-menu');
  const globe = document.querySelector<HTMLElement>('[data-creator-globe]');
  if (!deck || !globe || deck.nextElementSibling !== globe || deck.dataset.meteorsReady) return;
  if (!desktop() || reduced()) return;
  const stage = globe.querySelector<HTMLElement>('.globe__stage');
  const canvas = globe.querySelector<HTMLElement>('[data-globe-canvas]');
  const phone = globe.querySelector<HTMLElement>('.phone');
  if (!stage || !canvas || !phone) return;
  deck.dataset.meteorsReady = 'true';

  const layer = document.createElement('div');
  layer.className = 'meteors';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  const names = [...globe.querySelectorAll<HTMLElement>('[data-globe-tab] .globe__region-name')].map((t) => t.textContent?.trim() ?? '');
  // The words either side of the phone (the region and its list; the message), which a name mustn't sit on.
  const copy = [...stage.querySelectorAll<HTMLElement>(':scope > .globe__intro, :scope > .globe__messages')];
  // The content's margin (the stage's own side padding, --margin), read again after a resize.
  let edge = 0;
  const readEdge = () => (edge = parseFloat(getComputedStyle(stage).paddingLeft) || 0);
  readEdge();
  // The cards coming loose, each with where it started.
  const loose = new Map<HTMLElement, Base>();
  // Where each has landed: a point of light on the planet, lit by its hit.
  let spots: HTMLElement[] = [];
  const spotsFor = (n: number) => {
    if (spots.length === n) return spots;
    spots.forEach((s) => s.remove());
    spots = Array.from({ length: n }, () => {
      const s = document.createElement('span');
      s.className = 'meteors__spot';
      s.setAttribute('aria-hidden', 'true');
      stage.append(s);
      return s;
    });
    return spots;
  };
  let lastP = 0;
  // The next frame runs whatever the scroll (the first, and after a resize or a new tab). Kept apart from lastP so
  // that a resize or a new tab never sets off the impacts again.
  let dirty = true;
  let raf = 0;

  // The open tab's cards, looked up again only when the tab changes.
  let cards: HTMLElement[] | null = null;
  const openCards = () => (cards ??= [...deck.querySelectorAll<HTMLElement>('.deck__panel:not([hidden]) .deck__cards > li')]);

  /** Where a meteor lands, on the screen as it is now. */
  const spot = (i: number, n: number, g: Planet) => {
    // Its share of the planet's top, narrower on a screen wider than 16:9, where the planet is far larger than the
    // screen is tall and the outer landings would fall into the margin (the radial navigation) or off the screen.
    // Up to 16:9 neither limit is reached, so they spread as drawn.
    const reach = Math.min(REACH * g.width, g.inner);
    const spread = Math.min(SPREAD, (Math.asin(clamp(reach / (INSET * g.r))) * 180) / Math.PI);
    const a = ((n > 1 ? -spread + (2 * spread * i) / (n - 1) : 0) * Math.PI) / 180;
    return { x: g.left + g.cx + INSET * g.r * Math.sin(a), y: g.top + g.cy - INSET * g.r * Math.cos(a) };
  };

  const hit = (i: number, n: number, s: { x: number; y: number }, box: DOMRect, k: number) => {
    const el = document.createElement('div');
    el.className = 'meteors__hit';
    el.style.left = `${s.x - box.left}px`;
    el.style.top = `${s.y - box.top}px`;
    el.innerHTML = `<span class="meteors__ring"></span><span class="meteors__ring"></span>${Array.from({ length: 8 }, (_, j) => `<i style="--a: ${j * 45 + 12}deg"></i>`).join('')}`;
    const label = document.createElement('b');
    label.textContent = names[i % names.length] ?? '';
    el.append(label);
    stage.append(el);
    // Where its name stands in the stage (layout boxes, so the words' entrance and the name's own animation don't
    // count): over the words beside the phone, it steps aside once they come in (.is-crowded, SocialPage.astro).
    const x = s.x - box.left;
    const y = s.y - box.top + label.offsetTop;
    const half = label.offsetWidth / 2;
    const h = label.offsetHeight;
    const crowded = copy.some(
      (w) => x + half > w.offsetLeft && x - half < w.offsetLeft + w.offsetWidth && y + h > w.offsetTop && y < w.offsetTop + w.offsetHeight,
    );
    if (crowded) label.classList.add('is-crowded');
    window.setTimeout(() => el.remove(), 1500);
    globe.dispatchEvent(new CustomEvent('globe:kick', { detail: (i < n / 2 ? -1 : 1) * KICK }));
    canvas.animate([{ transform: 'none' }, { transform: `translateY(${7 * k}px)` }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
  };

  const release = (li: HTMLElement) => {
    li.style.removeProperty('transform');
    li.style.removeProperty('visibility');
    li.style.removeProperty('clip-path');
    loose.get(li)?.trail.remove();
    loose.delete(li);
  };

  const frame = () => {
    raf = 0;
    const k = uiScale();
    const scroll = window.scrollY;

    // ---------- Reads, all of them, before anything is written this frame ----------
    const whole = globe.getBoundingClientRect().top + scroll;
    const p = whole > 0 ? clamp(scroll / whole) : 0;
    // Nothing to do once it's settled either way: landed (after one last frame), or not begun with nothing loose.
    if (!dirty && ((p >= 1 && lastP >= 1) || (p <= 0 && lastP === 0 && !loose.size))) return;
    dirty = false;
    const list = openCards();
    const n = list.length;
    const box = stage.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    const planet: Planet = {
      left: c.left,
      top: c.top,
      width: c.width,
      cx: Number(canvas.dataset.cx),
      cy: Number(canvas.dataset.cy),
      r: Number(canvas.dataset.r),
      inner: c.width / 2 - edge - ROOM * k,
    };
    const at = list.map((_, i) => spot(i, n, planet));
    // A card coming loose is measured where it sits (it has no transform of ours yet).
    const fresh = new Map<HTMLElement, DOMRect>();
    list.forEach((li, i) => {
      if (p > START + i * START_GAP && !loose.has(li)) fresh.set(li, li.getBoundingClientRect());
    });

    // ---------- Writes ----------
    deck.classList.toggle('is-falling', p > 0);
    const out = clamp((p - SPOTS_OUT) / (1 - SPOTS_OUT));
    spotsFor(n).forEach((s, i) => {
      const land = n > 1 ? lerp(LAND_FIRST, LAND_LAST, i / (n - 1)) : LAND_LAST;
      // Moved, not laid out again.
      s.style.translate = `${(at[i].x - box.left).toFixed(1)}px ${(at[i].y - box.top).toFixed(1)}px`;
      s.classList.toggle('is-lit', p >= land && out < 1);
      s.style.opacity = p >= land ? String(1 - out) : '';
    });

    list.forEach((li, i) => {
      const start = START + i * START_GAP;
      const land = n > 1 ? lerp(LAND_FIRST, LAND_LAST, i / (n - 1)) : LAND_LAST;
      const t = clamp((p - start) / (land - start));
      if (t <= 0) return release(li);
      let base = loose.get(li);
      if (!base) {
        const r = fresh.get(li);
        if (!r) return;
        const trail = document.createElement('span');
        trail.className = 'meteors__trail';
        layer.append(trail);
        base = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 + scroll, w: r.width, h: r.height, trail };
        loose.set(li, base);
      }
      const { cx, cy, w, h, trail } = base;
      const goal = at[i];
      const from = cy - start * whole; // where it was on the screen as it came loose
      const path = (x: number) => {
        // A small lift as it comes loose, then gravity.
        const lift = x < 0.16 ? Math.sin((x / 0.16) * Math.PI) * 26 * k : 0;
        return { x: lerp(cx, goal.x, x * x), y: lerp(from, goal.y, x ** 2.3) - lift };
      };
      const now = path(t);

      if (t >= 1) {
        li.style.visibility = 'hidden';
        trail.style.opacity = '0';
        if (lastP < land && p >= land) hit(i, n, goal, box, k);
        return;
      }
      li.style.visibility = 'visible';
      // It closes in on the middle of the photo as it falls, into a round meteor.
      const side = Math.min(w, h);
      const round = clamp(t * 1.5);
      const size = lerp(1, Math.max(0.06, (HEAD * k) / side), t ** 1.5);
      const turn = (i % 2 ? 1 : -1) * 28 * t * t;
      li.style.transform = `translate(${now.x - cx}px, ${now.y - (cy - scroll)}px) rotate(${turn}deg) scale(${size})`;
      li.style.clipPath = `inset(${((h - side) / 2) * round}px ${((w - side) / 2) * round}px round ${lerp(22 * k, side / 2, round * round)}px)`;

      // The streak behind it, along its way down.
      const back = path(Math.max(0, t - 0.3));
      const dx = now.x - back.x;
      const dy = now.y - back.y;
      const length = Math.hypot(dx, dy);
      trail.style.opacity = String(clamp((t - 0.18) / 0.22));
      trail.style.width = `${Math.max(16 * k, side * size * 0.9)}px`;
      trail.style.height = `${length}px`;
      trail.style.transform = `translate(${now.x}px, ${now.y}px) translate(-50%, -100%) rotate(${(Math.atan2(dx, dy) * -180) / Math.PI}deg)`;
    });

    // The words wait for the phone.
    globe.classList.toggle('is-landing', p < WORDS_AT);

    // Its beam waits for it.
    const arriving = p < PHONE_AT;
    if (arriving !== globe.classList.contains('is-arriving')) {
      globe.classList.toggle('is-arriving', arriving);
      globe.dispatchEvent(new Event('globe:redraw'));
    }

    // The phone arrives with the last hit, and is left alone once it has.
    const q = clamp((p - PHONE_AT) / (1 - PHONE_AT));
    if (p >= 1) {
      phone.style.removeProperty('opacity');
      phone.style.removeProperty('transform');
    } else {
      const o = 1.7;
      const pop = 1 + (o + 1) * (q - 1) ** 3 + o * (q - 1) ** 2; // overshoots a touch
      phone.style.opacity = String(clamp(q * 2.5));
      phone.style.transform = `translateY(${(1 - q) * 60 * k}px) scale(${lerp(0.5, 1, pop)})`;
    }
    lastP = p;
  };

  const ask = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const reset = () => {
    deck.querySelectorAll<HTMLElement>('.deck__cards > li').forEach(release);
    dirty = true;
    ask();
  };
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', () => {
    readEdge();
    reset();
  });
  // A tab changed: let go of the old tab's cards, and fall with the new one's.
  new MutationObserver((records) => {
    if (!records.some((r) => (r.target as Element).classList?.contains('deck__panel'))) return;
    cards = null;
    reset();
  }).observe(deck, { attributes: true, attributeFilter: ['hidden'], subtree: true });
  frame();
}
