// What a visitor has picked as they go: services for a campaign brief, creators for a shortlist. Anything
// with [data-keep] toggles an item; experience/Tray.astro shows the list and leads to the enquiry form, which
// starts from it. Kept for this visit only, on this device, and nothing is sent anywhere until the visitor
// sends the form. Only what a page has actually rendered can be added, so the roster's consent rule holds,
// shared links included.
// The tray keeps each item's own element from one change to the next: only what's added comes in, what's taken out
// leaves before the rest close up after it, the count rolls like a counter, and emptied, the tray goes as it came.
// trayUp() lifts it out of a deck's way (Tray.astro's .is-up), gliding there. None of it under reduced motion.
import { reduced } from './env';
export type Item = { id: string; label: string; group?: string; image?: string };

const SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SLIDE = 'cubic-bezier(0.3, 1.25, 0.45, 1)';

const stores = new Map<string, Item[]>();
const keyOf = (list: string) => `stride:${list}`;

const load = (list: string): Item[] => {
  const known = stores.get(list);
  if (known) return known;
  let items: Item[] = [];
  try {
    items = JSON.parse(sessionStorage.getItem(keyOf(list)) ?? '[]');
  } catch {
    /* no storage here: it lasts for this page */
  }
  stores.set(list, items);
  return items;
};

const save = (list: string, items: Item[]) => {
  stores.set(list, items);
  try {
    sessionStorage.setItem(keyOf(list), JSON.stringify(items));
  } catch {
    /* no storage here: it lasts for this page */
  }
  render(true);
};

// Closed by its ×, a tray stays closed for this visit (on every page) until something new is added to its list, which
// brings it back; what was in it stays kept. Stored as the ids it held when it was closed.
const closedKey = (list: string) => `stride:tray-closed:${list}`;
const closedWith = (list: string): string[] | null => {
  try {
    const v = sessionStorage.getItem(closedKey(list));
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
const setClosed = (list: string, ids: string[] | null) => {
  try {
    if (ids) sessionStorage.setItem(closedKey(list), JSON.stringify(ids));
    else sessionStorage.removeItem(closedKey(list));
  } catch {
    /* no storage here: it lasts for this page */
  }
};

export const addTo = (list: string, item: Item) => {
  const items = load(list);
  if (!items.some((x) => x.id === item.id)) save(list, [...items, item]);
};
export const removeFrom = (list: string, id: string) => save(list, load(list).filter((x) => x.id !== id));

/** The link to the enquiry form, carrying the list. */
const linkFor = (list: string, base: string) => {
  const items = load(list);
  if (!items.length) return base;
  const url = new URL(base, location.origin);
  if (list === 'creators') url.searchParams.set('creators', items.map((x) => x.id).join(','));
  else {
    url.searchParams.set('brief', items.map((x) => x.label).join('|'));
    const groups = new Set(items.map((x) => x.group).filter(Boolean));
    if (groups.size === 1) url.searchParams.set('service', [...groups][0] as string);
  }
  return url.pathname + url.search;
};

/** One item in a tray: creators with a photo are a small press print, anything else a chip. */
function build(tray: HTMLElement, list: string, item: Item) {
  // The photo goes with them from the page they were kept on; an item kept before that has none, so it's looked for
  // on this page, else it stays a chip.
  const image = item.image ?? (list === 'creators' ? document.querySelector<HTMLElement>(`[data-keep-image][data-keep-id="${CSS.escape(item.id)}"]`)?.dataset.keepImage : undefined);
  const li = document.createElement('li');
  li.className = image ? 'tray__print' : 'tray__chip';
  li.title = item.label;
  li.dataset.itemId = item.id;
  if (image) {
    const photo = document.createElement('img');
    photo.src = image;
    photo.alt = '';
    photo.decoding = 'async';
    li.append(photo);
  }
  const name = document.createElement('span');
  name.textContent = item.label;
  const x = document.createElement('button');
  x.type = 'button';
  x.textContent = '×';
  x.setAttribute('aria-label', `${tray.dataset.remove ?? 'Remove'}: ${item.label}`);
  x.addEventListener('click', () => removeFrom(list, item.id));
  li.append(name, x);
  return li;
}

/** Runs `change` on a tray's items and slides those that stay from where they were to where they are now. */
function closeUp(box: HTMLElement, change: () => void) {
  const kids = [...box.children] as HTMLElement[];
  const was = new Map(kids.map((k) => [k, k.getBoundingClientRect()]));
  change();
  ([...box.children] as HTMLElement[]).forEach((k) => {
    const a = was.get(k);
    if (!a) return;
    const b = k.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    k.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320, easing: SLIDE });
  });
}

/** The tray's items, keyed by id: new ones are added (and come in), kept ones stay as they are. */
function sync(tray: HTMLElement, box: HTMLElement, list: string, items: Item[], motion: boolean) {
  const present = new Map<string, HTMLElement>();
  box.querySelectorAll<HTMLElement>(':scope > li[data-item-id]:not(.is-leaving)').forEach((li) => present.set(li.dataset.itemId!, li));
  const wanted = new Set(items.map((x) => x.id));
  const first = !present.size; // filling an empty tray (the page has just loaded, or it had been emptied)
  items.forEach((item) => {
    if (present.has(item.id)) return;
    const li = build(tray, list, item);
    if (motion || first) {
      li.classList.add('is-new');
      li.addEventListener('animationend', () => li.classList.remove('is-new'), { once: true });
    }
    box.append(li);
  });
  present.forEach((li, id) => {
    if (wanted.has(id)) return;
    if (!motion) return li.remove();
    li.classList.add('is-leaving');
    li.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-0.5rem) rotate(6deg) scale(0.9)' }], { duration: 220, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' })
      .finished.then(() => closeUp(box, () => li.remove()), () => li.remove());
  });
}

/** The count rolls like a counter: the old number leaves through the top and the new one comes up from below. */
function roll(el: HTMLElement, value: string, motion: boolean) {
  if ((el.dataset.to ?? el.textContent) === value) return;
  el.dataset.to = value;
  el.getAnimations().forEach((a) => a.cancel());
  if (!motion || el.textContent === value) {
    el.textContent = value;
    return;
  }
  el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-100%)', opacity: 0 }], { duration: 120, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' })
    .finished.then(
      () => {
        el.getAnimations().forEach((a) => a.cancel());
        el.textContent = value;
        el.animate([{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: SETTLE });
      },
      () => {},
    );
}

// Emptied, the tray goes as it came (the reverse of its entrance) before it's hidden; anything added meanwhile keeps it.
const exits = new WeakMap<HTMLElement, Animation>();
function showTray(tray: HTMLElement, any: boolean, motion: boolean) {
  const going = exits.get(tray);
  if (any) {
    going?.cancel();
    exits.delete(tray);
    tray.hidden = false;
    return;
  }
  if (tray.hidden || going) return;
  if (!motion || !tray.classList.contains('tray')) {
    tray.hidden = true;
    return;
  }
  const exit = tray.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(1rem) scale(0.96)' }], { duration: 240, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' });
  exits.set(tray, exit);
  exit.finished.then(
    () => {
      exits.delete(tray);
      tray.hidden = true;
      exit.cancel();
    },
    () => {},
  );
}

// What asks for the tray to be up out of the way (each deck whose bar is on screen); it's up while anything does.
const raisedBy = new WeakMap<HTMLElement, Set<object>>();
/** Lifts the tray up under the header (or lets it back down), gliding from where it was. */
export function trayUp(tray: HTMLElement, by: object, up: boolean) {
  const asking = raisedBy.get(tray) ?? new Set<object>();
  raisedBy.set(tray, asking);
  if (up) asking.add(by);
  else asking.delete(by);
  const want = asking.size > 0;
  if (tray.classList.contains('is-up') === want) return;
  if (tray.hidden || reduced()) {
    tray.classList.toggle('is-up', want);
    return;
  }
  const a = tray.getBoundingClientRect();
  tray.classList.toggle('is-up', want);
  const b = tray.getBoundingClientRect();
  tray.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }], { duration: 460, easing: SETTLE });
}

function render(changed = false) {
  document.querySelectorAll<HTMLElement>('[data-keep]').forEach((b) => {
    b.setAttribute('aria-pressed', String(load(b.dataset.keep!).some((x) => x.id === b.dataset.keepId)));
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-keep-cta]').forEach((a) => {
    a.href = linkFor(a.dataset.keepCta!, a.dataset.keepBase ?? a.getAttribute('href') ?? '/');
  });
  const motion = changed && !reduced();
  // Every [data-tray]: the tray itself, and a count elsewhere that shows the same list (a deck's link).
  document.querySelectorAll<HTMLElement>('[data-tray]').forEach((tray) => {
    const list = tray.dataset.tray!;
    const items = load(list);
    const shown = !tray.hidden && !exits.has(tray);
    const count = tray.querySelector<HTMLElement>('[data-tray-count]');
    if (count) roll(count, String(items.length), motion && shown);
    const box = tray.querySelector<HTMLElement>('[data-tray-items]');
    if (box) sync(tray, box, list, items, motion);
    // A closed tray (only the tray itself: a count elsewhere keeps showing) stays closed until a new pick.
    let closed = false;
    if (tray.classList.contains('tray')) {
      const held = closedWith(list);
      if (held && items.some((x) => !held.includes(x.id))) setClosed(list, null);
      else closed = !!held;
    }
    showTray(tray, items.length > 0 && !closed, motion);
    if (motion && items.length && shown) {
      tray.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
    }
  });
  // For anything else that shows the list (Stride Talent's close, TalentClose.astro).
  document.dispatchEvent(new CustomEvent('shortlist:render', { detail: { creators: load('creators') } }));
}

/** What's in a list now. */
export const listOf = (list: string): Item[] => [...load(list)];

let started = false;
export function initShortlists() {
  if (started) return render();
  started = true;
  // In the capture phase, so choosing never also opens or flips the card it sits on.
  document.addEventListener(
    'click',
    (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-keep]');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      const list = b.dataset.keep!;
      const id = b.dataset.keepId!;
      if (load(list).some((x) => x.id === id)) removeFrom(list, id);
      else addTo(list, { id, label: b.dataset.keepLabel ?? id, group: b.dataset.keepGroup, image: b.dataset.keepImage });
    },
    true,
  );
  // A shared shortlist: only creators this page shows can be restored.
  const shared = new URLSearchParams(location.search).get('shortlist');
  shared?.split(',').forEach((id) => {
    const b = document.querySelector<HTMLElement>(`[data-keep="creators"][data-keep-id="${CSS.escape(id)}"]`);
    if (b) addTo('creators', { id, label: b.dataset.keepLabel ?? id });
  });
  // The tray's ×: it goes as it does when emptied, and stays closed until something new is added.
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tray-close]');
    const tray = b?.closest<HTMLElement>('.tray[data-tray]');
    if (!tray) return;
    const list = tray.dataset.tray!;
    setClosed(list, load(list).map((x) => x.id));
    if (tray.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
    showTray(tray, false, !reduced());
  });
  // "Get to know them": the profiles of the creators picked, over the page where it can (creator-sheet.ts), otherwise
  // on the roster, which opens them as it arrives.
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tray-meet]');
    if (!b || !load('creators').length) return;
    if (document.querySelector('[data-csheet]')) document.dispatchEvent(new CustomEvent('creators:meet', { detail: { from: b.closest('[data-tray]')?.getBoundingClientRect() ?? null } }));
    else location.href = '/talent/roster?meet=1';
  });
  render();
}
