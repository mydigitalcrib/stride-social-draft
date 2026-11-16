// A Stride Social service's page on desktop (social/ServiceHero.astro): what it includes goes into the visitor's brief
// a line at a time (shortlist.ts, the same entries the stack of cards made: `<service>:<n>`), each landing with a small
// burst at its tick and a light along its rule; its pictures follow one another every few seconds (or a dot chooses
// one), waiting while the pointer or the keyboard is on the frame, while it's out of view or the tab is hidden; the
// frame leans towards the pointer under a glare, its badge and dots floating a little above the picture; its words open
// to the rest with "Read more", in place, what's below gliding down to make room (and back up again).
// Under reduced motion nothing moves by itself or leans, but the dots still choose a picture.
import { addTo, listOf, removeFrom } from './shortlist';
import { reduced } from './env';

const NEXT = 4200; // ms a picture stays on
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const clampHalf = (v: number) => Math.min(0.5, Math.max(-0.5, v));

export function initServiceHero() {
  const root = document.querySelector<HTMLElement>('[data-service-hero]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const service = root.dataset.service ?? '';

  /* ---------- What it includes, into the brief ---------- */
  const items = [...root.querySelectorAll<HTMLButtonElement>('[data-shero-item]')];
  const sync = () => {
    const ids = new Set(listOf('brief').map((x) => x.id));
    items.forEach((b) => b.setAttribute('aria-pressed', String(ids.has(`${service}:${b.dataset.sheroItem}`))));
  };
  const glow = getComputedStyle(root).getPropertyValue('--tone-glow').trim() || '207 237 248';
  // It lands like a meteor: two rings and six sparks at its tick, a light along its rule, its number glowing.
  const land = (b: HTMLButtonElement) => {
    if (reduced()) return;
    const burst = document.createElement('span');
    burst.className = 'shero__burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.innerHTML = `<i></i><i></i>${Array.from({ length: 6 }, (_, k) => `<b style="--a: ${k * 60 + 15}deg"></b>`).join('')}`;
    b.querySelector('.shero__tick')?.append(burst);
    const sweep = document.createElement('span');
    sweep.className = 'shero__sweep';
    sweep.setAttribute('aria-hidden', 'true');
    sweep.innerHTML = '<i></i>';
    b.append(sweep);
    window.setTimeout(() => {
      burst.remove();
      sweep.remove();
    }, 900);
    b.querySelector('.shero__no')?.animate(
      [{ textShadow: `0 0 0 rgb(${glow} / 0)` }, { textShadow: `0 0 0.875rem rgb(${glow} / 0.9)`, offset: 0.35 }, { textShadow: `0 0 0 rgb(${glow} / 0)` }],
      { duration: 600, easing: 'ease-out' },
    );
  };
  items.forEach((b) =>
    b.addEventListener('click', () => {
      const id = `${service}:${b.dataset.sheroItem}`;
      if (b.getAttribute('aria-pressed') === 'true') removeFrom('brief', id);
      else {
        addTo('brief', { id, label: b.dataset.label ?? '', group: service });
        land(b);
      }
      sync();
    }),
  );
  document.addEventListener('shortlist:render', sync);
  sync();

  /* ---------- Read more: opened in place ---------- */
  // What moves when the words open (everything around them, as the column re-centres, and the frame beside it) glides
  // from where it was; the new paragraphs come in one after another. Read less takes them out, then closes up.
  const copy = root.querySelector<HTMLElement>('.shero__copy');
  const body = root.querySelector<HTMLElement>('[data-shero-body]');
  const more = root.querySelector<HTMLButtonElement>('[data-shero-more]');
  const frame = root.querySelector<HTMLElement>('[data-shero-frame]');
  const moreWords = more?.querySelector('span')?.textContent ?? '';
  if (body && more) {
    const extras = [...body.querySelectorAll<HTMLElement>('p.is-more')];
    const moving = [
      ...[...(copy?.children ?? [])].filter((el) => el !== body),
      body.querySelector('p:not(.is-more)'),
      more,
      frame,
    ].filter((el): el is HTMLElement => el instanceof HTMLElement);
    const flip = (change: () => void) => {
      const before = moving.map((el) => el.getBoundingClientRect().top);
      change();
      const after = moving.map((el) => el.getBoundingClientRect().top);
      moving.forEach((el, i) => {
        const dy = before[i] - after[i];
        if (Math.abs(dy) > 0.5) el.animate([{ translate: `0 ${dy}px` }, { translate: '0 0' }], { duration: 420, easing: EASE_OUT, composite: 'add' });
      });
    };
    let open = false;
    let leaving: Animation[] = [];
    more.addEventListener('click', () => {
      open = !open;
      more.setAttribute('aria-expanded', String(open));
      const label = more.querySelector('span');
      if (label) label.textContent = open ? (more.dataset.less ?? moreWords) : moreWords;
      if (reduced()) {
        body.classList.toggle('is-open', open);
        return;
      }
      leaving.forEach((a) => a.cancel());
      leaving = [];
      if (open) {
        if (!body.classList.contains('is-open')) flip(() => body.classList.add('is-open'));
        extras.forEach((p, i) =>
          p.animate([{ opacity: 0, translate: '0 0.5rem' }, { opacity: 1, translate: '0 0' }], { duration: 420, delay: i * 60, easing: EASE_OUT, fill: 'backwards' }),
        );
        return;
      }
      const these = extras.map((p, i) =>
        p.animate([{ opacity: 1 }, { opacity: 0, translate: '0 0.5rem' }], { duration: 200, delay: (extras.length - 1 - i) * 40, easing: 'ease-in', fill: 'forwards' }),
      );
      leaving = these;
      Promise.all(these.map((a) => a.finished)).then(
        () => {
          if (leaving !== these) return; // opened again meanwhile
          flip(() => body.classList.remove('is-open'));
          these.forEach((a) => a.cancel());
          leaving = [];
        },
        () => {
          /* opened again meanwhile: cancelled */
        },
      );
    });
  }

  /* ---------- Its pictures, one after another ---------- */
  const pics = [...root.querySelectorAll<HTMLImageElement>('[data-shero-pic]')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-shero-dot]')];
  if (frame && pics.length > 1) {
    const auto = !reduced();
    let at = 0;
    const show = (i: number) => {
      at = (i + pics.length) % pics.length;
      pics.forEach((p, k) => p.classList.toggle('is-on', k === at));
      dots.forEach((d, k) => {
        d.classList.toggle('is-on', k === at);
        if (k === at) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    };
    // A clock that keeps what's left of a picture's time while it waits.
    const holds = new Set<string>(['view']); // until it's known to be in view
    let due = NEXT;
    let since = 0;
    let timer = 0;
    const arm = () => {
      since = performance.now();
      timer = window.setTimeout(() => {
        timer = 0;
        show(at + 1);
        due = NEXT;
        if (!holds.size) arm();
      }, due);
    };
    const hold = (why: string, on: boolean) => {
      if (!auto) return;
      const was = holds.size > 0;
      if (on) holds.add(why);
      else holds.delete(why);
      const is = holds.size > 0;
      if (was === is) return;
      if (is) {
        window.clearTimeout(timer);
        timer = 0;
        due = Math.max(0, due - (performance.now() - since));
      } else arm();
    };
    dots.forEach((d, k) =>
      d.addEventListener('click', () => {
        show(k);
        due = NEXT;
        if (timer) {
          window.clearTimeout(timer);
          arm();
        }
      }),
    );
    frame.addEventListener('pointerenter', () => hold('pointer', true));
    frame.addEventListener('pointerleave', () => hold('pointer', false));
    frame.addEventListener('focusin', (e) => {
      if ((e.target as Element).matches(':focus-visible')) hold('focus', true);
    });
    frame.addEventListener('focusout', (e) => {
      if (!frame.contains(e.relatedTarget as Node | null)) hold('focus', false);
    });
    document.addEventListener('visibilitychange', () => hold('tab', document.hidden));
    new IntersectionObserver((entries) => hold('view', !entries[entries.length - 1].isIntersecting), { threshold: 0.3 }).observe(frame);
  }

  /* ---------- The frame leans towards the pointer, a glare crossing it ---------- */
  // Measured as it comes under the pointer (and again if the page scrolls under it), by its size before it leans,
  // so the lean never feeds back into itself; written once a frame.
  if (frame && !reduced()) {
    let box: { x: number; y: number; w: number; h: number } | null = null;
    let nx = 0;
    let ny = 0;
    let px = 0;
    let py = 0;
    let raf = 0;
    const measure = () => {
      const r = frame.getBoundingClientRect();
      box = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: frame.offsetWidth || 1, h: frame.offsetHeight || 1 };
    };
    const aim = () => {
      if (!box) measure();
      if (!box) return;
      nx = clampHalf((px - box.x) / box.w);
      ny = clampHalf((py - box.y) / box.h);
      if (!raf) raf = requestAnimationFrame(lean);
    };
    const lean = () => {
      raf = 0;
      frame.style.setProperty('--ry', `${(nx * 10).toFixed(2)}deg`);
      frame.style.setProperty('--rx', `${(-ny * 8).toFixed(2)}deg`);
      frame.style.setProperty('--shero-gx', `${(50 + nx * 90).toFixed(1)}%`);
      frame.style.setProperty('--shero-gy', `${(50 + ny * 90).toFixed(1)}%`);
      frame.style.setProperty('--shero-nx', nx.toFixed(3));
      frame.style.setProperty('--shero-ny', ny.toFixed(3));
    };
    const onScroll = () => {
      box = null;
      aim();
    };
    frame.addEventListener('pointerenter', (e) => {
      box = null;
      px = e.clientX;
      py = e.clientY;
      window.addEventListener('scroll', onScroll, { passive: true });
    });
    frame.addEventListener('pointermove', (e) => {
      px = e.clientX;
      py = e.clientY;
      aim();
    });
    // Let go, it all eases back to rest: the lean, the glare to its place, the badge and dots onto the picture.
    frame.addEventListener('pointerleave', () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      raf = 0;
      box = null;
      ['--rx', '--ry', '--shero-gx', '--shero-gy', '--shero-nx', '--shero-ny'].forEach((v) => frame.style.removeProperty(v));
    });
  }
}
