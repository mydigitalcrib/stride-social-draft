// Behaviour for group/TeamField.astro: faces swell near the pointer, a tag names the nearest one, and filtering
// or shuffling sends the faces flying to their new places. On phones and tablets a face grows into its big card;
// on desktop it doesn't. Desktop also has: a light following the pointer over the faces; the tag gliding after the
// pointer, its name changing over; the faces arriving in a wave the first time the field comes into view; every
// change travelling outwards from where it started (a team's word, a pill, Shuffle, a filter); and the keyboard (one
// tab stop, the arrow keys between faces, Home and End; the face focused stands in for the pointer). Each face's
// place is measured when the layout changes, never per frame: a frame reads the field's position once, then writes.
import { initGrow } from './grow';
import { deskScale } from './scale';
import { desktop, lenis, reduced } from './env';

const REACH = 230; // how far the swell reaches at 1920×1080, in pixels (it grows with the screen past it)
const SWELL = 0.8;
const WAVE = 0.35; // ms of delay per pixel (at 1920×1080) from where a change starts
const WAVE_MAX = 420;

type Spot = { x: number; y: number; w: number; h: number };

function initField(root: HTMLElement) {
  const grid = root.querySelector<HTMLElement>('[data-tfield-grid]');
  const tag = root.querySelector<HTMLElement>('[data-tfield-tag]');
  const tagName = root.querySelector<HTMLElement>('[data-tfield-tag-name]');
  const tagRole = root.querySelector<HTMLElement>('[data-tfield-tag-role]');
  const light = root.querySelector<HTMLElement>('[data-tfield-light]');
  if (!grid) return;
  const faces = [...grid.querySelectorAll<HTMLElement>(':scope > li')];
  const linkOf = (f: HTMLElement) => f.firstElementChild as HTMLElement;
  const desk = desktop();
  // Desktop: no card to grow into (the owner's call, 2026-11-11). A face is a picture, named by the tag beside the
  // pointer, with nothing to press. Other screens keep the card: there, no pointer names anyone.
  if (desk) {
    grid.querySelectorAll<HTMLElement>('[data-grow-card]').forEach((face) => {
      face.removeAttribute('href');
      face.removeAttribute('data-grow-card');
      face.setAttribute('role', 'img');
    });
  }
  const grow = initGrow(root);
  // Clicking the dimmed field puts the card away.
  root.addEventListener('click', (e) => {
    if (root.classList.contains('has-big-card') && !(e.target as HTMLElement).closest('[data-grow-card], .bigcard')) grow.close();
  });

  /* ---------- Where each face is, within the field ---------- */
  const spots = new Map<HTMLElement, Spot>();
  const measure = () => {
    spots.clear();
    // The faces' own box is the field once it's positioned (desktop); otherwise both are placed in the same box.
    const ox = faces[0]?.offsetParent === grid ? 0 : grid.offsetLeft;
    const oy = faces[0]?.offsetParent === grid ? 0 : grid.offsetTop;
    faces.forEach((f) => {
      if (f.hidden) return;
      spots.set(f, { x: f.offsetLeft - ox + f.offsetWidth / 2, y: f.offsetTop - oy + f.offsetHeight / 2, w: f.offsetWidth, h: f.offsetHeight });
    });
  };
  measure();
  new ResizeObserver(measure).observe(grid);
  // How long a face waits for a change that starts at (x, y): the further away, the later, up to WAVE_MAX.
  const waveFrom = (x: number, y: number) => {
    const s = deskScale();
    return (f: HTMLElement) => {
      const p = spots.get(f);
      return p ? Math.min(WAVE_MAX, (Math.hypot(p.x - x, p.y - y) / s) * WAVE) : 0;
    };
  };
  // A control's centre, within the field.
  const centreOf = (el: Element) => {
    const g = grid.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - g.left, y: r.top + r.height / 2 - g.top };
  };

  /* ---------- The swell, the light and the tag ---------- */
  let clientX = 0;
  let clientY = 0;
  let focusFace: HTMLElement | null = null; // the face the keyboard is on (it stands in for the pointer)
  let over = false;
  let swelled = new Set<HTMLElement>();
  let named: HTMLElement | null = null;
  let tagX = 0;
  let tagY = 0;
  let toX = 0;
  let toY = 0;
  let snapTag = true;
  // The tag's size, kept as its name changes (read after layout, so a frame never measures what it just wrote).
  let tagSize: [number, number] = [0, 0];
  if (tag) {
    new ResizeObserver(() => {
      tagSize = [tag.offsetWidth, tag.offsetHeight];
      if (over) kick();
    }).observe(tag);
  }
  const swell = () => {
    const still = reduced();
    const s = deskScale();
    const reach = REACH * s;
    const g = grid.getBoundingClientRect();
    const f0 = focusFace && spots.get(focusFace);
    const px = f0 ? f0.x : clientX - g.left;
    const py = f0 ? f0.y : clientY - g.top;
    let best = Infinity;
    let nearest: HTMLElement | null = null;
    const now = new Set<HTMLElement>();
    spots.forEach((p, f) => {
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < best) {
        best = d;
        nearest = f;
      }
      if (still || d >= reach) return;
      const k = 1 - d / reach;
      const sc = 1 + SWELL * k * k;
      linkOf(f).style.setProperty('--s', sc.toFixed(3));
      f.style.zIndex = String(Math.round(sc * 10));
      now.add(f);
    });
    // Only the faces that swelled last frame and no longer do are put back.
    swelled.forEach((f) => {
      if (now.has(f)) return;
      linkOf(f).style.setProperty('--s', '1');
      f.style.removeProperty('z-index');
    });
    swelled = now;
    if (nearest) rename(nearest);
    // The soft light over the faces (desktop): its box starts 3.75rem out from the field.
    if (light && !still) {
      const edge = 60 * s;
      light.style.transform = `translate3d(${(px + edge).toFixed(1)}px, ${(py + edge).toFixed(1)}px, 0)`;
    }
    // The tag sits beside the pointer (or the face), on the side with room, and never off the screen.
    if (tag) {
      const [w, h] = tagSize;
      const x = g.left + px;
      const y = g.top + py;
      const gap = 22 * s;
      const drop = 18 * s;
      toX = x + gap + w > window.innerWidth ? x - w - gap : x + gap;
      toY = y + drop + h > window.innerHeight - 8 ? y - h - drop : y + drop;
      toX = Math.max(8, Math.min(window.innerWidth - w - 8, toX));
      toY = Math.max(8, toY);
    }
  };

  // One frame loop: the swell when the pointer (or the page) has moved, then the tag easing after it.
  let raf = 0;
  let dirty = false;
  const frame = () => {
    raf = 0;
    if (dirty) {
      dirty = false;
      swell();
    }
    if (!tag) return;
    if (snapTag || reduced()) {
      tagX = toX;
      tagY = toY;
      snapTag = false;
    } else {
      tagX += (toX - tagX) * 0.3;
      tagY += (toY - tagY) * 0.3;
      if (Math.abs(toX - tagX) < 0.3 && Math.abs(toY - tagY) < 0.3) {
        tagX = toX;
        tagY = toY;
      }
    }
    tag.style.transform = `translate3d(${tagX.toFixed(1)}px, ${tagY.toFixed(1)}px, 0)`;
    if (tagX !== toX || tagY !== toY) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    dirty = true;
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const enter = () => {
    if (over) return;
    over = true;
    snapTag = true; // it appears where it belongs, then follows
    root.classList.add('is-over');
  };
  const rest = () => {
    over = false;
    root.classList.remove('is-over');
    swelled.forEach((f) => {
      linkOf(f).style.setProperty('--s', '1');
      f.style.removeProperty('z-index');
    });
    swelled.clear();
  };

  // The name changes over: the old one rises away, the new one rises in (the latest, however quickly it's moved).
  let shown: HTMLElement | null = null;
  let busy = false;
  const parts = [tagName, tagRole].filter((p): p is HTMLElement => !!p);
  const write = (f: HTMLElement) => {
    shown = f;
    if (tagName) tagName.textContent = f.dataset.name ?? '';
    if (tagRole) tagRole.textContent = f.dataset.role ?? '';
  };
  function rename(f: HTMLElement) {
    named = f;
    if (named === shown || busy) return;
    if (reduced() || !shown || !parts.length) return write(named);
    busy = true;
    const d = 6 * deskScale();
    const out = parts.map((p) => p.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${-d}px)` }], { duration: 120, easing: 'ease-in', fill: 'forwards' }));
    out[0].finished
      .then(() => {
        if (named) write(named);
        out.forEach((a) => a.cancel());
        const ins = parts.map((p) => p.animate([{ opacity: 0, transform: `translateY(${d}px)` }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }));
        return ins[0].finished;
      })
      .then(() => {
        busy = false;
        if (named) rename(named);
      })
      .catch(() => (busy = false));
  }

  grid.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      clientX = e.clientX;
      clientY = e.clientY;
      focusFace = null;
      enter();
      kick();
    },
    { passive: true },
  );
  grid.addEventListener('pointerleave', () => {
    // The keyboard is still on a face: it takes the tag back.
    const active = document.activeElement?.closest<HTMLElement>('.tface');
    if (active && grid.contains(active) && linkOf(active).matches(':focus-visible')) {
      focusFace = active;
      kick();
    } else rest();
  }, { passive: true });
  grid.addEventListener('click', rest);
  // The page scrolling under a still pointer moves the faces under it: swell again (Lenis's frame, once it runs).
  const onScroll = () => over && kick();
  requestAnimationFrame(() => {
    const l = lenis();
    if (l?.on) l.on('scroll', onScroll);
    else window.addEventListener('scroll', onScroll, { passive: true });
  });

  /* ---------- Faces flying to new places ---------- */
  // Where each face is on screen at the moment of a change (mid-flight included, so a change in the middle of
  // another carries on from there), and where the change started.
  let before = new Map<HTMLElement, { x: number; y: number }>();
  let origin: { x: number; y: number } | null = null;
  const snapshot = (source?: Element | null) => {
    const g = grid.getBoundingClientRect();
    before = new Map();
    faces.forEach((f) => {
      if (f.hidden) return;
      const r = f.getBoundingClientRect();
      before.set(f, { x: r.left - g.left, y: r.top - g.top });
    });
    faces.forEach((f) => f.getAnimations().forEach((a) => a.cancel()));
    origin = source && desk ? centreOf(source) : null;
  };
  const fly = () => {
    const had = before;
    before = new Map();
    measure();
    if (!had.size) return;
    const g = grid.getBoundingClientRect();
    const delay = origin ? waveFrom(origin.x, origin.y) : () => 0;
    origin = null;
    if (!reduced()) {
      // All the new places read first, then all the flights started (no reading between writes).
      const after = faces.filter((f) => !f.hidden).map((f) => [f, f.getBoundingClientRect()] as const);
      after.forEach(([f, r]) => {
        const was = had.get(f);
        f.animate(
          was
            ? [{ transform: `translate(${was.x - (r.left - g.left)}px, ${was.y - (r.top - g.top)}px)` }, { transform: 'none' }]
            : [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }],
          // Each in its turn, holding its old place until then.
          { duration: 620, delay: delay(f), easing: 'cubic-bezier(0.2, 1.15, 0.3, 1)', fill: 'backwards' },
        );
      });
    }
    rove();
    if (over) kick();
  };
  // A filter (archive-filter.ts) shows and hides faces: taken just before it does, from the chip pressed.
  root.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('[data-filter-group] [data-value]');
    if (chip) snapshot(chip);
  }, true);
  let waiting = false;
  new MutationObserver(() => {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(() => {
      waiting = false;
      fly();
    });
  }).observe(grid, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  // Stepping back (or forward) from a control outwards: each face's delay, for its own transition.
  const ripple = (source: Element) => {
    if (!desk) return;
    const { x, y } = centreOf(source);
    const delay = waveFrom(x, y);
    faces.forEach((f) => f.style.setProperty('--wd', `${delay(f).toFixed(0)}ms`));
  };

  /* ---------- Who you'd work with: they light up and move to the front ---------- */
  const needs = [...root.querySelectorAll<HTMLButtonElement>('[data-tfield-need]')];
  needs.forEach((b) =>
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      needs.forEach((x) => x.setAttribute('aria-pressed', String(on && x === b)));
      const teams = on ? (b.dataset.tfieldNeed ?? '').split(' ') : [];
      snapshot(b);
      ripple(b);
      const lit = (f: HTMLElement) => teams.includes(f.dataset.filterDepartment ?? '');
      faces.forEach((f) => {
        f.classList.toggle('is-lit', on && lit(f));
        f.classList.toggle('is-dim', on && !lit(f));
      });
      (on ? [...faces.filter(lit), ...faces.filter((f) => !lit(f))] : faces).forEach((f) => grid.append(f));
      fly();
    }),
  );

  /* ---------- Desktop: pointing at a team (or focusing it) lights its people, and the rest step back ---------- */
  if (desk) {
    const teams = [...root.querySelectorAll<HTMLButtonElement>('[data-filter-group="department"] [data-value]')];
    let intent = 0;
    const clear = () => {
      window.clearTimeout(intent);
      faces.forEach((f) => f.classList.remove('is-shade'));
    };
    const preview = (b: HTMLButtonElement) => {
      const team = b.dataset.value;
      if (!team || team === 'all') return clear();
      ripple(b);
      faces.forEach((f) => f.classList.toggle('is-shade', f.dataset.filterDepartment !== team));
    };
    // A short pause before either, so sweeping across the words goes from one team to the next without the whole
    // field flickering back in between.
    const soon = (fn: () => void) => {
      window.clearTimeout(intent);
      intent = window.setTimeout(fn, 70);
    };
    teams.forEach((b) => {
      b.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && soon(() => preview(b)));
      b.addEventListener('pointerleave', () => soon(clear));
      b.addEventListener('focus', () => b.matches(':focus-visible') && preview(b));
      b.addEventListener('blur', clear);
      b.addEventListener('click', clear);
    });
  }

  root.querySelector('[data-tfield-shuffle]')?.addEventListener('click', (e) => {
    snapshot(e.currentTarget as Element);
    const order = [...faces];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((f) => grid.append(f));
    fly();
  });

  /* ---------- Desktop: the keyboard on the faces ---------- */
  // One tab stop for the whole field; the arrow keys go to the nearest face that way, Home and End to the first
  // and the last. The face focused swells and is named, as the pointer's would be.
  function rove(to?: HTMLElement) {
    if (!desk) return;
    const shownFaces = faces.filter((f) => !f.hidden);
    const keep = to ?? shownFaces.find((f) => linkOf(f).tabIndex === 0) ?? shownFaces[0];
    faces.forEach((f) => (linkOf(f).tabIndex = f === keep && !f.hidden ? 0 : -1));
  }
  if (desk) {
    rove(faces.find((f) => !f.hidden));
    const ways: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const next = (from: HTMLElement, key: string) => {
      const shownFaces = faces.filter((f) => !f.hidden);
      if (key === 'Home') return shownFaces[0];
      if (key === 'End') return shownFaces[shownFaces.length - 1];
      const way = ways[key];
      const a = spots.get(from);
      if (!way || !a) return null;
      let best: HTMLElement | null = null;
      let score = Infinity;
      spots.forEach((b, f) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const along = dx * way[0] + dy * way[1];
        if (f === from || along < 1) return;
        const sc = along + 2 * Math.abs(dx * way[1] + dy * way[0]);
        if (sc < score) {
          score = sc;
          best = f;
        }
      });
      return best;
    };
    grid.addEventListener('keydown', (e) => {
      const from = (e.target as HTMLElement).closest<HTMLElement>('.tface');
      if (!from || !(ways[e.key] || e.key === 'Home' || e.key === 'End')) return;
      e.preventDefault();
      const to = next(from, e.key);
      if (!to) return;
      rove(to);
      linkOf(to).focus();
    });
    grid.addEventListener('focusin', (e) => {
      const f = (e.target as HTMLElement).closest<HTMLElement>('.tface');
      if (!f) return;
      rove(f);
      if (!linkOf(f).matches(':focus-visible')) return;
      focusFace = f;
      enter();
      kick();
    });
    grid.addEventListener('focusout', (e) => {
      if (grid.contains(e.relatedTarget as Node)) return;
      focusFace = null;
      rest();
    });
  }

  /* ---------- Desktop: the faces arrive in a wave, the first time the field comes into view ---------- */
  if (desk && !reduced() && 'IntersectionObserver' in window) {
    const r = grid.getBoundingClientRect();
    // Already scrolled past it (a reload further down the page): nothing to arrive.
    if (r.bottom > 0) {
      const arrive = () => {
        root.classList.remove('is-waiting');
        const lead = faces.find((f) => !f.hidden && f.classList.contains('tface--lead')) ?? faces.find((f) => !f.hidden);
        const from = lead && spots.get(lead);
        if (!from) return;
        const delay = waveFrom(from.x, from.y);
        const lift = 16 * deskScale();
        faces.forEach((f) => {
          if (f.hidden) return;
          f.animate([{ opacity: 0, transform: `translateY(${lift}px) scale(0.94)` }, { opacity: 1, transform: 'none' }], {
            duration: 560,
            delay: delay(f),
            easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
            fill: 'backwards',
          });
        });
      };
      if (r.top < window.innerHeight * 0.85) arrive();
      else {
        root.classList.add('is-waiting');
        const io = new IntersectionObserver((entries) => {
          if (!entries.some((en) => en.isIntersecting)) return;
          io.disconnect();
          arrive();
        }, { rootMargin: '0px 0px -15% 0px' });
        io.observe(grid);
      }
    }
  }
}

export function initTeamFields() {
  document.querySelectorAll<HTMLElement>('[data-tfield]').forEach((root) => {
    if (root.dataset.tfieldReady) return;
    root.dataset.tfieldReady = 'true';
    initField(root);
  });
}
