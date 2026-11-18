// Stride Speakers' scenes (talent/SpeakerStage.astro, desktop).
// The line-up: a speaker's name pointed at (or focused) puts them on the monitor, the broadcast caption wiping in with
// their name; a press on the name opens their profile among the others (creator-sheet.ts, `creators:open`); a click on
// the monitor adds them (their keep button, so shortlist.ts keeps the list, and the camera's shot).
// Like a vision mixer: a new speaker is a cut, a line of light sweeping down the monitor and the picture settling from
// bright (only for the one the pointer settles on, so skimming the names never strobes); a click snaps the frame marks in.
// Left alone in view for a few seconds, it moves on to the next speaker by itself (unannounced), until the pointer or
// the focus comes into the line-up. The names are one stop in the tab order (the one on the monitor), the arrow keys,
// Home and End move along them, and the next stop is that speaker's "+ Add" (so any of them can be added from the
// keyboard, not only the last); taken from the keyboard it takes the shot too.
// The slides: one engagement at a time on the stage's screen; a click on its right half goes on, on its left half back
// (round and round), as do the arrow keys while the screen is in view, the arrows and the pictures below, and a sideways
// swipe on a trackpad. Over the screen the pointer is a presenter's laser with a short fading trail; a click sends a
// ring of light out from it, a soft light at the edge says which way the half pointed at goes, the slides come in from
// that side and the number rolls. Over the caption's links the site's own cursor comes back. Nothing moves under
// reduced motion.
import { openCreators } from './creator-open';
import { initShortlists } from './shortlist';
import { takeShot } from './shot';
import { uiScale } from './scale';
import { reduced, tapWords } from './env';

const TRAIL = 220; // ms a point of the laser's trail lasts
const SKIM = 90; // ms: a speaker the pointer passes on from within this gets no cut of their own
const IDLE_AFTER = 6000; // ms left alone before the monitor moves on by itself
const IDLE_EVERY = 5000; // ms on each speaker then
const SWIPE = 60; // px of sideways travel a trackpad swipe needs (the gesture's own, so the same on any screen)
const SWIPE_LOCK = 450; // ms after a swipe before the next can count
const gone = (el: Element) => () => el.remove();
// The frame marks' corners: which way each closes in.
const CORNERS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

function initLineup() {
  const root = document.querySelector<HTMLElement>('[data-speaker-lineup]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const ids = (root.dataset.ids ?? '').split(' ').filter(Boolean);
  const names = [...root.querySelectorAll<HTMLButtonElement>('[data-lineup-name]')];
  const imgs = [...root.querySelectorAll<HTMLImageElement>('[data-lineup-img]')];
  const monitor = root.querySelector<HTMLElement>('[data-lineup-monitor]');
  const marks = monitor ? [...monitor.querySelectorAll<HTMLElement>('.lineup__frame i')] : [];
  const line = root.querySelector<HTMLElement>('[data-lineup-cut]');
  const caption = root.querySelector<HTMLElement>('.lineup__caption');
  const capName = root.querySelector<HTMLElement>('[data-lineup-cap-name]');
  const capWhat = root.querySelector<HTMLElement>('[data-lineup-cap-what]');
  const capNote = root.querySelector<HTMLElement>('[data-lineup-cap-note]');
  const capAct = root.querySelector<HTMLElement>('[data-lineup-cap-act]');
  const keeps = [...root.querySelectorAll<HTMLButtonElement>('[data-lineup-keep]')];
  let people: { name: string; note?: string; what: string; src: string }[] = [];
  try {
    people = JSON.parse(root.querySelector('[data-lineup-data]')?.textContent || '[]');
  } catch {
    /* the names still open the profiles */
  }
  const still = reduced();
  let on = 0;
  let tall = monitor?.clientHeight ?? 0;
  if (monitor) new ResizeObserver(() => (tall = monitor.clientHeight)).observe(monitor);

  const mark = () => {
    const kept = keeps[on]?.getAttribute('aria-pressed') === 'true';
    monitor?.classList.toggle('is-kept', kept);
    if (capAct) capAct.textContent = tapWords((kept ? capAct.dataset.kept : capAct.dataset.shoot) ?? '');
  };

  // The cut: the line of light down the monitor, the picture settling from bright.
  let cutTimer = 0;
  const cut = (i: number) => {
    if (i !== on) return;
    line?.animate([{ translate: '0 0', opacity: 0 }, { opacity: 0.85, offset: 0.4 }, { translate: `0 ${tall}px`, opacity: 0 }], { duration: 220, easing: 'linear' });
    imgs.find((img) => Number(img.dataset.lineupImg) === i)?.animate([{ filter: 'brightness(1.3) contrast(1.1)' }, { filter: 'none' }], { duration: 300, easing: 'ease-out' });
  };

  // A speaker on the monitor; `auto` when it moved on by itself (not read out, and cut at once).
  const show = (i: number, auto = false) => {
    if (i === on || !people[i]) return;
    on = i;
    names.forEach((n, k) => {
      n.classList.toggle('is-on', k === i);
      n.tabIndex = k === i ? 0 : -1;
    });
    imgs.forEach((img) => img.classList.toggle('is-on', Number(img.dataset.lineupImg) === i));
    caption?.setAttribute('aria-live', auto ? 'off' : 'polite');
    if (capName) capName.textContent = people[i].name;
    if (capNote) capNote.textContent = people[i].note ?? '';
    if (capWhat) capWhat.textContent = people[i].what;
    if (caption && !still) {
      caption.classList.remove('is-in');
      void caption.offsetWidth;
      caption.classList.add('is-in');
    }
    keeps.forEach((k, n) => (k.hidden = n !== i));
    mark();
    if (still) return;
    window.clearTimeout(cutTimer);
    cutTimer = window.setTimeout(() => cut(i), auto ? 0 : SKIM);
  };

  // The frame marks snap in further as a click adds the speaker, and settle back (no white flash since 2026-11-18).
  const snap = () => {
    if (still) return;
    marks.forEach((m, k) => {
      const [x, y] = CORNERS[k];
      m.animate([{ translate: `${x * 0.875}rem ${y * 0.875}rem`, offset: 0 }], { duration: 140, easing: 'ease-out' });
    });
  };
  const shoot = () => {
    if (!monitor || keeps[on]?.getAttribute('aria-pressed') !== 'true') return;
    snap();
    takeShot({ rect: monitor.getBoundingClientRect(), src: people[on]?.src ?? '', name: people[on]?.name ?? '' });
  };

  // With a mouse, pointing at a name puts them on the monitor and a click opens their profile; on a touch screen the first
  // tap does what pointing does and the next opens it.
  let touched = false;
  names.forEach((n, i) => {
    n.addEventListener('pointerdown', (e) => (touched = e.pointerType !== 'mouse'));
    n.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && show(i));
    n.addEventListener('focus', () => !touched && show(i));
    n.addEventListener('click', () => {
      if (touched && on !== i) {
        touched = false;
        show(i);
        return;
      }
      touched = false;
      openCreators(ids, i, monitor?.getBoundingClientRect() ?? null, root.dataset.profile);
    });
    n.addEventListener('keydown', (e) => {
      const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? names.length - 1 : null;
      if (to === null) return;
      e.preventDefault();
      names[Math.max(0, Math.min(names.length - 1, to))].focus();
    });
  });
  monitor?.addEventListener('click', () => {
    const keep = keeps[on];
    if (!keep) return;
    keep.click();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        mark();
        shoot();
      }),
    );
  });
  // "+ Add" pressed from the keyboard: the shot once the list has it.
  let keyed = 0;
  keeps.forEach((k) =>
    k.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') keyed = performance.now();
    }),
  );
  document.addEventListener('shortlist:render', () => {
    mark();
    if (!keyed || performance.now() - keyed > 600) return;
    keyed = 0;
    shoot();
  });

  // Left alone, in view: the next speaker every few seconds, until the pointer or the focus comes in.
  let inView = false;
  let engaged = false;
  let idle = 0;
  const wait = (after: number) => {
    window.clearTimeout(idle);
    if (still || !inView || engaged || people.length < 2 || document.hidden) return;
    idle = window.setTimeout(() => {
      if (!document.documentElement.classList.contains('has-sheet')) show((on + 1) % people.length, true);
      wait(IDLE_EVERY);
    }, after);
  };
  if (!still) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        wait(IDLE_AFTER);
      },
      { threshold: [0, 0.5] },
    ).observe(root);
    root.addEventListener('pointerenter', () => {
      engaged = true;
      wait(0);
    });
    root.addEventListener('pointerleave', () => {
      engaged = root.contains(document.activeElement);
      wait(IDLE_AFTER);
    });
    root.addEventListener('focusin', () => {
      engaged = true;
      wait(0);
    });
    root.addEventListener('focusout', (e) => {
      if (root.contains(e.relatedTarget as Node | null)) return;
      engaged = root.matches(':hover');
      wait(IDLE_AFTER);
    });
    document.addEventListener('visibilitychange', () => wait(IDLE_AFTER));
  }

  // One tab stop for the names: the speaker on the monitor's (show() moves it along with them).
  names.forEach((n, k) => (n.tabIndex = k === on ? 0 : -1));
  initShortlists();
  mark();
}

function initSlides() {
  const root = document.querySelector<HTMLElement>('[data-speaker-slides]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const screen = root.querySelector<HTMLElement>('[data-slides-screen]')!;
  const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')];
  const thumbs = [...root.querySelectorAll<HTMLButtonElement>('[data-slides-go]')];
  const count = root.querySelector<HTMLElement>('.slides__at');
  const laser = root.querySelector<HTMLElement>('[data-slides-laser]');
  const trail = root.querySelector<HTMLCanvasElement>('[data-slides-trail]');
  const ctx = trail?.getContext('2d') ?? null;
  const still = reduced();
  let at = 0;

  // The slide's number, rolling: going on, the old one up and away and the new one up from below; going back, down.
  const roll = (n: number, dir: number) => {
    const old = count?.querySelector<HTMLElement>('[data-slides-at]');
    if (!count || !old) return;
    if (still) {
      old.textContent = String(n + 1);
      return;
    }
    const next = document.createElement('span');
    next.dataset.slidesAt = '';
    next.textContent = String(n + 1);
    old.removeAttribute('data-slides-at');
    count.append(next);
    old.animate([{ translate: '0 0', opacity: 1 }, { translate: `0 ${-100 * dir}%`, opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' }).finished.then(gone(old), gone(old));
    next.animate([{ translate: `0 ${100 * dir}%`, opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 260, easing: 'ease-out' });
  };

  // To slide i, coming in from the side it's on (dir: 1 on, -1 back).
  const go = (i: number, dir = Math.sign(i - at) || 1) => {
    const n = (i + slides.length) % slides.length;
    if (n === at) return;
    const out = slides[at];
    at = n;
    slides.forEach((s, k) => {
      s.classList.toggle('is-on', k === n);
      if (k === n) s.removeAttribute('aria-hidden');
      else s.setAttribute('aria-hidden', 'true');
    });
    thumbs.forEach((b, k) => {
      b.classList.toggle('is-on', k === n);
      b.setAttribute('aria-pressed', String(k === n));
    });
    roll(n, dir);
    if (still) return;
    out.animate([{ translate: '0 0' }, { translate: `${-1.5 * dir}% 0` }], { duration: 520, easing: 'ease-out' });
    slides[n].animate([{ translate: `${1.5 * dir}% 0`, filter: 'brightness(1.15)' }, { translate: '0 0', filter: 'brightness(1)' }], { duration: 620, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  };

  // The screen's box, read once when needed again (the pointer coming onto it, the page scrolled or resized).
  let rect: DOMRect | null = null;
  const box = () => (rect ??= screen.getBoundingClientRect());
  screen.addEventListener('pointerenter', () => (rect = null));
  window.addEventListener('resize', () => (rect = null), { passive: true });
  window.addEventListener('scroll', () => (rect = null), { passive: true });

  screen.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) return;
    const r = box();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const dir = x < r.width / 2 ? -1 : 1;
    go(at + dir, dir);
    if (still) return;
    // The clicker: a ring of laser light from where it was pressed, the point dipping as it goes.
    const ping = document.createElement('span');
    ping.className = 'slides__ping';
    ping.setAttribute('aria-hidden', 'true');
    ping.style.translate = `${x}px ${y}px`;
    screen.append(ping);
    ping.animate([{ scale: 0.3, opacity: 0.75 }, { scale: 2.4, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }).finished.then(gone(ping), gone(ping));
    laser?.animate([{ scale: 1 }, { scale: 0.7, offset: 0.5 }, { scale: 1 }], { duration: 180, easing: 'ease-out' });
  });
  root.querySelector('[data-slides-prev]')?.addEventListener('click', () => go(at - 1, -1));
  root.querySelector('[data-slides-next]')?.addEventListener('click', () => go(at + 1, 1));
  thumbs.forEach((b, i) => b.addEventListener('click', () => go(i)));
  // The arrow keys, while the screen is in view (and no profile is open over the page).
  let inView = false;
  new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), { threshold: 0.5 }).observe(screen);
  document.addEventListener('keydown', (e) => {
    if (!inView || document.documentElement.classList.contains('has-sheet')) return;
    if ((e.target as Element | null)?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'ArrowRight') go(at + 1, 1);
    else if (e.key === 'ArrowLeft') go(at - 1, -1);
  });
  // A sideways swipe on a trackpad over the screen: on or back, once per swipe (kept from the page's scrolling and
  // from the browser's own swipe back). Up and down still scroll the page. A swipe that has turned a slide is spent
  // until its stream of events stops (its momentum included, which can run on for a second), or a new push starts
  // in it (the deltas rising again rather than dying away).
  let swept = 0;
  let sweptAt = 0;
  let swipeLock = 0;
  let spent = false;
  let lastDx = 0;
  screen.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= 1.2 * Math.abs(e.deltaY)) return;
      e.preventDefault();
      e.stopPropagation();
      const time = performance.now();
      const dx = Math.abs(e.deltaX);
      if (time - sweptAt > 200 || (spent && time >= swipeLock && dx > lastDx + 10)) {
        swept = 0;
        spent = false;
      }
      sweptAt = time;
      lastDx = dx;
      if (spent || time < swipeLock) return;
      swept += e.deltaX;
      if (Math.abs(swept) < SWIPE) return;
      const dir = swept > 0 ? 1 : -1;
      swept = 0;
      spent = true;
      swipeLock = time + SWIPE_LOCK;
      go(at + dir, dir);
    },
    { passive: false },
  );

  // The laser, and its trail.
  if (!laser) return;
  const points: { x: number; y: number; t: number }[] = [];
  let raf = 0;
  const size = () => {
    if (!trail || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    trail.width = Math.round(trail.clientWidth * dpr);
    trail.height = Math.round(trail.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener('resize', size, { passive: true });
  const draw = () => {
    raf = 0;
    if (!ctx || !trail) return;
    const now = performance.now();
    const s = uiScale();
    while (points.length && now - points[0].t > TRAIL) points.shift();
    ctx.clearRect(0, 0, trail.clientWidth, trail.clientHeight);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const life = 1 - (now - b.t) / TRAIL;
      ctx.strokeStyle = `rgba(207, 237, 248, ${(life * 0.7).toFixed(3)})`;
      ctx.lineWidth = (1 + life * 4) * s;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(207, 237, 248, 0.9)';
      ctx.shadowBlur = 10 * s;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    if (points.length) raf = requestAnimationFrame(draw);
  };
  screen.addEventListener('pointermove', (e) => {
    const r = box();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    laser.style.setProperty('--lx', `${x}px`);
    laser.style.setProperty('--ly', `${y}px`);
    // Over the caption's links the laser goes and the site's own cursor comes back (global/CursorBuddy, which reads
    // data-own-cursor as the same move reaches it); elsewhere, the edge light of the half pointed at.
    const onLink = !!(e.target as Element).closest('a');
    screen.classList.toggle('is-on-link', onLink);
    screen.toggleAttribute('data-own-cursor', !onLink);
    const back = x < r.width / 2;
    screen.classList.toggle('is-prev', !onLink && back);
    screen.classList.toggle('is-next', !onLink && !back);
    if (still) return;
    points.push({ x, y, t: performance.now() });
    if (!raf) raf = requestAnimationFrame(draw);
  });
  screen.addEventListener('pointerleave', () => screen.classList.remove('is-prev', 'is-next'));
}

export function initSpeakerStage() {
  initLineup();
  initSlides();
}
