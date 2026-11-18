// The notification chime (the homepage opening's notifications, opening.ts; the Social globe's, creator-globe.ts) and the
// dial's detent (playTick):
// two soft, quick notes, the second higher, made here with Web Audio, so there's no sound file.
// Browsers only let a page make sound after the visitor has clicked, tapped or pressed a key on it. `unlockChime`
// goes in such a click (entering the site); `playChime` plays only once that has happened, never late.

let audio: AudioContext | null = null;

const context = () => {
  try {
    audio ??= new AudioContext();
  } catch {
    audio = null;
  }
  return audio;
};

/** The dial's detent (global/EdgeNav.astro, edge-nav.ts): a short, soft knock each time an area passes the capsule as
 *  the dial is dragged or scrolled (the owner, 2026-11-18). Only once the visitor has clicked or pressed a key on the
 *  page, as browsers require; never more than one every 28 ms, so a fast spin purrs rather than buzzes. */
let lastTick = 0;
export function playTick() {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activation && !activation.hasBeenActive) return;
  const at = performance.now();
  if (at - lastTick < 28) return;
  lastTick = at;
  const ctx = context();
  if (!ctx) return;
  const knock = () => {
    const now = ctx.currentTime;
    const tone = ctx.createOscillator();
    const level = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(1900, now);
    tone.frequency.exponentialRampToValueAtTime(820, now + 0.03);
    level.gain.setValueAtTime(0.0001, now);
    level.gain.linearRampToValueAtTime(0.085, now + 0.002);
    level.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    tone.connect(level).connect(ctx.destination);
    tone.start(now);
    tone.stop(now + 0.05);
  };
  if (ctx.state === 'running') return knock();
  ctx.resume().then(knock).catch(() => {});
}

/** Call from a click: from then on the chime can play. */
export function unlockChime() {
  context()?.resume().catch(() => {});
}

/** The chime, if the browser allows sound yet; otherwise nothing. */
export function playChime() {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activation && !activation.hasBeenActive) return;
  const ctx = context();
  if (!ctx) return;
  const ring = () => {
    const now = ctx.currentTime;
    [
      [880, 0],
      [1318.5, 0.09],
    ].forEach(([frequency, delay]) => {
      const tone = ctx.createOscillator();
      const level = ctx.createGain();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      level.gain.setValueAtTime(0, now + delay);
      level.gain.linearRampToValueAtTime(0.16, now + delay + 0.012);
      level.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.5);
      tone.connect(level).connect(ctx.destination);
      tone.start(now + delay);
      tone.stop(now + delay + 0.55);
    });
  };
  if (ctx.state === 'running') return ring();
  // Waking the sound up: ring only if it wakes straight away, never later on, when the moment has passed.
  const asked = performance.now();
  ctx
    .resume()
    .then(() => performance.now() - asked < 300 && ring())
    .catch(() => {});
}
