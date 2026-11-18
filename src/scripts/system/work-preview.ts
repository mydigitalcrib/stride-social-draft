// Behaviour for the case study panel in experience/WorkCanvas.astro (Our Work, desktop): a click on a tile opens the
// whole case study over the canvas, without leaving the page. The tile grows into its picture (from where it was on
// the screen to its place on the left, the picture inside keeping its proportions and starting as the tile showed it),
// the canvas dims behind it, and the case rises in on the right, part after part, to read down (the wheel anywhere
// over it and the up and down keys read it on in one glide; a hairline beside it shows how far). Its
// footage plays over the picture, if it has some, as stories do: a bar for each clip along the top, filling as it
// plays, one clip running on into the next (the tile's own footage carrying on from where it was); a press on the
// picture goes on to the next (on its left edge, back), a drag sideways does the same, and held, the clip waits. A tall
// clip (a reel) stands whole in the frame. The picture leans a little towards the pointer, a light moving across it,
// over a glow in its own colours; the client's name comes in letter by letter, and runs past in outline behind.
// Verified results count up to themselves as they first come into view in the column, as on the case study's page.
// The previous and next projects are a step away: their pictures wait at the screen's edges, and a press on one (or
// the left and right keys) swaps it in: its picture travels in from where it was waiting, this one goes to wait at
// the other edge, and the next one along slides into the place it left. Escape, the close button or a click on the
// dark around it closes it, the picture shrinking back into its tile. Meanwhile the page doesn't scroll and the
// keyboard stays inside. The canvas can close it and read down it too.
// On a screen larger than 1920×1080 its distances grow with the root size, as the styles do (scale.ts).
import { deskScale } from './scale';
import { clamp, lenis, reduced } from './env';

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** px: its corners, as drawn there. */
  radius?: number;
  /** deg: turned, as the projects waiting at the edges are. */
  rotate?: number;
  /** Dimmed, as they are. */
  filter?: string;
  /** A canvas tile's picture, moved towards the pointer inside its frame (-1 to 1 each way). */
  shift?: [number, number];
};
/** A tile's footage, playing: the case study's clip carries on from there if it's the same. */
export type Carry = { src: string; time: number };
export type Preview = {
  open(key: string, from?: Rect | null, carry?: Carry | null): void;
  isOpen(): boolean;
  close(): void;
  /** Reads down the case (or back up) by this many px. */
  scrollBy(px: number): void;
};

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const GROW_MS = 720;
const SHRINK_MS = 520;
const SWAP_MS = 200;
const TRAVEL_MS = 360; // swapped for the next: this picture going to wait at the other edge...
const ARRIVE_MS = 620; // ...the chosen one's coming in from its edge...
const THUMB_MS = 420; // ...and the next one along sliding into the place it left,
const THUMB_AFTER = 180; // this long after
const THUMB_FROM = 40; // px it slides in from, beyond the screen's edge
const COUNT_MS = 1000; // a verified figure counting up
const LEAN = 0.09; // per frame, how quickly the picture takes up where the pointer is
const READ = 0.18; // per frame (at 60 a second), the share of the way to where it's being read to that the case covers
const HOLD_MS = 220; // pressed this long, the clip waits
const DRAG_PX = 44; // dragged this far sideways, it's the next clip (or the one before)
const SLIDE = 90; // px a project comes in from, and leaves by (swapped other than for a neighbour)
const STEP_PX = 60; // the up and down keys read on by this much
// A canvas tile shows its picture a touch inside its edges, moved up to 3% towards the pointer (work-canvas.ts).
const TILE_ZOOM = 1 / 0.93;
const TILE_SHIFT = 3 / 0.93; // % of the frame, for a shift of 1

// The smallest version of a picture that's still sharp at a given width (from the srcset the build adds).
const thumbOf = (img: HTMLImageElement | null, wide = 120) => {
  if (!img) return '';
  const sizes = (img.getAttribute('srcset') ?? '')
    .split(',')
    .map((c) => c.trim().split(/\s+/))
    .filter((c) => c[0] && /w$/.test(c[1] ?? ''))
    .map((c) => ({ url: c[0], w: parseInt(c[1], 10) }))
    .sort((a, b) => a.w - b.w);
  return (sizes.find((c) => c.w >= wide) ?? sizes[sizes.length - 1])?.url ?? img.getAttribute('src') ?? '';
};

// Where an element is drawn, as it is, unturned: its middle, its size (scaled as it is), how it's turned, its corners
// and its filter. (For the projects waiting at the edges: their button is what's turned and scaled.)
const boxOf = (button: HTMLElement, pic: HTMLElement): Rect => {
  const box = pic.getBoundingClientRect();
  const turn = getComputedStyle(button);
  const look = getComputedStyle(pic);
  const k = parseFloat(turn.scale) || 1;
  const width = pic.offsetWidth * k;
  const height = pic.offsetHeight * k;
  return {
    left: box.left + box.width / 2 - width / 2,
    top: box.top + box.height / 2 - height / 2,
    width,
    height,
    rotate: parseFloat(turn.rotate) || 0,
    radius: (parseFloat(look.borderTopLeftRadius) || 0) * k,
    filter: look.filter,
  };
};

export function initWorkPreview(
  root: HTMLElement,
  opts: { onOpen?: () => void; onClose?: () => void; rectOf?: (key: string) => Rect | null } = {},
): Preview | null {
  const dialog = root.querySelector<HTMLElement>('[data-preview]');
  const stage = root.querySelector<HTMLElement>('[data-preview-stage]');
  const sources = [...root.querySelectorAll<HTMLElement>('[data-preview-for]')];
  if (!dialog || !stage || !sources.length) return null;
  const keys = sources.map((el) => el.dataset.previewFor ?? '');
  const names = sources.map((el) => el.querySelector('h2')?.textContent?.trim() ?? '');
  let current = -1;
  let openedKey = '';
  let from: Rect | null = null;
  let carry: Carry | null = null; // the tile's footage, for the first clip
  let returnFocus: HTMLElement | null = null;
  let busy = false;
  const body = () => stage.querySelector<HTMLElement>('[data-preview-body]');
  const read = dialog.querySelector<HTMLElement>('[data-preview-read]');
  const films = () => [...stage.querySelectorAll<HTMLVideoElement>('[data-clip]')];
  const peeks = [...dialog.querySelectorAll<HTMLElement>('[data-preview-step]')];
  let clip = 0; // which clip is playing
  let raf = 0;
  let lastFrame = 0;
  // Where the pointer is over the screen (-1 to 1 each way), and where the picture's lean has got to.
  let aimX = 0;
  let aimY = 0;
  let leanX = 0;
  let leanY = 0;
  let readTo: number | null = null; // where the case is being read to (it glides there)

  // Its clips, as stories: one plays at a time, over the picture, and runs on into the next (a single one goes
  // round); a tall one stands whole in the frame. The bars of those already played stay full. The first carries on
  // from the tile's own footage, if it's the same, without fading in again.
  const play = (n: number) => {
    const media = stage.querySelector<HTMLElement>('[data-preview-media]');
    const all = films();
    const resume = n === 0 && carry ? carry : null;
    carry = null;
    if (!all.length) return;
    clip = (n + all.length) % all.length;
    all.forEach((film, k) => {
      if (k !== clip) {
        film.pause();
        film.classList.remove('is-in');
        return;
      }
      if (reduced() || !film.dataset.src) return;
      const at = resume && resume.src === film.dataset.src ? resume.time : -1;
      if (!film.src) film.src = film.dataset.src;
      film.loop = all.length === 1;
      film.onended = () => play(clip + 1);
      film.onloadedmetadata = () => {
        const tall = film.videoHeight > film.videoWidth;
        film.classList.toggle('is-tall', tall);
        media?.classList.toggle('is-tall', tall);
      };
      film.classList.toggle('is-cut', at >= 0);
      film.onplaying = () => film.classList.add('is-in');
      film.currentTime = Math.max(0, at);
      film.play().catch(() => {});
    });
    stage.querySelectorAll<HTMLElement>('[data-clip-pick]').forEach((b) => {
      const k = Number(b.dataset.clipPick);
      b.setAttribute('aria-pressed', String(k === clip));
      b.classList.toggle('is-done', k < clip);
      b.style.setProperty('--p', '0');
    });
    const caption = stage.querySelector('[data-clip-caption]');
    if (caption) caption.textContent = all[clip]?.dataset.caption ?? '';
  };

  // Reading on: where it's sent (from wherever it's on its way to), and it glides there, frame by frame.
  const readBy = (px: number) => {
    const text = body();
    if (!text) return;
    const room = Math.max(0, text.scrollHeight - text.clientHeight);
    const to = Math.max(0, Math.min(room, (readTo ?? text.scrollTop) + px));
    if (reduced()) {
      readTo = null;
      text.scrollTop = to;
    } else readTo = to;
  };
  const glide = (dt: number) => {
    const text = body();
    if (!text || readTo === null) return void (readTo = null);
    const was = text.scrollTop;
    const left = readTo - was;
    if (Math.abs(left) < 0.5) {
      text.scrollTop = readTo;
      readTo = null;
      return;
    }
    text.scrollTop = was + left * (1 - Math.pow(1 - READ, dt));
    // (Where the browser keeps whole px, the last few are taken at once.)
    if (Math.abs(text.scrollTop - was) < 0.01) {
      text.scrollTop = readTo;
      readTo = null;
    }
  };

  // A verified figure counting up to itself, once (its width held and its figures all as wide meanwhile, so nothing
  // beside it moves); it ends on the figure exactly as verified.
  const countUp = (el: HTMLElement) => {
    const match = (el.dataset.count ?? '').match(/^([^\d]*)([\d,.]+)(.*)$/);
    if (!match || el.dataset.counted || reduced()) return;
    el.dataset.counted = 'true';
    const [, before, digits, after] = match;
    const target = Number(digits.replace(/,/g, ''));
    // (One figure only: a range or a ratio, "10-15%" or "24/7", stays as it is.)
    if (!Number.isFinite(target) || /\d/.test(after)) return;
    const places = digits.includes('.') ? digits.split('.')[1].length : 0;
    const format = { minimumFractionDigits: places, maximumFractionDigits: places, useGrouping: digits.includes(',') };
    // (Held at its own width, on one line: equal-width figures can be a touch wider than its own, and mustn't push.)
    el.style.width = `${el.offsetWidth}px`;
    el.style.whiteSpace = 'nowrap';
    el.classList.add('is-counting');
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / COUNT_MS);
      if (k < 1 && el.isConnected) {
        el.textContent = `${before}${(target * (1 - (1 - k) ** 3)).toLocaleString('en-GB', format)}${after}`;
        requestAnimationFrame(step);
        return;
      }
      el.textContent = el.dataset.count ?? '';
      el.style.width = '';
      el.style.whiteSpace = '';
      el.classList.remove('is-counting');
    };
    requestAnimationFrame(step);
  };
  // Each counts as it first comes into view in the column (not as its part reaches the top: by then it has been read,
  // and it mustn't drop back to nothing), clear of the column's faded foot.
  let figures: IntersectionObserver | null = null;
  const watchFigures = () => {
    figures?.disconnect();
    figures = null;
    const text = body();
    const all = [...stage.querySelectorAll<HTMLElement>('[data-count]')];
    if (!text || !all.length || reduced() || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          countUp(entry.target as HTMLElement);
        }),
      { root: text, rootMargin: `0px 0px -${Math.round(64 * deskScale())}px 0px`, threshold: 1 },
    );
    all.forEach((el) => io.observe(el));
    figures = io;
  };

  // How far down the case has been read, and which of its chapters it's at.
  let spot = () => {};
  const reading = () => {
    const text = body();
    if (!read || !text) return;
    const room = text.scrollHeight - text.clientHeight;
    read.classList.toggle('is-off', room < 8);
    read.style.setProperty('--read', room < 8 ? '0' : (text.scrollTop / room).toFixed(4));
    spot();
  };

  // Its chapters, at the top of the column: the one being read lit (the last whose part has come up under the bar; the
  // last of all at the foot), its part in full voice; a press on one reads straight to its part.
  const chapters = () => {
    const text = body();
    const nav = stage.querySelector<HTMLElement>('[data-preview-chapters]');
    const parts = [...stage.querySelectorAll<HTMLElement>('[data-part]')];
    const buttons = [...(nav?.querySelectorAll<HTMLButtonElement>('[data-chapter]') ?? [])];
    const line = nav?.querySelector<HTMLElement>('[data-chapter-line]');
    if (!text || !nav || parts.length < 2 || buttons.length !== parts.length) {
      spot = () => {};
      return;
    }
    text.classList.add('has-chapters');
    let at = -1;
    const light = (n: number) => {
      if (n === at) return;
      at = n;
      buttons.forEach((b, k) => (k === n ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
      parts.forEach((p, k) => p.classList.toggle('is-current', k === n));
      const b = buttons[n];
      if (line && b) {
        // (Its length by scaling a line of 100px: --cw is the button's width in px, unitless.)
        line.style.setProperty('--cx', `${b.offsetLeft}px`);
        line.style.setProperty('--cw', String(b.offsetWidth));
        line.style.translate = `0 ${b.offsetTop + b.offsetHeight - nav.clientHeight + 6 * deskScale()}px`;
      }
    };
    spot = () => {
      const room = text.scrollHeight - text.clientHeight;
      const under = text.getBoundingClientRect().top + nav.offsetHeight + 40 * deskScale();
      let n = 0;
      parts.forEach((p, k) => {
        if (p.getBoundingClientRect().top <= under) n = k;
      });
      if (room > 8 && text.scrollTop >= room - 4) n = parts.length - 1;
      light(n);
    };
    buttons.forEach((b, k) =>
      b.addEventListener('click', () => {
        const to = parts[k].getBoundingClientRect().top - text.getBoundingClientRect().top + text.scrollTop - nav.offsetHeight - 4 * deskScale();
        readTo = null;
        readBy(Math.max(0, to) - text.scrollTop);
      }),
    );
    // Once it has risen in (its place is measured then).
    window.setTimeout(spot, 700);
    spot();
  };

  // While it's open, every frame: the playing clip's bar, reading on, and the picture's lean towards the pointer.
  const lean = (to?: number) => {
    if (to !== undefined) leanX = leanY = to;
    stage.style.setProperty('--lx', leanX.toFixed(4));
    stage.style.setProperty('--ly', leanY.toFixed(4));
  };
  const frame = (now: number) => {
    raf = 0;
    if (dialog.hidden) return;
    const dt = lastFrame ? Math.min(3, (now - lastFrame) / (1000 / 60)) : 1;
    lastFrame = now;
    const film = films()[clip];
    const bar = stage.querySelector<HTMLElement>(`[data-clip-pick="${clip}"]`);
    if (film && bar && film.duration) bar.style.setProperty('--p', Math.min(1, film.currentTime / film.duration).toFixed(4));
    if (readTo !== null) glide(dt);
    if (!reduced() && !busy) {
      leanX += (aimX - leanX) * LEAN;
      leanY += (aimY - leanY) * LEAN;
      lean();
    }
    raf = requestAnimationFrame(frame);
  };
  dialog.addEventListener('pointermove', (e) => {
    aimX = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
    aimY = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
  });
  dialog.addEventListener('pointerleave', () => (aimX = aimY = 0));

  // The projects either side: which they are, their names and pictures (each fetched at the size it's shown at).
  const neighbour = (b: HTMLElement, i: number) => (i + Number(b.dataset.previewStep) + keys.length) % keys.length;
  const srcOf = (b: HTMLElement, n: number) => {
    const wide = Math.round((b.offsetWidth || 300 * deskScale()) * Math.min(2, window.devicePixelRatio || 1));
    return thumbOf(sources[n].querySelector('img'), wide);
  };
  const pictureOf = (b: HTMLElement, n: number) => {
    const src = srcOf(b, n);
    return src ? `url("${src}")` : '';
  };
  // A picture fetched and decoded ahead, so it's there the moment it's shown (a swap never shows an empty frame).
  const ready = (src: string) => {
    if (!src) return Promise.resolve();
    const img = new Image();
    img.src = src;
    return img.decode().catch(() => undefined);
  };
  const setPeeks = (i: number, pictures: boolean) =>
    peeks.forEach((b) => {
      const n = neighbour(b, i);
      const label = b.querySelector('[data-preview-step-name]');
      if (label) label.textContent = names[n];
      const thumb = b.querySelector<HTMLElement>('[data-preview-step-thumb]');
      if (thumb && pictures) thumb.style.backgroundImage = pictureOf(b, n);
    });

  // Puts a case study in: its picture and footage, its story (each part with its place in the order they rise in),
  // and the names of the projects either side (and their pictures, unless a swap brings them in itself).
  const fill = (i: number, pictures = true) => {
    readTo = null;
    stage.replaceChildren(...[...sources[i].children].map((el) => el.cloneNode(true)));
    stage.querySelectorAll<HTMLElement>('[data-preview-body] > *').forEach((el, n) => el.style.setProperty('--i', String(n)));
    stage.querySelectorAll('img').forEach((img) => (img.loading = 'eager'));
    // Its name, cut into words and letters so they can come in one after another (read out whole).
    const name = stage.querySelector('h2');
    if (name) {
      name.id = 'wpreview-name';
      name.setAttribute('aria-label', names[i]);
      let k = 0;
      name.replaceChildren(
        ...names[i].split(/\s+/).flatMap((word, n) => {
          const el = document.createElement('span');
          el.className = 'wpreview__word';
          el.setAttribute('aria-hidden', 'true');
          for (const letter of word) {
            const span = document.createElement('span');
            span.textContent = letter;
            span.style.setProperty('--k', String(k++));
            el.append(span);
          }
          return n ? [' ', el] : [el];
        }),
      );
    }
    dialog.setAttribute('aria-labelledby', 'wpreview-name');
    // The glow behind the picture: the picture itself (a small copy is enough, it's blurred).
    const aura = stage.querySelector<HTMLElement>('[data-preview-aura]');
    const own = thumbOf(sources[i].querySelector('img'));
    if (aura) aura.style.backgroundImage = own ? `url("${own}")` : '';
    play(0);
    body()?.addEventListener('scroll', reading, { passive: true });
    reading();
    chapters();
    watchFigures();
    setPeeks(i, pictures);
  };

  // The picture inside keeps its own proportions while its frame is stretched to another's (the tile's, or an edge's),
  // and starts as a canvas tile showed it (a touch larger, moved towards the pointer), so nothing jumps.
  const inner = (media: HTMLElement, sx: number, sy: number, shift: Rect['shift'], back: boolean, timing: KeyframeAnimationOptions) => {
    const m = Math.max(sx, sy);
    media.querySelectorAll<HTMLElement>('.wpreview__picture, .wpreview__film').forEach((el) => {
      const pic = !!shift && el.classList.contains('wpreview__picture');
      const z = pic ? TILE_ZOOM : 1;
      const [hx, hy] = pic && shift ? shift : [0, 0];
      const frames: Keyframe[] = [{ transform: `translate(${hx * TILE_SHIFT}%, ${hy * TILE_SHIFT}%) scale(${(m / sx) * z}, ${(m / sy) * z})` }, { transform: 'none' }];
      el.animate(back ? frames.reverse() : frames, timing);
    });
  };

  // The picture grows from where it was on the screen (a tile, an edge's picture, the list's) to its own place, turned
  // and dimmed as it was there; or shrinks back. Its bars wait until it has arrived.
  const grow = (rect: Rect | null, back = false, ms = back ? SHRINK_MS : GROW_MS) => {
    const media = stage.querySelector<HTMLElement>('[data-preview-media]');
    if (!media || !rect || reduced() || !rect.width || !rect.height) return Promise.resolve();
    const end = media.getBoundingClientRect();
    const sx = rect.width / end.width;
    const sy = rect.height / end.height;
    const round = parseFloat(getComputedStyle(media).borderTopLeftRadius) || 0;
    const corner = rect.radius ?? 14 * deskScale();
    const dx = rect.left + rect.width / 2 - (end.left + end.width / 2);
    const dy = rect.top + rect.height / 2 - (end.top + end.height / 2);
    const dim = rect.filter && rect.filter !== 'none' ? rect.filter : '';
    const frames: Keyframe[] = [
      { transform: `translate(${dx}px, ${dy}px) rotate(${rect.rotate ?? 0}deg) scale(${sx}, ${sy})`, borderRadius: `${corner / sx}px / ${corner / sy}px`, ...(dim ? { filter: dim } : {}) },
      { transform: 'none', borderRadius: `${round}px`, ...(dim ? { filter: 'none' } : {}) },
    ];
    const timing: KeyframeAnimationOptions = { duration: ms, easing: EASE, fill: back ? 'forwards' : 'none' };
    media.classList.add('is-growing');
    const anim = media.animate(back ? frames.reverse() : frames, timing);
    inner(media, sx, sy, rect.shift, back, timing);
    return anim.finished
      .catch(() => undefined)
      .then(() => {
        if (!back) media.classList.remove('is-growing');
      });
  };

  const show = () => {
    void stage.offsetWidth;
    stage.classList.add('is-shown');
    reading();
  };

  // A project swapped for one other than a neighbour: this one's picture leaves by one side as the stage fades, the
  // other's comes in from the other, and its parts rise again.
  const slide = (d: number, out: boolean) => {
    const side = stage.querySelector<HTMLElement>('.wpreview__side');
    if (!side || reduced()) return;
    const by = SLIDE * deskScale();
    const away = { translate: `${(out ? -d : d) * by}px 0`, opacity: 0 };
    const here = { translate: '0px 0', opacity: 1 };
    side.animate(out ? [here, away] : [away, here], { duration: out ? SWAP_MS : 620, easing: EASE, fill: out ? 'forwards' : 'none' });
  };

  // This project's picture going to wait at the edge, as the one there did: out of the stage (so the next can come in
  // meanwhile, over it), to that edge's place, turned and dimmed as it is.
  const fly = (media: HTMLElement, to: Rect) => {
    const box = media.getBoundingClientRect();
    const w = media.offsetWidth;
    const h = media.offsetHeight;
    const round = parseFloat(getComputedStyle(media).borderTopLeftRadius) || 0;
    stage.before(media);
    media.classList.add('is-growing');
    Object.assign(media.style, {
      position: 'fixed',
      left: `${box.left + box.width / 2 - w / 2}px`,
      top: `${box.top + box.height / 2 - h / 2}px`,
      width: `${w}px`,
      height: `${h}px`,
      maxHeight: 'none',
      margin: '0',
      zIndex: '0',
      pointerEvents: 'none',
    });
    const sx = to.width / w;
    const sy = to.height / h;
    const corner = to.radius ?? round;
    const dx = to.left + to.width / 2 - (box.left + box.width / 2);
    const dy = to.top + to.height / 2 - (box.top + box.height / 2);
    const timing: KeyframeAnimationOptions = { duration: TRAVEL_MS, easing: EASE, fill: 'forwards' };
    inner(media, sx, sy, undefined, true, timing);
    return media
      .animate(
        [
          { transform: 'none', borderRadius: `${round}px`, filter: 'none' },
          { transform: `translate(${dx}px, ${dy}px) rotate(${to.rotate ?? 0}deg) scale(${sx}, ${sy})`, borderRadius: `${corner / sx}px / ${corner / sy}px`, filter: to.filter || 'none' },
        ],
        timing,
      )
      .finished.catch(() => undefined);
  };

  // The next one along slides into the place the chosen picture left, from beyond the screen's edge, over it.
  const slideIn = (b: HTMLElement, way: number, picture: string) => {
    const thumb = b.querySelector<HTMLElement>('[data-preview-step-thumb]');
    if (!thumb) return;
    const layer = thumb.cloneNode(false) as HTMLElement;
    layer.removeAttribute('data-preview-step-thumb');
    layer.style.backgroundImage = picture;
    layer.style.opacity = '';
    thumb.after(layer);
    layer
      .animate([{ translate: `${way * THUMB_FROM * deskScale()}px 0`, opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: THUMB_MS, easing: EASE })
      .finished.catch(() => undefined)
      .then(() => {
        thumb.style.backgroundImage = picture;
        thumb.style.opacity = '';
        layer.remove();
      });
  };

  const go = (d: number) => {
    if (busy || dialog.hidden || !d) return;
    busy = true;
    const way = Math.sign(d);
    current = (current + d + keys.length) % keys.length;
    const media = stage.querySelector<HTMLElement>('[data-preview-media]');
    const chosen = peeks.find((b) => Number(b.dataset.previewStep) === way);
    const across = peeks.find((b) => Number(b.dataset.previewStep) === -way);
    const chosenPic = chosen?.querySelector<HTMLElement>('[data-preview-step-thumb]');
    const acrossPic = across?.querySelector<HTMLElement>('[data-preview-step-thumb]');
    // (Still growing in from where it was opened, it can't travel from where it is: it swaps as before.)
    const growing = !!media?.getAnimations().some((a) => a.playState === 'running');
    if (reduced() || Math.abs(d) !== 1 || growing || !media || !chosen || !across || !chosenPic || !acrossPic) {
      stage.classList.add('is-swapping');
      slide(way, true);
      window.setTimeout(
        () => {
          stage.querySelectorAll('video').forEach((v) => v.pause());
          stage.classList.remove('is-shown');
          fill(current);
          stage.classList.remove('is-swapping');
          show();
          slide(way, false);
          busy = false;
        },
        reduced() ? 0 : SWAP_MS,
      );
      return;
    }
    // A neighbour: the picture waiting at its edge travels in from there, as this one goes to wait at the other edge
    // (the picture there giving way to it), and the story goes quickly, all together, to rise in again.
    const start = boxOf(chosen, chosenPic);
    const end = boxOf(across, acrossPic);
    // The pictures the edges will show next, fetched from now: the travelling picture waits at its edge until that
    // edge's own is ready to take its place (a moment at most, so it's all done before the next swap can begin).
    const waiting = srcOf(across, neighbour(across, current));
    const ahead = srcOf(chosen, neighbour(chosen, current));
    void ready(ahead);
    const atMost = new Promise((done) => window.setTimeout(done, TRAVEL_MS + 240));
    stage.classList.remove('is-shown');
    acrossPic.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: EASE, fill: 'forwards' });
    void Promise.all([fly(media, end), Promise.race([ready(waiting), atMost])]).then(() => {
      acrossPic.style.backgroundImage = waiting ? `url("${waiting}")` : '';
      acrossPic.getAnimations().forEach((a) => a.cancel());
      media.remove();
    });
    window.setTimeout(() => {
      fill(current, false);
      show();
      chosenPic.style.opacity = '0';
      void grow(start, false, ARRIVE_MS).then(() => (busy = false));
      window.setTimeout(() => slideIn(chosen, way, ahead ? `url("${ahead}")` : ''), THUMB_AFTER);
    }, SWAP_MS);
  };

  const open = (key: string, rect?: Rect | null, carried?: Carry | null) => {
    const i = keys.indexOf(key);
    if (i < 0 || busy) return;
    if (!dialog.hidden) return go(i - current);
    current = i;
    openedKey = key;
    from = rect ?? null;
    carry = carried ?? null;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fill(i);
    dialog.hidden = false;
    document.documentElement.classList.add('wpreview-on');
    lenis()?.stop();
    opts.onOpen?.();
    // Square to the screen while it grows; then it leans to the pointer.
    lean(0);
    void grow(from);
    requestAnimationFrame(() => {
      dialog.classList.add('is-open');
      show();
    });
    lastFrame = 0;
    if (!raf) raf = requestAnimationFrame(frame);
    dialog.querySelector<HTMLElement>('.wpreview__close')?.focus({ preventScroll: true });
  };

  const close = async () => {
    if (dialog.hidden || busy) return;
    busy = true;
    // Back into the tile of the case showing (the canvas finds it: the one it came from, or one of that case's own);
    // otherwise into where it came from, if that's still the case showing; otherwise it just fades.
    const back = opts.rectOf?.(keys[current]) ?? (keys[current] === openedKey ? from : null);
    stage.querySelectorAll('video').forEach((v) => v.pause());
    dialog.classList.remove('is-open');
    stage.classList.remove('is-shown');
    lean(0);
    if (back && !reduced()) await grow(back, true);
    else await new Promise((done) => setTimeout(done, reduced() ? 0 : 320));
    dialog.hidden = true;
    figures?.disconnect();
    stage.replaceChildren();
    document.documentElement.classList.remove('wpreview-on');
    lenis()?.start();
    opts.onClose?.();
    returnFocus?.focus({ preventScroll: true });
    busy = false;
  };

  // On the picture: held, the clip waits (as stories do) and goes on when let go; dragged sideways, it's the next
  // clip, or the one before. Either way the click that follows isn't one (`handled`).
  let press: { x: number; timer: number; held: boolean; media: HTMLElement } | null = null;
  let handled = false;
  stage.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    const media = target.closest<HTMLElement>('[data-preview-media]');
    if (!media || e.button !== 0 || busy || target.closest('[data-clip-pick]')) return;
    handled = false;
    const timer = window.setTimeout(() => {
      if (!press) return;
      press.held = true;
      films()[clip]?.pause();
      media.classList.add('is-held');
    }, HOLD_MS);
    press = { x: e.clientX, timer, held: false, media };
  });
  const lift = (e: PointerEvent) => {
    if (!press) return;
    window.clearTimeout(press.timer);
    press.media.classList.remove('is-held');
    const dx = e.clientX - press.x;
    if (press.held) {
      handled = true;
      if (!reduced() && !dialog.hidden) films()[clip]?.play().catch(() => {});
    } else if (e.type === 'pointerup' && Math.abs(dx) > DRAG_PX * deskScale() && films().length > 1) {
      handled = true;
      play(clip + (dx < 0 ? 1 : -1));
    }
    press = null;
  };
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', lift);
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  dialog.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-preview-close]')) void close();
    const step = target.closest<HTMLElement>('[data-preview-step]');
    if (step) go(Number(step.dataset.previewStep));
    const pick = target.closest<HTMLElement>('[data-clip-pick]');
    if (pick) return play(Number(pick.dataset.clipPick));
    // A press on the picture: the next clip (on its left edge, the one before). Not after a hold or a drag.
    const media = target.closest<HTMLElement>('[data-preview-media]');
    if (media && handled) return void (handled = false);
    if (media && films().length > 1) {
      const box = media.getBoundingClientRect();
      play(clip + ((e as MouseEvent).clientX - box.left < box.width * 0.3 ? -1 : 1));
    }
  });
  // The wheel anywhere over the stage reads down the case, in a glide (in the column itself it scrolls as it would
  // anywhere, and a glide on its way stops there). A pinch is left to the browser.
  stage.addEventListener(
    'wheel',
    (e) => {
      const text = body();
      if (!text || e.ctrlKey) return;
      if (text.contains(e.target as Node)) {
        readTo = null;
        return;
      }
      e.preventDefault();
      readBy(e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * text.clientHeight : e.deltaY);
    },
    { passive: false },
  );
  dialog.addEventListener('keydown', (e) => {
    const text = body();
    if (e.key === 'Escape') {
      e.preventDefault();
      void close();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    } else if (text && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key) && !(e.target as HTMLElement).closest('button, a')) {
      e.preventDefault();
      const page = text.clientHeight * 0.85;
      const step = STEP_PX * deskScale();
      readBy({ ArrowDown: step, ArrowUp: -step, PageDown: page, PageUp: -page, ' ': page }[e.key] ?? 0);
    } else if (e.key === 'Tab') {
      // The keyboard stays inside.
      const stops = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((el) => el.offsetParent);
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  // Coming back with the browser's back button (from a creator's page), it's closed.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted || dialog.hidden) return;
    dialog.hidden = true;
    dialog.classList.remove('is-open');
    stage.classList.remove('is-shown');
    figures?.disconnect();
    stage.replaceChildren();
    document.documentElement.classList.remove('wpreview-on');
    lenis()?.start();
    opts.onClose?.();
  });

  return {
    open,
    isOpen: () => !dialog.hidden,
    close: () => void close(),
    scrollBy: readBy,
  };
}
