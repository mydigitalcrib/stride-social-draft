// A camera shot, for anything on Stride Talent's pages that keeps a creator by taking their picture (the roster's
// viewfinder, roster-finder.ts; Stride Speakers' monitor): the shutter (chime.ts) and their press print coming out and
// flying into the shortlist's tray. No flash (the owner, 2026-11-18: "very distracting"). Nothing under reduced motion.
// Styles: .shot-print, styles/system/glass.css.
// The print lands on its own place in the tray: the tray's print for that creator (`id`, or the one just added) waits,
// unseen, until the flying one reaches it, and then simply shows there.
import { playShutter } from './chime';
import { uiScale } from './scale';
import { reduced } from './env';

export function takeShot({ rect, src, name, id }: { rect: DOMRect; src: string; name: string; id?: string }) {
  if (reduced()) return;
  // Shots are desktop only: the print's sizes and its flight are those of 1920×1080, grown with a larger screen as the
  // CSS around them is (scale.ts).
  const k = uiScale();
  playShutter();

  const print = document.createElement('div');
  print.className = 'shot-print';
  print.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.src = src;
  image.alt = '';
  const caption = document.createElement('span');
  caption.textContent = name;
  print.append(image, caption);
  const w = Math.max(150 * k, Math.min(rect.width, 240 * k));
  print.style.width = `${w}px`;
  print.style.left = `${rect.left + rect.width / 2 - w / 2}px`;
  print.style.top = `${rect.top + Math.max(0, rect.height / 2 - w * 0.75)}px`;
  document.body.append(print);

  // Its place in the tray (shortlist.ts has just added it): hidden until the print gets there.
  const tray = document.querySelector<HTMLElement>('.tray[data-tray="creators"]:not([hidden])');
  const items = tray?.querySelector<HTMLElement>('[data-tray-items]');
  const slot = items ? (id ? items.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`) : [...items.querySelectorAll<HTMLElement>(':scope > .is-new')].pop()) : null;
  slot?.classList.add('is-incoming');
  const arrive = () => slot?.classList.remove('is-incoming', 'is-new');

  // It comes out of the camera and turns, held a moment; then it flies to its place, measured only then (the tray may
  // just have come up), and lands there as the print that stays.
  const lift = [
    { transform: `translate(0, ${24 * k}px) scale(0.84) rotate(0deg)`, opacity: 0 },
    { transform: `translate(0, ${-40 * k}px) scale(1.08) rotate(-5deg)`, opacity: 1, offset: 0.48 },
    { transform: `translate(0, ${-48 * k}px) scale(1.06) rotate(-6deg)`, opacity: 1 },
  ];
  print
    .animate(lift, { duration: 700, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)', fill: 'forwards' })
    .finished.then(() => {
      const from = print.getBoundingClientRect();
      const at = slot?.isConnected ? slot.getBoundingClientRect() : null;
      const to = at ?? tray?.getBoundingClientRect() ?? new DOMRect(window.innerWidth - 324 * k, window.innerHeight - 160 * k, 300 * k, 120 * k);
      // The print's box without the lift's own turn and scale (it's 1.06 its size there).
      const base = print.offsetWidth;
      const cx = from.left + from.width / 2;
      const cy = from.top + from.height / 2;
      const tx = at ? to.left + to.width / 2 : to.left + Math.min(to.width, 120 * k) / 2;
      const ty = at ? to.top + to.height / 2 : to.top + Math.min(to.height, 90 * k) / 2;
      const end = at && slot ? slot.offsetWidth / base : 0.16;
      const turn = slot && at ? parseFloat(getComputedStyle(slot).rotate) || 0 : -22;
      const flight = print.animate(
        [
          { transform: `translate(0, ${-48 * k}px) scale(1.06) rotate(-6deg)`, opacity: 1 },
          { transform: `translate(${tx - cx}px, ${ty - cy - 48 * k}px) scale(${end}) rotate(${turn}deg)`, opacity: at ? 1 : 0.2 },
        ],
        { duration: 700, easing: 'cubic-bezier(0.5, 0, 0.25, 1)', fill: 'forwards' },
      );
      tray?.animate([{ scale: '1' }, { scale: '1.06' }, { scale: '1' }], { duration: 420, delay: 620, easing: 'ease-out' });
      return flight.finished;
    })
    .then(
      () => {
        arrive();
        print.remove();
      },
      () => {
        arrive();
        print.remove();
      },
    );
}
