// The homepage hero (components/home/CoverHero.astro): the big word in depth, turning a little towards the pointer
// with a light crossing it, and the award badges tilting with a holographic shine. The turn and the tilt need a mouse
// on desktop with motion allowed; otherwise the word keeps its resting depth and the badges still say what they are
// on hover (a tap on a phone). The word waits for the entrance (and the opening film) to finish, and rests again once the
// page is scrolled, so it lines up with its copy when it becomes a door (hero-scene.ts).
// One light: now and then it crosses the word by itself, runs on along the fine rule under it and carries into the
// badges, one after another (a pass): as the headline lands (`hero:light`, from hero-entrance.ts), just after the
// finished hero fades in on a return visit (.is-return), and when the pointer has been still for a while with the
// hero at the top of a visible page. Any movement of the pointer ends a pass, and the light eases back to the pointer
// from where it is. Meanwhile the badges' own resting sheen (the CSS) stands down (.has-light). Every screen with
// motion allowed (phones and tablets too since 2026-11-13), whatever the pointer, so a finger, a trackpad or the
// keyboard gets it too.
// Each frame writes only what has changed, rounded (the light and the side repaint the word), and the word's place is
// read once per layout, not on every movement.
import { DESKTOP, REDUCED } from './env';

const TURN_X = 9; // degrees at most, either way
const TURN_Y = 6;
const EASE = 0.08; // per frame, how quickly it follows the pointer
const REST = { ex: 0.5, ey: 0.7 }; // the side's direction at rest (lit from the top left)
const PASS = 1.3; // s, a pass of the light across the word
const IDLE = 7000; // ms of a still pointer before the light crosses by itself
const AGAIN = 11000; // ms from one pass to the next while it stays still
const RETURN = 900; // ms into a return visit (its fade-in, then a moment)
const SHEEN_EVERY = 120; // ms between the badges catching it

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function initHeroDepth() {
  const hero = document.querySelector<HTMLElement>('.cover');
  if (!hero || hero.dataset.depthReady) return;
  hero.dataset.depthReady = 'true';
  const mouse = window.matchMedia(`${DESKTOP} and (hover: hover) and (pointer: fine)`);
  const still = window.matchMedia(REDUCED);
  const badges = [...hero.querySelectorAll<HTMLElement>('[data-award]')];

  /* ---------- The award badges: a label always; tilt and shine with motion ---------- */
  badges.forEach((badge) => {
    let box: DOMRect | null = null;
    badge.addEventListener('pointerenter', () => {
      badge.classList.add('is-on');
      badge.classList.remove('is-sheen');
      box = badge.getBoundingClientRect();
    });
    badge.addEventListener('pointerleave', () => {
      badge.classList.remove('is-on');
      ['--rx', '--ry', '--holo-x', '--holo-y'].forEach((p) => badge.style.removeProperty(p));
      box = null;
    });
    badge.addEventListener('pointermove', (e) => {
      if (still.matches || !box) return;
      const x = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
      badge.style.setProperty('--rx', ((x - 0.5) * 34).toFixed(2));
      badge.style.setProperty('--ry', ((0.5 - y) * 30).toFixed(2));
      badge.style.setProperty('--holo-x', (x * 100).toFixed(1));
      badge.style.setProperty('--holo-y', (y * 100).toFixed(1));
    });
    // A pass's sheen is one sweep: done (or cut short by the pointer), it's ready for the next.
    const done = (e: AnimationEvent) => {
      if ((e.target as Element).classList.contains('cover__award-holo')) badge.classList.remove('is-sheen');
    };
    badge.addEventListener('animationend', done);
    badge.addEventListener('animationcancel', done);
  });

  /* ---------- The big word ---------- */
  const word = hero.querySelector<HTMLElement>('.cover__word');
  if (!word) return;
  const rule = hero.querySelector<HTMLElement>('.cover__rule');
  let aimX = 0; // where the pointer is, -1 to 1 each way
  let aimY = 0;
  let aimG = -30; // where the light should cross (0 to 100 along the word; off it at rest)
  let x = 0;
  let y = 0;
  let g = -30;
  let raf = 0;
  let pointerX = -1;
  let pointerY = -1;
  const free = () => !hero.classList.contains('is-entrance') && !hero.classList.contains('is-opening') && window.scrollY < 24;
  const entering = () => hero.classList.contains('is-entrance') || hero.classList.contains('is-opening');

  // The word's place across the screen, read when the layout changes rather than on every movement.
  let span = { left: 0, width: 0 };
  const measure = () => {
    if (!mouse.matches) return;
    const r = word.getBoundingClientRect();
    span = { left: r.left, width: r.width };
  };

  const written: Record<string, string> = {};
  const put = (el: HTMLElement, name: string, value: string) => {
    if (written[name] === value) return;
    written[name] = value;
    el.style.setProperty(name, value);
  };
  // Only what changes, rounded where a change repaints the word (its side, its light); the turn composites.
  const write = () => {
    if (!entering()) {
      put(word, '--hx', (x * TURN_X).toFixed(3));
      put(word, '--hy', (-y * TURN_Y).toFixed(3));
      put(word, '--ex', (REST.ex - x * 0.9).toFixed(2));
      put(word, '--ey', (REST.ey - y * 0.8).toFixed(2));
    }
    // (A tenth of a percent: the light spans the word, so coarser steps show as a judder on a large screen.)
    put(word, '--g', g.toFixed(1));
  };

  /* ---------- A pass of the light ---------- */
  const passes = !still.matches;
  // `firm`: the landing's, part of the entrance, which the pointer doesn't cut short.
  let pass: { at: number; from: number; length: number; firm: boolean; sheened: boolean } | null = null;
  let idle = 0;
  let due = 0; // when the next pass is due, if all stays still
  const lightRule = (at: number, on: boolean) => {
    if (!rule) return;
    put(rule, '--rule-g', at.toFixed(1));
    put(rule, '--rule-a', on ? '1' : '0');
  };
  const sheen = () =>
    badges.forEach((badge, i) =>
      window.setTimeout(() => {
        if (!badge.classList.contains('is-on')) badge.classList.add('is-sheen');
      }, i * SHEEN_EVERY),
    );
  // One timer, put off (not reset) by each movement: when it's due, a pass, if the hero is at the top of a visible
  // page; otherwise the next movement, the return to the top or to the tab waits again.
  const check = () => {
    idle = 0;
    const left = due - performance.now();
    if (left > 20) idle = window.setTimeout(check, left);
    else if (free() && !document.hidden && !pass) cross(PASS);
  };
  const wait = (ms: number) => {
    if (!passes) return;
    due = performance.now() + ms;
    if (!idle) idle = window.setTimeout(check, ms);
  };
  // From where the light is (off the word at rest), on across it and off its end.
  const cross = (length: number, from = g < 110 ? g : -30, firm = false) => {
    pass = { at: performance.now(), from, length, firm, sheened: false };
    wake();
  };
  const cancel = () => {
    if (!pass || pass.firm) return;
    pass = null;
    lightRule(g, false);
  };

  const frame = (now: number) => {
    raf = 0;
    const tx = free() ? aimX : 0;
    const ty = free() ? aimY : 0;
    const tg = free() ? aimG : -30;
    x += (tx - x) * EASE;
    y += (ty - y) * EASE;
    if (pass) {
      const p = Math.min(1, (now - pass.at) / (pass.length * 1000));
      g = pass.from + (120 - pass.from) * easeInOut(p);
      lightRule(g, true);
      if (!pass.sheened && g >= 100) {
        pass.sheened = true;
        sheen();
      }
      if (p >= 1) {
        // Off the word's end: it rests off it (until the pointer moves), and crosses again if all stays still.
        pass = null;
        g = aimG = -30;
        lightRule(g, false);
        wait(AGAIN - PASS * 1000);
      }
    } else g += (tg - g) * EASE * 1.4;
    write();
    if (pass || Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001 || Math.abs(tg - g) > 0.05) raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      // Only a real movement (not the page moving under a still pointer) ends a pass and puts off the next.
      if (Math.abs(e.clientX - pointerX) + Math.abs(e.clientY - pointerY) < 2) return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      cancel();
      wait(IDLE);
      if (!mouse.matches || still.matches) return;
      aimX = (e.clientX / window.innerWidth - 0.5) * 2;
      aimY = (e.clientY / window.innerHeight - 0.5) * 2;
      // The light follows the pointer across the word, from just before its first letter to just after its last.
      aimG = span.width ? ((e.clientX - span.left) / span.width) * 100 : -30;
      aimG = Math.min(118, Math.max(-18, aimG));
      wake();
    },
    { passive: true },
  );
  // Off the window: back to rest.
  document.documentElement.addEventListener('pointerleave', () => {
    aimX = aimY = 0;
    aimG = -30;
    wake();
  });
  // Scrolled down (or back): settle, or take up the pointer again; back at the top, the word's place is read again.
  let top = window.scrollY < 24;
  window.addEventListener(
    'scroll',
    () => {
      const now = window.scrollY < 24;
      if (now !== top) {
        top = now;
        if (now) {
          measure();
          wait(IDLE);
        } else cancel();
      }
      wake();
    },
    { passive: true },
  );
  let sized = 0;
  window.addEventListener(
    'resize',
    () => {
      if (sized) return;
      sized = requestAnimationFrame(() => {
        sized = 0;
        measure();
      });
    },
    { passive: true },
  );
  document.fonts?.ready.then(measure);
  measure();

  if (!passes) return;
  hero.classList.add('has-light');
  // The headline landing: the light crosses as the word turns solid (hero-entrance.ts sets its timing).
  hero.addEventListener('hero:light', (e) => {
    const { from = -20, length = PASS } = (e as CustomEvent<{ from?: number; length?: number }>).detail ?? {};
    cross(length, from, true);
  });
  // The entrance has handed over: the word is where it rests, and its own values are gone.
  hero.addEventListener('hero:landed', () => {
    Object.keys(written).forEach((name) => delete written[name]);
    measure();
    wait(IDLE);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wait(IDLE);
    else cancel();
  });
  if (hero.classList.contains('is-return')) {
    window.setTimeout(() => {
      if (free() && !pass) cross(PASS);
    }, RETURN);
  } else if (!entering()) wait(IDLE);
}
