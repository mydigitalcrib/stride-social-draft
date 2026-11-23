// About's story (group/StoryReel.astro, every screen; a swipe is a chapter on touch), a film you can scrub. The page's scroll through the runway is the
// story's time (--p): the first stretch is the opening (the headline stepping back), then one stretch per chapter. The
// chapter on rolls its year into place digit by digit (or writes its name), and its words come in one by one, from the
// side the story is heading. The player's bar: play runs the story on (a chapter every few seconds, to the end, a line
// filling towards the next; the visitor taking over in any way stops it), the marks go to their chapters and name them
// when pointed at, a press on the bar seeks there smoothly, and the head can be dragged (or moved with the keyboard),
// which runs the story and scrubs the footage behind with it, the footage going back to playing when let go. While it's
// dragged between two years the counter runs through the years in between like a real one, and settles on the
// chapter's year when let go. The year leans towards the pointer under a light; Where we work lights its places one
// after another. It follows Lenis's own frame (no frame behind the scroll), and rests while it's off screen.
import { playChime } from './chime';
import { whenLoaded } from './loaded';
import { uiScale } from './scale';
import { clamp, lenis, reduced } from './env';

const PLAY_EVERY = 4600; // ms a chapter stays on while playing

const smooth = (t: number) => t * t * (3 - 2 * t);

  // A chapter's TikTok (the owner, 2026-11-13): the creator's profile previewed over the page, with TikTok's own embed,
  // which is only fetched now, when it's asked for (it sets TikTok's cookies). Escape, the corner or outside it closes it.
function initTikTok(root: HTMLElement, onOpen: () => void) {
  const tiktok = root.querySelector<HTMLDialogElement>('[data-story-tiktok]');
  const tiktokFrame = tiktok?.querySelector<HTMLElement>('[data-story-tiktok-frame]');
  root.querySelectorAll<HTMLButtonElement>('[data-story-tiktok-open]').forEach((btn) => btn.addEventListener('click', () => {
    if (!tiktok || !tiktokFrame) return;
    const handle = btn.dataset.storyTiktokOpen ?? '';
    const url = `https://www.tiktok.com/@${handle}`;
    onOpen();
    const quote = document.createElement('blockquote');
    quote.className = 'tiktok-embed';
    quote.setAttribute('cite', url);
    quote.dataset.uniqueId = handle;
    quote.dataset.embedType = 'creator';
    quote.style.maxWidth = '780px';
    quote.style.minWidth = '288px';
    const fallback = document.createElement('a');
    fallback.href = `${url}?refer=creator_embed`;
    fallback.target = '_blank';
    fallback.rel = 'noopener';
    fallback.textContent = `@${handle}`;
    const section = document.createElement('section');
    section.append(fallback);
    quote.append(section);
    tiktokFrame.replaceChildren(quote);
    // TikTok's script turns the quote into its profile; added again each time, it reads the new one.
    document.querySelector('script[data-tiktok-embed]')?.remove();
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    script.dataset.tiktokEmbed = '';
    document.body.append(script);
    lenis()?.stop?.();
    tiktok.showModal();
  }));
  tiktok?.querySelector('[data-story-tiktok-close]')?.addEventListener('click', () => tiktok.close());
  tiktok?.addEventListener('click', (e) => {
    if (e.target === tiktok) tiktok.close();
  });
  tiktok?.addEventListener('close', () => {
    tiktokFrame?.replaceChildren();
    lenis()?.start?.();
  });
}

export function initStoryReel() {
  const root = document.querySelector<HTMLElement>('[data-story-reel]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const stage = root.querySelector<HTMLElement>('[data-story-stage]');
  const lead = root.querySelector<HTMLElement>('[data-story-lead]');
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-story-chapter]')];
  const big = root.querySelector<HTMLElement>('[data-story-big]');
  const door = root.querySelector<HTMLElement>('[data-story-door]');
  const cols = [...root.querySelectorAll<HTMLElement>('.story__digits')];
  const word = root.querySelector<HTMLElement>('[data-story-word]');
  const medias = [...root.querySelectorAll<HTMLElement>('[data-story-media]')];
  const player = root.querySelector<HTMLElement>('[data-story-player]');
  const track = root.querySelector<HTMLElement>('[data-story-track]');
  const fill = root.querySelector<HTMLElement>('[data-story-fill]');
  const timerLine = root.querySelector<HTMLElement>('[data-story-timer]');
  const ghost = root.querySelector<HTMLElement>('[data-story-ghost]');
  const head = root.querySelector<HTMLElement>('[data-story-head]');
  const preview = root.querySelector<HTMLElement>('[data-story-preview]');
  const previewMark = root.querySelector<HTMLElement>('[data-story-preview-mark]');
  const previewName = root.querySelector<HTMLElement>('[data-story-preview-name]');
  const ticks = [...root.querySelectorAll<HTMLAnchorElement>('[data-story-go]')];
  // The notification on the opening and the button it points to (shown at the end of this, once per visit).
  const note = root.querySelector<HTMLElement>('[data-story-note]');
  const skipBtn = root.querySelector<HTMLButtonElement>('[data-story-skip]');
  let noteTimer = 0;
  const hideNote = () => {
    window.clearTimeout(noteTimer);
    note?.classList.remove('is-on');
    skipBtn?.classList.remove('is-calling');
  };
  const atEl = root.querySelector<HTMLElement>('[data-story-at]');
  const play = root.querySelector<HTMLButtonElement>('[data-story-play]');
  const footage = document.querySelector<HTMLVideoElement>('[data-backvid-video]');
  const n = chapters.length;
  if (!n || !stage || !track || !head || !player) return;

  // Each chapter's words, cut so they can come in one after another (read out whole).
  chapters.forEach((ch) => {
    let w = 0;
    ch.querySelectorAll<HTMLElement>('[data-story-words]').forEach((el) => {
      const words = (el.textContent ?? '').split(/\s+/).filter(Boolean);
      el.setAttribute('aria-label', el.textContent ?? '');
      el.replaceChildren(
        ...words.flatMap((text, k) => {
          const s = document.createElement('span');
          s.className = 'story__w';
          s.setAttribute('aria-hidden', 'true');
          s.style.setProperty('--w', String(w++));
          s.textContent = text;
          return k ? [document.createTextNode(' '), s] : [s];
        }),
      );
    });
  });

  // Where the runway starts and how long it is, and how wide the bar is: measured on resize, not every frame.
  let top = 0;
  let room = 1;
  let trackW = 1;
  const measure = () => {
    top = root.getBoundingClientRect().top + window.scrollY;
    room = Math.max(1, root.offsetHeight - window.innerHeight);
    trackW = track.clientWidth || 1;
  };
  const yFor = (i: number) => top + ((i + 1) / (n + 1)) * room; // the middle of chapter i's stretch

  /* ---------- The counter ---------- */
  const rolling = (on: boolean) => big?.classList.toggle('is-rolling', on);
  // Sets the strips to a year. Coming from a drag that ran past a 9, the 0 to land on is the strip's trailing one, so
  // it rolls on rather than back; once there it steps to the first 0, which looks the same.
  const setDigits = (year: string, fromHand = false) => {
    cols.forEach((c, k) => {
      const d = Number(year[k] ?? 0);
      const cur = Number(c.style.getPropertyValue('--d')) || 0;
      const to = fromHand && d === 0 && cur > 5 ? 10 : d;
      c.style.setProperty('--d', String(to));
      c.style.setProperty('--k', String(k));
      if (to === 10) {
        window.setTimeout(() => {
          if (c.style.getPropertyValue('--d') !== '10') return;
          c.style.transition = 'none';
          c.style.setProperty('--d', '0');
          void c.offsetWidth;
          c.style.removeProperty('transition');
        }, 900 + k * 70 + 60);
      }
    });
  };
  // Dragging between two years: the value in between (eased, so it rests near each year), each strip rolling like a
  // real counter's (the ones continuously, the others only as the one below them passes 9).
  let lastV = 0;
  const clock = (c: number) => {
    const i = Math.floor(clamp(c, 0, n - 1));
    const a = chapters[i]?.dataset.year;
    const b = chapters[i + 1]?.dataset.year;
    if (!a || !b) return; // next to a chapter without a year: the ordinary crossfade
    const v = Number(a) + (Number(b) - Number(a)) * smooth(clamp(c - i));
    cols.forEach((col, k) => {
      const place = 10 ** (3 - k);
      const digit = Math.floor(v / place) % 10 + Math.max(0, (v % place) - (place - 1));
      col.style.setProperty('--d', digit.toFixed(3));
    });
    rolling(Math.abs(v - lastV) > 0.08);
    lastV = v;
  };

  /* ---------- The chapter on ---------- */
  let at = -2;
  let leaveTimer = 0;
  let mediaLeaveTimer = 0;
  let lastCp = 0.5; // how far through its stretch the chapter on is (0 to 1), for the scroll's motion
  let placesTimer = 0;
  const places = [...root.querySelectorAll<HTMLElement>('.story__places span')];
  const placesChapter = places[0]?.closest<HTMLElement>('[data-story-chapter]');
  let scrubbing = false;
  let visible = false; // the reel on screen (the observer at the end)
  // Where we work: its places light up one after another while it's on, and while it's on screen.
  const cyclePlaces = () => {
    window.clearInterval(placesTimer);
    placesTimer = 0;
    if (!placesChapter || !visible || chapters[at] !== placesChapter || reduced()) return;
    let k = 0;
    placesTimer = window.setInterval(() => {
      const lit = k++ % places.length;
      places.forEach((p, j) => p.classList.toggle('is-lit', j === lit));
    }, 900);
  };
  const show = (i: number) => {
    if (i === at) return;
    const prev = at;
    at = i;
    // The words leave the way the story is heading, and the new ones come in from the other side.
    stage.dataset.dir = i >= prev ? '1' : '-1';
    window.clearTimeout(leaveTimer);
    chapters.forEach((c) => c.classList.remove('is-leaving'));
    void stage.offsetWidth; // the new chapter's words start from the side they're coming from
    chapters.forEach((c, k) => c.classList.toggle('is-on', k === i));
    const was = chapters[prev];
    if (was && !reduced()) {
      // It keeps the drift it had (the stage's goes on with the new chapter) while it leaves.
      was.style.setProperty('--cp', lastCp.toFixed(3));
      was.classList.add('is-leaving');
      leaveTimer = window.setTimeout(() => {
        was.classList.remove('is-leaving');
        was.style.removeProperty('--cp');
        was.style.removeProperty('--story-vel');
      }, 420);
    }
    // Its photographs leave the way the story is heading (the stylesheet), from where they had drifted to.
    const going = medias.find((m) => m.classList.contains('is-on'));
    if (going && Number(going.dataset.storyMedia) !== i && !reduced()) {
      window.clearTimeout(mediaLeaveTimer);
      medias.forEach((m) => {
        m.classList.remove('is-leaving');
        if (m !== going) {
          m.style.removeProperty('--cp');
          m.style.removeProperty('--story-vel');
        }
      });
      going.style.setProperty('--cp', lastCp.toFixed(3));
      going.classList.add('is-leaving');
      mediaLeaveTimer = window.setTimeout(() => {
        going.classList.remove('is-leaving');
        going.style.removeProperty('--cp');
        going.style.removeProperty('--story-vel');
      }, 600);
    }
    ticks.forEach((tk, k) => {
      tk.classList.toggle('is-on', k === i);
      tk.classList.toggle('is-past', k <= i);
    });
    if (atEl) atEl.textContent = String(Math.max(0, i + 1)).padStart(2, '0');
    head.setAttribute('aria-valuenow', String(Math.max(0, i + 1)));
    head.setAttribute('aria-valuetext', i >= 0 ? (chapters[i].dataset.mark ?? '') : '');
    // Its photographs or film, when it has them (the year moves up to make room for them); the film plays while it's on.
    let withMedia = false;
    medias.forEach((m) => {
      const on = Number(m.dataset.storyMedia) === i;
      m.classList.toggle('is-on', on);
      withMedia ||= on;
      m.querySelectorAll<HTMLVideoElement>('[data-story-video]').forEach((v) => {
        if (on && !reduced()) v.play().catch(() => {});
        else v.pause();
      });
    });
    root.classList.toggle('has-media', withMedia);
    root.classList.toggle('is-in', i >= 0);
    // The chapters either side get ready now, so their photographs (decoded ahead) and films (loading ahead) don't hold
    // up the scroll in the moment they come on.
    [i - 1, i + 1].forEach((n) => medias.forEach((m) => {
      if (Number(m.dataset.storyMedia) !== n || m.dataset.ready) return;
      m.dataset.ready = 'true';
      m.querySelectorAll('img').forEach((img) => {
        img.loading = 'eager';
        img.decode().catch(() => {});
      });
      m.querySelectorAll('video').forEach((v) => (v.preload = 'auto'));
    }));
    // Into the story: the notification about skipping it has done its job.
    if (i >= 0) hideNote();
    cyclePlaces();
    if (!big || !chapters.length) return;
    // The year rolls to it, digit by digit; a chapter without one writes its name. On the opening it already holds the
    // first chapter's (without rolling), so the headline fades into it: before, the counter showed its "0000" there
    // (the owner, 2026-11-13).
    const year = chapters[Math.max(0, i)].dataset.year;
    const before = chapters[Math.max(0, prev)]?.dataset;
    big.classList.toggle('is-word', !year);
    // A new year, or name, rises in whole from the side the story is heading (no digits rolling past); the same one
    // stays put.
    const rise = (el: Element | null | undefined) => {
      if (i < 0 || scrubbing || reduced() || !el) return;
      el.animate([{ opacity: 0, translate: `0 ${i >= prev ? '0.22em' : '-0.22em'}` }, { opacity: 1, translate: '0 0' }], { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    };
    if (year) {
      setDigits(year);
      if (before?.year !== year) rise(big.querySelector('[data-story-odo]'));
    } else if (word) {
      word.replaceChildren(...(chapters[Math.max(0, i)].dataset.mark ?? '').split(/\s+/).map((part) => {
        const s = document.createElement('span');
        s.textContent = part;
        return s;
      }));
      if (before?.mark !== chapters[Math.max(0, i)].dataset.mark) rise(word);
    }
  };

  /* ---------- The scroll is the story's time ---------- */
  let lastP = '';
  let lastLead = '';
  const update = () => {
    const p = clamp((window.scrollY - top) / room);
    const key = p.toFixed(4);
    if (key === lastP) return;
    lastP = key;
    // Only what moves is written: the fill, the head (moved, not laid out), and the opening while it steps back.
    fill?.style.setProperty('--p', key);
    head.style.transform = `translate3d(${(p * trackW).toFixed(1)}px, 0, 0)`;
    const seg = p * (n + 1);
    const l = clamp(1 - seg * 1.6).toFixed(3);
    if (l !== lastLead) {
      lastLead = l;
      lead?.style.setProperty('--lead', l);
      lead?.style.setProperty('--lead-events', Number(l) > 0.2 ? 'auto' : 'none');
      big?.style.setProperty('--lead', l);
      door?.style.setProperty('--lead', l);
    }
    show(seg < 0.5 ? -1 : Math.min(n - 1, Math.floor(seg - 0.5)));
    if (scrubbing && !reduced()) clock(seg - 1);
    if (!reduced()) motion(seg);
  };
  // The scroll's motion: how far through its stretch the chapter on is (its words and photographs drift with it), and
  // how fast the story is being scrolled (they lean a little), which eases back to rest once the scroll stops. Set on
  // the chapter and the photographs on screen only (the only ones that use them): set on the whole stage, every
  // element of the story was restyled each frame.
  let lastY = window.scrollY;
  let vel = 0; // the lean, eased towards how fast the scroll is going
  let restRaf = 0;
  let restTimer = 0;
  let movedCp = '';
  let movedVel = '';
  let movedAt = -2; // the chapter they were last set on: a new one gets both at once
  const moving = () => [at >= 0 ? chapters[at] : null, medias.find((m) => Number(m.dataset.storyMedia) === at) ?? null].filter((el): el is HTMLElement => !!el);
  const tip = (v: number) => {
    const value = v.toFixed(3);
    if (value === movedVel) return;
    movedVel = value;
    moving().forEach((el) => el.style.setProperty('--story-vel', value));
  };
  const settle = () => {
    vel *= 0.82;
    if (Math.abs(vel) < 0.004) vel = 0;
    tip(vel);
    restRaf = vel ? requestAnimationFrame(settle) : 0;
  };
  const motion = (seg: number) => {
    if (at !== movedAt) {
      movedAt = at;
      movedCp = movedVel = '';
    }
    lastCp = at < 0 ? 0.5 : clamp(seg - (at + 0.5));
    const cp = lastCp.toFixed(3);
    if (cp !== movedCp) {
      movedCp = cp;
      moving().forEach((el) => el.style.setProperty('--cp', cp));
    }
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    // An ordinary scroll leans them only a touch; a quick flick, fully.
    const want = clamp(dy / (window.innerHeight * 0.14), -1, 1);
    vel += (want - vel) * 0.35;
    cancelAnimationFrame(restRaf);
    tip(vel);
    window.clearTimeout(restTimer);
    restTimer = window.setTimeout(() => (restRaf = requestAnimationFrame(settle)), 90);
  };
  // The marks' names: one that would touch the name before it (a narrower screen) steps out of the way, so they never
  // run together; the preview still names it when pointed at.
  const hush = () => {
    let end = -Infinity;
    const gap = 0.75 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    ticks.forEach((tk) => {
      tk.classList.remove('is-hushed');
      if (tk.classList.contains('story__tick--again')) return;
      const r = tk.querySelector('span')?.getBoundingClientRect();
      if (!r || !r.width) return;
      if (r.left < end + gap) tk.classList.add('is-hushed');
      else end = r.right;
    });
  };
  const refresh = () => {
    measure();
    lastP = '';
    update();
    hush();
  };
  measure();
  update();
  hush();
  new ResizeObserver(refresh).observe(track);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh);
  // Lenis's own frame, once it's running (it starts after this); the plain scroll event without it.
  requestAnimationFrame(() => {
    const l = lenis();
    if (l?.on) return void l.on('scroll', update);
    let queued = false;
    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    }, { passive: true });
  });

  // The chapter last glided to, and when: a key pressed again mid-glide steps on from there, not from the one on.
  let aim = -1;
  let aimAt = 0;
  const goTo = (i: number) => {
    aim = i;
    aimAt = performance.now();
    const y = yFor(i);
    const l = lenis();
    if (l) l.scrollTo(y, { duration: reduced() ? 0 : 1.1, immediate: reduced() });
    else window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
  };
  ticks.forEach((tk, i) => tk.addEventListener('click', (e) => {
    e.preventDefault();
    stop();
    goTo(i);
  }));

  // The notification (the owner, 2026-11-13): a moment after the page opens, while the opening is still on, Stride says
  // the story can be skipped with the button, and the button shines; it goes after a while, with the first chapter or
  // with a skip. Every time the page opens (the owner asked for it again, 2026-11-13: once per visit was too easy to
  // miss).
  if (note) {
    whenLoaded(() => {
      noteTimer = window.setTimeout(() => {
        if (at >= 0) return;
        note.classList.add('is-on');
        skipBtn?.classList.add('is-calling');
        playChime();
        noteTimer = window.setTimeout(hideNote, 8000);
      }, 1400);
    });
  }

  initTikTok(root, () => stop());


  // Skipping (the owner, 2026-11-13): straight to what follows the story, in one move, and the keyboard's focus with it.
  // Little prints round a photograph keep to its corners whatever its shape: its height for its width (--mh), once
  // it's in, and again when the screen changes.
  const tuckedRound = [...root.querySelectorAll<HTMLElement>('.story__media--tucked')];
  const shape = () =>
    tuckedRound.forEach((m) => {
      const main = m.querySelector<HTMLElement>('.story__print:not(.story__print--small)');
      if (main?.offsetWidth) m.style.setProperty('--mh', (main.offsetHeight / main.offsetWidth).toFixed(3));
    });
  tuckedRound.forEach((m) => m.querySelector<HTMLImageElement>('.story__print:not(.story__print--small) img')?.addEventListener('load', shape));
  window.addEventListener('resize', shape, { passive: true });
  window.addEventListener('load', shape);
  shape();

  // The team's first faces start on their way as soon as the button is pointed at, so they're there when it lands.
  let warmed = false;
  const warmTeam = () => {
    if (warmed) return;
    warmed = true;
    [...document.querySelectorAll<HTMLImageElement>('[data-tfield] img[loading="lazy"]')].slice(0, 36).forEach((img) => (img.loading = 'eager'));
  };
  skipBtn?.addEventListener('pointerenter', warmTeam);
  skipBtn?.addEventListener('focus', warmTeam);
  skipBtn?.addEventListener('click', () => {
    hideNote();
    warmTeam();
    stop();
    const y = root.getBoundingClientRect().bottom + window.scrollY;
    const l = lenis();
    if (l) l.scrollTo(y, { immediate: true });
    else window.scrollTo({ top: y, behavior: 'instant' });
    let next = root.nextElementSibling as HTMLElement | null;
    while (next && (next.matches('script, style, template') || !next.offsetHeight)) next = next.nextElementSibling as HTMLElement | null;
    if (next) {
      if (!next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1');
      next.focus({ preventScroll: true });
    }
  });

  /* ---------- The footage behind, scrubbed with the story ---------- */
  // Seeks don't pile up in the decoder: the latest one waits until the one under way is done. While dragging, the
  // nearest frame is enough (fastSeek, where there is one); let go, the exact one.
  let pendingAt = -1;
  let pendingFast = false;
  const flushSeek = () => {
    if (!footage || pendingAt < 0) return;
    const t = pendingAt;
    pendingAt = -1;
    if (pendingFast && typeof footage.fastSeek === 'function') footage.fastSeek(t);
    else footage.currentTime = t;
  };
  footage?.addEventListener('seeked', flushSeek);
  const footTo = (p: number, fast: boolean) => {
    if (!footage || !footage.duration || reduced()) return;
    pendingAt = p * footage.duration;
    pendingFast = fast;
    if (!footage.seeking) flushSeek();
  };

  /* ---------- The bar: a press seeks there, a drag takes the story by hand ---------- */
  let left = 0;
  const toP = (clientX: number) => clamp((clientX - left) / trackW);
  const seekTo = (p: number, hand: boolean) => {
    const y = top + p * room;
    const l = lenis();
    if (l) l.scrollTo(y, hand || reduced() ? { immediate: true } : { duration: 0.6 });
    else window.scrollTo({ top: y, behavior: hand || reduced() ? 'auto' : 'smooth' });
    footTo(p, hand);
  };
  let pressed = false;
  let startX = 0;
  let wasPlaying = false;
  track.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('[data-story-go]') || e.button !== 0) return;
    e.preventDefault();
    stop();
    pressed = true;
    startX = e.clientX;
    left = track.getBoundingClientRect().left;
    track.setPointerCapture(e.pointerId);
    track.classList.add('is-dragging');
    wasPlaying = !!footage && !footage.paused;
    seekTo(toP(e.clientX), false);
  });
  track.addEventListener('pointermove', (e) => {
    if (!pressed) {
      // The ghost of the head, where a press would land (not over a mark, which goes to its chapter).
      const overTick = !!(e.target as Element).closest('[data-story-go]');
      track.classList.toggle('is-hover', !overTick);
      if (ghost && !overTick) ghost.style.transform = `translate3d(${(e.clientX - left).toFixed(1)}px, 0, 0)`;
      return;
    }
    if (!scrubbing && Math.abs(e.clientX - startX) > 4 * uiScale()) {
      scrubbing = true;
      footage?.pause();
      if (!reduced()) big?.classList.add('is-scrubbing');
    }
    if (scrubbing) seekTo(toP(e.clientX), true);
  });
  track.addEventListener('pointerenter', () => (left = track.getBoundingClientRect().left));
  track.addEventListener('pointerleave', () => track.classList.remove('is-hover'));
  const release = () => {
    if (!pressed) return;
    pressed = false;
    track.classList.remove('is-dragging');
    if (!scrubbing) return;
    scrubbing = false;
    // Let go: the counter rolls on from wherever it is onto the chapter's own year, and the footage lands exactly.
    big?.classList.remove('is-scrubbing');
    rolling(false);
    const year = chapters[at]?.dataset.year;
    if (year) setDigits(year, true);
    footTo(clamp((window.scrollY - top) / room), false);
    if (wasPlaying) footage?.play().catch(() => {});
  };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);

  // The head on the keyboard: the arrows step a chapter, Page Up/Down two, Home and End the first and the last.
  head.addEventListener('keydown', (e) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 2, PageDown: -2 };
    const from = performance.now() - aimAt < 1100 ? aim : at;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : steps[e.key] !== undefined ? from + steps[e.key] : null;
    if (to === null) return;
    e.preventDefault();
    goTo(clamp(to, 0, n - 1));
  });

  /* ---------- A mark, pointed at or focused, names its chapter ---------- */
  const name = (i: number) => {
    if (!preview || !previewMark || !previewName) return;
    previewMark.textContent = chapters[i]?.dataset.mark ?? '';
    previewName.textContent = chapters[i]?.querySelector('[data-story-title]')?.getAttribute('aria-label') ?? '';
    // Above its mark, kept inside the bar.
    const x = ((i + 1) / (n + 1)) * trackW;
    const w = preview.offsetWidth;
    preview.style.setProperty('--px', `${clamp(x - w / 2, 0, Math.max(0, trackW - w)).toFixed(1)}px`);
    track.classList.add('has-preview');
  };
  const unname = () => track.classList.remove('has-preview');
  ticks.forEach((tk, i) => {
    tk.addEventListener('pointerenter', () => name(i));
    tk.addEventListener('pointerleave', unname);
    tk.addEventListener('focus', () => tk.matches(':focus-visible') && name(i));
    tk.addEventListener('blur', unname);
  });

  /* ---------- Play: on a chapter every few seconds, to the end; the visitor taking over stops it ---------- */
  let timer = 0;
  let fillAnim: Animation | null = null;
  // The way from the chapter on to the next fills in the time it stays.
  const runTimer = (i: number) => {
    fillAnim?.cancel();
    fillAnim = null;
    if (!timerLine || reduced() || i >= n - 1) return timerLine?.classList.remove('is-on');
    timerLine.style.setProperty('--from', `${((i + 1) / (n + 1)) * 100}%`);
    timerLine.style.setProperty('--len', `${(1 / (n + 1)) * 100}%`);
    timerLine.classList.add('is-on');
    fillAnim = timerLine.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: PLAY_EVERY, easing: 'linear', fill: 'forwards' });
  };
  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
    fillAnim?.pause();
    timerLine?.classList.remove('is-on');
    if (play) {
      play.setAttribute('aria-pressed', 'false');
      play.setAttribute('aria-label', play.dataset.play ?? '');
    }
  };
  const start = () => {
    if (!play) return;
    play.setAttribute('aria-pressed', 'true');
    play.setAttribute('aria-label', play.dataset.pause ?? '');
    const step = () => {
      const next = Math.min(n - 1, at + 1);
      goTo(next);
      runTimer(next);
      if (next >= n - 1) stop();
    };
    if (at >= n - 1) {
      goTo(0);
      runTimer(0);
    } else step();
    timer = window.setInterval(step, PLAY_EVERY);
  };
  const toggle = () => (timer ? stop() : start());
  play?.addEventListener('click', toggle);
  // Space or K plays and pauses from anywhere in the bar (Space on the button is the button's own).
  player.addEventListener('keydown', (e) => {
    if ((e.key !== ' ' && e.key.toLowerCase() !== 'k') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' && e.target === play) return;
    e.preventDefault();
    toggle();
  });
  const playKeys = (e: KeyboardEvent) => player.contains(e.target as Node) && (e.key === ' ' || e.key.toLowerCase() === 'k');
  window.addEventListener('wheel', () => timer && stop(), { passive: true });
  window.addEventListener('keydown', (e) => {
    if (timer && !(e.target as Element).closest?.('[data-story-play]') && !playKeys(e)) stop();
  });
  document.addEventListener('pointerdown', (e) => {
    if (timer && !player.contains(e.target as Node)) stop();
  });
  document.addEventListener('visibilitychange', () => document.hidden && stop());

  /* ---------- One scroll, one chapter (with motion) ----------
     The owner, 2026-11-13: "make each scroll feel fast and effortless". In the story a turn of the wheel, a swipe on a
     trackpad or an arrow key (Page Down, Space) is the next chapter, or the one before, glided to in about half a
     second; spinning the wheel on keeps going, a chapter at a time. From the last chapter on down (and from the opening
     up) the page scrolls as usual, on to the team. The scrollbar and the player's bar still go anywhere. */
  const GLIDE = 0.5; // s, a chapter's glide
  const GESTURE_GAP = 200; // ms without the wheel that ends a gesture (a trackpad's swipe and its glide are one)
  const SPIN_STEP = 220; // how far a wheel spun on turns for each further chapter
  const SPIN_EVERY = 380; // ms at least between chapters while it spins
  let lastWheel = 0;
  let lastDir = 0;
  let stepAt = 0;
  let spun = 0;
  const easeOut = (t: number) => 1 - (1 - t) ** 3;
  const inStory = () => window.scrollY >= top - 2 && window.scrollY <= top + room + 2;
  const heading = () => (performance.now() - aimAt < GLIDE * 1000 + 120 ? aim : at); // where it is, or is gliding to
  const tiktokOpen = () => !!root.querySelector<HTMLDialogElement>('[data-story-tiktok]')?.open;
  const canStep = () => !reduced() && !scrubbing && !tiktokOpen() && inStory();
  const step = (dir: number) => {
    const to = heading() + dir;
    if (to < -1 || to > n - 1) return;
    if (timer) stop();
    stepAt = performance.now();
    aim = to;
    aimAt = stepAt;
    const y = yFor(to);
    const l = lenis();
    if (l) l.scrollTo(y, { duration: GLIDE, easing: easeOut, force: true });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };
  // Out of the story at either end: the page's own scroll takes over.
  const leaving = (dir: number) => (dir > 0 && heading() >= n - 1) || (dir < 0 && heading() <= -1);
  window.addEventListener('wheel', (e) => {
    // Over the dial at the edge, the wheel is the dial's (it turns, edge-nav.ts): not a step of the story.
    if ((e.target as Element | null)?.closest?.('[data-radial]')) return;
    if (!canStep() || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || !e.deltaY) return;
    const dir = Math.sign(e.deltaY);
    const now = performance.now();
    const fresh = now - lastWheel > GESTURE_GAP || dir !== lastDir;
    lastWheel = now;
    lastDir = dir;
    if (leaving(dir)) return;
    // The smooth scroll (Lenis, on the same window) never sees it: the glide is ours.
    e.preventDefault();
    e.stopImmediatePropagation();
    if (fresh) {
      spun = 0;
      step(dir);
      return;
    }
    spun += Math.abs(e.deltaY);
    if (now - stepAt > SPIN_EVERY && spun > SPIN_STEP) {
      spun = 0;
      step(dir);
    }
  }, { capture: true, passive: false });
  window.addEventListener('keydown', (e) => {
    if (!canStep() || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest?.('input, textarea, select, button, a, [role="slider"], [contenteditable="true"], dialog')) return;
    const dir = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey) ? 1
      : e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey) ? -1 : 0;
    if (!dir || leaving(dir)) return;
    e.preventDefault();
    step(dir);
  });

  // Touch (phones and tablets): a swipe up or down in the story is the next chapter or the one before, glided to, as a
  // turn of the wheel is; the page doesn't scroll under it. From the last chapter on down (and from the opening up),
  // and a sideways swipe, the page's own scroll and the finger take over.
  let touchX = 0;
  let touchY = 0;
  let touching = false;
  let swiped = false;
  const SWIPE = 28; // px of travel that makes a swipe
  window.addEventListener('touchstart', (e) => {
    touching = e.touches.length === 1 && canStep() && !(e.target as Element).closest?.('[data-story-player], dialog');
    swiped = false;
    touchX = e.touches[0]?.clientX ?? 0;
    touchY = e.touches[0]?.clientY ?? 0;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!touching) return;
    const dx = (e.touches[0]?.clientX ?? 0) - touchX;
    const dy = touchY - (e.touches[0]?.clientY ?? 0);
    if (!swiped && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      touching = false;
      return;
    }
    const dir = Math.sign(dy);
    if (!dir) return;
    if (!swiped && leaving(dir)) {
      touching = false;
      return;
    }
    e.preventDefault();
    if (!swiped && Math.abs(dy) > SWIPE) {
      swiped = true;
      step(dir);
    }
  }, { passive: false });
  window.addEventListener('touchend', () => (touching = false), { passive: true });
  window.addEventListener('touchcancel', () => (touching = false), { passive: true });

  /* ---------- The year leans towards the pointer ---------- */
  // One eased value per frame, written as a transform (nothing redrawn); back to flat when the pointer leaves the page.
  // (The soft light that crossed it is gone: the owner, 2026-11-13, "delete this".)
  let rx = 0;
  let ry = 0;
  let toRx = 0;
  let toRy = 0;
  let leanRaf = 0;
  const lean = () => {
    leanRaf = 0;
    if (!big) return;
    rx += (toRx - rx) * 0.12;
    ry += (toRy - ry) * 0.12;
    const still = Math.abs(toRx - rx) < 0.01 && Math.abs(toRy - ry) < 0.01;
    if (still) {
      rx = toRx;
      ry = toRy;
    }
    big.style.transform = `perspective(75rem) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    if (!still && visible) leanRaf = requestAnimationFrame(lean);
  };
  const leanOn = () => {
    if (!leanRaf && visible) leanRaf = requestAnimationFrame(lean);
  };
  if (!reduced() && big) {
    root.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      toRy = nx * 14;
      toRx = -ny * 10;
      leanOn();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => {
      toRx = toRy = 0;
      leanOn();
    }, { passive: true });
  }

  // Off screen (the team below, the footer): play stops, and the lean and the places rest.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) stop();
    else leanOn();
    cyclePlaces();
  }).observe(root);
}
