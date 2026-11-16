// Behaviour for group/Headlines.astro. On desktop the picture of the headline under the pointer floats in the free
// space to the right of the list, following up and down with a little lag and a lean in the direction of travel.
// Moving to another headline turns it like a stack of prints: the new picture rises over the old one from the side
// you're heading for (from below going down the list) while the old one sinks back, and the frame kicks a little that
// way. Tabbing through the headlines shows their pictures too, and a scroll under a still pointer moves the picture to
// the headline that's now under it. Pictures are fetched ahead (the headlines in view, then each one's neighbours)
// and swapped only once decoded, so none pops in late. With reduced motion, a plain crossfade.
// Also here, on every screen: the headlines rearranging as the filters change, the time slider charting each read against
// your time while it's worked, and the topics filling with light when chosen; and on touch, the headline in the middle
// of the screen lit (the rest in outline), as the one pointed at is with a mouse.
import { uiScale } from './scale';
import { desktop, reduced } from './env';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function initList(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('[data-heads-list]');
  const float = root.querySelector<HTMLElement>('[data-heads-float]');
  const a = root.querySelector<HTMLImageElement>('[data-heads-a]');
  const b = root.querySelector<HTMLImageElement>('[data-heads-b]');
  if (!list || !float || !a || !b || !desktop()) return;
  let front = a;
  let back = b;
  let current: HTMLElement | null = null; // the headline whose picture is out, or on its way
  let wanted = '';
  let token = 0;
  let settle: (() => void) | null = null; // ends the turn in progress at once
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let kick = 0;
  let raf = 0;
  let over = false; // the picture is out
  let inside = false; // the pointer is over the list
  let byKeys = false; // the picture follows the focused headline rather than the pointer
  let px = 0;
  let py = 0;
  let box = { w: 0, h: 0, right: 0 };
  let stale = true;
  const fetched = new Set<string>();

  // The frame's size and the list's right edge change only with the window, so they're read once, not per move.
  const measure = () => {
    stale = false;
    box = { w: float.offsetWidth, h: float.offsetHeight, right: list.getBoundingClientRect().right };
  };
  window.addEventListener('resize', () => (stale = true), { passive: true });

  const loop = () => {
    raf = 0;
    const k = reduced() ? 1 : 0.14;
    const dx = tx - x;
    const dy = ty - y;
    x += dx * k;
    y += dy * k;
    kick *= 0.86;
    // The lean comes from the distance travelled at 1920×1080's scale, so a larger screen leans no harder.
    const lean = reduced() ? 0 : (dy / uiScale()) * 0.04 + kick;
    float.style.setProperty('--fx', `${x.toFixed(1)}px`);
    float.style.setProperty('--fy', `${y.toFixed(1)}px`);
    float.style.setProperty('--fr', `${Math.max(-7, Math.min(7, lean)).toFixed(2)}deg`);
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(kick) > 0.05) raf = requestAnimationFrame(loop);
  };
  const run = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  // At the right of the list, level with cy, drifting a little with the pointer (cx).
  const place = (cy: number, cx?: number) => {
    if (stale) measure();
    const m = 12 * uiScale();
    tx = box.right - box.w + ((cx ?? box.right) - box.right) * 0.03;
    ty = Math.max(m, Math.min(window.innerHeight - box.h - m, cy - box.h / 2));
  };

  const rows = () => [...list.querySelectorAll<HTMLElement>('li:not([hidden]) [data-cover]')];
  const prefetch = (src?: string) => {
    if (!src || fetched.has(src)) return;
    fetched.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  };
  // As the list is first approached: the pictures of the headlines in view, and a little beyond.
  const warm = () => {
    const h = window.innerHeight;
    for (const row of rows()) {
      const r = row.getBoundingClientRect();
      if (r.bottom > -h * 0.25 && r.top < h * 1.25) prefetch(row.dataset.cover);
    }
  };

  // From one picture to the next: turned like a stack of prints (dir 1 going down the list, -1 going up), or a plain
  // crossfade when the picture is only now coming out, or with reduced motion. Never more than two layers.
  const swap = (dir: number) => {
    settle?.();
    const incoming = back;
    const outgoing = front;
    front = incoming;
    back = outgoing;
    if (!dir || reduced()) {
      incoming.classList.add('is-on');
      outgoing.classList.remove('is-on');
      return;
    }
    incoming.classList.add('is-on', 'is-top');
    const timing = { duration: 420, easing: EASE };
    const rise = incoming.animate(
      [
        { clipPath: dir > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)', scale: '1.08' },
        { clipPath: 'inset(0)', scale: '1' },
      ],
      timing,
    );
    const sink = outgoing.animate(
      [
        { scale: '1', filter: 'brightness(1)' },
        { scale: '0.96', filter: 'brightness(0.6)' },
      ],
      { ...timing, fill: 'forwards' },
    );
    const end = () => {
      if (settle !== end) return;
      settle = null;
      rise.cancel();
      sink.cancel();
      incoming.classList.remove('is-top');
      outgoing.classList.remove('is-on');
    };
    settle = end;
    rise.finished.then(end, () => undefined);
    kick = dir * 1.5;
    run();
  };

  // live: the picture was already out, so moving on turns it.
  const show = (row: HTMLElement, live: boolean) => {
    const src = row.dataset.cover;
    if (!src || src === wanted) return;
    const shown = rows();
    const i = shown.indexOf(row);
    const dir = live && current ? Math.sign(i - shown.indexOf(current)) : 0;
    current = row;
    wanted = src;
    prefetch(shown[i - 1]?.dataset.cover);
    prefetch(shown[i + 1]?.dataset.cover);
    const t = ++token;
    if (front.getAttribute('src') === src) return;
    // The picture underneath is about to change: the turn in progress lands first.
    settle?.();
    if (back.getAttribute('src') !== src) back.src = src;
    back
      .decode()
      .then(
        () => undefined,
        () => undefined,
      )
      .then(() => {
        if (t === token) swap(dir);
      });
  };

  const point = (row: HTMLElement | null) => {
    place(py, px);
    if (!over) {
      x = tx;
      y = ty;
    }
    const live = over;
    over = !!row;
    root.classList.toggle('is-previewing', over);
    if (row) show(row, live);
    run();
  };

  list.addEventListener(
    'pointerenter',
    (e) => {
      if (e.pointerType === 'touch') return;
      inside = true;
      px = e.clientX;
      py = e.clientY;
      warm();
    },
    { passive: true },
  );
  list.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      inside = true;
      byKeys = false;
      px = e.clientX;
      py = e.clientY;
      point((e.target as HTMLElement).closest<HTMLElement>('[data-cover]'));
    },
    { passive: true },
  );
  list.addEventListener(
    'pointerleave',
    () => {
      inside = false;
      if (byKeys) return;
      over = false;
      root.classList.remove('is-previewing');
    },
    { passive: true },
  );

  // The keyboard: the picture comes out beside the focused headline, once the browser has brought it into view.
  const aim = (row: HTMLElement) => {
    const r = row.getBoundingClientRect();
    place(r.top + r.height / 2);
  };
  list.addEventListener('focusin', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-cover]');
    if (!row || !row.matches(':focus-visible')) return;
    byKeys = true;
    if (!over) warm();
    requestAnimationFrame(() => {
      if (document.activeElement !== row) return;
      aim(row);
      if (!over) {
        x = tx;
        y = ty;
      }
      const live = over;
      over = true;
      root.classList.add('is-previewing');
      show(row, live);
      run();
    });
  });
  list.addEventListener('focusout', (e) => {
    if (!byKeys || list.contains(e.relatedTarget as Node | null)) return;
    byKeys = false;
    over = false;
    root.classList.remove('is-previewing');
  });

  // A scroll moves the list under a still pointer (or the focused headline under its picture): once a frame, the
  // picture catches up with whatever is there now.
  let queued = false;
  window.addEventListener(
    'scroll',
    () => {
      if (queued || !(inside || (byKeys && over))) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (byKeys) {
          const row = document.activeElement;
          if (row instanceof HTMLElement && list.contains(row)) {
            aim(row);
            run();
          }
          return;
        }
        const hit = document.elementFromPoint(px, py);
        inside = !!hit && list.contains(hit);
        point(hit && inside ? hit.closest<HTMLElement>('[data-cover]') : null);
      });
    },
    { passive: true },
  );
}

/** The headlines rearranging as the filters change: each flies from where it was, the new ones fade up (a few at a
 * time, one after another). Only the rows on screen or near it move; one already landing where it's going is left to
 * land; and while the slider is dragged they move quicker, so they keep up. */
function initRearrange(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('[data-heads-list]');
  const slider = root.querySelector<HTMLInputElement>('[data-filter-max]');
  if (!list || reduced()) return;
  const items = [...list.children] as HTMLElement[];
  const moving = new Map<HTMLElement, { anim: Animation; at: number }>();
  let held = false;
  slider?.addEventListener('pointerdown', () => (held = true), { passive: true });
  const letGo = () => (held = false);
  window.addEventListener('pointerup', letGo, { passive: true });
  window.addEventListener('pointercancel', letGo, { passive: true });
  // Where each row is drawn now, mid-flight or not.
  const tops = () => new Map(items.filter((li) => !li.hidden).map((li) => [li, li.getBoundingClientRect().top]));
  let before = tops();
  root.addEventListener('input', () => (before = tops()), true);
  root.addEventListener(
    'click',
    (e) => {
      if ((e.target as HTMLElement).closest('[data-value], [data-filter-clear], [data-load-more]')) before = tops();
    },
    true,
  );
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const s = uiScale();
      const h = window.innerHeight;
      const near = 200 * s;
      const seen = (top: number, height: number) => top + height > -near && top < h + near;
      // Each row's place without its motion: the list's top plus its offset in the list (the list is positioned).
      const origin = list.getBoundingClientRect().top;
      let fresh = 0;
      for (const li of items) {
        const flight = moving.get(li);
        if (li.hidden) {
          flight?.anim.cancel();
          moving.delete(li);
          continue;
        }
        // (Measured from the list itself even if the window has been narrowed below desktop, where it isn't positioned.)
        const at = li.offsetParent === list ? li.offsetTop : li.offsetTop - list.offsetTop;
        if (flight && flight.at === at) continue;
        const top = origin + at;
        const was = before.get(li);
        // Anything still in flight is called off here: its motion was towards its old place, so left running it would
        // jump the row by however far it still had to go (and a row drawn just where it now belongs needs no flight).
        flight?.anim.cancel();
        moving.delete(li);
        if (was !== undefined && Math.abs(was - top) < 0.5) continue;
        const height = li.offsetHeight;
        if (!seen(top, height) && (was === undefined || !seen(was, height))) continue;
        const anim = li.animate(
          was === undefined
            ? [{ opacity: 0, transform: `translateY(${(18 * s).toFixed(1)}px)` }, { opacity: 1, transform: 'none' }]
            : [{ transform: `translateY(${(was - top).toFixed(1)}px)` }, { transform: 'none' }],
          {
            duration: held ? 280 : 460,
            delay: was === undefined ? Math.min(fresh++, 8) * 35 : 0,
            easing: 'cubic-bezier(0.2, 1, 0.3, 1)',
            fill: 'backwards',
          },
        );
        moving.set(li, { anim, at });
        anim.finished.then(
          () => moving.get(li)?.anim === anim && moving.delete(li),
          () => undefined,
        );
      }
    });
  }).observe(list, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
}

const SLIDER_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/** How long have you got, charted: while the slider is held or worked with the keys (.is-timing), every headline shows
 * its line, as long as its read, rising one after another down the screen (--i), against a faint mark at your time
 * (--cut), so each read visibly ends inside it. It all goes 900ms after you let go. The track is lit up to the thumb
 * (--v) whatever happens. */
function initTiming(root: HTMLElement) {
  const slider = root.querySelector<HTMLInputElement>('[data-filter-max]');
  const list = root.querySelector<HTMLElement>('[data-heads-list]');
  if (!slider || !list) return;
  const most = Number(slider.max) || 1;
  const items = [...list.children] as HTMLElement[];
  const fill = () => {
    const v = Number(slider.value) || most;
    slider.style.setProperty('--v', most > 1 ? ((v - 1) / (most - 1)).toFixed(4) : '1');
    list.style.setProperty('--cut', (v / most).toFixed(4));
  };
  // Each row's place in the rise, counted from the first one on screen.
  const order = () => {
    const h = window.innerHeight;
    let i = 0;
    for (const li of items) {
      if (li.hidden) continue;
      const r = li.getBoundingClientRect();
      li.style.setProperty('--i', String(r.bottom > 0 && r.top < h ? i++ : 0));
    }
  };
  let timer = 0;
  let after = 0;
  let holding = false;
  const on = () => {
    window.clearTimeout(timer);
    window.clearTimeout(after);
    root.classList.remove('is-untiming');
    if (root.classList.contains('is-timing')) return;
    order();
    root.classList.add('is-timing');
  };
  // While the thumb is held nothing else ends it: letting go does.
  const off = () => {
    window.clearTimeout(timer);
    if (holding) return;
    timer = window.setTimeout(() => {
      root.classList.remove('is-timing');
      root.classList.add('is-untiming');
      after = window.setTimeout(() => root.classList.remove('is-untiming'), 400);
    }, 900);
  };
  slider.addEventListener(
    'pointerdown',
    () => {
      holding = true;
      on();
    },
    { passive: true },
  );
  const release = () => {
    if (!holding) return;
    holding = false;
    off();
  };
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  slider.addEventListener('focus', () => {
    if (!slider.matches(':focus-visible')) return;
    on();
    off();
  });
  slider.addEventListener('keydown', (e) => {
    if (!SLIDER_KEYS.has(e.key)) return;
    on();
    off();
  });
  slider.addEventListener('blur', () => {
    if (root.classList.contains('is-timing')) off();
  });
  slider.addEventListener('input', fill);
  // After any change of the list (a topic, Clear, Load more): the track and the mark, and the rise's order.
  new MutationObserver(() => {
    fill();
    if (root.classList.contains('is-timing')) requestAnimationFrame(order);
  }).observe(list, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  fill();
}

/** The topics fill with light when chosen: each word gets its solid self laid over it (the same label, hidden from
 * screen readers), uncovered from the left as it's chosen and drained to the right (.was-on) as another is. */
function initTopics(root: HTMLElement) {
  const group = root.querySelector<HTMLElement>('[data-filter-group]');
  if (!group) return;
  const timers = new Map<HTMLElement, number>();
  group.querySelectorAll<HTMLElement>('[data-value]').forEach((chip) => {
    const fill = document.createElement('span');
    fill.className = 'heads__fill';
    fill.setAttribute('aria-hidden', 'true');
    fill.textContent = chip.textContent?.trim() ?? '';
    chip.append(fill);
  });
  root.classList.add('has-fill');
  new MutationObserver((records) => {
    for (const r of records) {
      const chip = r.target as HTMLElement;
      const on = chip.getAttribute('aria-pressed') === 'true';
      const was = r.oldValue === 'true';
      if (on === was) continue;
      window.clearTimeout(timers.get(chip));
      chip.classList.toggle('was-on', !on);
      if (!on) timers.set(chip, window.setTimeout(() => chip.classList.remove('was-on'), 600));
    }
  }).observe(group, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'], attributeOldValue: true });
}

/** Touch (no pointer to point with): the headline crossing the middle of the screen is the lit one (.is-near), the rest
 *  in outline (.has-near on the list), as the one under the pointer is on desktop. */
function initNear(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('[data-heads-list]');
  if (!list || window.matchMedia('(hover: hover)').matches || !('IntersectionObserver' in window)) return;
  let near: Element | null = null;
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) near = en.target;
        else if (near === en.target) near = null;
      }
      list.querySelectorAll('.hline__link.is-near').forEach((a) => a !== near && a.classList.remove('is-near'));
      near?.classList.add('is-near');
      list.classList.toggle('has-near', !!near);
    },
    { rootMargin: '-46% 0px -46% 0px' },
  );
  list.querySelectorAll('.hline__link').forEach((a) => io.observe(a));
}

export function initHeadlines() {
  document.querySelectorAll<HTMLElement>('[data-heads]').forEach((root) => {
    if (root.dataset.headsReady) return;
    root.dataset.headsReady = 'true';
    initList(root);
    initRearrange(root);
    initTiming(root);
    initTopics(root);
    initNear(root);
  });
}
