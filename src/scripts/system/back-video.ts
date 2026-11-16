// The video behind a whole page (core/BackVideo.astro): it plays round and round, rests while the tab is hidden, and
// stays a still picture with reduced motion or data saving. The navy over it deepens as the page scrolls past its
// first screen (--deep). Phones and tablets play the smaller file (data-phone) and rest while the navy covers it.
import { desktop, reduced } from './env';
export function initBackVideo() {
  const layer = document.querySelector<HTMLElement>('[data-backvid]');
  const video = layer?.querySelector<HTMLVideoElement>('[data-backvid-video]');
  if (!layer || !video || layer.dataset.ready) return;
  layer.dataset.ready = 'true';
  const desk = desktop();

  // Phones and tablets: the smaller file in place of the desktop's, before anything is fetched.
  if (!desk && layer.dataset.phone) {
    video.querySelectorAll('source').forEach((s) => s.remove());
    const source = document.createElement('source');
    source.src = layer.dataset.phone;
    source.type = 'video/mp4';
    video.append(source);
  }

  let playing = false;
  const play = () => video.play().catch(() => {});
  let queued = false;
  let covered = false;
  const depth = () => {
    queued = false;
    const deep = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
    layer.style.setProperty('--deep', deep.toFixed(3));
    // Phones and tablets: it rests once the navy covers it all the way, and plays again on the way back up.
    if (!desk && (deep >= 1) !== covered) {
      covered = deep >= 1;
      if (covered) video.pause();
      else if (playing) play();
    }
  };
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(depth);
  }, { passive: true });
  depth();

  const saving = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (reduced() || saving) return;
  playing = true;
  video.preload = 'auto';
  if (!desk) video.load();
  if (!covered) play();
  document.addEventListener('visibilitychange', () => (document.hidden || covered ? video.pause() : play()));
}
