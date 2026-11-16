// The footage behind Stride Sport and Stride Speakers (talent/SpecialistPage.astro), on every screen. One shot alone
// (Stride Sport's: a finished cut, with its own cuts) plays whole and goes round. Two shots of one moment (Stride
// Speakers') take turns behind the page: each plays its part (data-from to data-to, in seconds) at its own speed, and as it
// nears its end the other starts on top of it and fades in, so the cuts (and the loop back to the start) are
// dissolves and nothing behind ever shows through. About seven seconds a round. With reduced motion or data saving,
// the first shot's picture stands. It rests while the tab is hidden. The navy over it deepens as the page scrolls
// on (--deep, read by the styles).
// Desktop, as a broadcast camera would: over the first screen of scrolling the footage moves in a little, and while the
// hero is in view it drifts a touch against the pointer (not with reduced motion). While a video plays over the page
// (talent/VideoWall.astro's screen, `spec:hush`) or a creator's profile is open over it (html.has-sheet), the footage
// rests: the navy comes down further and the clip pauses, until they close. The opening's lighting cues (html.spec-cue,
// set as the page starts: SpecialistPage.astro) are cleared away once they've played.
import { DESKTOP, reduced } from './env';

const BLEND = 450; // ms: the next shot coming in over the last (the styles' fade)
const PUSH = 0.05; // how far the footage moves in over the first screen of scrolling (its scale)
const DRIFT = 0.0035; // how far it drifts against the pointer, each way (a share of its size)
const EDGE = 0.38; // its subjects stand between 38% and 62% of it (--at, --ay): the scale around them that keeps its edges covered
const FOLLOW = 0.05; // per frame (at 60 a second), the share of the way the drift covers
const HUSH = 0.7; // the navy over it while it rests
const CUE_FOR = 2400; // ms: the opening's lighting cues are over by then

type Shot = { v: HTMLVideoElement; from: number; to: number };

export function initSpecReel() {
  const html = document.documentElement;
  if (html.classList.contains('spec-cue')) {
    window.setTimeout(() => {
      html.classList.remove('spec-cue');
      document.querySelector('.spec-reel__cue')?.remove();
    }, CUE_FOR);
  }
  const layer = document.querySelector<HTMLElement>('.spec-reel');
  const videos = layer ? [...layer.querySelectorAll<HTMLVideoElement>('[data-spec-reel]')] : [];
  if (!layer || !videos.length || layer.dataset.reelReady) return;
  layer.dataset.reelReady = 'true';
  const desk = window.matchMedia(DESKTOP);
  const still = reduced();
  const deep = layer.querySelector<HTMLElement>('.spec-reel__deep');

  // The camera: how far it has moved in (from the scroll) and how far it has drifted (from the pointer). While it drifts
  // it is a touch larger, so its edges never show.
  let push = 1;
  let dx = 0;
  let dy = 0;
  const camera = () => {
    const cover = 1 + Math.max(Math.abs(dx), Math.abs(dy)) / EDGE;
    const scale = Math.max(push, cover).toFixed(4);
    const drift = `${(dx * 100).toFixed(3)}% ${(dy * 100).toFixed(3)}%`;
    videos.forEach((v) => {
      v.style.setProperty('--push', scale);
      v.style.setProperty('--drift', drift);
    });
  };

  // Past the hero, the navy deepens (whatever the motion setting: it's a shade, not a movement); on desktop the camera
  // moves in over the same stretch.
  let queued = false;
  const depth = () => {
    queued = false;
    const p = Math.min(1, window.scrollY / window.innerHeight);
    layer.style.setProperty('--deep', Math.min(1, window.scrollY / (window.innerHeight * 0.8)).toFixed(3));
    if (still || !desk.matches) return;
    push = 1 + PUSH * (1 - (1 - p) * (1 - p));
    camera();
  };
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(depth);
    },
    { passive: true },
  );
  depth();

  // The drift: eased after the pointer, against it, while the hero is in view.
  if (!still) {
    const hero = document.querySelector('.spec--hero');
    let heroSeen = true;
    let aimX = 0;
    let aimY = 0;
    let raf = 0;
    let last = 0;
    const glide = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const k = 1 - Math.pow(1 - FOLLOW, dt * 60);
      dx += (aimX - dx) * k;
      dy += (aimY - dy) * k;
      camera();
      if (Math.abs(aimX - dx) > 1e-5 || Math.abs(aimY - dy) > 1e-5) raf = requestAnimationFrame(glide);
      else last = 0;
    };
    if (hero) new IntersectionObserver(([entry]) => (heroSeen = entry.isIntersecting)).observe(hero);
    window.addEventListener(
      'pointermove',
      (e) => {
        if (!heroSeen || e.pointerType !== 'mouse' || !desk.matches) return;
        aimX = -(e.clientX / window.innerWidth - 0.5) * 2 * DRIFT;
        aimY = -(e.clientY / window.innerHeight - 0.5) * 2 * DRIFT;
        if (!raf) raf = requestAnimationFrame(glide);
      },
      { passive: true },
    );
  }

  const saving = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (still || saving) return;

  // What plays and what rests, whichever way the reel goes round (set below): the tab hidden, and the hush.
  let resume = () => {};
  let rest = () => {};
  let hushed = false;
  let video = false; // a video playing over the page, in view
  let timer = 0;
  let fade: Animation | null = null;
  const hush = () => {
    const on = desk.matches && (video || html.classList.contains('has-sheet'));
    if (on === hushed || !deep) return;
    hushed = on;
    window.clearTimeout(timer);
    // From wherever the navy is now (a fade may be under way): down to the hush, or back up to the scroll's own depth.
    const from = getComputedStyle(deep).opacity;
    fade?.cancel();
    if (on) {
      fade = deep.animate([{ opacity: from }, { opacity: HUSH }], { duration: 600, easing: 'ease-out', fill: 'forwards' });
      timer = window.setTimeout(rest, 600);
    } else {
      fade = deep.animate([{ opacity: from, offset: 0 }], { duration: 800, easing: 'ease-out' });
      if (!document.hidden) resume();
    }
  };
  document.addEventListener('spec:hush', (e) => {
    video = !!(e as CustomEvent<{ on: boolean }>).detail?.on;
    hush();
  });
  new MutationObserver(hush).observe(html, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) rest();
    else if (!hushed) resume();
  });

  const shots: Shot[] = videos.map((v) => ({ v, from: Number(v.dataset.from) || 0, to: Number(v.dataset.to) || 0 }));
  const cue = (s: Shot) => {
    try {
      s.v.currentTime = s.from;
    } catch {
      // not loaded yet: it starts from the top, and is cued once it is
    }
  };
  shots.forEach((s) => {
    s.v.preload = 'auto';
    s.v.addEventListener('loadedmetadata', () => s.v.paused && cue(s), { once: true });
    s.v.load();
  });

  // One shot alone plays whole and goes round on its own.
  if (shots.length === 1) {
    const only = shots[0].v;
    only.loop = true;
    resume = () => only.play().catch(() => {});
    rest = () => only.pause();
    const start = () => {
      only.classList.add('is-on');
      layer.classList.add('is-live');
      if (!hushed) resume();
    };
    if (only.readyState >= 1) start();
    else only.addEventListener('loadedmetadata', start, { once: true });
    return;
  }

  let on = 0; // which shot is playing
  let blending = false;
  const blend = () => {
    if (blending) return;
    blending = true;
    const out = shots[on];
    const next = shots[1 - on];
    on = 1 - on;
    cue(next);
    next.v.play().catch(() => {});
    // The one that's ending stays whole underneath; the next fades in over it.
    out.v.classList.replace('is-on', 'is-under');
    next.v.classList.add('is-on');
    window.setTimeout(() => {
      out.v.classList.remove('is-under');
      out.v.pause();
      cue(out);
      blending = false;
    }, BLEND + 80);
  };

  // The next shot starts just before this one's part is over.
  const watch = () => {
    const s = shots[on];
    const end = s.to || s.v.duration;
    if (!blending && end && !s.v.paused && end - s.v.currentTime < BLEND / 1000 + 0.02) blend();
    requestAnimationFrame(watch);
  };
  shots.forEach((s, i) => s.v.addEventListener('ended', () => i === on && blend()));
  resume = () => shots[on].v.play().catch(() => {});
  rest = () => shots.forEach((s) => s.v.pause());

  const first = shots[0];
  const go = () => {
    cue(first);
    first.v.classList.add('is-on');
    layer.classList.add('is-live');
    if (!hushed) resume();
    requestAnimationFrame(watch);
  };
  if (first.v.readyState >= 1) go();
  else first.v.addEventListener('loadedmetadata', go, { once: true });
}
