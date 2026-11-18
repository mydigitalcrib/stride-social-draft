// Opens creators' profiles over the page (creator-sheet.ts, `creators:open`: { ids, index, from }) where the page can
// show them, and otherwise goes to the creator's own page (`base` + id: routes.creator, given by the scene's markup),
// so a name in a scene (Stride Sport's board, Stride Speakers' running order) always leads somewhere, on every
// screen. A sheet that opens without being drawn (a screen it isn't built for) is put away again before going.
export function openCreators(ids: string[], index: number, from: DOMRect | null, base?: string) {
  let shown = false;
  const seen = () => (shown = true);
  document.addEventListener('sheet:open', seen, { once: true });
  document.dispatchEvent(new CustomEvent('creators:open', { detail: { ids, index, from } }));
  document.removeEventListener('sheet:open', seen);
  const sheet = document.querySelector<HTMLElement>('[data-csheet]');
  if (shown && sheet && getComputedStyle(sheet).display !== 'none') return;
  if (shown) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const id = ids[index];
  if (base && id) location.assign(`${base}${id}`);
}
