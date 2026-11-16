import Lenis from 'lenis';
import { uiScale } from './scale';
import { DESKTOP, reduced } from './env';

// Same feel as the live site (lerp 0.1, wheel 0.7). Touch keeps native scrolling.
// Past 1920×1080 the desktop's design grows with the screen (styles/system/tokens.css), so a wheel or trackpad step
// travels as far through it as it does at 1920×1080: its distance grows by the same scale (1 up to there, and on
// phones and tablets).
export function initSmoothScroll() {
  if (reduced()) return;
  const desk = window.matchMedia(DESKTOP);
  const lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 0.7,
    gestureOrientation: 'vertical',
    virtualScroll: (data) => {
      if (data.event.type === 'wheel' && desk.matches) {
        const k = uiScale();
        data.deltaX *= k;
        data.deltaY *= k;
      }
      return true;
    },
  });
  (window as unknown as { lenis: Lenis }).lenis = lenis;
  // The homepage intro may already have locked scrolling (src/scripts/system/hero-intro.ts).
  if (document.documentElement.classList.contains('intro-lock')) lenis.stop();
  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}
