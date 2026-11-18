// What Stride Sport, Stride Podcasts and Stride Speakers share on every screen (talent/SpecialistPage.astro): the division's
// figures below the headline count up from nothing as the page opens (straight to them under reduced motion); and the
// tray of creators picked steps away while a scene it would cover is on screen ([data-tray-away]: the slides).
import { whenLoaded } from './loaded';
import { reduced } from './env';
const COUNT_FROM = 700; // ms after the page starts
const COUNT_FOR = 1400; // ms

function trayAway() {
  const tray = document.querySelector<HTMLElement>('[data-tray="creators"]');
  const scenes = [...document.querySelectorAll<HTMLElement>('[data-tray-away]')];
  if (!tray || !scenes.length) return;
  const showing = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? showing.add(e.target) : showing.delete(e.target)));
    tray.classList.toggle('is-away', showing.size > 0);
  }, { threshold: 0.3 });
  scenes.forEach((s) => io.observe(s));
}

export function initSpecScenes() {
  trayAway();
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
