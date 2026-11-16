// The homepage's opening (components/home/OpeningFilm.astro), on every screen: the gate with the Stride lockup and the
// button to enter, a moment of black, the hero's entrance (hero-entrance.ts) building the headline from triangles, then Stride's
// message notifications arriving at the top of the hero, each with a chime. While they're there the header steps
// aside (html.has-notes, global/SiteHeader.astro), so the logo and the notifications never share the top.
// The hero's inline script decides whether it plays (.is-opening on the hero: first visit, motion allowed).
// It holds the hero's entrance until the headline's turn (`hero:opening`). Escape (`hero:skip`, from hero-intro.ts)
// goes straight to the finished hero, without the notifications. Page scrolling is locked until the headline comes in.
// Entering is one shot (.is-handing): the rest of the lockup wipes away and the gate goes to black around the mark,
// which travels to where the entrance draws its own and grows to its size; the entrance starts from that mark
// (`detail.handover`) and the film fades over it once it's drawn (`hero:mark`), so the swap can't be seen.
// Pointed at, the stack of notifications fans out and waits; they leave the oldest first.
// The chime is chime.ts (no sound file). Entering is the click that lets the browser play it.
import { playChime, unlockChime } from './chime';
import { entranceMark } from './hero-entrance';
import { loaded } from './loaded';
import { lenis } from './env';

const BUTTON_AT = 2200; // ms after the lockup starts, the button to enter appears (OpeningFilm's progress line too)
const BLACK = 650; // ms of black before the headline
const HAND_WAIT = 400; // ms the film waits for the entrance to draw its mark, at most, before it fades anyway
const NOTES_AFTER = 350; // ms after the headline has landed (`hero:landed`, from hero-entrance.ts)
const NOTES_LATEST = 4200; // ms after the headline starts, in case it never says so
const NOTES_EVERY = 1500; // ms between notifications
const NOTES_STAY = 4200; // ms the stack stays after the last one, then it slides away
const NOTES_LINGER = 1600; // ms it stays at least, once the pointer has left it
const NOTES_GONE = 700; // ms for the stack to slide away (the oldest first)

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
  const notes = hero?.querySelector<HTMLElement>('[data-opening-notes]');
  if (!hero || !root || root.dataset.openingReady) return;
  if (!hero.classList.contains('is-opening')) {
    document.documentElement.classList.remove('opening-on');
    root.remove();
    notes?.remove();
    return;
  }
  const gate = root.querySelector<HTMLElement>('[data-opening-gate]')!;
  const lockup = root.querySelector<HTMLElement>('[data-reveal-lockup]');
  const mark = root.querySelector<SVGElement>('[data-reveal-mark]');
  const enter = root.querySelector<HTMLButtonElement>('[data-opening-enter]')!;
  const list = [...(notes?.querySelectorAll<HTMLElement>('[data-opening-note]') ?? [])];
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
    }, BUTTON_AT);
  });
  // The keyboard in use at the gate: its focus on the button lifts the veil as the pointer does (not the focus the
  // button is given when it appears).
  document.addEventListener('keydown', () => {
    if (state === 'gate') root.classList.add('is-keyed');
  });
  root.addEventListener('pointermove', () => root.classList.remove('is-keyed'), { passive: true });

  /* ---------- Entering: the sound on, the mark on into the hero (or black), then the headline ---------- */
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
    // With sound, always: this click is what lets the browser play it.
    unlockChime();
    handing = handOver();
    root.classList.add(handing ? 'is-handing' : 'is-black');
    later(headline, BLACK);
  });

  // The film fades, then goes.
  let left = false;
  const leave = () => {
    if (left) return;
    left = true;
    root.classList.add('is-leaving');
    window.setTimeout(() => {
      root.remove();
      document.documentElement.classList.remove('opening-on');
    }, 600);
  };

  /* ---------- The notifications: pointed at, the stack fans out and waits ---------- */
  let due = 0; // when the stack slides away
  let away = 0;
  let held = false;
  const goAway = () => {
    notes?.classList.add('is-gone');
    document.documentElement.classList.remove('has-notes');
    later(() => {
      notes?.remove();
      state = 'done';
    }, NOTES_GONE);
  };
  const awayIn = (ms: number) => {
    window.clearTimeout(away);
    due = performance.now() + ms;
    if (!held) away = later(goAway, ms);
  };
  if (notes) {
    // They belong to the top of the hero: as soon as the page is scrolled, they slide away, so they never sit over the
    // sections that come up under them (the owner, 2026-11-13).
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.08 || !notes.isConnected || notes.classList.contains('is-gone')) return;
      window.removeEventListener('scroll', onScroll);
      held = false;
      window.clearTimeout(away);
      notes.classList.remove('is-open');
      goAway();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    notes.addEventListener('pointerenter', () => {
      if (state !== 'headline' || !due || notes.classList.contains('is-gone')) return;
      held = true;
      window.clearTimeout(away);
      notes.classList.add('is-open');
    });
    notes.addEventListener('pointerleave', () => {
      if (!held) return;
      held = false;
      notes.classList.remove('is-open');
      awayIn(Math.max(NOTES_LINGER, due - performance.now()));
    });
  }

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
    // Once it has landed (never before, so they don't compete with it): the notifications, one by one, each
    // pushing the ones before it back.
    let begun = false;
    const begin = () => {
      if (begun || state !== 'headline') return;
      begun = true;
      if (list.length) document.documentElement.classList.add('has-notes');
      list.forEach((note, i) =>
        later(() => {
          list.slice(0, i + 1).forEach((n, j) => n.style.setProperty('--slot', String(i - j)));
          note.style.zIndex = String(10 + i);
          note.classList.add('is-on');
          playChime();
        }, i * NOTES_EVERY),
      );
      awayIn((list.length - 1) * NOTES_EVERY + NOTES_STAY);
    };
    hero.addEventListener('hero:landed', () => later(begin, NOTES_AFTER), { once: true });
    later(begin, NOTES_LATEST);
  };

  /* ---------- Escape: straight to the finished hero ---------- */
  hero.addEventListener('hero:skip', () => {
    if (state === 'done') return;
    const before = state;
    state = 'done';
    timers.forEach((id) => window.clearTimeout(id));
    // The notifications slide away (the oldest first) rather than vanish, even fanned out under the pointer.
    held = false;
    notes?.classList.remove('is-open');
    notes?.classList.add('is-gone');
    window.setTimeout(() => notes?.remove(), NOTES_GONE);
    document.documentElement.classList.remove('has-notes');
    if (before === 'headline') {
      leave(); // the entrance is already under way; hero-entrance.ts finishes it
      return;
    }
    hero.classList.remove('is-opening');
    lock(false);
    root.remove();
    document.documentElement.classList.remove('opening-on');
    hero.dispatchEvent(new CustomEvent('hero:opening'));
    hero.dispatchEvent(new CustomEvent('hero:skip'));
  });
}
