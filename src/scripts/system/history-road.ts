// Behaviour for group/HistoryRoad.astro: the section is made as tall as the road is long, so vertical
// scrolling carries you sideways. Dragging moves the scroll, so they always agree (and a drag let go of quickly is
// thrown on); a sideways swipe on a trackpad travels the road too. Panels lean with your speed, settling like a
// spring, Stride's mark drifts behind each, and the one at the centre lights up: a light runs once round its mark,
// and the lit year along the foot glides to it. The keyboard brings what it focuses into view, and the arrow keys go
// along the years. Only on desktop with motion. Positions are measured once (and on resize), and each frame writes
// only to what moves, so it stays smooth; distances in pixels grow with the screen past 1920×1080 (uiScale).
import { goToProgress, progressOf } from './ambient';
import { uiScale } from './scale';
import { clamp } from './env';

const TRACE = 1100 + 3 * 90; // ms the light takes round the four triangles

function initRoad(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>('[data-road-track]');
  const pin = root.querySelector<HTMLElement>('[data-road-pin]');
  if (!track || !pin) return;
  const progress = root.querySelector<HTMLElement>('.road__progress');
  const fade = root.querySelector<HTMLElement>('.road__fade');
  const years = root.querySelector<HTMLElement>('.road__years');
  const capsule = root.querySelector<HTMLElement>('[data-road-here]');
  const jumps = [...root.querySelectorAll<HTMLElement>('[data-road-jump]')];
  const stops = [...root.querySelectorAll<HTMLElement>('[data-road-stop]')].map((el) => ({
    el,
    card: el.querySelector<HTMLElement>('.stop__card'),
    year: el.querySelector<SVGElement>('.stop__mark'), // Stride's mark behind the panel (it was the year)
    mid: 0, // the panel's centre along the track
    away: -1, // how far from the screen's centre it was last frame
    traced: -Infinity, // when the light last ran round its mark
    tracing: 0,
  }));
  // Every screen (phones and tablets since 2026-11-13), unless motion is reduced.
  const live = window.matchMedia('(prefers-reduced-motion: no-preference)');
  let span = 0; // how far the track travels
  let vw = window.innerWidth;
  let scale = 1;
  let x = 0;
  let lean = 0;
  let leanV = 0;
  let lastT = 0;
  let raf = 0;
  let here = '';
  let jumpAt: { x: number; y: number; w: number; h: number }[] = [];

  const measure = () => {
    if (!live.matches) return;
    vw = window.innerWidth;
    scale = uiScale();
    span = Math.max(0, track.scrollWidth - vw);
    root.style.height = `${window.innerHeight + span}px`;
    stops.forEach((s) => {
      s.mid = s.el.offsetLeft + s.el.offsetWidth / 2;
      s.away = -1;
      // The light round the mark: two pixels wide (six for its glow) in the drawing's own units, at any size.
      const w = s.year?.getBoundingClientRect().width;
      if (s.year && w) {
        s.year.style.setProperty('--tw', ((2 * scale * 106) / w).toFixed(3));
        s.year.style.setProperty('--tg', ((6 * scale * 106) / w).toFixed(3));
      }
    });
    jumpAt = jumps.map((j) => ({ x: j.offsetLeft, y: j.offsetTop, w: j.offsetWidth, h: j.offsetHeight }));
    placeHere(false);
    run();
  };

  /* ---------- The year that is here: one capsule, gliding ---------- */
  function placeHere(glide = true) {
    if (!capsule || !years) return;
    const i = jumps.findIndex((j) => j.dataset.roadJump === here);
    const at = jumpAt[i];
    years.classList.toggle('has-here', !!at);
    if (!at) return;
    years.classList.toggle('is-gliding', glide && years.classList.contains('is-placed'));
    capsule.style.width = `${at.w}px`;
    capsule.style.height = `${at.h}px`;
    capsule.style.transform = `translate(${at.x}px, ${at.y}px)`;
    years.classList.add('is-placed');
    // Where the years don't fit their bar (a phone), the one you're at is kept in view (no change where they fit).
    if (years.scrollWidth > years.clientWidth + 1) years.scrollTo({ left: at.x + at.w / 2 - years.clientWidth / 2, behavior: glide ? 'smooth' : 'auto' });
  }

  /* ---------- Arriving at a stop: a light runs once round its mark ---------- */
  const trace = (id: string) => {
    const s = stops.find((st) => st.el.dataset.roadStop === id);
    const mark = s?.year;
    if (!s || !mark) return;
    const now = performance.now();
    if (now - s.traced < 900) return; // passing back and forth doesn't set it off again and again
    s.traced = now;
    window.clearTimeout(s.tracing);
    // From the start again: off in this frame, on in the next (so the road's frame never stops to measure).
    mark.classList.remove('is-tracing');
    requestAnimationFrame(() => {
      mark.classList.add('is-tracing');
      s.tracing = window.setTimeout(() => mark.classList.remove('is-tracing'), TRACE + 60);
    });
  };

  const frame = (t: number) => {
    raf = 0;
    if (!live.matches) return;
    const dt = lastT ? Math.min(1 / 30, (t - lastT) / 1000) : 1 / 60;
    lastT = t;
    const target = -progressOf(root) * span;
    const delta = target - x;
    x += delta * 0.16;
    if (Math.abs(delta) < 0.4) x = target;
    // The lean follows the speed (in the design's own pixels, so a big screen leans as 1920 does) on a light spring:
    // it settles with a touch of overshoot instead of dying away.
    const want = clamp((delta * 0.05) / scale, -7, 7);
    leanV += (170 * (want - lean) - 20 * leanV) * dt;
    lean = clamp(lean + leanV * dt, -7, 7);
    if (want === 0 && Math.abs(lean) < 0.02 && Math.abs(leanV) < 0.05) lean = leanV = 0;
    track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    if (progress) progress.style.transform = `scaleX(${(span ? -x / span : 0).toFixed(4)})`;
    // Panels fade before they reach the wheel at the left; at the start of the road, nothing's there yet.
    if (fade) fade.style.opacity = clamp(-x / (240 * scale), 0, 1).toFixed(3);

    let nearest = '';
    let best = 0.42; // beyond this, you're between panels
    stops.forEach((s) => {
      const f = clamp((s.mid + x - vw / 2) / vw, -1, 1);
      const away = Math.abs(f);
      if (away < best) {
        best = away;
        nearest = s.el.dataset.roadStop ?? '';
      }
      if (away === 1 && s.away === 1) return; // still off screen
      s.away = away;
      if (s.card) {
        s.card.style.transform = `skewX(${lean.toFixed(2)}deg) scale(${(1 - away * 0.06).toFixed(4)})`;
        s.card.style.opacity = (1 - away * 0.4).toFixed(3);
      }
      if (s.year) s.year.style.transform = `translate(calc(-50% + ${(f * 22).toFixed(2)}vw), -50%)`;
    });
    if (nearest !== here) {
      here = nearest;
      stops.forEach((s) => s.el.classList.toggle('is-here', s.el.dataset.roadStop === here));
      jumps.forEach((j) => {
        const on = j.dataset.roadJump === here;
        j.classList.toggle('is-here', on);
        if (on) j.setAttribute('aria-current', 'step');
        else j.removeAttribute('aria-current');
      });
      placeHere();
      if (here) trace(here);
    }
    if (x !== target || lean !== 0) raf = requestAnimationFrame(frame);
    else lastT = 0;
  };
  const run = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  window.addEventListener('scroll', run, { passive: true });

  /* ---------- Dragging moves the scroll; let go quickly, it's thrown on ---------- */
  let pressed = false;
  let lastX = 0;
  let lastMove = 0;
  let speed = 0; // px per ms, eased over the last 80ms or so
  pin.addEventListener('pointerdown', (e) => {
    if (!live.matches || e.button !== 0 || e.pointerType === 'touch') return;
    if ((e.target as HTMLElement).closest('a, .road__years')) return;
    pressed = true;
    lastX = e.clientX;
    lastMove = e.timeStamp;
    speed = 0;
    root.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!pressed || !span) return;
    const dx = e.clientX - lastX;
    const dt = e.timeStamp - lastMove;
    lastX = e.clientX;
    lastMove = e.timeStamp;
    if (dt > 0) speed += (dx / dt - speed) * (1 - Math.exp(-dt / 80));
    goToProgress(root, progressOf(root) - dx / span);
  });
  window.addEventListener('pointerup', (e) => {
    if (!pressed) return;
    pressed = false;
    root.classList.remove('is-dragging');
    // Still moving when let go: on it goes, by as much as the speed says (most of a screen at most); the road's own
    // easing and lean carry it there.
    if (!span || e.timeStamp - lastMove > 80 || Math.abs(speed) < 0.25 * scale) return;
    const toss = clamp(speed * 380, -0.9 * vw, 0.9 * vw);
    goToProgress(root, progressOf(root) - toss / span, true);
  });

  /* ---------- The years along the foot ---------- */
  const goStop = (id: string | undefined) => {
    const stop = stops.find((s) => s.el.dataset.roadStop === id);
    if (stop && span) goToProgress(root, (stop.mid - vw / 2) / span, true);
  };
  jumps.forEach((j) =>
    j.addEventListener('click', (e) => {
      e.preventDefault();
      goStop(j.dataset.roadJump);
    }),
  );
  // The arrow keys go along the years (from play, on to the first), Home and End to the ends.
  years?.addEventListener('keydown', (e) => {
    if (!live.matches) return;
    const i = jumps.indexOf(document.activeElement as HTMLElement);
    const to =
      e.key === 'ArrowRight' ? Math.min(jumps.length - 1, i + 1)
      : e.key === 'ArrowLeft' ? Math.max(0, i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? jumps.length - 1
      : -1;
    if (to < 0 || (e.key === 'ArrowLeft' && i < 0)) return;
    e.preventDefault();
    jumps[to]?.focus();
    goStop(jumps[to]?.dataset.roadJump);
  });
  // Something focused along the road (the links at its end) is brought into view, rather than left off the screen.
  track.addEventListener('focusin', (e) => {
    const panel = (e.target as HTMLElement).closest<HTMLElement>('[data-road-panel]');
    if (!panel || !live.matches || !span || !(e.target as HTMLElement).matches(':focus-visible')) return;
    goToProgress(root, (panel.offsetLeft + panel.offsetWidth / 2 - vw / 2) / span, true);
  });

  /* ---------- Play: the road travels itself, until the visitor takes over ---------- */
  const play = root.querySelector<HTMLButtonElement>('[data-road-play]');
  const JOURNEY = 42; // seconds, end to end
  let playing = false;
  let lastPlay = 0;
  const halt = () => {
    playing = false;
    play?.setAttribute('aria-pressed', 'false');
    if (play?.dataset.play) play.setAttribute('aria-label', play.dataset.play);
  };
  const travel = (t: number) => {
    if (!playing) return;
    const dt = Math.min(50, t - lastPlay);
    lastPlay = t;
    const p = progressOf(root) + dt / 1000 / JOURNEY;
    goToProgress(root, Math.min(1, p));
    if (p >= 1) return halt();
    requestAnimationFrame(travel);
  };
  play?.addEventListener('click', () => {
    if (playing) return halt();
    if (progressOf(root) >= 0.999) goToProgress(root, 0);
    playing = true;
    play.setAttribute('aria-pressed', 'true');
    if (play.dataset.pause) play.setAttribute('aria-label', play.dataset.pause);
    lastPlay = performance.now();
    requestAnimationFrame(travel);
  });
  window.addEventListener('wheel', () => playing && halt(), { passive: true });
  window.addEventListener('keydown', (e) => {
    if (playing && !(e.target as HTMLElement).closest('[data-road-play]')) halt();
  });
  pin.addEventListener('pointerdown', (e) => {
    if (playing && !(e.target as HTMLElement).closest('[data-road-play]')) halt();
  });
  document.addEventListener('visibilitychange', () => document.hidden && halt());

  /* ---------- A sideways swipe on a trackpad travels the road ---------- */
  // Lenis only takes the vertical; a mostly sideways swipe moves the road as far as the fingers did. At either end
  // the browser keeps it (its swipe back and forward).
  pin.addEventListener('wheel', (e) => {
    if (!live.matches || !span || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vw : 1;
    const dx = e.deltaX * unit * scale;
    const p = progressOf(root);
    if ((p <= 0 && dx < 0) || (p >= 1 && dx > 0)) return;
    e.preventDefault();
    (e as WheelEvent & { lenisStopPropagation?: boolean }).lenisStopPropagation = true;
    halt();
    goToProgress(root, p + dx / span);
  }, { passive: false });

  /* ---------- On or off ---------- */
  const setMode = () => {
    root.classList.toggle('is-live', live.matches);
    if (live.matches) measure();
    else {
      root.style.removeProperty('height');
      track.style.removeProperty('transform');
      stops.forEach((s) => {
        s.card?.style.removeProperty('transform');
        s.card?.style.removeProperty('opacity');
        s.year?.style.removeProperty('transform');
      });
    }
  };
  live.addEventListener('change', setMode);
  window.addEventListener('resize', measure, { passive: true });
  document.fonts?.ready.then(measure);
  window.addEventListener('load', measure);
  setMode();
}

export function initHistoryRoads() {
  document.querySelectorAll<HTMLElement>('[data-road]').forEach((root) => {
    if (root.dataset.roadReady) return;
    root.dataset.roadReady = 'true';
    initRoad(root);
  });
}
