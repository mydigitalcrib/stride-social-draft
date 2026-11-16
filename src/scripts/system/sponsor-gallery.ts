// Behaviour for group/SponsorGallery.astro (every screen; what follows the pointer only happens with one): the pile is
// dealt onto the page, then fans out under the pointer
// and brings the event pointed at in the list to the top; the list and the pile glide to their chapter. Each chapter's
// name lights up from the left as it comes into view, its photographs develop the first time they're seen and drift at
// their own depths as the page scrolls (--p, --fill, on Lenis's own frame); a photograph leans towards the pointer under
// a glare. Pressing one lifts it off the wall into the viewer, to go through that event's pictures (the arrow keys, a
// drag or a sideways swipe; Escape, a click outside or on the photograph closes it, and it flies back to its place).
// A photograph is only swapped in once it's ready, so nothing flashes empty. Reduced motion: no deal, development,
// drift, lean or flight; the viewer appears and photographs change in place.
import { deskScale } from './scale';
import { REDUCED, clamp, lenis } from './env';

type Pics = { name: string; when: string; pics: { src: string; alt: string }[] };
const ready = (img: HTMLImageElement) => img.decode().catch(() => {});
const within = (ms: number, p: Promise<unknown>) => Promise.race([p.then(() => true), new Promise<boolean>((r) => window.setTimeout(() => r(false), ms))]);

export function initSponsorGallery() {
  const root = document.querySelector<HTMLElement>('[data-sgal]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const reduced = window.matchMedia(REDUCED).matches;
  const s = deskScale();

  /* ---------- The pile: dealt, then fanned ---------- */
  const hero = root.querySelector<HTMLElement>('[data-sgal-hero]');
  const pile = root.querySelector<HTMLElement>('[data-sgal-pile]');
  const prints = [...root.querySelectorAll<HTMLElement>('[data-sgal-pile-print]')];
  let dealing = false;
  const top = (id: string | null) => {
    prints.forEach((p) => p.classList.toggle('is-top', p.dataset.sgalPilePrint === id));
    pile?.classList.toggle('has-top', !!id);
  };
  pile?.addEventListener('pointerenter', () => !dealing && pile.classList.add('is-open'));
  pile?.addEventListener('pointerleave', () => {
    pile.classList.remove('is-open');
    top(null);
  });
  prints.forEach((p) => p.addEventListener('pointerenter', () => !dealing && top(p.dataset.sgalPilePrint ?? null)));
  root.querySelectorAll<HTMLAnchorElement>('[data-sgal-index]').forEach((a) => {
    a.addEventListener('pointerenter', () => top(a.dataset.sgalIndex ?? null));
    a.addEventListener('focus', () => top(a.dataset.sgalIndex ?? null));
    a.addEventListener('pointerleave', () => top(null));
    a.addEventListener('blur', () => top(null));
  });
  // Dealt one after another, the bottom one first, once their photographs are ready (or half a second, whichever
  // comes first); fanning waits until they're down.
  if (pile && prints.length && !reduced) {
    dealing = true;
    pile.classList.add('is-dealing');
    const imgs = prints.map((p) => p.querySelector('img')).filter((i): i is HTMLImageElement => !!i);
    within(500, Promise.all(imgs.map(ready))).then(() => {
      const deals = prints.map((p, k) =>
        p.animate([{ opacity: 0, transform: 'translateY(-16vh) rotate(14deg)' }, { opacity: 1, transform: 'none' }], {
          duration: 760,
          delay: k * 110,
          easing: 'cubic-bezier(0.2, 1.1, 0.3, 1)',
          fill: 'backwards',
        }),
      );
      pile.classList.remove('is-dealing');
      Promise.all(deals.map((d) => d.finished)).catch(() => {}).finally(() => {
        dealing = false;
        if (pile.matches(':hover')) pile.classList.add('is-open');
      });
    });
  }
  // The pile stops breathing once it's scrolled away.
  if (hero && pile) new IntersectionObserver(([en]) => pile.classList.toggle('is-away', !en.isIntersecting)).observe(hero);

  /* ---------- The list and the pile glide to their chapter ---------- */
  root.querySelectorAll<HTMLAnchorElement>('[data-sgal-go]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const chapter = document.getElementById(a.dataset.sgalGo ?? '');
      if (!chapter) return;
      e.preventDefault();
      const l = lenis();
      if (l && !reduced) l.scrollTo(chapter, { duration: 1.2 });
      else chapter.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      // The keyboard carries on from the chapter, and the address says where you are.
      chapter.querySelector<HTMLElement>('.sgal__name')?.focus({ preventScroll: true });
      history.replaceState(null, '', `#${chapter.id}`);
    }),
  );

  /* ---------- The chapters: the name lights up, the photographs drift ---------- */
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-sgal-chapter]')];
  if (!reduced) {
    const tick = () => {
      const vh = window.innerHeight;
      const margin = 200 * s;
      // Every chapter read first, then written (a read after a write would make the browser restyle in between).
      const rects = chapters.map((c) => c.getBoundingClientRect());
      chapters.forEach((c, i) => {
        const r = rects[i];
        if (r.bottom < -margin || r.top > vh + margin) return;
        // 0 as its top enters from below, 1 as its bottom leaves at the top.
        const p = clamp((vh - r.top) / (vh + r.height));
        c.style.setProperty('--p', p.toFixed(4));
        // The name fills from the left between the chapter's top reaching 90% and 35% of the screen.
        const f = clamp((vh * 0.9 - r.top) / (vh * 0.55));
        c.style.setProperty('--fill', `${(f * 100).toFixed(1)}%`);
        c.style.setProperty('--lit', f.toFixed(3));
      });
    };
    // On Lenis's own frame once it's running (so the drift never trails the page); the scroll event without it.
    requestAnimationFrame(() => {
      const l = lenis();
      if (l?.on) return void l.on('scroll', tick);
      let queued = false;
      window.addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          tick();
        });
      }, { passive: true });
    });
    window.addEventListener('resize', tick, { passive: true });
    tick();

    // The photographs develop the first time their chapter is a third in view, one after another, as a print comes up
    // in the tray; until then they wait undeveloped (set here, so without the script nothing is). One not ready in
    // time simply shows when it is.
    const UNDEVELOPED = `brightness(1.7) contrast(0.55) saturate(0.15) blur(${2 * s}px)`;
    const develop = (c: HTMLElement) => {
      c.querySelectorAll<HTMLImageElement>('.sgal__print-btn img').forEach((img, k) => {
        within(600, ready(img)).then((ok) => {
          img.style.removeProperty('filter');
          if (!ok || !img.naturalWidth) return;
          img.style.willChange = 'filter';
          img
            .animate([{ filter: UNDEVELOPED }, { filter: 'none' }], { duration: 1400, delay: k * 90, easing: 'ease-out', fill: 'backwards' })
            .finished.catch(() => {})
            .finally(() => img.style.removeProperty('will-change'));
        });
      });
    };
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      develop(en.target as HTMLElement);
    }), { threshold: 0.35 });
    chapters.forEach((c) => {
      // Only those still to come: a chapter already on screen (or above it) stays as it is.
      if (c.getBoundingClientRect().top < window.innerHeight * 0.65) return;
      c.querySelectorAll<HTMLImageElement>('.sgal__print-btn img').forEach((img) => (img.style.filter = UNDEVELOPED));
      io.observe(c);
    });

    // A photograph leans towards the pointer, a glare following: each eased there frame by frame (as a transform, so
    // nothing is redrawn), and back to flat when the pointer leaves it.
    type Lean = { rx: number; ry: number; gx: number; gy: number; to: [number, number, number, number]; glare: HTMLElement | null };
    const leans = new Map<HTMLElement, Lean>();
    let leanRaf = 0;
    const GX = 0.5; // where the glare rests, as a share of the photograph
    const GY = 0.3;
    const lean = () => {
      leanRaf = 0;
      leans.forEach((l, b) => {
        l.rx += (l.to[0] - l.rx) * 0.14;
        l.ry += (l.to[1] - l.ry) * 0.14;
        l.gx += (l.to[2] - l.gx) * 0.14;
        l.gy += (l.to[3] - l.gy) * 0.14;
        const still = Math.abs(l.to[0] - l.rx) < 0.01 && Math.abs(l.to[1] - l.ry) < 0.01 && Math.abs(l.to[2] - l.gx) < 0.001 && Math.abs(l.to[3] - l.gy) < 0.001;
        if (still) [l.rx, l.ry, l.gx, l.gy] = l.to;
        b.style.transform = `perspective(62.5rem) rotateX(${l.rx.toFixed(2)}deg) rotateY(${l.ry.toFixed(2)}deg)`;
        // The glare's spot is 140% by 110% of the photograph; moved by its own size, so nothing is measured.
        if (l.glare) l.glare.style.transform = `translate3d(${(((l.gx - GX) / 1.4) * 100).toFixed(1)}%, ${(((l.gy - GY) / 1.1) * 100).toFixed(1)}%, 0)`;
        if (still && !l.to[0] && !l.to[1] && l.to[2] === GX && l.to[3] === GY) leans.delete(b);
      });
      if (leans.size) leanRaf = requestAnimationFrame(lean);
    };
    const leanTo = (b: HTMLElement, to: Lean['to']) => {
      const l = leans.get(b) ?? { rx: 0, ry: 0, gx: GX, gy: GY, to, glare: b.querySelector<HTMLElement>('.sgal__glare i') };
      l.to = to;
      leans.set(b, l);
      if (!leanRaf) leanRaf = requestAnimationFrame(lean);
    };
    root.querySelectorAll<HTMLElement>('.sgal__print-btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        leanTo(b, [-ny * 8, nx * 10, 0.5 + nx * 0.9, 0.5 + ny * 0.9]);
      });
      b.addEventListener('pointerleave', () => leanTo(b, [0, 0, GX, GY]));
    });
  }

  /* ---------- A photograph, large ---------- */
  const viewer = root.querySelector<HTMLElement>('[data-sgal-viewer]');
  const back = viewer?.querySelector<HTMLElement>('.sgal__viewer-back');
  const layers = [...(viewer?.querySelectorAll<HTMLImageElement>('[data-sgal-viewer-img]') ?? [])];
  const name = viewer?.querySelector<HTMLElement>('[data-sgal-viewer-name]');
  const count = viewer?.querySelector<HTMLElement>('[data-sgal-viewer-count]');
  const closeBtn = viewer?.querySelector<HTMLButtonElement>('button.sgal__viewer-close');
  // What comes in after the photograph lands: the caption and the buttons.
  const chrome = [viewer?.querySelector<HTMLElement>('[data-sgal-caption]'), ...(viewer?.querySelectorAll<HTMLElement>('.exp-round') ?? [])].filter((x): x is HTMLElement => !!x);
  const sets = new Map<string, Pics>();
  root.querySelectorAll<HTMLScriptElement>('[data-sgal-pics]').forEach((el) => sets.set(el.dataset.sgalPics ?? '', JSON.parse(el.textContent ?? '{}')));
  const of = root.dataset.of ?? '{n} of {total}';
  let setId = '';
  let set: Pics | undefined;
  let at = 0;
  let opener: HTMLElement | null = null;
  let cur = layers[0];
  let flying = false;
  let swap = 0; // the latest change asked for (an older one, still loading, gives way to it)
  const RADIUS = 14; // the viewer's corners, px at 1920×1080
  const PRINT_RADIUS = 16;

  const caption = () => {
    if (!set) return;
    if (name) name.textContent = `${set.name} · ${set.when}`;
    if (count) count.textContent = set.pics.length > 1 ? of.replace('{n}', String(at + 1)).replace('{total}', String(set.pics.length)) : '';
  };
  // The ones either side ready before they're asked for.
  const preload = () => {
    if (!set || set.pics.length < 2) return;
    [1, -1].forEach((d) => {
      const pic = set?.pics[(at + d + (set?.pics.length ?? 0)) % (set?.pics.length ?? 1)];
      if (pic) new Image().src = pic.src;
    });
  };
  // The print on the wall that shows photograph k of this event (only the first six are on the wall).
  const printOf = (k: number) => root.querySelector<HTMLElement>(`[data-sgal-open="${CSS.escape(setId)}"][data-sgal-at="${k}"]`);
  // A print's own box on screen (its size before any turn, its centre where it is).
  type Box = { left: number; top: number; width: number; height: number };
  const boxOf = (btn: HTMLElement): Box => {
    const r = btn.getBoundingClientRect();
    const li = btn.closest<HTMLElement>('.sgal__print');
    const k = parseFloat(li ? getComputedStyle(li).scale : '') || 1;
    const w = btn.offsetWidth * k;
    const h = btn.offsetHeight * k;
    return { left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2, width: w, height: h };
  };
  // The transform and crop that put the photograph (laid out at `to`) exactly over a print (`from`): scaled until it
  // covers the print, as the print's own photograph does, then cut to it with the print's corners.
  const onto = (from: Box, to: Box, rotate = 0) => {
    const c = Math.max(from.width / to.width, from.height / to.height);
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const ix = Math.max(0, (to.width - from.width / c) / 2);
    const iy = Math.max(0, (to.height - from.height / c) / 2);
    return {
      transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${c.toFixed(4)}) rotate(${rotate.toFixed(2)}deg)`,
      clipPath: `inset(${iy.toFixed(1)}px ${ix.toFixed(1)}px round ${((PRINT_RADIUS * s) / c).toFixed(1)}px)`,
    };
  };
  // Landed: uncut, with room for its shadow.
  const landed = () => ({ transform: 'none', clipPath: `inset(${-8 * 16 * s}px round ${RADIUS * s}px)` });
  const rotationOf = (el: HTMLElement | null) => parseFloat(el ? getComputedStyle(el).rotate : '') || 0;

  // Sets photograph k on a layer, once it's decoded. A press on a print starts from the file the print already shows
  // (ready at once), and the full photograph takes its place as soon as it's in.
  const place = async (layer: HTMLImageElement, k: number, quick?: string) => {
    const pic = set?.pics[k];
    if (!pic) return;
    layer.alt = pic.alt;
    layer.dataset.at = String(k);
    layer.src = quick || pic.src;
    await ready(layer);
    if (layer.naturalHeight) layer.style.setProperty('--ar', (layer.naturalWidth / layer.naturalHeight).toFixed(4));
    if (!quick || quick === pic.src) return;
    const full = new Image();
    full.src = pic.src;
    full.decode().then(() => {
      if (layer.dataset.at === String(k) && !viewer?.hidden) layer.src = pic.src;
    }).catch(() => {});
  };

  const lock = (on: boolean) => {
    document.documentElement.style.overflow = on ? 'hidden' : '';
  };

  const open = async (id: string, k: number, from: HTMLElement) => {
    if (!viewer || flying || !viewer.hidden) return;
    set = sets.get(id);
    if (!set || !cur) return;
    setId = id;
    opener = from;
    at = k;
    const token = ++swap;
    // Where it is on the wall now, before anything moves.
    const fromBox = boxOf(from);
    const li = from.closest<HTMLElement>('.sgal__print');
    const rotate = rotationOf(li);
    const quick = from.querySelector('img')?.currentSrc;
    layers.forEach((l) => {
      l.getAnimations().forEach((a) => a.cancel());
      l.classList.remove('is-out');
      l.style.removeProperty('transform');
      l.hidden = l !== cur;
    });
    await place(cur, k, quick);
    if (token !== swap) return;
    viewer.classList.toggle('is-single', set.pics.length < 2);
    caption();
    lock(true);
    viewer.hidden = false;
    lenis()?.stop();
    closeBtn?.focus({ preventScroll: true });
    preload();
    if (reduced) return;
    // It lifts off the wall: from the print to its place, uncropping as it goes, the caption and buttons after it.
    flying = true;
    li?.classList.add('is-lifted');
    const flight = cur.animate([onto(fromBox, cur.getBoundingClientRect(), rotate), landed()], { duration: 560, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)' });
    chrome.forEach((el) => el.animate([{ opacity: 0, transform: `translateY(${8 * s}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
    cur.style.willChange = 'transform, clip-path';
    await flight.finished.catch(() => {});
    cur.style.removeProperty('will-change');
    li?.classList.remove('is-lifted');
    flying = false;
  };

  const close = async () => {
    if (!viewer || viewer.hidden || flying) return;
    swap++;
    // It goes back to its print: the one of the photograph showing, if it's on the wall, or the one that opened it.
    const land = printOf(at) ?? opener;
    const li = land?.closest<HTMLElement>('.sgal__print');
    const done = () => {
      viewer.hidden = true;
      lenis()?.start();
      land?.focus({ preventScroll: true });
    };
    if (reduced || !land || !cur) {
      lock(false);
      return done();
    }
    flying = true;
    // Where it shows now (mid-slide or mid-drag included), then where it's laid out once all that is let go.
    const was = cur.getBoundingClientRect();
    layers.forEach((l) => {
      l.getAnimations().forEach((a) => a.cancel());
      l.style.removeProperty('transform');
      if (l !== cur) l.hidden = true;
    });
    // The page gets its scrollbar back first, so the print is measured where it'll be seen.
    lock(false);
    const now = cur.getBoundingClientRect();
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    li?.classList.add('is-lifted');
    const flight = cur.animate(
      [{ transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`, clipPath: landed().clipPath }, onto(boxOf(land), now, rotationOf(li ?? null))],
      { duration: 440, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
    );
    const fades = [back, ...chrome].filter((x): x is HTMLElement => !!x).map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: el === back ? 440 : 160, easing: 'ease-out', fill: 'forwards' }));
    await flight.finished.catch(() => {});
    // Landed: the print takes over where the photograph stands (it can take the focus again once it's visible).
    li?.classList.remove('is-lifted');
    done();
    [flight, ...fades].forEach((a) => a.cancel());
    flying = false;
  };

  // The next or previous photograph: the one showing slides off one way (from wherever a drag left it), the new one
  // slides in from the other, once it's ready.
  const go = async (k: number, dir: number, from = '') => {
    if (!set || !cur || flying || set.pics.length < 2) return;
    const total = set.pics.length;
    const to = (k + total) % total;
    const token = ++swap;
    const next = layers.find((l) => l !== cur);
    if (!next) return;
    next.getAnimations().forEach((a) => a.cancel());
    next.classList.remove('is-out');
    next.hidden = true;
    await place(next, to);
    if (token !== swap) return;
    at = to;
    const out = cur;
    cur = next;
    out.classList.add('is-out');
    next.hidden = false;
    caption();
    preload();
    out.style.removeProperty('transform');
    if (reduced || !dir) {
      out.hidden = true;
      out.classList.remove('is-out');
      return;
    }
    out
      .animate([{ opacity: 1, transform: from || 'none' }, { opacity: 0, transform: `translateX(${-dir * 7}vw)` }], { duration: 240, easing: 'ease-in', fill: 'forwards' })
      .finished.then(() => {
        if (out === cur) return;
        out.getAnimations().forEach((a) => a.cancel());
        out.hidden = true;
        out.classList.remove('is-out');
      })
      .catch(() => {});
    next.animate([{ opacity: 0, transform: `translateX(${dir * 7}vw)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.2, 1, 0.3, 1)' });
  };

  root.querySelectorAll<HTMLButtonElement>('[data-sgal-open]').forEach((b) =>
    b.addEventListener('click', () => open(b.dataset.sgalOpen ?? '', Number(b.dataset.sgalAt ?? 0), b)),
  );
  viewer?.querySelectorAll('[data-sgal-close]').forEach((b) => b.addEventListener('click', close));
  viewer?.querySelector('[data-sgal-prev]')?.addEventListener('click', () => go(at - 1, -1));
  viewer?.querySelector('[data-sgal-next]')?.addEventListener('click', () => go(at + 1, 1));
  document.addEventListener('keydown', (e) => {
    if (!viewer || viewer.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(at + 1, 1);
    else if (e.key === 'ArrowLeft') go(at - 1, -1);
    else if (e.key === 'Tab') {
      // Keep the keyboard inside the viewer.
      const stops = [...viewer.querySelectorAll<HTMLElement>('button:not([tabindex="-1"])')].filter((x) => x.offsetParent);
      const i = stops.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        stops[stops.length - 1]?.focus();
      } else if (!e.shiftKey && i === stops.length - 1) {
        e.preventDefault();
        stops[0]?.focus();
      }
    }
  });

  /* ---------- Dragging the photograph, or swiping sideways ---------- */
  // It follows the hand; let go far enough (or quickly enough) and it's the next, otherwise it springs back. A press
  // that doesn't move closes the viewer, as a click on the photograph always has.
  let pressX = 0;
  let pressT = 0;
  let dragX = 0;
  let pressing = false;
  const drag = (dx: number) => `translateX(${dx.toFixed(1)}px) rotate(${(dx * 0.008).toFixed(3)}deg)`;
  layers.forEach((layer) => {
    layer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || layer !== cur || flying) return;
      e.preventDefault();
      pressing = true;
      pressX = e.clientX;
      pressT = e.timeStamp;
      dragX = 0;
      layer.setPointerCapture(e.pointerId);
      layer.getAnimations().forEach((a) => a.cancel());
    });
    layer.addEventListener('pointermove', (e) => {
      if (!pressing || layer !== cur) return;
      dragX = e.clientX - pressX;
      if (Math.abs(dragX) > 3 * s) viewer?.classList.add('is-dragging');
      if (!reduced && set && set.pics.length > 1) layer.style.transform = drag(dragX);
    });
    const release = (e: PointerEvent) => {
      if (!pressing) return;
      pressing = false;
      viewer?.classList.remove('is-dragging');
      if (Math.abs(dragX) <= 3 * s) {
        layer.style.removeProperty('transform');
        return void close();
      }
      const speed = Math.abs(dragX) / Math.max(1, e.timeStamp - pressT);
      const far = Math.abs(dragX) > layer.getBoundingClientRect().width * 0.18 || speed > 0.5 * s;
      if (far && set && set.pics.length > 1) {
        const dir = dragX < 0 ? 1 : -1;
        return void go(at + dir, dir, reduced ? '' : drag(dragX));
      }
      const from = layer.style.transform;
      layer.style.removeProperty('transform');
      if (from && !reduced) layer.animate([{ transform: from }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(0.3, 1.25, 0.45, 1)' });
    };
    layer.addEventListener('pointerup', release);
    layer.addEventListener('pointercancel', () => {
      dragX = 0;
      pressing = false;
      viewer?.classList.remove('is-dragging');
      layer.style.removeProperty('transform');
    });
  });
  // A sideways swipe on a trackpad: once it has gone far enough, the next one. One swipe is one photograph: the rest
  // of it (and its momentum, which keeps coming after the fingers lift) is let go until the wheel has been still.
  let swiped = 0;
  let lastWheel = 0;
  let swipeUsed = false;
  viewer?.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (e.timeStamp - lastWheel > 220) {
      swiped = 0;
      swipeUsed = false;
    }
    lastWheel = e.timeStamp;
    if (swipeUsed || !set || set.pics.length < 2) return;
    swiped += e.deltaX * (e.deltaMode === 1 ? 16 : 1);
    if (Math.abs(swiped) < 60 * s) return;
    const dir = swiped > 0 ? 1 : -1;
    swipeUsed = true;
    go(at + dir, dir);
  }, { passive: false });
}
