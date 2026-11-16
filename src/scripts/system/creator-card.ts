// Behaviour for talent/CreatorCard.astro: a photo that fails to load (many portraits are loaded from other servers,
// which can change or refuse them) gives way to the creator's initial, drawn as on the cards without a photo, so a
// card never shows a broken image. The initial comes from the card's own name.

function fallBack(img: HTMLImageElement) {
  const photo = img.closest<HTMLElement>('.ccc__photo');
  if (!photo || photo.classList.contains('is-broken')) return;
  photo.classList.add('is-broken');
  const name = photo.closest('.ccc')?.getAttribute('aria-label') ?? '';
  const none = document.createElement('span');
  const initial = document.createElement('span');
  none.className = 'ccc__none';
  none.setAttribute('aria-hidden', 'true');
  initial.className = 'ccc__initial';
  initial.textContent = (name.match(/[A-Za-z0-9]/) ?? ['S'])[0].toUpperCase();
  // The card's styles are scoped to the component: the new elements take its mark.
  for (const a of photo.attributes) {
    if (!a.name.startsWith('data-astro-cid-')) continue;
    none.setAttribute(a.name, a.value);
    initial.setAttribute(a.name, a.value);
  }
  none.append(initial);
  photo.prepend(none);
}

let ready = false;

export function initCreatorCards() {
  if (ready) return;
  ready = true;
  // `error` doesn't bubble: caught on its way down. Photos that had already failed are picked up once.
  document.addEventListener(
    'error',
    (e) => {
      if (e.target instanceof HTMLImageElement && e.target.closest('.ccc__photo')) fallBack(e.target);
    },
    true,
  );
  document.querySelectorAll<HTMLImageElement>('.ccc__photo img').forEach((img) => {
    if (img.complete && img.currentSrc && !img.naturalWidth) fallBack(img);
  });
}
