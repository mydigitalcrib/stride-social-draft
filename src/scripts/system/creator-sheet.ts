// Behaviour for talent/CreatorSheet.astro: creators' profiles over the page (every screen; one column on a phone).
// - A press on a creator's name in a roster (talent/RosterBrowser.astro) opens theirs, among the others of that roster
//   as it's narrowed now; a modified click (new tab, and so on) still goes to their page.
// - "Get to know them", in the tray of creators picked ("Meet our talents", shortlist.ts: `creators:meet`), opens the
//   profiles of everyone picked, one after another; on the roster's own page `?meet=1` does the same as it arrives.
// Each profile shows what the page has for that creator: their own card if it's on the page (what the roster's rules let
// the card show), else the profile data the page carries (CreatorSheet's `data`), else just their name, photo and the
// way to their page. The photo grows from where it was into the print, keeping its shape, and the paper comes up around
// it; the arrow keys, the edges, a flick of the print (a drag, or a sideways swipe on a trackpad) move to the creator
// before or after, whose photo develops as it comes in (quick presses go straight to the last one asked for); the print
// leans towards the pointer as if held. Escape, the veil or the close button closes it. While it's open the keyboard
// stays in it, the page behind is out of reach, and `sheet:open` / `sheet:close` let the page's own motion wait.
import { initShortlists, listOf } from './shortlist';
import { uiScale } from './scale';
import { lenis, reduced } from './env';

const LEAN = 6; // deg: how far the print leans towards the pointer, at most
const FOLLOW = 0.12; // per frame (at 60 a second), the share of the way the lean covers
const FLICK = 90; // px dragged that flicks the print on to the next creator
const FLICK_SPEED = 0.5; // px per ms at 1920×1080 (growing with a larger screen): or this fast
const SWIPE = 60; // px of sideways trackpad swipe that does the same (the fingers' travel, the same on any screen)
const SWIPE_REST = 450; // ms before another swipe counts (a trackpad's swipe runs on after the fingers stop)

export type SheetEntry = {
  id: string;
  name: string;
  src?: string | null;
  srcset?: string | null;
  tag?: string | null;
  handle?: string | null;
  details?: string | null;
  line?: string | null;
  figure?: string | null;
  platforms?: { label: string; href: string }[];
  enquire?: string | null;
  href?: string | null;
  video?: string | null;
};

export function initCreatorSheet() {
  const sheet = document.querySelector<HTMLElement>('[data-csheet]');
  if (!sheet || sheet.dataset.ready) return;
  sheet.dataset.ready = 'true';
  const q = <T extends HTMLElement>(s: string) => sheet.querySelector<T>(s)!;
  const hand = q<HTMLElement>('[data-csheet-hand]');
  const print = q<HTMLElement>('[data-csheet-print]');
  const paper = q<HTMLElement>('[data-csheet-paper]');
  const photo = q<HTMLElement>('[data-csheet-photo]');
  const gloss = q<HTMLElement>('[data-csheet-gloss]');
  const img = q<HTMLImageElement>('[data-csheet-img]');
  const video = q<HTMLVideoElement>('[data-csheet-video]');
  const caption = q<HTMLElement>('[data-csheet-caption]');
  const text = q<HTMLElement>('[data-csheet-text]');
  const tag = q<HTMLElement>('[data-csheet-tag]');
  const name = q<HTMLElement>('[data-csheet-name]');
  const handle = q<HTMLElement>('[data-csheet-handle]');
  const details = q<HTMLElement>('[data-csheet-details]');
  const line = q<HTMLElement>('[data-csheet-line]');
  const figure = q<HTMLElement>('[data-csheet-figure]');
  const platforms = q<HTMLElement>('[data-csheet-platforms]');
  const enquire = q<HTMLAnchorElement>('[data-csheet-enquire]');
  const enquireLabel = q<HTMLElement>('[data-csheet-enquire-label]');
  const keep = q<HTMLButtonElement>('[data-csheet-keep]');
  const profile = q<HTMLAnchorElement>('[data-csheet-profile]');
  const prev = q<HTMLButtonElement>('[data-csheet-prev]');
  const next = q<HTMLButtonElement>('[data-csheet-next]');
  const closer = q<HTMLButtonElement>('.csheet__close');
  const count = sheet.querySelector<HTMLElement>('[data-csheet-count]');
  const enquireWords = enquireLabel.textContent?.trim() ?? '';
  // The profiles the page carries for creators it shows without a card (the photocall's).
  const carried = new Map<string, SheetEntry>();
  try {
    (JSON.parse(sheet.querySelector('[data-csheet-data]')?.textContent || '[]') as SheetEntry[]).forEach((e) => carried.set(e.id, e));
  } catch {
    /* nothing carried */
  }

  const body = q<HTMLElement>('.csheet__body');
  let list: SheetEntry[] = [];
  let at = -1;
  let opener: HTMLElement | null = null;
  let source: () => DOMRect | null = () => null;
  let closing = false;
  // On its way to another creator (the slide out under way), and which way.
  let moving = false;
  let heading = 0;
  // A flick of the print in hand.
  let drag: { id: number; x: number; t: number; dx: number; v: number } | null = null;
  // The print has landed in the hand (it leans only then, so its flight in lines up with where it came from).
  let held = false;

  const textOf = (card: HTMLElement, s: string) => card.querySelector(s)?.textContent?.trim() || null;

  // A creator's card on the page, by id.
  const cardOf = (id: string) => document.querySelector<HTMLElement>(`[data-roster-card] .ccc__keep[data-keep-id="${CSS.escape(id)}"]`)?.closest<HTMLElement>('[data-roster-card]') ?? null;

  const fromCard = (card: HTMLElement): SheetEntry => {
    const photo = card.querySelector<HTMLImageElement>('.ccc__photo img');
    const k = card.querySelector<HTMLElement>('.ccc__keep');
    return {
      id: k?.dataset.keepId ?? card.getAttribute('aria-label') ?? '',
      name: card.getAttribute('aria-label') ?? textOf(card, '.ccc__name') ?? '',
      src: photo?.getAttribute('src'),
      srcset: photo?.getAttribute('srcset'),
      tag: textOf(card, '.ccc__tag'),
      handle: textOf(card, '.ccc__handle'),
      details: textOf(card, '.ccc__details'),
      line: card.dataset.line ?? null,
      figure: textOf(card, '.ccc__figure'),
      platforms: [...card.querySelectorAll<HTMLAnchorElement>('.ccc__platforms a')].map((a) => ({ label: a.textContent ?? '', href: a.href })),
      enquire: card.querySelector<HTMLAnchorElement>('.ccc__enquire')?.href,
      href: card.querySelector<HTMLAnchorElement>('.ccc__name a')?.href,
      video: card.querySelector<HTMLSourceElement>('.ccc__video source')?.src ?? null,
    };
  };

  const entryOf = (item: { id: string; label: string; image?: string }): SheetEntry => {
    const card = cardOf(item.id);
    if (card) return fromCard(card);
    return carried.get(item.id) ?? { id: item.id, name: item.label, src: item.image, href: `/talent/roster/${item.id}` };
  };

  const fill = (e: SheetEntry) => {
    img.src = e.src ?? '';
    if (e.srcset) img.srcset = e.srcset;
    else img.removeAttribute('srcset');
    // The print's column is 420px up to 1920 wide and grows with a larger screen (CreatorSheet.astro).
    img.sizes = '(min-width: 1921px) 22vw, 420px';
    video.pause();
    if (e.video) {
      video.src = e.video;
      video.poster = e.src ?? '';
      video.hidden = false;
      if (!reduced()) video.play().catch(() => {});
    } else {
      video.removeAttribute('src');
      video.hidden = true;
    }
    caption.textContent = e.name;
    tag.textContent = e.tag ?? '';
    name.textContent = e.name;
    handle.textContent = e.handle ?? '';
    details.textContent = e.details ?? '';
    line.textContent = e.line ?? '';
    figure.textContent = e.figure ?? '';
    platforms.replaceChildren(
      ...(e.platforms ?? []).map((p) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = p.href;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = p.label;
        li.append(link);
        return li;
      }),
    );
    enquire.href = e.enquire ?? `/talent/enquire?creator=${encodeURIComponent(e.id)}`;
    enquireLabel.textContent = `${enquireWords} ${e.name}`;
    profile.href = e.href ?? `/talent/roster/${e.id}`;
    keep.dataset.keepId = e.id;
    keep.dataset.keepLabel = e.name;
    if (e.src) keep.dataset.keepImage = e.src;
    else delete keep.dataset.keepImage;
    initShortlists(); // marks it added or not
    const before = list[at - 1];
    const after = list[at + 1];
    prev.hidden = !before;
    next.hidden = !after;
    const pi = prev.querySelector('img');
    const ni = next.querySelector('img');
    if (pi) pi.src = before?.src ?? '';
    if (ni) ni.src = after?.src ?? '';
    if (count) count.textContent = list.length > 1 ? `${at + 1} / ${list.length}` : '';
    // With others either side, the print can be flicked to them: the site's cursor shows a hand over it.
    print.toggleAttribute('data-grab', list.length > 1);
  };

  // The photo from a place on the screen into the print (or back): one scale, so the face keeps its shape, lining the
  // print's photo up with where it was (centre on centre) and turning to the print's angle on the way; the paper and
  // the caption come up around it at the end (or go first, on the way back).
  const grow = (from: DOMRect | null, back = false) => {
    if (!from || reduced()) return Promise.resolve();
    // Measured flat: the print's angle doesn't move its layout, and the animation turns it from flat.
    print.style.rotate = '0deg';
    const box = print.getBoundingClientRect();
    const pic = photo.getBoundingClientRect();
    print.style.removeProperty('rotate');
    if (!pic.width) return Promise.resolve();
    const s = from.width / pic.width;
    const tx = from.left + from.width / 2 - box.left - s * (pic.left - box.left + pic.width / 2);
    const ty = from.top + from.height / 2 - box.top - s * (pic.top - box.top + pic.height / 2);
    const away = { transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`, rotate: '0deg' };
    const home = { transform: 'none', rotate: '-1.5deg' };
    const timing = { duration: back ? 380 : 620, easing: back ? 'cubic-bezier(0.5, 0, 0.75, 0)' : 'cubic-bezier(0.2, 0.9, 0.25, 1)', fill: 'both' as const };
    const around = back
      ? [{ opacity: 1 }, { opacity: 0, offset: 0.3 }, { opacity: 0 }]
      : [{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }];
    paper.animate(around, timing);
    caption.animate(around, timing);
    const frames = back ? [{ ...home, opacity: 1 }, { ...away, opacity: 0.4 }] : [{ ...away, opacity: 0.6 }, { ...home, opacity: 1 }];
    return print.animate(frames, timing).finished.then(() => {}, () => {});
  };
  const settleGrow = () => [print, paper, caption].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

  /* ---------- Held: the print leans towards the pointer, a gloss crossing it ---------- */
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  let leanRaf = 0;
  let leanLast = 0;
  const leanFrame = (now: number) => {
    leanRaf = 0;
    const dt = leanLast ? Math.min(3, (now - leanLast) / (1000 / 60)) : 1;
    leanLast = now;
    const k = 1 - Math.pow(1 - FOLLOW, dt);
    lean.x += (lean.tx - lean.x) * k;
    lean.y += (lean.ty - lean.y) * k;
    const still = Math.abs(lean.tx - lean.x) + Math.abs(lean.ty - lean.y) < 0.02;
    if (still) {
      lean.x = lean.tx;
      lean.y = lean.ty;
    }
    const tilt = Math.hypot(lean.x, lean.y);
    hand.style.transform = tilt < 0.01 ? '' : `rotateX(${lean.x.toFixed(2)}deg) rotateY(${lean.y.toFixed(2)}deg)`;
    gloss.style.opacity = Math.min(1, tilt / LEAN).toFixed(3);
    gloss.style.transform = `translate3d(${((-lean.y / LEAN) * 22).toFixed(1)}%, ${((lean.x / LEAN) * 22).toFixed(1)}%, 0)`;
    if (!still) leanRaf = requestAnimationFrame(leanFrame);
  };
  const leanTo = (x: number, y: number) => {
    lean.tx = x;
    lean.ty = y;
    if (!leanRaf) {
      leanLast = 0;
      leanRaf = requestAnimationFrame(leanFrame);
    }
  };
  const leanReset = () => {
    cancelAnimationFrame(leanRaf);
    leanRaf = 0;
    lean.x = lean.y = lean.tx = lean.ty = 0;
    hand.style.transform = '';
    gloss.style.opacity = '0';
  };
  sheet.addEventListener('pointermove', (e) => {
    if (sheet.hidden || closing || !held || reduced() || drag || e.pointerType === 'touch') return;
    // From where the hand is laid out, not where it leans to (its column in the sheet).
    const b = body.getBoundingClientRect();
    const w = hand.offsetWidth || 1;
    const h = hand.offsetHeight || 1;
    const fx = Math.max(-1, Math.min(1, (e.clientX - (b.left + hand.offsetLeft + w / 2)) / w));
    const fy = Math.max(-1, Math.min(1, (e.clientY - (b.top + hand.offsetTop + h / 2)) / h));
    leanTo(-fy * LEAN, fx * LEAN);
  });
  sheet.addEventListener('pointerleave', () => leanTo(0, 0));

  /* ---------- Keeping the keyboard in it, and the page behind out of reach ---------- */
  let walled: HTMLElement[] = [];
  const wall = (on: boolean) => {
    walled.forEach((el) => (el.inert = false));
    walled = [];
    if (!on) return;
    for (let el: HTMLElement | null = sheet; el && el !== document.body; el = el.parentElement) {
      for (const sib of el.parentElement?.children ?? []) {
        if (sib === el || !(sib instanceof HTMLElement) || sib.inert || sib instanceof HTMLScriptElement) continue;
        sib.inert = true;
        walled.push(sib);
      }
    }
  };
  const focusables = () => [...sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((el) => el.getClientRects().length > 0);

  const open = (entries: SheetEntry[], index: number, from: () => DOMRect | null) => {
    if (!entries.length) return;
    list = entries;
    at = Math.max(0, Math.min(entries.length - 1, index));
    closing = false;
    held = false;
    opener = document.activeElement as HTMLElement | null;
    source = from;
    const start = from();
    fill(list[at]);
    leanReset();
    sheet.hidden = false;
    document.documentElement.classList.add('has-sheet');
    document.dispatchEvent(new CustomEvent('sheet:open'));
    lenis()?.stop();
    if (!reduced()) {
      sheet.querySelector('.csheet__veil')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
      text.animate([{ opacity: 0, translate: '0 1.125rem' }, { opacity: 1, translate: '0 0' }], { duration: 520, delay: 160, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)', fill: 'backwards' });
      [prev, next].forEach((edge) => edge.animate([{ opacity: 0 }, { opacity: 0.5 }], { duration: 500, delay: 300, fill: 'backwards' }));
    }
    // The page behind goes out of reach once the print has landed (it restyles the whole page, so not mid-flight).
    grow(start).then(() => {
      if (closing || sheet.hidden) return;
      settleGrow();
      held = true;
      wall(true);
    });
    closer.focus({ preventScroll: true });
  };

  const close = () => {
    if (sheet.hidden || closing) return;
    closing = true;
    held = false;
    dropDrag();
    video.pause();
    leanReset();
    const end = () => {
      settleGrow();
      sheet.hidden = true;
      moving = false;
      closing = false;
      document.documentElement.classList.remove('has-sheet');
      wall(false);
      document.dispatchEvent(new CustomEvent('sheet:close'));
      lenis()?.start();
      opener?.focus?.({ preventScroll: true });
    };
    if (reduced()) return end();
    sheet.querySelector('.csheet__veil')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'both' });
    text.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' });
    [prev, next].forEach((edge) => edge.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: 200, fill: 'both' }));
    grow(source(), true).then(() => {
      sheet.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      end();
    });
  };

  // To the creator before or after: the print slides out one way (on from where a flick left it) and the next comes in
  // from the other, its photo developing. Presses while it's on its way only change where it's going: the slide out
  // under way brings in the latest.
  const arrive = () => {
    moving = false;
    if (sheet.hidden || closing) return;
    const k = uiScale();
    const by = heading;
    fill(list[at]);
    print.getAnimations().forEach((a) => a.cancel());
    print.style.removeProperty('translate');
    print.style.removeProperty('rotate');
    print.animate([{ opacity: 0, translate: `${by * 60 * k}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 380, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' });
    text.animate([{ opacity: 0, translate: `${by * 24 * k}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' });
    // Developing, as the photocall's prints do.
    photo.animate(
      [
        { filter: `brightness(2.6) contrast(0.7) blur(${2 * k}px)` },
        { filter: `brightness(1.3) blur(${0.5 * k}px)`, offset: 0.35 },
        { filter: 'none' },
      ],
      { duration: 700, easing: 'ease-out' },
    );
  };
  const go = (by: number, from = 0) => {
    const to = at + by;
    if (closing || sheet.hidden || to < 0 || to >= list.length) return false;
    at = to;
    const entry = list[at];
    source = () => (cardOf(entry.id)?.querySelector('.ccc__photo') ?? null)?.getBoundingClientRect() ?? null;
    if (reduced()) {
      fill(entry);
      return true;
    }
    heading = by;
    if (moving) return true;
    moving = true;
    const k = uiScale();
    const turned = print.style.rotate || '-1.5deg';
    print
      .animate(
        [
          { opacity: 1, translate: `${from}px 0`, rotate: turned },
          { opacity: 0, translate: `${from - by * 60 * k}px 0`, rotate: turned },
        ],
        { duration: 180, easing: 'ease-in', fill: 'forwards' },
      )
      .finished.then(arrive, arrive);
    return true;
  };

  /* ---------- A flick of the print: the neighbour it's heading for leans in with it ---------- */
  const lead = (dx: number) => {
    const k = uiScale();
    const p = Math.min(1, Math.abs(dx) / (FLICK * k));
    next.style.translate = dx < 0 ? `${58 - 12 * p}% -50%` : '';
    prev.style.translate = dx > 0 ? `${-58 + 12 * p}% -50%` : '';
  };
  print.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || moving || closing || list.length < 2 || e.pointerType === 'touch') return;
    drag = { id: e.pointerId, x: e.clientX, t: performance.now(), dx: 0, v: 0 };
    print.setPointerCapture(e.pointerId);
  });
  print.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    const dx = e.clientX - drag.x;
    if (!sheet.classList.contains('is-dragging')) {
      if (Math.abs(dx) < 4) return;
      sheet.classList.add('is-dragging');
      leanTo(0, 0);
    }
    drag.v = (dx - drag.dx) / Math.max(1, now - drag.t);
    drag.dx = dx;
    drag.t = now;
    if (reduced()) return;
    print.style.translate = `${dx.toFixed(1)}px 0`;
    print.style.rotate = `${(-1.5 + dx * 0.02).toFixed(2)}deg`;
    lead(dx);
  });
  const release = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx } = drag;
    // How fast it was going as it was let go (nothing, if the hand had stopped).
    const v = performance.now() - drag.t > 80 ? 0 : drag.v;
    drag = null;
    const was = sheet.classList.contains('is-dragging');
    sheet.classList.remove('is-dragging');
    next.style.removeProperty('translate');
    prev.style.removeProperty('translate');
    if (!was) return;
    const flicked = Math.abs(dx) > FLICK * uiScale() || Math.abs(v) > FLICK_SPEED * uiScale();
    if (flicked && go(dx < 0 ? 1 : -1, reduced() ? 0 : dx)) return;
    // Not far enough: it springs back into the hand.
    const turned = print.style.rotate;
    print.style.removeProperty('translate');
    print.style.removeProperty('rotate');
    if (!reduced() && turned) {
      print.animate([{ translate: `${dx.toFixed(1)}px 0`, rotate: turned }, { translate: '0 0', rotate: '-1.5deg' }], { duration: 360, easing: 'cubic-bezier(0.2, 1.3, 0.35, 1)' });
    }
  };
  print.addEventListener('pointerup', release);
  print.addEventListener('pointercancel', release);
  // The pointer lost without a release (the browser took it back): the same as letting go where it was.
  print.addEventListener('lostpointercapture', release);
  // A flick cut short by the sheet closing under it: the print goes back into the hand, the neighbours to their places.
  function dropDrag() {
    if (!drag) return;
    drag = null;
    sheet?.classList.remove('is-dragging');
    next.style.removeProperty('translate');
    prev.style.removeProperty('translate');
    print.style.removeProperty('translate');
    print.style.removeProperty('rotate');
  }
  print.addEventListener('dragstart', (e) => e.preventDefault());

  // A sideways swipe on a trackpad: once it's gone far enough, on to the next, and then it waits out the swipe's run-on.
  let swept = 0;
  let sweptAt = 0;
  let rest = 0;
  sheet.addEventListener(
    'wheel',
    (e) => {
      if (sheet.hidden || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < rest) return;
      if (now - sweptAt > 200) swept = 0;
      sweptAt = now;
      swept += e.deltaX * (e.deltaMode === 1 ? 16 : 1);
      if (Math.abs(swept) < SWIPE) return;
      go(swept > 0 ? 1 : -1);
      swept = 0;
      rest = now + SWIPE_REST;
    },
    { passive: false },
  );

  // A creator's name, in any roster on the page.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element | null)?.closest?.('.ccc__name a');
    const card = link?.closest<HTMLElement>('[data-roster-card]');
    const grid = card?.closest<HTMLElement>('[data-roster-grid]');
    if (!card || !grid) return;
    e.preventDefault();
    const cards = [...grid.querySelectorAll<HTMLElement>('[data-roster-card]')].filter((c) => !c.hidden);
    open(cards.map(fromCard), cards.indexOf(card), () => card.querySelector<HTMLElement>('.ccc__photo')?.getBoundingClientRect() ?? null);
  });

  // "Get to know them": everyone picked.
  const meet = (from: DOMRect | null) => {
    const picked = listOf('creators');
    if (!picked.length) return;
    open(picked.map(entryOf), 0, () => from);
  };
  document.addEventListener('creators:meet', (e) => meet((e as CustomEvent<{ from: DOMRect | null }>).detail?.from ?? null));
  // Any scene of its own (Stride Sport's board, Stride Podcasts' dial, Stride Speakers' line-up) opens a creator's
  // profile among others by id: `creators:open` with { ids, index, from }.
  document.addEventListener('creators:open', (e) => {
    const d = (e as CustomEvent<{ ids: string[]; index?: number; from?: DOMRect | null }>).detail;
    if (!d?.ids?.length) return;
    open(d.ids.map((id) => entryOf({ id, label: carried.get(id)?.name ?? id })), d.index ?? 0, () => d.from ?? null);
  });
  if (new URLSearchParams(location.search).has('meet')) window.setTimeout(() => meet(null), 400);

  sheet.querySelectorAll('[data-csheet-close]').forEach((el) => el.addEventListener('click', close));
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  document.addEventListener('keydown', (e) => {
    if (sheet.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'Tab') {
      // Round and round the sheet's own controls.
      const all = focusables();
      if (!all.length) return;
      const first = all[0];
      const last = all[all.length - 1];
      const here = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (here === first || !sheet.contains(here))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (here === last || !sheet.contains(here))) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
