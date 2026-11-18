// "Meet our talent." on /talent (talent/RosterBrowser.astro without its tools, every screen): a contact sheet that swells
// around the pointer (on touch, around the photograph tapped; a second tap there takes the shot). The photograph under it grows and comes into colour with its name; its neighbours are eased aside
// and half in colour, the light falling off with distance; the rest stay small, in black and white. Every value glides
// to where it should be a share of the way each frame, so it never jumps. A click on a photograph adds the creator, with
// their profile (roster-finder.ts); a name opens their profile (creator-sheet.ts). The keyboard gets the same swell:
// the card in focus is the one it swells around. Still under reduced motion: the one pointed at simply comes into colour
// (RosterBrowser.astro).
import { openOnClick } from './roster-finder';
import { uiScale } from './scale';
import { reduced } from './env';

const GROW = 0.14; // how much larger the one under the pointer gets
const PUSH = 26; // px at 1920×1080 (growing with a larger screen): how far its neighbours are eased aside, at most
const REACH = 1.3; // tiles: how far the swell reaches
const FOLLOW = 0.18; // per frame (at 60 a second), the share of the way each value covers

type Tile = { el: HTMLElement; cx: number; cy: number; x: number; y: number; s: number; g: number };

export function initRosterMosaics() {
  document.querySelectorAll<HTMLElement>('[data-roster][data-glimpse]').forEach((root) => {
    const grid = root.querySelector<HTMLElement>('[data-roster-grid]');
    if (!grid || grid.dataset.mosaic) return;
    grid.dataset.mosaic = 'true';
    openOnClick(grid);

    let tiles: Tile[] = [];
    let size = 200;
    let dirty = true;
    let over = false;
    let pointed = false;
    let focused = false;
    let px = 0;
    let py = 0;
    let raf = 0;
    let last = 0;
    let aimed: HTMLElement | null = null;

    // Where each photograph sits, untransformed (its place in the grid, not where the swell has eased it).
    const measure = () => {
      dirty = false;
      const was = new Map(tiles.map((t) => [t.el, t]));
      tiles = [...grid.querySelectorAll<HTMLElement>('[data-roster-card]')]
        .filter((el) => !el.hidden)
        .map((el) => {
          const t = was.get(el);
          return { el, cx: el.offsetLeft + el.offsetWidth / 2, cy: el.offsetTop + el.offsetHeight / 2, x: t?.x ?? 0, y: t?.y ?? 0, s: t?.s ?? 1, g: t?.g ?? 1 };
        });
      size = tiles[0]?.el.offsetWidth || 200;
    };

    const aim = (el: HTMLElement | null) => {
      if (el === aimed) return;
      aimed?.classList.remove('is-aimed');
      aimed = el;
      aimed?.classList.add('is-aimed');
    };

    const frame = (now: number) => {
      raf = 0;
      if (dirty) measure();
      const dt = last ? Math.min(3, (now - last) / (1000 / 60)) : 1;
      last = now;
      const k = 1 - Math.pow(1 - FOLLOW, dt);
      const reach = size * REACH;
      const push = PUSH * uiScale();
      let moving = false;
      for (const t of tiles) {
        const dx = t.cx - px;
        const dy = t.cy - py;
        const d = Math.hypot(dx, dy);
        const mine = over && t.el === aimed;
        const f = mine ? 1 : over ? Math.exp(-(d * d) / (reach * reach)) * 0.85 : 0;
        // The one under the pointer stays where it is, full size, so its name never runs from the pointer; those
        // around it are eased away from the pointer.
        const away = mine ? 0 : f * push * Math.min(1, d / (size * 0.55));
        const tx = d > 0.5 ? (dx / d) * away : 0;
        const ty = d > 0.5 ? (dy / d) * away : 0;
        const ts = 1 + GROW * f;
        const tg = 1 - Math.min(1, f * 1.15);
        t.x += (tx - t.x) * k;
        t.y += (ty - t.y) * k;
        t.s += (ts - t.s) * k;
        t.g += (tg - t.g) * k;
        if (Math.abs(tx - t.x) + Math.abs(ty - t.y) > 0.2 || Math.abs(ts - t.s) > 0.001 || Math.abs(tg - t.g) > 0.004) moving = true;
        t.el.style.setProperty('--sx', `${t.x.toFixed(1)}px`);
        t.el.style.setProperty('--sy', `${t.y.toFixed(1)}px`);
        t.el.style.setProperty('--ss', t.s.toFixed(4));
        t.el.style.setProperty('--sg', t.g.toFixed(3));
        t.el.style.setProperty('--sz', String(Math.round(f * 10)));
      }
      if (moving || pointed) raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (raf || reduced()) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      over = pointed || focused;
      if (!over) aim(null);
      run();
    };

    grid.addEventListener('pointerenter', () => {
      pointed = true;
      dirty = true;
      sync();
    });
    grid.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return; // a finger lifting leaves the swell where it touched
      pointed = false;
      sync();
    });
    // A finger: its tap swells the sheet round the photograph it touched (it stays until another tap, or a tap
    // elsewhere); a second tap on the same photograph opens their profile (the click goes on to openOnClick).
    let aimedBefore = false;
    let byTouch = false;
    grid.addEventListener('pointerdown', (e) => {
      byTouch = e.pointerType === 'touch';
      if (!byTouch) return;
      const card = (e.target as Element).closest<HTMLElement>('[data-roster-card]');
      aimedBefore = !!card && card.classList.contains('is-aimed');
      if (!card) return;
      const b = grid.getBoundingClientRect();
      px = e.clientX - b.left;
      py = e.clientY - b.top;
      pointed = true;
      dirty = true;
      aim(card);
      sync();
    });
    grid.addEventListener('click', (e) => {
      if (!byTouch || aimedBefore || (e.target as Element).closest('a, button')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || grid.contains(e.target as Node) || !pointed) return;
      pointed = false;
      sync();
    });
    grid.addEventListener('pointermove', (e) => {
      const b = grid.getBoundingClientRect();
      px = e.clientX - b.left;
      py = e.clientY - b.top;
      // Between photographs, the last one stays aimed at (no jump across the gap).
      const card = (e.target as Element).closest<HTMLElement>('[data-roster-card]');
      if (card) aim(card);
      run();
    });
    // The keyboard: the card in focus is the one the sheet swells around.
    grid.addEventListener('focusin', (e) => {
      const card = (e.target as Element).closest<HTMLElement>('[data-roster-card]');
      if (!card) return;
      // Only the keyboard's focus (a profile closing hands focus back to its name, wherever the pointer is).
      focused = (e.target as Element).matches(':focus-visible');
      if (!focused) return sync();
      if (pointed) return;
      dirty = true;
      px = card.offsetLeft + card.offsetWidth / 2;
      py = card.offsetTop + card.offsetHeight / 2;
      aim(card);
      sync();
    });
    grid.addEventListener('focusout', (e) => {
      if (grid.contains(e.relatedTarget as Node | null)) return;
      focused = false;
      sync();
    });
    // The division picker narrows the sheet (roster-browser.ts says so with a resize): measure again.
    window.addEventListener('resize', () => {
      dirty = true;
      if (!over) tiles.forEach((t) => ['--sx', '--sy', '--ss', '--sg', '--sz'].forEach((p) => t.el.style.removeProperty(p)));
      if (!over) tiles = [];
    }, { passive: true });
  });
}
