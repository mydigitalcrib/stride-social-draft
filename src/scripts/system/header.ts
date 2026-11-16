// Behaviour for global/SiteHeader.astro.
// - Scroll: transparent throughout, so it slides away on scroll down as soon as content would pass under it,
//   and returns on scroll up (never while the navigation panel is open), on every page, the homepage's scene
//   included, so the logo never sits over the words scrolling past.
// - Desktop: on the way back up it only returns where the logo would stand clear of the page's words (the owner,
//   2026-11-12: "avoid in general the overlap between the logo and the text"), and goes again if words come under it;
//   at the top of the page it's always there. The Menu button itself is handled by src/scripts/system/edge-nav.ts.
import { uiScale } from './scale';
import { DESKTOP } from './env';

// The words a logo must not sit over: headings, paragraphs and the like (their whole box, generously).
const WORDS = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, label, [role="heading"]';

export function initHeader() {
  const chrome = document.querySelector<HTMLElement>('[data-chrome]');
  if (!chrome || chrome.dataset.ready) return;
  chrome.dataset.ready = 'true';
  const navOpen = () => !!document.querySelector('[data-menu-panel].is-open');
  const desk = window.matchMedia(DESKTOP);
  const logo = chrome.querySelector<HTMLElement>('.header__logo');

  // Where the logo stands when the header is there (it's fixed at the top: its place in the header, not on screen,
  // since a hidden header has moved it up and out of view).
  const logoBox = () => {
    if (!logo) return null;
    const r = logo.getBoundingClientRect();
    const shift = chrome.getBoundingClientRect().top;
    return { left: r.left, right: r.right, top: r.top - shift, bottom: r.bottom - shift };
  };
  // Is anything with words under the logo's place? A few points across it, each asking what the page has there
  // beneath the header.
  const wordsUnderLogo = () => {
    const box = logoBox();
    if (!box) return false;
    const xs = [box.left + 4, (box.left + box.right) / 2, box.right - 4];
    const ys = [box.top + 4, (box.top + box.bottom) / 2, box.bottom - 4];
    for (const x of xs) {
      for (const y of ys) {
        for (const el of document.elementsFromPoint(x, y)) {
          if (chrome.contains(el)) continue;
          const words = el.closest<HTMLElement>(WORDS);
          if (words && words.textContent?.trim()) return true;
          break;
        }
      }
    }
    return false;
  };

  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    // On desktop the header grows with the screen past 1920×1080 (styles/system/tokens.css), and so does the distance
    // before content reaches it. The 4px of slack against a jittery scroll stays as it is.
    const k = desk.matches ? uiScale() : 1;
    chrome.classList.toggle('is-scrolled', y > 80 * k);
    if (Math.abs(y - lastY) > 4) {
      const away = y > 48 * k && !navOpen();
      const down = y > lastY;
      chrome.classList.toggle('is-hidden', away && (down || (desk.matches && wordsUnderLogo())));
      lastY = y;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
