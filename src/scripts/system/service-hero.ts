// A Stride Social service's page (social/ServiceHero.astro): its phone plays its clips one after another, as reels do;
// without any, its pictures follow one another every few seconds (or a dot chooses
// one), waiting while the pointer or the keyboard is on the frame, while it's out of view or the tab is hidden; the
// frame leans towards the pointer under a glare, its badge and dots floating a little above the picture; its words open
// to the rest with "Read more", in place, what's below gliding down to make room (and back up again).
// Under reduced motion nothing moves by itself or leans, but the dots still choose a picture.
import { reduced } from './env';
import { setSoundWanted, soundAllowed, soundWanted, whenSoundAllowed } from './sound';

const NEXT = 4200; // ms a picture stays on
const MAX_CLIP = 15; // s a clip on the phone plays at most before the next
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const clampHalf = (v: number) => Math.min(0.5, Math.max(-0.5, v));

export function initServiceHero() {
  const root = document.querySelector<HTMLElement>('[data-service-hero]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';

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

  /* ---------- Its phone: videos one after another, as reels play ---------- */
  // Each clip plays (muted until the sound is turned on) for its length, or MAX_CLIP at most, then the next slides up;
  // after the last, the first again. A press on the right goes on, on the left back. It rests while it's out of view or
  // the tab is hidden; with reduced motion nothing plays by itself (the presses still change the clip, its first frame).
  const phone = root.querySelector<HTMLElement>('[data-shero-phone]');
  if (phone) {
    const clips = [...phone.querySelectorAll<HTMLElement>('[data-shero-clip]')];
    const videos = clips.map((c) => c.querySelector<HTMLVideoElement>('video')!);
    const bars = [...phone.querySelectorAll<HTMLElement>('[data-shero-bar]')];
    const sound = phone.querySelector<HTMLButtonElement>('[data-shero-sound]');
    const auto = !reduced();
    let at = 0;
    // Sound on as soon as the browser allows it, unless the visitor turned it off (sound.ts; the owner, 2026-11-18).
    let muted = !(soundWanted() && soundAllowed());
    let seen = false;
    let raf = 0;
    const limit = (v: HTMLVideoElement) => Math.min(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : MAX_CLIP, MAX_CLIP);
    const paint = () => {
      bars.forEach((b, k) => b.style.setProperty('--p', k < at ? '1' : k > at ? '0' : String(Math.min(1, videos[at].currentTime / limit(videos[at])))));
    };
    const tick = () => {
      raf = 0;
      const v = videos[at];
      paint();
      if (v.currentTime >= limit(v) - 0.05) return show(at + 1);
      if (!v.paused) raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (!auto || !seen || document.hidden) return;
      const v = videos[at];
      v.muted = muted;
      v.play().then(() => {
        if (!raf) raf = requestAnimationFrame(tick);
      }, () => {});
    };
    const show = (i: number) => {
      const was = at;
      at = (i + clips.length) % clips.length;
      clips.forEach((c, k) => {
        c.classList.toggle('is-on', k === at);
        c.classList.toggle('is-before', k === was && k !== at);
        if (k === at) c.removeAttribute('aria-hidden');
        else c.setAttribute('aria-hidden', 'true');
        c.querySelector('a')?.setAttribute('tabindex', k === at ? '0' : '-1');
      });
      videos.forEach((v, k) => {
        if (k === at) return;
        v.pause();
        if (k === was) window.setTimeout(() => (v.currentTime = 0), 650);
      });
      // The next one starts loading while this one plays.
      const next = videos[(at + 1) % videos.length];
      if (next.preload === 'none') next.preload = 'auto';
      videos[at].currentTime = 0;
      cancelAnimationFrame(raf);
      raf = 0;
      paint();
      play();
    };
    videos.forEach((v) => v.addEventListener('ended', () => v === videos[at] && show(at + 1)));
    phone.querySelector('[data-shero-next]')?.addEventListener('click', () => show(at + 1));
    phone.querySelector('[data-shero-prev]')?.addEventListener('click', () => show(at - 1));
    const setMuted = (m: boolean) => {
      muted = m;
      videos[at].muted = muted;
      sound?.setAttribute('aria-pressed', String(!muted));
      sound?.setAttribute('aria-label', (muted ? sound.dataset.off : sound.dataset.on) ?? '');
      if (!muted && videos[at].paused) play();
    };
    sound?.addEventListener('click', () => {
      setMuted(!muted);
      setSoundWanted(!muted);
    });
    if (muted) whenSoundAllowed(() => soundWanted() && setMuted(false));
    else {
      sound?.setAttribute('aria-pressed', 'true');
      sound?.setAttribute('aria-label', sound.dataset.on ?? '');
    }
    document.addEventListener('stride:sound', (e) => setMuted(!(e as CustomEvent<{ on: boolean }>).detail.on));
    const rest = () => {
      videos[at].pause();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    new IntersectionObserver((entries) => {
      seen = entries[entries.length - 1].isIntersecting;
      if (seen) play();
      else rest();
    }, { threshold: 0.35 }).observe(phone);
    document.addEventListener('visibilitychange', () => (document.hidden ? rest() : play()));
    paint();
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
