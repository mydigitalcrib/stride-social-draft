// Behaviour for the list view of experience/WorkCanvas.astro (Our Work, desktop). The picture of the line under the
// pointer floats beside it, following a little behind and leaning the way it's carried; with the keyboard, it sits
// beside the focused line. From one line to the next, the new picture wipes in over the last from the side the pointer
// came from (from below, going down the list). A press opens that case study over the page, the picture growing into
// it (work-preview.ts); a modified click still opens its page. Without this the list is plain links.
// On a screen larger than 1920×1080 its distances grow with the root size, as the picture does (scale.ts).

import { deskScale } from './scale';
import type { Rect } from './work-preview';
import { clamp, reduced } from './env';

const FOLLOW = 0.16; // per frame (at 60 a second), the share of the way to the pointer the picture covers
const LEAN = 0.07; // degrees it leans for each px it's behind (at 1920×1080)
const LEAN_MAX = 9;
const WIPE_MS = 420; // a new picture wiping in over the last
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function initWorkList(root: HTMLElement, opts: { src(key: string): string; open(key: string, from: Rect | null): void }) {
  const list = root.querySelector<HTMLElement>('[data-canvas-list]');
  const peek = root.querySelector<HTMLElement>('[data-canvas-peek]');
  const img = peek?.querySelector('img');
  if (!list || !peek || !img) return;
  const rows = [...list.querySelectorAll<HTMLElement>('[data-canvas-row]')];

  let key = ''; // whose picture is in it
  let order = -1; // where that line is in the list
  let shown = img; // the picture on top
  let wiping = 0; // the latest wipe (an older one that hasn't begun gives way to it)
  let on = false;
  let raf = 0;
  let last = 0;
  let x = 0; // where it is...
  let y = 0;
  let tx = 0; // ...and where it's going
  let ty = 0;
  const pointer = { x: 0, y: 0, in: false };

  const place = () => {
    peek.style.setProperty('--px', `${x.toFixed(1)}px`);
    peek.style.setProperty('--py', `${y.toFixed(1)}px`);
    peek.style.setProperty('--pr', `${(reduced() ? 0 : clamp(((tx - x) * LEAN) / deskScale(), -LEAN_MAX, LEAN_MAX)).toFixed(2)}deg`);
  };
  const frame = (now: number) => {
    raf = 0;
    const dt = last ? clamp((now - last) / (1000 / 60), 0.25, 3) : 1;
    last = now;
    const k = reduced() ? 1 : 1 - Math.pow(1 - FOLLOW, dt);
    x += (tx - x) * k;
    y += (ty - y) * k;
    place();
    if (on || Math.abs(tx - x) + Math.abs(ty - y) > 0.3) raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };

  // Beside a point on the screen: a little to its right and above the line it's on (below it near the top, where
  // there's no room above), so the picked line itself is never covered; and never off the section.
  const aim = (sx: number, sy: number) => {
    const s = deskScale();
    const box = root.getBoundingClientRect();
    const w = peek.offsetWidth;
    const h = peek.offsetHeight;
    const above = sy - box.top - h - 46 * s;
    tx = clamp(sx - box.left + 28 * s, box.width * 0.3, box.width - w - 24 * s);
    ty = clamp(above >= 16 * s ? above : sy - box.top + 52 * s, 16 * s, box.height - h - 16 * s);
  };

  // The next line's picture, over the last: decoded first, then wiped in, settling as it does; the last goes after.
  const wipe = (src: string, down: boolean, want: string) => {
    const layer = shown.cloneNode(false) as HTMLImageElement;
    layer.src = src;
    const n = ++wiping;
    void layer
      .decode()
      .catch(() => {})
      .then(() => {
        if (key !== want || n !== wiping) return;
        shown.after(layer);
        shown = layer;
        layer
          .animate([{ clipPath: down ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)', scale: 1.06 }, { clipPath: 'inset(0 0 0 0)', scale: 1 }], { duration: WIPE_MS, easing: EASE })
          .finished.catch(() => undefined)
          .then(() => {
            if (shown === layer) peek.querySelectorAll('img').forEach((el) => el !== layer && el.remove());
          });
      });
  };

  const show = (row: HTMLElement) => {
    const next = row.dataset.canvasRow ?? '';
    if (next !== key) {
      const at = rows.indexOf(row);
      const down = at > order;
      key = next;
      order = at;
      const src = opts.src(next);
      if (src && on && !reduced() && shown.classList.contains('is-in')) wipe(src, down, next);
      else {
        wiping++;
        shown.classList.remove('is-in');
        if (src) {
          shown.src = src;
          const pic = shown;
          pic
            .decode()
            .catch(() => {})
            .then(() => key === next && pic.classList.add('is-in'));
        }
      }
    }
    if (!on) {
      on = true;
      // It appears where it belongs, rather than flying in from where it last was.
      x = tx;
      y = ty;
      place();
      peek.classList.add('is-on');
    }
    run();
  };
  const hide = () => {
    on = false;
    peek.classList.remove('is-on');
  };
  const rowAt = (sx: number, sy: number) => (document.elementFromPoint(sx, sy) as HTMLElement | null)?.closest<HTMLElement>('[data-canvas-row]') ?? null;

  list.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.in = true;
    aim(e.clientX, e.clientY);
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-canvas-row]');
    if (row) show(row);
    else hide();
  });
  list.addEventListener('pointerleave', () => {
    pointer.in = false;
    hide();
  });
  // Scrolled under a still pointer, the line there changes.
  list.addEventListener(
    'scroll',
    () => {
      if (!pointer.in) return;
      const row = rowAt(pointer.x, pointer.y);
      if (row) show(row);
      else hide();
    },
    { passive: true },
  );
  // The keyboard: beside the focused line, towards its right end.
  list.addEventListener('focusin', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-canvas-row]');
    if (!row || !row.matches(':focus-visible')) return;
    const r = row.getBoundingClientRect();
    aim(r.right - peek.offsetWidth - 160 * deskScale(), r.top + r.height / 2);
    show(row);
  });
  list.addEventListener('focusout', () => {
    if (!pointer.in) hide();
  });

  // A press opens it over the page, from the floating picture, turned as it is (a modified click opens its page, as a
  // link does).
  list.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-canvas-row]');
    if (!row || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    let from: Rect | null = null;
    if (on) {
      const box = peek.getBoundingClientRect();
      const width = peek.offsetWidth;
      const height = peek.offsetHeight;
      from = {
        left: box.left + box.width / 2 - width / 2,
        top: box.top + box.height / 2 - height / 2,
        width,
        height,
        rotate: parseFloat(peek.style.getPropertyValue('--pr')) || 0,
        radius: parseFloat(getComputedStyle(peek).borderTopLeftRadius) || 0,
      };
    }
    hide();
    opts.open(row.dataset.canvasRow ?? '', from);
  });
}
