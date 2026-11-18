// Behaviour for Stride Talent 2.0 (talent/TalentStories.astro, talent/StoryPlayer.astro), and for the highlights on
// /talent's Instagram profile (talent/InstaProfile.astro, a highlight plays its niche), as close as it can be to
// fyndafit.com/en/creators: the rows that scroll sideways (a mouse can drag them; the arrows at their ends step them),
// the niches (a ring chooses one and the cards become its top ten; the chosen ring again plays its stories), a card's
// own clip while it's pointed at, niches already watched (remembered in this browser), and the story player: a niche's
// creators one after another, each their clip or their photograph with a bar each along the top, then the next niche's.
// The right of the story goes on, the left goes back, holding it pauses, a swipe sideways turns, a swipe down or the
// dimmed page closes; the keyboard: ←/→, Space, M, Escape. Its address (?niche=<key>&story=<id>) opens it straight onto
// that creator, and ?niche=<key> alone chooses the niche; Back closes it. A niche with a roster post ends on a card
// offering its full roster ("See full roster" fires `talent:roster`, which /talent's profile answers; elsewhere its link
// goes to the roster page) or the next niche ("Keep watching").
import { lenis, reduced } from './env';
import { whenLoaded } from './loaded';

// `end`: the card after a niche's last story, offering its full roster (the owner, 2026-11-18). `pic`: a story's own
// picture when it isn't the face beside the name; `alt`, what it shows. A niche that's `own` is a profile's own stories
// (/talent's picture, 2026-11-18): no niche beside the name, and it ends where it ends, neither running on into the
// niches nor back from them.
type Story = { id: string; n: string; p: string; v: string | null; vp: string | null; u: string; pic?: string; alt?: string; end?: { count: number; bg?: string } };
type Niche = { k: string; l: string; ids: string[]; own?: boolean };
type Data = { creators: Story[]; niches: Niche[]; words: Record<string, string> };

const SEEN = 'stride:stories-seen';
const SOUND = 'stride:stories-sound';
const PHOTO_MS = 6000; // a photograph's story
const MAX_CLIP_S = 30; // a clip's story lasts its own length, up to this
const HOLD_MS = 220; // a press held this long pauses instead of going on

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const icons = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  mark: '<svg viewBox="0 0 106 106" aria-hidden="true"><path d="M53 53H0L53 0v53Z"/><path d="M53 106H0l53-53v53Z"/><path d="M106 53H53l53-53v53Z"/><path d="M106 106H53l53-53v53Z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9l5 6M20.5 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

// ---------- Watched (this browser): a niche turns grey once all its stories have been seen ----------
const seen = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN) || '[]') as string[]);
  } catch {
    return new Set();
  }
};
function paintSeen(niches: Niche[]) {
  const all = seen();
  niches.forEach((n) =>
    document.querySelectorAll<HTMLElement>(`.ring[data-niche="${CSS.escape(n.k)}"]`).forEach((el) => el.classList.toggle('is-seen', n.ids.every((id) => all.has(id)))),
  );
}
function markSeen(id: string, niches: Niche[]) {
  const all = seen();
  if (all.has(id)) return;
  all.add(id);
  try {
    localStorage.setItem(SEEN, JSON.stringify([...all].slice(-500)));
  } catch {
    /* a private window: they just stay unwatched */
  }
  paintSeen(niches);
}

// ---------- Rows that scroll sideways (a rail may hold a row per niche; only the shown one moves) ----------
function initRails(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-rail]').forEach((rail) => {
    const tracks = [...rail.querySelectorAll<HTMLElement>('[data-rail-track]')];
    if (!tracks.length) return;
    const shown = () => tracks.find((t) => !t.hidden) ?? tracks[0];
    const steps = [...rail.querySelectorAll<HTMLButtonElement>('[data-rail-step]')];
    const update = () => {
      const track = shown();
      const max = track.scrollWidth - track.clientWidth - 2;
      steps.forEach((b) => (b.disabled = b.dataset.railStep === '-1' ? track.scrollLeft <= 2 : track.scrollLeft >= max));
    };
    steps.forEach((b) =>
      b.addEventListener('click', () => {
        const track = shown();
        track.scrollBy({ left: Number(b.dataset.railStep) * track.clientWidth * 0.8, behavior: reduced() ? 'auto' : 'smooth' });
      }),
    );
    tracks.forEach((t) => t.addEventListener('scroll', update, { passive: true }));
    rail.addEventListener('rail:update', update);
    window.addEventListener('resize', update);
    update();

    // A mouse drags it sideways; a drag never also opens what it started on.
    let down: { x: number; left: number; track: HTMLElement } | null = null;
    let moved = false;
    tracks.forEach((track) => {
      track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = { x: e.clientX, left: track.scrollLeft, track };
        moved = false;
      });
      track.addEventListener('dragstart', (e) => e.preventDefault());
      track.addEventListener(
        'click',
        (e) => {
          if (!moved) return;
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        },
        true,
      );
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        rail.classList.add('is-dragging');
      }
      if (moved) down.track.scrollLeft = down.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = null;
      requestAnimationFrame(() => rail.classList.remove('is-dragging'));
    });
  });
}

// ---------- The niches: a ring chooses one, and the cards become its ten ----------
function chooseNiche(root: HTMLElement, key: string, animate = true) {
  const track = root.querySelector<HTMLElement>(`[data-niche-cards="${CSS.escape(key)}"]`);
  if (!track) return;
  root.querySelectorAll<HTMLElement>('.ring[data-niche]').forEach((r) => {
    const on = r.dataset.niche === key;
    r.classList.toggle('is-on', on);
    r.setAttribute('aria-pressed', String(on));
  });
  const wasHidden = track.hidden;
  root.querySelectorAll<HTMLElement>('[data-niche-cards]').forEach((t) => (t.hidden = t !== track));
  if (wasHidden) {
    track.scrollLeft = 0;
    track.classList.remove('is-in');
    if (animate && !reduced()) {
      void track.offsetWidth;
      track.classList.add('is-in');
    }
  }
  track.closest('[data-rail]')?.dispatchEvent(new Event('rail:update'));
  // The niche stays in the address, so a reload or a shared link opens on it.
  const url = new URL(location.href);
  url.searchParams.set('niche', key);
  history.replaceState(history.state, '', url.pathname + url.search);
}

// ---------- A card's own clip while it's pointed at (a mouse) ----------
function initClips(root: HTMLElement) {
  if (!window.matchMedia('(hover: hover)').matches || reduced()) return;
  root.querySelectorAll<HTMLElement>('.card[data-video]').forEach((card) => {
    let video: HTMLVideoElement | null = null;
    card.addEventListener('pointerenter', () => {
      video = document.createElement('video');
      Object.assign(video, { muted: true, loop: true, playsInline: true, autoplay: true, src: card.dataset.video! });
      video.setAttribute('aria-hidden', 'true');
      card.querySelector('.card__img')?.after(video);
      video.play().catch(() => {});
    });
    card.addEventListener('pointerleave', () => {
      video?.remove();
      video = null;
    });
  });
}

// ---------- The player ----------
function initPlayer(root: HTMLElement, el: HTMLElement, data: Data) {
  const byId = new Map(data.creators.map((c) => [c.id, c]));
  const niches = data.niches;
  const w = (key: string, fallback: string) => data.words[key] ?? fallback;
  const frame = el.querySelector<HTMLElement>('[data-sp-frame]')!;
  const live = el.querySelector<HTMLElement>('[data-sp-live]');

  let ni = 0; // the niche playing
  let at = 0; // its creator
  let face: HTMLElement | null = null;
  let video: HTMLVideoElement | null = null;
  let elapsed = 0;
  let last = 0;
  let open = false;
  let paused = false;
  let held = false;
  let waiting = false;
  let pushed = false;
  let landing: string | null = null; // the address to settle on once a Back of ours has landed
  let opener: HTMLElement | null = null;
  let muted = sessionStorage.getItem(SOUND) !== 'on';
  let raf = 0;

  const queue = () => niches[ni].ids;
  const address = () => `${location.pathname}?niche=${encodeURIComponent(niches[ni].k)}&story=${encodeURIComponent(queue()[at])}`;
  const stopped = () => paused || held || waiting || document.hidden;

  // The clip plays only while the story runs; the buttons say what they'd do.
  const sync = () => {
    face?.classList.toggle('is-paused', stopped());
    if (video) {
      video.muted = muted;
      if (stopped() || !open) video.pause();
      else video.play().catch(() => {});
    }
    const pauseBtn = face?.querySelector<HTMLButtonElement>('[data-sf-pause]');
    if (pauseBtn) {
      pauseBtn.innerHTML = paused ? icons.play : icons.pause;
      pauseBtn.setAttribute('aria-label', paused ? w('play', 'Play') : w('pause', 'Pause'));
    }
    const soundBtn = face?.querySelector<HTMLButtonElement>('[data-sf-sound]');
    if (soundBtn) {
      soundBtn.innerHTML = muted ? icons.soundOff : icons.soundOn;
      soundBtn.setAttribute('aria-label', muted ? w('mute', 'Sound on') : w('unmute', 'Sound off'));
    }
  };

  // The niche's name beside the creator's: a link to its full roster where it has the card for it.
  const nicheTag = () => {
    if (niches[ni].own) return '';
    const r = byId.get(`${niches[ni].k}-roster`);
    return r
      ? `<a class="sf__niche sf__niche--link" href="${esc(r.u)}" data-sf-roster="${esc(niches[ni].k)}">${esc(niches[ni].l)}</a>`
      : `<span class="sf__niche">${esc(niches[ni].l)}</span>`;
  };
  // The card after the niche's last story (the owner, 2026-11-18, as Instagram ends a profile's highlights): over the
  // niche's first picture blurred, Stride's mark, the question, the way to the full roster and the way on. It waits.
  function buildEnd(c: Story, bars: string): HTMLElement {
    const sf = document.createElement('div');
    sf.className = 'sf sf--end';
    const say = (key: string, fallback: string) => w(key, fallback).replace('{n}', String(c.end!.count)).replace('{niche}', niches[ni].l);
    sf.innerHTML = `
      <div class="sf__media">${c.end!.bg ? `<img class="sf__blur" src="${esc(c.end!.bg)}" alt="" draggable="false">` : ''}</div>
      <div class="sf__shade"></div>
      <span class="sf__bars">${bars}</span>
      <header class="sf__head">
        <span class="sf__who"><img src="${esc(c.p)}" alt="" draggable="false"><b>${esc(c.n)}</b></span>${nicheTag()}
        <div class="sf__tools">
          <button class="sf__tool sf__close" type="button" data-sp-close aria-label="${esc(w('close', 'Close stories'))}">${icons.close}</button>
        </div>
      </header>
      <div class="sf__end">
        <span class="sf__end-mark">${icons.mark}</span>
        <h3 class="sf__end-title">${esc(say('rosterAsk', 'Wanna see the full roster?'))}</h3>
        <p class="sf__end-line">${esc(say('rosterLine', 'Meet all {n} {niche} creators at Stride.'))}</p>
        <a class="sf__end-yes exp-pill exp-pill--glass" href="${esc(c.u)}" data-sf-roster="${esc(niches[ni].k)}">${esc(w('rosterYes', 'See full roster'))}</a>
        <button class="sf__end-no exp-pill exp-pill--ghost" type="button" data-sf-next>${esc(w('rosterNo', 'Keep watching'))}</button>
      </div>`;
    return sf;
  }

  // A story: the niche's bars (those before it full), the creator's face, name and niche, and the tools.
  function build(c: Story): HTMLElement {
    const bars = queue()
      .map((_, i) => `<span class="sf__bar${i === at ? ' is-on' : ''}"><i style="--k:${i < at ? 1 : 0}"></i></span>`)
      .join('');
    if (c.end) return buildEnd(c, bars);
    const sf = document.createElement('div');
    sf.className = 'sf';
    sf.innerHTML = `
      <div class="sf__media"></div>
      <div class="sf__shade"></div>
      <span class="sf__bars">${bars}</span>
      <header class="sf__head">
        <a class="sf__who" href="${esc(c.u)}"><img src="${esc(c.p)}" alt="" draggable="false"><b>${esc(c.n)}</b></a>${nicheTag()}
        <div class="sf__tools">
          ${c.v ? '<button class="sf__tool" type="button" data-sf-sound></button>' : ''}
          <button class="sf__tool" type="button" data-sf-pause></button>
          <button class="sf__tool sf__close" type="button" data-sp-close aria-label="${esc(w('close', 'Close stories'))}">${icons.close}</button>
        </div>
      </header>`;
    const media = sf.querySelector<HTMLElement>('.sf__media')!;
    if (c.v) {
      const v = document.createElement('video');
      Object.assign(v, { muted, playsInline: true, preload: 'auto', poster: c.vp ?? c.p, src: c.v });
      v.setAttribute('aria-hidden', 'true');
      media.append(v);
    } else {
      const img = document.createElement('img');
      Object.assign(img, { alt: c.alt ?? '', decoding: 'async', draggable: false, src: c.pic ?? c.p });
      media.append(img);
    }
    return sf;
  }

  // A creator's story starts.
  function show() {
    face?.querySelector('video')?.pause();
    face?.remove();
    const c = byId.get(queue()[at])!;
    face = build(c);
    video = face.querySelector('video');
    frame.append(face);
    elapsed = 0;
    if (!video && !c.end && !reduced()) {
      face.style.setProperty('--sf-dur', `${PHOTO_MS}ms`);
      face.classList.add('is-drift');
    }
    // Its picture first, then the bar.
    waiting = true;
    const mine = face;
    const ready = () => {
      if (face !== mine || !waiting) return;
      waiting = false;
      sync();
    };
    if (video) {
      video.addEventListener('loadeddata', ready, { once: true });
      window.setTimeout(ready, 2500);
    } else {
      const img = face.querySelector<HTMLImageElement>('.sf__media img');
      if (img) img.decode().catch(() => {}).finally(ready);
      else ready();
      window.setTimeout(ready, 3000);
    }
    sync();
    markSeen(c.id, niches);
    if (live) live.textContent = c.end ? face.querySelector('.sf__end-title')?.textContent ?? '' : c.alt ? `${c.n}: ${c.alt}` : `${c.n}, ${niches[ni].l}`;
    if (c.end) face.querySelector<HTMLElement>('.sf__end-yes')?.focus({ preventScroll: true });
    history.replaceState(history.state, '', address());
    const n = byId.get(queue()[at + 1] ?? '');
    if (n && !n.v) new Image().src = n.pic ?? n.p;
  }

  // On through the niche, then into the next niche (the cards behind follow); back past its first, the niche before's last.
  // A profile's own stories close after their last and stay at their first going back.
  const own = (i: number) => !!niches[i]?.own;
  const go = (dir: number) => {
    const to = at + dir;
    if (to >= queue().length) {
      if (ni + 1 >= niches.length || own(ni) || own(ni + 1)) return close();
      ni += 1;
      at = 0;
      chooseNiche(root, niches[ni].k, false);
    } else if (to < 0) {
      if (ni === 0 || own(ni) || own(ni - 1)) at = 0;
      else {
        ni -= 1;
        at = queue().length - 1;
        chooseNiche(root, niches[ni].k, false);
      }
    } else at = to;
    show();
  };

  // The bar, every frame; at its end, the next creator.
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(now - (last || now), 100);
    last = now;
    if (!open || !face) return;
    // The roster card waits for an answer, its bar full.
    if (face.classList.contains('sf--end')) {
      face.querySelector<HTMLElement>('.sf__bar.is-on i')?.style.setProperty('--k', '1');
      return;
    }
    let k: number;
    if (video && Number.isFinite(video.duration) && video.duration > 0) k = video.ended ? 1 : video.currentTime / Math.min(video.duration, MAX_CLIP_S);
    else {
      if (!stopped()) elapsed += dt;
      k = elapsed / PHOTO_MS;
    }
    face.querySelector<HTMLElement>('.sf__bar.is-on i')?.style.setProperty('--k', String(Math.min(1, k)));
    if (k >= 1 && !stopped()) go(1);
  };

  function openAt(key: string, id: string | null, from: HTMLElement | null, push = true) {
    ni = Math.max(0, niches.findIndex((n) => n.k === key));
    at = id ? Math.max(0, queue().indexOf(id)) : 0;
    opener = from;
    open = true;
    paused = false;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-open'));
    document.documentElement.style.overflow = 'hidden';
    lenis()?.stop();
    // Its own entry in the history, so Back closes it and the page's own address stays as it was.
    if (push) {
      history.pushState({ stories: true }, '', address());
      pushed = true;
    }
    show();
    const closeBtn = el.querySelector<HTMLElement>('.sp__close');
    (closeBtn && getComputedStyle(closeBtn).display !== 'none' ? closeBtn : frame.querySelector<HTMLElement>('[data-sf-pause]'))?.focus({ preventScroll: true });
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function close(fromHistory = false) {
    if (!open) return;
    open = false;
    video?.pause();
    el.classList.remove('is-open');
    window.setTimeout(() => {
      if (open) return;
      el.hidden = true;
      face?.remove();
      face = null;
      video = null;
    }, 280);
    document.documentElement.style.overflow = '';
    lenis()?.start();
    // Back to the card of the creator it ended on (the opener if that's off the row).
    const id = queue()[at] ?? '';
    (root.querySelector<HTMLElement>(`[data-niche-cards="${CSS.escape(niches[ni].k)}"] [data-story-card="${CSS.escape(id)}"]`) ?? opener)?.focus({ preventScroll: true });
    // The page's address afterwards: the niche it ended on (once Back has landed, when it went back).
    const back = `${location.pathname}?niche=${encodeURIComponent(niches[ni].k)}`;
    if (!fromHistory && pushed) {
      landing = back;
      history.back();
    } else history.replaceState(history.state, '', back);
    pushed = false;
  }

  // Presses on the story: the left third back, the rest on, held pauses, a swipe turns or closes.
  let press: { x: number; y: number; id: number } | null = null;
  let swiping = false;
  let holdTimer = 0;
  frame.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('a, button') || e.button > 0) return;
    press = { x: e.clientX, y: e.clientY, id: e.pointerId };
    swiping = false;
    frame.setPointerCapture(e.pointerId);
    holdTimer = window.setTimeout(() => {
      held = true;
      sync();
    }, HOLD_MS);
  });
  frame.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (Math.abs(e.clientX - press.x) > 12 || Math.abs(e.clientY - press.y) > 12) {
      swiping = true;
      window.clearTimeout(holdTimer);
    }
  });
  const release = (e: PointerEvent, cancelled = false) => {
    if (!press || e.pointerId !== press.id) return;
    window.clearTimeout(holdTimer);
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    const wasHeld = held;
    held = false;
    press = null;
    sync();
    if (cancelled) return;
    if (swiping) {
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      else if (dy > 90 && dy > Math.abs(dx)) close();
    } else if (!wasHeld) {
      const r = frame.getBoundingClientRect();
      go(e.clientX - r.left < r.width / 3 ? -1 : 1);
    }
  };
  frame.addEventListener('pointerup', (e) => release(e));
  frame.addEventListener('pointercancel', (e) => release(e, true));

  el.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t.closest('[data-sp-close]')) return close();
    // The name in a story's head, on /talent: the creator's roster post with their details (`?creator=`), or, for a
    // clip under Stride Talent's name, the niche's Roster tab (`?roster=`); the creator pages were deleted (the owner,
    // 2026-11-18).
    const who = t.closest<HTMLAnchorElement>('a.sf__who');
    if (who && document.querySelector('[data-igp-viewer^="roster-"]')) {
      const q = new URL(who.href, location.href).searchParams;
      const creator = q.get('creator');
      const niche = q.get('roster');
      if (creator || niche) {
        e.preventDefault();
        close();
        window.setTimeout(() => window.dispatchEvent(creator ? new CustomEvent('talent:creator', { detail: { id: creator } }) : new CustomEvent('talent:roster', { detail: { niche } })), 320);
        return;
      }
    }
    // The full roster: on /talent it opens as the profile's roster post (talent/InstaProfile.astro), elsewhere the link
    // goes to the roster page.
    const toRoster = t.closest<HTMLAnchorElement>('[data-sf-roster]');
    if (toRoster) {
      const niche = toRoster.dataset.sfRoster ?? '';
      if (!document.querySelector(`[data-igp-roster="${CSS.escape(niche)}"]`)) return;
      e.preventDefault();
      close();
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('talent:roster', { detail: { niche } })), 320);
      return;
    }
    if (t.closest('[data-sf-next]')) return go(1);
    if (t.closest('[data-sf-pause]')) {
      paused = !paused;
      return sync();
    }
    if (t.closest('[data-sf-sound]')) {
      muted = !muted;
      try {
        sessionStorage.setItem(SOUND, muted ? 'off' : 'on');
      } catch {
        /* fine */
      }
      return sync();
    }
  });

  // The keyboard, while it's open; focus stays inside it.
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    const onControl = (e.target as Element).closest?.('a, button');
    if (e.key === 'Escape') return void (e.preventDefault(), close());
    if (e.key === 'ArrowRight') return void (e.preventDefault(), go(1));
    if (e.key === 'ArrowLeft') return void (e.preventDefault(), go(-1));
    if (e.key === ' ' && !onControl) {
      e.preventDefault();
      paused = !paused;
      return sync();
    }
    if ((e.key === 'm' || e.key === 'M') && video) {
      muted = !muted;
      return sync();
    }
    if (e.key === 'Tab') {
      const focusable = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((x) => x.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const lastOne = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), lastOne.focus());
      else if (!e.shiftKey && document.activeElement === lastOne) (e.preventDefault(), first.focus());
      else if (!el.contains(document.activeElement)) (e.preventDefault(), first.focus());
    }
  });

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('popstate', () => {
    if (open) close(true);
    else if (landing) {
      history.replaceState(history.state, '', landing);
      landing = null;
    }
  });

  // A ring chooses its niche; the chosen one plays it (a highlight on /talent's Instagram profile, `data-plays`, plays it
  // straight away: there are no cards to choose). A card plays its niche from that creator (a modified click still
  // opens the creator's page).
  root.addEventListener('click', (e) => {
    const t = e.target as Element;
    const ring = t.closest<HTMLElement>('.ring[data-niche]');
    if (ring) {
      const key = ring.dataset.niche!;
      if (ring.classList.contains('is-on') || ring.hasAttribute('data-plays')) openAt(key, null, ring);
      else chooseNiche(root, key);
      return;
    }
    const card = t.closest<HTMLAnchorElement>('[data-story-card]');
    if (!card || (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey || (e as MouseEvent).shiftKey || (e as MouseEvent).button > 0) return;
    e.preventDefault();
    const key = card.closest<HTMLElement>('[data-niche-cards]')?.dataset.nicheCards ?? niches[0].k;
    openAt(key, card.dataset.storyCard!, card);
  });

  // From the address: the niche, and straight onto a creator's story once the page has opened.
  const params = new URLSearchParams(location.search);
  const askedNiche = niches.find((n) => n.k === params.get('niche'));
  const askedStory = params.get('story');
  const found = askedStory ? (askedNiche?.ids.includes(askedStory) ? askedNiche : niches.find((n) => n.ids.includes(askedStory))) : undefined;
  // A story no longer in any niche (a niche's stories replaced by its own clips) opens its niche from the start.
  const storyNiche = found ?? (askedStory ? askedNiche : undefined);
  const startNiche = storyNiche ?? askedNiche;
  if (startNiche && startNiche !== niches[0]) chooseNiche(root, startNiche.k, false);
  if (storyNiche && askedStory) {
    const id = storyNiche.ids.includes(askedStory) ? askedStory : null;
    whenLoaded(() => openAt(storyNiche.k, id, id ? root.querySelector<HTMLElement>(`[data-story-card="${CSS.escape(id)}"]`) : null, false));
  }
}

export function initTalentStories() {
  const root = document.querySelector<HTMLElement>('[data-stories]');
  const el = document.querySelector<HTMLElement>('[data-story-player]');
  const raw = el?.querySelector('[data-sp-data]')?.textContent;
  if (!root || !el || !raw) return;
  const data = JSON.parse(raw) as Data;
  if (!data.niches.length) return;
  paintSeen(data.niches);
  initRails(root);
  initClips(root);
  initPlayer(root, el, data);
}
