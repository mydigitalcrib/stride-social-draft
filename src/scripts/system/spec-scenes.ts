// What Stride Sport, Stride Podcasts and Stride Speakers share on every screen (talent/SpecialistPage.astro): the division's
// figures below the headline count up from nothing as the page opens (straight to them under reduced motion).
import { whenLoaded } from './loaded';
import { reduced } from './env';
const COUNT_FROM = 700; // ms after the page starts
const COUNT_FOR = 1400; // ms

export function initSpecScenes() {
  if (reduced()) return;
  const figures = [...document.querySelectorAll<HTMLElement>('[data-spec-count]')];
  if (!figures.length) return;
  figures.forEach((f) => (f.textContent = '0'));
  // From when the loading screen opens (loaded.ts).
  whenLoaded(() => {
    const start = performance.now() + COUNT_FROM;
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / COUNT_FOR));
      const eased = 1 - Math.pow(1 - k, 3);
      figures.forEach((f) => (f.textContent = String(Math.round(Number(f.dataset.specCount) * eased))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
