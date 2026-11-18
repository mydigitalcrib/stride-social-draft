// The homepage's opening (components/home/OpeningFilm.astro), on every screen: the gate with the Stride lockup and
// "Enter site", a moment of black, then the hero's entrance (hero-entrance.ts) building the headline from triangles
// (its message notifications after the headline were removed, the owner, 2026-11-17).
// The hero's inline script decides whether it plays (.is-opening on the hero: first visit, motion allowed).
// It holds the hero's entrance until the headline's turn (`hero:opening`). Escape (`hero:skip`, from hero-intro.ts)
// goes straight to the finished hero. Page scrolling is locked until the headline comes in.
// Entering is one shot (.is-handing): the rest of the lockup wipes away and the gate goes to navy around the mark,
// which travels to where the entrance draws its own and grows to its size; the entrance starts from that mark
// (`detail.handover`) and the film fades over it once it's drawn (`hero:mark`), so the swap can't be seen.
import { entranceMark } from './hero-entrance';
import { loaded } from './loaded';
import { lenis } from './env';

const BUTTON_AT = 2200; // ms after the lockup starts, the button to enter appears (OpeningFilm's progress line too)
const BLACK = 400; // ms of navy before the headline (the mark's journey, OpeningFilm's .is-handing; quicker since the owner, 2026-11-17: it was 650)
const HAND_WAIT = 400; // ms the film waits for the entrance to draw its mark, at most, before it fades anyway

const lock = (on: boolean) => {
  document.documentElement.classList.toggle('intro-lock', on);
  if (on) lenis()?.stop();
  else lenis()?.start();
};

const fontsReady = () =>
  Promise.race([
    Promise.all([document.fonts.load('850 1em "Archivo Variable"'), document.fonts.load('500 1em "IBM Plex Mono"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => {});

export function initOpening() {
  const hero = document.querySelector<HTMLElement>('.cover');
  // The opening has moved itself to the end of the page (its inline script), so it's found there.
  const root = document.querySelector<HTMLElement>('[data-opening]');
  if (!hero || !root || root.dataset.openingReady) return;
  if (!hero.classList.contains('is-opening')) {
    document.documentElement.classList.remove('opening-on');
    root.remove();
    return;
  }
  const gate = root.querySelector<HTMLElement>('[data-opening-gate]')!;
  const lockup = root.querySelector<HTMLElement>('[data-reveal-lockup]');
  const mark = root.querySelector<SVGElement>('[data-reveal-mark]');
  const enter = root.querySelector<HTMLButtonElement>('[data-opening-enter]')!;
  root.dataset.openingReady = 'true';
  hero.dataset.openingReady = 'true';

  let state: 'gate' | 'black' | 'headline' | 'done' = 'gate';
  let handing = false;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  lock(true);

  /* ---------- The gate: the lockup builds, then the button ---------- */
  // Once the loading screen has opened (loaded.ts): it holds the page, the showreel included, until it's ready.
  loaded().then(fontsReady).then(() => {
    if (state !== 'gate') return;
    if (lockup && mark) {
      // The mark comes together at the centre of the screen, then slides into the lockup (as hero-intro.ts does).
      const box = lockup.getBoundingClientRect();
      lockup.style.setProperty('--mark-shift', `${window.innerWidth / 2 - (box.left + mark.getBoundingClientRect().width / 2)}px`);
    }
    gate.classList.add('is-intro-run');
    later(() => {
      if (state !== 'gate') return;
      root.classList.add('is-ready');
      enter.focus({ preventScroll: true });
      // While it waits, the entrance measures the headline, so nothing heavy happens in the moment of entering.
      hero.dispatchEvent(new CustomEvent('hero:prepare'));
    }, BUTTON_AT);
  });
  // The keyboard in use at the gate: its focus on the button lifts the veil as the pointer does (not the focus the
  // button is given when it appears).
  document.addEventListener('keydown', () => {
    if (state === 'gate') root.classList.add('is-keyed');
  });
  root.addEventListener('pointermove', () => root.classList.remove('is-keyed'), { passive: true });

  /* ---------- Entering: the mark on into the hero (or black), then the headline ---------- */
  // Where the mark goes, from its place in the lockup: the entrance's own mark, its place and its size.
  const handOver = () => {
    const to = entranceMark(hero);
    const from = mark?.getBoundingClientRect();
    if (!mark || !to || !from?.width) return false;
    mark.style.setProperty('--hand-x', `${(to.x - (from.left + from.width / 2)).toFixed(2)}px`);
    mark.style.setProperty('--hand-y', `${(to.y - (from.top + from.height / 2)).toFixed(2)}px`);
    mark.style.setProperty('--hand-s', (to.size / from.width).toFixed(4));
    return true;
  };
  enter.addEventListener('click', () => {
    if (state !== 'gate') return;
    state = 'black';
    handing = handOver();
    root.classList.add(handing ? 'is-handing' : 'is-black');
    later(headline, BLACK);
    // Once the ice and its footage have faded, the film's video stops (nothing more to decode during the flight).
    later(() => root.querySelector('video')?.pause(), 460);
  });

  // The film fades, then goes, but only once the headline has landed: taking it away (and with it html.opening-on,
  // which brings in the side menu's glass) in the middle of the triangles' flight cost the flight its frames.
  let left = false;
  let landed = false;
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    root.remove();
    document.documentElement.classList.remove('opening-on');
  };
  hero.addEventListener('hero:landed', () => {
    landed = true;
    if (left) window.setTimeout(remove, 120);
  }, { once: true });
  const leave = () => {
    if (left) return;
    left = true;
    root.classList.add('is-leaving');
    window.setTimeout(() => landed && remove(), 800);
    window.setTimeout(remove, 6000); // in case the headline never says it has landed
  };

  const headline = () => {
    if (state !== 'black') return;
    state = 'headline';
    hero.classList.remove('is-opening');
    lock(false);
    // Handed over, the film stays until the entrance has drawn its mark under the film's own.
    if (handing) {
      hero.addEventListener('hero:mark', leave, { once: true });
      later(leave, HAND_WAIT);
    }
    hero.dispatchEvent(new CustomEvent('hero:opening', { detail: { handover: handing } }));
    if (!handing) leave();
    hero.addEventListener('hero:landed', () => (state = 'done'), { once: true });
  };

  /* ---------- Escape: straight to the finished hero ---------- */
  hero.addEventListener('hero:skip', () => {
    if (state === 'done') return;
    const before = state;
    state = 'done';
    timers.forEach((id) => window.clearTimeout(id));
    if (before === 'headline') {
      leave(); // the entrance is already under way; hero-entrance.ts finishes it
      return;
    }
    hero.classList.remove('is-opening');
    lock(false);
    remove();
    hero.dispatchEvent(new CustomEvent('hero:opening'));
    hero.dispatchEvent(new CustomEvent('hero:skip'));
  });
}
