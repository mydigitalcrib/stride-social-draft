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
// The hand-off into "Three sides of Stride" is one movement (the owner, 2026-11-18: "more smooth like a really good
// transition"): the frost starts as the door finishes opening, so the footage never sits still between them, and the
// heading and its line resolve out of the frost with the scroll (--sides-in on the section: they rise, sharpen and
// come up), close behind the door, rather than fading in on their own once they're on the screen.
// It never jumps with the scroll (the owner, 2026-11-18: "make the transition way smoother"): the scene's progress
// glides after where the page has scrolled to, a share of the way each frame, so a quick flick of the wheel or the
// trackpad plays the door out instead of cutting through it; and the navy round the letter dissolves over a longer
// stretch while the letter is still growing, rather than being swept off at the end. A jump of more than a couple of
// screens (a link to the three sides, the End key) goes straight there.
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
const FOLLOW = 0.11; // per 60th of a second, the share of the way the scene's progress goes towards the scroll's
const LEAP = 2.2; // screens: a jump further than this goes straight there

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

  const sides = scene.querySelector<HTMLElement>('.sides');
  const set = (name: string, value: number, digits = 3, on: HTMLElement = hero) => {
    const v = value.toFixed(digits);
    if (values[name] === v) return;
    values[name] = v;
    on.style.setProperty(name, v);
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

  // The progress shown (screens into the scene), gliding after the scroll's; -1 until the first measure.
  let shown = -1;
  let last = 0;
  const update = (now = performance.now()) => {
    queued = false;
    const box = scene.getBoundingClientRect();
    const goal = Math.max(0, -box.top / window.innerHeight);
    const dt = last ? Math.min(4, (now - last) / (1000 / 60)) : 1;
    last = now;
    if (shown < 0 || still.matches || Math.abs(goal - shown) > LEAP) shown = goal;
    else shown += (goal - shown) * (1 - Math.pow(1 - FOLLOW, dt));
    if (Math.abs(goal - shown) < 0.0005) shown = goal;
    const p = shown;
    // The door's length, in screens (none with reduced motion, or without its runway).
    const run = !still.matches && runway && runway.offsetHeight ? runway.offsetHeight / window.innerHeight : 0;
    hero.classList.toggle('has-door', run > 0);
    if (run > 0) {
      const t = clamp(p / run);
      // The navy closes in round the letters over a longer stretch, so it doesn't snap shut.
      set('--door-band', ease(0, 0.22, t));
      set('--swap', ease(0.08, 0.34, t));
      // and it dissolves over the last third, while the letter is still growing, so the footage takes over softly.
      set('--door-show', ease(0.08, 0.34, t) * (1 - ease(0.64, 0.98, t)));
      const z = clamp((t - 0.26) / 0.74);
      set('--door-scale', Math.pow(grow, Math.pow(z, 1.35)), 4);
    }
    const q = p - run; // past the door (negative while it's still opening)
    const f = ease(0, 0.32, Math.max(0, q));
    // With the door, the frost starts as it finishes opening and is whole by the time the heading has come up.
    const d = run > 0 ? ease(-0.06, 0.55, q) : ease(0.04, 0.72, q);
    set('--fade', f);
    set('--deep', d);
    hero.classList.toggle('is-deep', f > 0 || d > 0);
    if (sides) set('--sides-in', run > 0 ? ease(0.02, 0.5, q) : 1, 3, sides);
    // Still on its way: the next frame carries on (and stops once it's there).
    if (shown !== goal) queue();
    else last = 0;
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
  // Coming back to the page part-way down (bfcache): start from where it is, without gliding there.
  window.addEventListener('pageshow', () => {
    shown = -1;
    queue();
  });
  // The typeface may arrive after the first measure.
  document.fonts?.ready.then(() => {
    aim();
    queue();
  });
  aim();
  update();
}
