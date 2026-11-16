// The loading screen (global/PageLoader.astro) holds every page until its first screen is ready. Entrances wait for
// it to open (`stride:loaded`, as it starts to fade), so they play in front of the visitor rather than under it.
export const isLoading = () => document.documentElement.classList.contains('is-loading');

/** Runs `fn` once the loading screen has opened: straight away when it already has, or there is none. */
export function whenLoaded(fn: () => void) {
  if (!isLoading()) return fn();
  window.addEventListener('stride:loaded', () => fn(), { once: true });
}

/** The same, as a promise. */
export const loaded = () => new Promise<void>((resolve) => whenLoaded(resolve));
