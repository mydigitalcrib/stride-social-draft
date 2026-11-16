// The notification chime (the homepage opening's notifications, opening.ts; the Social globe's, creator-globe.ts):
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

/** A camera's shutter (Stride Talent's photocall, photocall.ts): two short clicks of filtered noise, the mirror and
 *  the blind. Only straight after the visitor's own click, as browsers require. */
export function playShutter() {
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean; hasBeenActive: boolean } }).userActivation;
  if (activation && !activation.hasBeenActive) return;
  const ctx = context();
  if (!ctx) return;
  const snap = () => {
    const now = ctx.currentTime;
    const click = (at: number, length: number, gain: number, frequency: number) => {
      const size = Math.max(1, Math.floor(ctx.sampleRate * length));
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size) ** 2;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = frequency;
      band.Q.value = 0.8;
      const level = ctx.createGain();
      level.gain.value = gain;
      source.connect(band).connect(level).connect(ctx.destination);
      source.start(now + at);
    };
    click(0, 0.035, 0.34, 3200);
    click(0.07, 0.05, 0.22, 1700);
  };
  if (ctx.state === 'running') return snap();
  ctx.resume().then(snap).catch(() => {});
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
