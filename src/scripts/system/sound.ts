// Sound on, everywhere it can be (the owner, 2026-11-18: "make sure every video has sound on, everything has sound on
// automatically"). Browsers let a page play sound only once the visitor has clicked, tapped or pressed a key on the site,
// so videos start muted and the sound comes on with that first gesture (on later pages of the visit it's often allowed
// from the start); from then on every video plays with its sound.
// - One wish for the whole site: on unless the visitor has turned it off with a sound button (`stride:sound` in
//   sessionStorage), so a button anywhere turns it off everywhere, and back on.
// - Videos with their own sound button (Stride Social's feed, Talent's stories, a service's phone) follow the wish
//   themselves and are marked [data-sound="own"]; every other video is looked after here, one voice at a time: of the
//   videos playing on the screen that have a sound track, the largest is heard and the others stay muted, so two never
//   talk over each other. Silent footage (the backgrounds) is simply left as it is.

const KEY = 'stride:sound';
type Activation = { hasBeenActive: boolean };
const activation = () => (navigator as Navigator & { userActivation?: Activation }).userActivation;

/** The visitor's wish: on, unless they turned it off. */
export function soundWanted(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

/** A sound button's choice, for the whole site; videos follow at once. */
export function setSoundWanted(on: boolean) {
  try {
    sessionStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* no storage: for this page */
  }
  document.dispatchEvent(new CustomEvent('stride:sound', { detail: { on } }));
}

/** Whether the browser lets the page make sound yet (the visitor has clicked, tapped or pressed a key). */
export function soundAllowed(): boolean {
  return activation()?.hasBeenActive ?? false;
}

/** Runs once sound is allowed: now, or at the visitor's first gesture on the page (inside it, as browsers require). */
export function whenSoundAllowed(run: () => void) {
  if (soundAllowed()) return run();
  const kinds = ['pointerdown', 'keydown', 'touchend'] as const;
  const go = (e: Event) => {
    if (e instanceof KeyboardEvent && e.key === 'Escape') return; // Escape isn't a gesture that unlocks sound
    kinds.forEach((k) => window.removeEventListener(k, go, true));
    run();
  };
  kinds.forEach((k) => window.addEventListener(k, go, true));
}

// Does this video have a sound track? Firefox and Safari say; Chrome only once it has decoded some, so a video that has
// barely started counts as maybe (and is looked at again).
function hasSound(v: HTMLVideoElement): boolean {
  const x = v as HTMLVideoElement & { mozHasAudio?: boolean; audioTracks?: { length: number }; webkitAudioDecodedByteCount?: number };
  if (typeof x.mozHasAudio === 'boolean') return x.mozHasAudio;
  if (x.audioTracks) return x.audioTracks.length > 0;
  if (typeof x.webkitAudioDecodedByteCount === 'number') return x.webkitAudioDecodedByteCount > 0 || v.currentTime < 0.6;
  return true;
}

let started = false;

/** The one voice for every video without a sound button of its own. Once per page (SiteLayout). */
export function initSound() {
  if (started) return;
  started = true;
  let queued = false;
  const pick = () => {
    queued = false;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let best: HTMLVideoElement | null = null;
    let bestArea = 0;
    const managed = [...document.querySelectorAll<HTMLVideoElement>('video:not([data-sound="own"])')];
    for (const v of managed) {
      if (v.paused || v.ended || !hasSound(v)) continue;
      const r = v.getBoundingClientRect();
      const w = Math.min(r.right, vw) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      const area = w > 0 && h > 0 ? w * h : 0;
      if (area > bestArea && (!v.checkVisibility || v.checkVisibility({ opacityProperty: true, visibilityProperty: true }))) {
        best = v;
        bestArea = area;
      }
    }
    const loud = soundWanted() && soundAllowed() && !document.hidden;
    for (const v of managed) {
      const on = loud && v === best;
      if (v.muted === !on) continue;
      v.muted = !on;
      if (on) v.volume = 1;
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(pick);
  };
  document.addEventListener('play', queue, true);
  document.addEventListener('pause', queue, true);
  document.addEventListener('loadeddata', queue, true);
  document.addEventListener('stride:sound', queue);
  document.addEventListener('visibilitychange', queue);
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  // Chrome tells whether a video has sound only once it has decoded some: look again now and then while any plays.
  window.setInterval(() => {
    if (document.querySelector('video:not([data-sound="own"])')) queue();
  }, 1200);
  whenSoundAllowed(pick);
  queue();
}
