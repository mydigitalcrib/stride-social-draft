// Stride Talent's deck (components/experience/Deck.astro, variant "lineup", every screen; a tap chooses on touch): its
// cards stand in an
// row in black and white. Moving along it, the one nearest the pointer steps forward in colour and the rest lean
// away. Keyboard focus does the same. Cards walk on from the wing. With quotes (creator stories), the chosen one's
// words are written large beside the posters ([data-lineup-said]), changing with it.
// The pointer is read once a frame against the row's layout, measured when the pointer arrives (and again only after a
// scroll or a resize), so following it never forces the page to lay itself out mid-move.
import { firstView, preload, slidePill } from './deck-parts';
import { trayUp } from './shortlist';
import { reduced } from './env';

export function initLineup(root: HTMLElement, tabs: HTMLButtonElement[], panels: HTMLElement[]) {
  const pill = slidePill(root, tabs);
  preload(root);

  const said = root.querySelector<HTMLElement>('[data-lineup-said]');
  const saidText = said?.querySelector<HTMLElement>('.deck__said-text');
  const saidWho = said?.querySelector<HTMLElement>('.deck__said-who');
  // The words come in one after another, as captions do; who said them after.
  const say = (li: HTMLElement) => {
    if (!said || !saidText || !saidWho || !li.dataset.quote) return;
    saidText.textContent = '';
    li.dataset.quote.split(/\s+/).forEach((word, i) => {
      const w = document.createElement('span');
      w.className = 'deck__said-word';
      w.style.setProperty('--w', String(i));
      w.textContent = word;
      saidText.append(w, ' ');
    });
    saidWho.textContent = li.dataset.who ?? '';
    saidWho.style.setProperty('--w', String(li.dataset.quote.split(/\s+/).length));
    // The same element each time: its entrance is started again.
    saidWho.style.animation = 'none';
    void saidWho.offsetWidth;
    saidWho.style.removeProperty('animation');
  };

  const rows = panels.map((panel) => {
    const row = panel.querySelector<HTMLElement>('.deck__cards')!;
    const items = [...row.querySelectorAll<HTMLElement>(':scope > li')];
    let at = -1;
    const focus = (i: number) => {
      if (i === at) return;
      at = i;
      items.forEach((li, n) => {
        li.style.setProperty('--d', String(n - i));
        li.style.setProperty('--a', String(Math.abs(n - i)));
        li.classList.toggle('is-open', n === i);
      });
      if (items[i]) say(items[i]);
    };
    // Where the row and its posters are laid out (their own lean and lift aside): measured on arrival, then only again
    // after a scroll or a resize.
    let layout: { box: DOMRect; slots: { x: number; y: number; w: number; h: number }[] } | null = null;
    const measure = () => {
      const box = row.getBoundingClientRect();
      layout = { box, slots: items.map((li) => ({ x: li.offsetLeft, y: li.offsetTop, w: li.offsetWidth, h: li.offsetHeight })) };
      return layout;
    };
    const stale = () => (layout = null);
    new ResizeObserver(stale).observe(row);
    window.addEventListener('scroll', stale, { passive: true });

    // The chosen poster leans towards the pointer, a glare crossing it (--tx, --ty, --gx, --gy: Deck.astro).
    const lean = (x: number, y: number, box: DOMRect, slot: { x: number; y: number; w: number; h: number }) => {
      const card = items[at]?.querySelector<HTMLElement>('.deck__card');
      if (!card || reduced()) return;
      const nx = Math.max(-1, Math.min(1, (x - (box.left + slot.x + slot.w / 2)) / (slot.w / 2)));
      const ny = Math.max(-1, Math.min(1, (y - (box.top + slot.y + slot.h / 2)) / (slot.h / 2)));
      items.forEach((li) => li !== items[at] && li.querySelector<HTMLElement>('.deck__card')?.style.removeProperty('--tx'));
      card.style.setProperty('--tx', `${(nx * 9).toFixed(2)}deg`);
      card.style.setProperty('--ty', `${(-ny * 6).toFixed(2)}deg`);
      card.style.setProperty('--gx', `${(50 + nx * 50).toFixed(1)}%`);
      card.style.setProperty('--gy', `${(50 + ny * 50).toFixed(1)}%`);
    };
    let px = 0;
    let py = 0;
    let queued = 0;
    const follow = () => {
      queued = 0;
      const { box, slots } = layout ?? measure();
      const first = slots[0];
      const step = (box.width - first.w) / (items.length - 1);
      const i = Math.max(0, Math.min(items.length - 1, Math.round((px - box.left - first.w / 2) / step)));
      focus(i);
      lean(px, py, box, slots[i]);
    };
    row.addEventListener('pointerenter', stale);
    row.addEventListener('pointermove', (e) => {
      if (items.length < 2) return;
      px = e.clientX;
      py = e.clientY;
      if (!queued) queued = requestAnimationFrame(follow);
    });
    row.addEventListener('pointerleave', () => {
      cancelAnimationFrame(queued);
      queued = 0;
      items.forEach((li) => {
        const card = li.querySelector<HTMLElement>('.deck__card');
        ['--tx', '--ty', '--gx', '--gy'].forEach((p) => card?.style.removeProperty(p));
      });
    });
    items.forEach((li, n) => li.addEventListener('focusin', () => focus(n)));
    // A finger has no pointing: a tap chooses a poster, and a tap on the chosen one opens it (grow.ts).
    items.forEach((li, n) =>
      li.addEventListener(
        'click',
        (e) => {
          if (n === at) return;
          e.preventDefault();
          e.stopPropagation();
          focus(n);
        },
        true,
      ),
    );
    focus(Math.floor((items.length - 1) / 2));
    return { items };
  });

  const walkOn = (i: number) => {
    if (reduced()) return;
    rows[i].items.forEach((li, n) => {
      li.animate([{ translate: '-110vw 0', opacity: 0 }, { opacity: 1, offset: 0.2 }, { translate: '0 0', opacity: 1 }], {
        duration: 760,
        delay: (rows[i].items.length - 1 - n) * 42,
        easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)',
        fill: 'backwards',
      });
    });
  };
  const current = () => Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  firstView(root, () => walkOn(current()));

  // The shortlist's tray rises while the tabs it would cover are on screen (not for creator stories, which have no
  // tabs there now: it would only cover the posters).
  const bar = root.querySelector('.deck__bar');
  const tray = document.querySelector<HTMLElement>('.tray[data-tray="creators"]');
  if (bar && tray && !root.classList.contains('deck--said')) new IntersectionObserver((e) => trayUp(tray, root, e[e.length - 1].isIntersecting)).observe(bar);

  return (i: number) => {
    pill();
    walkOn(i);
  };
}
