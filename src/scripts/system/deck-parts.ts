// What the made-to-measure decks share (components/experience/Deck.astro, every screen): the pill that slides
// between the tabs, photos ready before they're needed, and an entrance that waits until the row is in view.
import { whenLoaded } from './loaded';
import { reduced } from './env';

/** The pill under the chosen tab. Returns the function that puts it there. It measures again whenever the row or a
 *  tab changes size (a font arriving, the buttons beside it settling), so it's never left short. */
export function slidePill(root: HTMLElement, tabs: HTMLButtonElement[]) {
  const pill = root.querySelector<HTMLElement>('[data-deck-pill]');
  const place = () => {
    const tab = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (!pill || !tab || !pill.parentElement) return;
    const at = tab.getBoundingClientRect();
    pill.style.width = `${at.width}px`;
    pill.style.transform = `translateX(${at.left - pill.parentElement.getBoundingClientRect().left}px)`;
  };
  if (pill?.parentElement) {
    root.classList.add('has-pill');
    place();
    const sizes = new ResizeObserver(place);
    sizes.observe(pill.parentElement);
    tabs.forEach((t) => sizes.observe(t));
  }
  return place;
}

/** Every tab's photos load as the deck comes near, so no card flashes empty. */
export function preload(root: HTMLElement) {
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      near.disconnect();
      root.querySelectorAll<HTMLImageElement>('.deck__image').forEach((img) => (img.loading = 'eager'));
    },
    { rootMargin: '100% 0px' },
  );
  near.observe(root);
}

/** Hides the row until it's in view, then runs its entrance once. */
export function firstView(root: HTMLElement, enter: () => void) {
  if (reduced()) return;
  root.classList.add('is-waiting');
  const first = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      first.disconnect();
      root.classList.remove('is-waiting');
      enter();
    },
    { threshold: 0.3 },
  );
  whenLoaded(() => first.observe(root));
}
