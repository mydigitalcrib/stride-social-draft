// The homepage scene (components/home/HeroScene.astro), on every screen (phones and tablets too since 2026-11-13):
// reads how far the page has scrolled into it, as
// a share of the screen's height, and sets the hero's state on every scroll frame (smooth scroll included),
// writing only what changes.
// First the door (when there's room for it, [data-door-run], and motion is allowed): the kicker and the band go
// (--door-band), the big word swaps for its copy in the navy overlay, so the footage shows only through the letters
// (--swap), the copy grows from inside one letter (--door-scale, about --ox --oy) and the navy clears (--door-show),
// leaving the footage whole. Then, as the destinations rise over the pinned hero, its depth: --fade (the type
// fading, over the first third) and --deep (the blur and the glass, building over most of the way), with .is-deep
// on the hero while either is under way.
// On a screen wider than 16:9 (21:9, 32:9) the margin grows to centre the content and the word is a smaller share
// of the width, so the door grows that much further, and the letter's stroke still fills the screen; at 16:9 or
// narrower, and up to 1920 wide, it grows as drawn.
import { REDUCED, clamp } from './env';

const ease = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const GROW = 44; // how much the word grows by the end: enough for a letter's stroke to fill the screen (at 1920×1080)
const SHARE = 1560 / 1920; // the word's share of the screen's width at 1920×1080

export function initHeroScene() {
  const scene = document.querySelector<HTMLElement>('[data-scene]');
  const hero = scene?.querySelector<HTMLElement>('.cover');
  if (!scene || !hero || scene.dataset.sceneReady) return;
  scene.dataset.sceneReady = 'true';
  const still = window.matchMedia(REDUCED);
  const runway = scene.querySelector<HTMLElement>('[data-door-run]');
  const doorWord = hero.querySelector<HTMLElement>('[data-door-word]');
  const values: Record<string, string> = {};
  let queued = false;
  let grow = GROW;

  const set = (name: string, value: number, digits = 3) => {
    const v = value.toFixed(digits);
    if (values[name] === v) return;
    values[name] = v;
    hero.style.setProperty(name, v);
  };

  // Where the word grows from: low in the stem of its T (or of its middle letter), measured with the word at rest;
  // and how far it grows, for the screen's shape.
  const aim = () => {
    if (!doorWord) return;
    // Wide only once the margin has grown past its floor (11.25rem) to centre the content, so a laptop's window, a
    // little wider than 16:9 under the browser's bar, keeps the door as drawn.
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const margin = doorWord.parentElement?.offsetLeft ?? 0;
    const wide = window.innerWidth / window.innerHeight > 16 / 9 + 0.01 && margin > 11.25 * rem + 1 && doorWord.offsetWidth > 0;
    grow = GROW * (wide ? Math.max(1, (window.innerWidth / doorWord.offsetWidth) * SHARE) : 1);
    const letters = [...doorWord.children] as HTMLElement[];
    const t = letters.find((el) => /^t$/i.test(el.textContent ?? '')) ?? letters[Math.floor(letters.length / 2)];
    if (!t) return;
    hero.style.setProperty('--ox', `${(t.offsetLeft + t.offsetWidth * 0.5).toFixed(1)}px`);
    hero.style.setProperty('--oy', `${(t.offsetTop + t.offsetHeight * 0.68).toFixed(1)}px`);
  };

  const update = () => {
    queued = false;
    const box = scene.getBoundingClientRect();
    const p = Math.max(0, -box.top / window.innerHeight);
    // The door's length, in screens (none with reduced motion, or without its runway).
    const run = !still.matches && runway && runway.offsetHeight ? runway.offsetHeight / window.innerHeight : 0;
    hero.classList.toggle('has-door', run > 0);
    if (run > 0) {
      const t = clamp(p / run);
      set('--door-band', ease(0, 0.2, t));
      set('--swap', ease(0.12, 0.3, t));
      set('--door-show', ease(0.12, 0.3, t) * (1 - ease(0.8, 1, t)));
      const z = clamp((t - 0.24) / 0.76);
      set('--door-scale', Math.pow(grow, Math.pow(z, 1.35)), 4);
    }
    const q = Math.max(0, p - run);
    const f = ease(0, 0.32, q);
    const d = ease(0.04, 0.72, q);
    set('--fade', f);
    set('--deep', d);
    hero.classList.toggle('is-deep', f > 0 || d > 0);
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener(
    'resize',
    () => {
      aim();
      queue();
    },
    { passive: true },
  );
  still.addEventListener('change', queue);
  // Coming back to the page part-way down (bfcache): start from where it is.
  window.addEventListener('pageshow', queue);
  // The typeface may arrive after the first measure.
  document.fonts?.ready.then(() => {
    aim();
    queue();
  });
  aim();
  update();
}
