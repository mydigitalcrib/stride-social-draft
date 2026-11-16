// One-shot "scroll into view" reveals (replaces Webflow IX2 scroll-into-view triggers).
// Elements marked [data-reveal] get `.is-revealed` the first time any part of them enters
// the viewport; each component owns the CSS transition it plays.
import { whenLoaded } from './loaded';

export function initReveal() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-revealed');
      io.unobserve(e.target);
    }
  });
  // Not until the loading screen has opened, so what's on the first screen comes in in front of the visitor.
  whenLoaded(() => els.forEach((el) => io.observe(el)));
}
