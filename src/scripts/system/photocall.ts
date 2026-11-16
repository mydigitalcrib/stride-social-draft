// Behaviour for talent/Photocall.astro (Stride Talent's opening, desktop): the wall of creators and the camera.
// - The columns drift, alternately up and down, each at its own pace, round and round (each track holds its creators
//   twice). With the pointer on the wall they ease to a stop, so a shot can be lined up.
// - The viewfinder is drawn over the wall and follows the pointer a little behind, as a camera does; over a creator it
//   locks onto them (the corners closing in once, AF lit) and they come into colour with their name. Until the pointer
//   comes onto the wall it roams it on its own, from creator to creator, so it explains itself. A dot marks exactly
//   where the pointer is. Near the screen's right edge its caption hangs from its other side.
// - A press on a creator half-presses the shutter (the corners close in further, their photo hunts for focus once);
//   the click, on release, takes the shot: shortlist.ts keeps the creator (each tile is one of its [data-keep] buttons,
//   and it takes the click first, in the capture phase, so this listens before it, on the window); then a burst of
//   flashes around them (flashes.ts) and the camera's shot (shot.ts, as on the roster: the flash, the shutter, and
//   their press print coming out of the wall and landing on its place in the shortlist's tray). A second click takes
//   them out of it again. The wall behind catches the flash.
// - The keyboard: the wall is one stop. The arrow keys move along it (up and down a column, round and round as it goes;
//   left and right to the creator at the same height in the next column), and the column eases the one in focus clear
//   of the fades. Enter or Space takes the shot.
// - While a creator's profile is open over the page (`sheet:open`), the wall and the viewfinder wait.
// Under reduced motion nothing drifts or flashes; the viewfinder jumps (only when something moves it) and a click still
// keeps. Distances are those of 1920×1080, grown with a larger screen as the CSS is (scale.ts).
import { takeShot } from './shot';
import { uiScale } from './scale';
import { whenLoaded } from './loaded';
import { reduced, tapWords } from './env';

const SPEED = 16; // px per second at 1920×1080, a column's drift
const FOLLOW = 0.2; // per frame (at 60 a second), the share of the way the viewfinder covers
const ROAM_EVERY = 2600; // ms between the viewfinder's moves while it roams on its own
const BACK_TO_ROAM = 2400; // ms after the pointer leaves the wall before it roams again
const SHOWN_AFTER = 1300; // ms after the wall first comes into view, the viewfinder appears
const SETTLE = 400; // ms: a column easing the creator in focus clear of the fades
const EDGE = 16; // px: how close to the screen's right edge the viewfinder's caption comes

// The roster's figures count up from nothing as the headline develops (straight to them under reduced motion).
const COUNT_FROM = 1100; // ms after the page starts, as the words below the headline rise
const COUNT_FOR = 1500; // ms
function countUp(root: HTMLElement) {
  const figures = [...root.querySelectorAll<HTMLElement>('[data-pc-count]')];
  if (!figures.length || reduced()) return;
  figures.forEach((f) => (f.textContent = '0'));
  // From when the loading screen opens (loaded.ts).
  whenLoaded(() => {
    const start = performance.now() + COUNT_FROM;
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / COUNT_FOR));
      const eased = 1 - Math.pow(1 - k, 3);
      figures.forEach((f) => (f.textContent = String(Math.round(Number(f.dataset.pcCount) * eased))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

type Col = { track: HTMLElement; dir: number; speed: number; offset: number; period: number; held: boolean; ease: { from: number; to: number; start: number } | null };
// A creator the keyboard can reach: their first appearance in a column, and its twin in the column's second round.
type Slot = { a: HTMLElement; b: HTMLElement | null; col: number };

export function initPhotocall() {
  const root = document.querySelector<HTMLElement>('[data-photocall]');
  if (!root || root.dataset.ready) return;
  countUp(root);
  const stage = root.querySelector<HTMLElement>('[data-pc-stage]');
  const finder = root.querySelector<HTMLElement>('[data-pc-finder]');
  const nameEl = finder?.querySelector<HTMLElement>('[data-pc-name]');
  const actionEl = finder?.querySelector<HTMLElement>('[data-pc-action]');
  const label = finder?.querySelector<HTMLElement>('.pc__label');
  const tracks = [...root.querySelectorAll<HTMLElement>('[data-pc-track]')];
  const tiles = [...root.querySelectorAll<HTMLElement>('[data-pc-tile]')];
  if (!stage || !finder || !nameEl || !actionEl || !label || !tracks.length) return;
  root.dataset.ready = 'true';
  const words = { shoot: tapWords(root.dataset.shoot ?? ''), kept: tapWords(root.dataset.kept ?? '') };

  // Where the pointer is, exactly: a dot (the viewfinder itself follows a little behind).
  const dot = document.createElement('span');
  dot.className = 'pc__dot';
  dot.setAttribute('aria-hidden', 'true');
  root.append(dot);

  /* ---------- The columns ---------- */
  const cols: Col[] = tracks.map((track, c) => ({ track, dir: c % 2 ? 1 : -1, speed: SPEED * (0.8 + (c % 3) * 0.24), offset: 0, period: 0, held: false, ease: null }));
  const place = (col: Col) => (col.track.style.transform = `translate3d(0, ${col.offset.toFixed(2)}px, 0)`);
  const measure = () =>
    cols.forEach((col) => {
      const kids = col.track.children as HTMLCollectionOf<HTMLElement>;
      const half = kids.length / 2;
      col.period = half >= 1 ? kids[half].offsetTop - kids[0].offsetTop : 0;
      if (!col.offset && col.period) col.offset = -Math.random() * col.period;
    });
  measure();
  // Measured again with the screen, and the viewfinder put back on its creator (under reduced motion nothing else would).
  new ResizeObserver(() => {
    measure();
    run();
  }).observe(stage);

  /* ---------- The viewfinder ---------- */
  let mode: 'roam' | 'hand' = 'roam';
  let aimed: HTMLElement | null = null;
  let over = false;
  let inView = false;
  let paused = false;
  let pointer = { x: 0, y: 0 };
  const cur = { x: 0, y: 0, w: 160 * uiScale(), h: 200 * uiScale() };
  let placed = false;
  let roamTimer = 0;
  let backTimer = 0;
  let labelWidth = 0;
  let flipped = false;

  // The creators fully in sight, clear of the fades at the wall's edges.
  const inSight = () => {
    const s = stage.getBoundingClientRect();
    return tiles.filter((t) => {
      const r = t.getBoundingClientRect();
      return r.top > s.top + s.height * 0.16 && r.bottom < s.bottom - s.height * 0.16 && r.left > s.left + s.width * 0.2 && r.right < s.right - 12 * uiScale();
    });
  };

  // Their name, and what they do and what a click does (and how wide that is, for which side it hangs from).
  const say = () => {
    nameEl.textContent = aimed?.dataset.name ?? '';
    const doing = aimed ? (aimed.getAttribute('aria-pressed') === 'true' ? words.kept : words.shoot) : '';
    actionEl.textContent = aimed?.dataset.category ? `${aimed.dataset.category} · ${doing}` : doing;
    labelWidth = label.offsetWidth;
  };

  /* ---------- Each frame: the drift, and the viewfinder after its target ---------- */
  let raf = 0;
  let last = 0;
  let still = 1; // 1: drifting; 0: stopped (the pointer on the wall)
  const frame = (now: number) => {
    raf = 0;
    if (paused) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const k = uiScale();
    const motion = !reduced();
    // The reads first (the layout the last frame left), then the writes, so a frame never forces a layout of its own.
    const b = root.getBoundingClientRect();
    const a = aimed?.getBoundingClientRect();
    if (motion) {
      still += ((over ? 0 : 1) - still) * Math.min(1, dt * 3.2);
      cols.forEach((col) => {
        if (!col.period) return;
        if (col.ease) {
          const p = Math.min(1, (now - col.ease.start) / SETTLE);
          col.offset = col.ease.from + (col.ease.to - col.ease.from) * (1 - Math.pow(1 - p, 4));
          if (p >= 1) col.ease = null;
        } else col.offset += col.dir * col.speed * k * still * dt;
        // Round and round (seamless: each track holds its creators twice), except under the keyboard's focus.
        if (!col.held) {
          if (col.offset > 0) col.offset -= col.period;
          if (col.offset < -col.period) col.offset += col.period;
        }
        place(col);
      });
    }
    const target = a
      ? { x: a.left - b.left - 9 * k, y: a.top - b.top - 9 * k, w: a.width + 18 * k, h: a.height + 18 * k }
      : { x: pointer.x - 72 * k, y: pointer.y - 90 * k, w: 144 * k, h: 180 * k };
    const f = !motion || !placed ? 1 : 1 - Math.pow(1 - FOLLOW, dt * 60);
    placed = true;
    cur.x += (target.x - cur.x) * f;
    cur.y += (target.y - cur.y) * f;
    cur.w += (target.w - cur.w) * f;
    cur.h += (target.h - cur.h) * f;
    finder.style.setProperty('--x', `${cur.x.toFixed(1)}px`);
    finder.style.setProperty('--y', `${cur.y.toFixed(1)}px`);
    finder.style.setProperty('--w', `${cur.w.toFixed(1)}px`);
    finder.style.setProperty('--h', `${cur.h.toFixed(1)}px`);
    // Which side the caption hangs from goes by where the viewfinder is heading, so it turns as the name changes, not
    // halfway through the glide.
    const flip = target.x + labelWidth > b.width - EDGE * k;
    if (flip !== flipped) {
      flipped = flip;
      finder.classList.toggle('is-flip', flip);
    }
    if (inView && motion) raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (raf || !inView || paused) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };

  const aim = (tile: HTMLElement | null) => {
    if (tile === aimed) return;
    aimed?.classList.remove('is-aimed');
    aimed = tile;
    aimed?.classList.add('is-aimed');
    finder.classList.toggle('is-locked', !!aimed);
    if (aimed && !reduced()) {
      finder.classList.remove('is-locking');
      void finder.offsetWidth;
      finder.classList.add('is-locking');
      window.setTimeout(() => finder.classList.remove('is-locking'), 240);
    }
    say();
    run();
  };

  const roam = () => {
    window.clearTimeout(roamTimer);
    if (mode !== 'roam' || !inView || paused) return;
    const pool = inSight().filter((t) => t !== aimed);
    if (pool.length) aim(pool[Math.floor(Math.random() * pool.length)]);
    roamTimer = window.setTimeout(roam, ROAM_EVERY);
  };

  /* ---------- Half-pressing the shutter ---------- */
  const halfPress = (on: boolean) => {
    if (on === finder.classList.contains('is-half')) return;
    finder.classList.toggle('is-half', on);
    if (!on || reduced() || !aimed) return;
    const k = uiScale();
    aimed.querySelector('img')?.animate(
      [{ filter: 'blur(0px)' }, { filter: `blur(${1.6 * k}px)`, offset: 0.35 }, { filter: `blur(${0.4 * k}px)`, offset: 0.7 }, { filter: 'blur(0px)' }],
      { duration: 280, easing: 'ease-out' },
    );
  };

  /* ---------- The pointer ---------- */
  stage.addEventListener('pointerenter', () => {
    over = true;
    mode = 'hand';
    window.clearTimeout(roamTimer);
    window.clearTimeout(backTimer);
    root.classList.add('is-aiming');
  });
  stage.addEventListener('pointermove', (e) => {
    const b = root.getBoundingClientRect();
    pointer = { x: e.clientX - b.left, y: e.clientY - b.top };
    dot.style.transform = `translate(${pointer.x}px, ${pointer.y}px)`;
    // Between two creators it stays on the last one; it moves on when the pointer reaches another (letting go of a
    // half-press: a shot is taken only where it was pressed).
    const tile = (e.target as HTMLElement).closest<HTMLElement>('[data-pc-tile]');
    if (tile && tile !== aimed) halfPress(false);
    if (tile) aim(tile);
    else run();
  });
  stage.addEventListener('pointerleave', () => {
    over = false;
    halfPress(false);
    root.classList.remove('is-aiming');
    window.clearTimeout(backTimer);
    backTimer = window.setTimeout(() => {
      mode = 'roam';
      roam();
    }, BACK_TO_ROAM);
  });
  stage.addEventListener('pointerdown', (e) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>('[data-pc-tile]');
    if (e.button !== 0 || !tile) return;
    aim(tile);
    halfPress(true);
  });
  stage.addEventListener('pointerup', () => halfPress(false));
  stage.addEventListener('pointercancel', () => halfPress(false));

  /* ---------- The keyboard: one stop on the wall ---------- */
  const slots: Slot[] = [];
  const slotOf = new Map<HTMLElement, Slot>();
  tracks.forEach((track, c) => {
    const kids = [...track.children] as HTMLElement[];
    const half = kids.length / 2;
    kids.slice(0, half).forEach((a, i) => {
      if (a.hasAttribute('tabindex')) return; // a creator shown again, not their first appearance
      const slot = { a, b: kids[i + half] ?? null, col: c };
      slots.push(slot);
      slotOf.set(a, slot);
      if (slot.b) slotOf.set(slot.b, slot);
    });
  });
  let stop: HTMLElement | null = null;
  // This creator's copy becomes the wall's one stop (and the one read out); its twin goes quiet.
  const makeStop = (slot: Slot, el: HTMLElement) => {
    const twin = el === slot.a ? slot.b : slot.a;
    twin?.setAttribute('aria-hidden', 'true');
    if (twin) twin.tabIndex = -1;
    el.removeAttribute('aria-hidden');
    if (stop && stop !== el) stop.tabIndex = -1;
    el.tabIndex = 0;
    stop = el;
  };
  slots.forEach((s, i) => (s.a.tabIndex = i ? -1 : 0));
  stop = slots[0]?.a ?? null;

  const middle = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.top + r.height / 2;
  };
  // Of a creator's two copies, the one nearer a height on the screen.
  const nearer = (slot: Slot, y: number) => (slot.b && Math.abs(middle(slot.b) - y) < Math.abs(middle(slot.a) - y) ? slot.b : slot.a);

  // The column eases the creator in focus into the clear band in the middle of the wall (without ever showing its end).
  const settle = (tile: HTMLElement) => {
    const slot = slotOf.get(tile);
    if (!slot) return;
    const col = cols[slot.col];
    cols.forEach((c) => (c.held = c === col));
    const s = stage.getBoundingClientRect();
    const r = tile.getBoundingClientRect();
    if (r.top >= s.top + s.height * 0.16 && r.bottom <= s.bottom - s.height * 0.16) return;
    const t = col.track.getBoundingClientRect();
    const want = s.top + s.height / 2 - (r.top + r.height / 2);
    const dy = Math.max(s.bottom - t.bottom, Math.min(s.top - t.top, want));
    // On the screen the wall is turned away into the room: its own distances are a little longer than they look.
    const local = dy / (t.height / (col.track.offsetHeight || t.height) || 1);
    if (reduced()) {
      col.offset += local;
      place(col);
      return run();
    }
    col.ease = { from: col.offset, to: col.offset + local, start: performance.now() };
    run();
  };

  stage.addEventListener('keydown', (e) => {
    const here = (e.target as HTMLElement).closest<HTMLElement>('[data-pc-tile]');
    const slot = here ? slotOf.get(here) : undefined;
    if (!here || !slot) return;
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) return halfPress(true);
    const down = e.key === 'ArrowDown';
    const right = e.key === 'ArrowRight';
    let to: Slot | undefined;
    // The copy nearest to where the visitor is now: the next one along, not its twin a round away.
    const y = middle(here);
    if (down || e.key === 'ArrowUp') {
      const column = slots.filter((s) => s.col === slot.col);
      to = column[(column.indexOf(slot) + (down ? 1 : -1) + column.length) % column.length];
    } else if (right || e.key === 'ArrowLeft') {
      const c = slot.col + (right ? 1 : -1);
      to = slots
        .filter((s) => s.col === c)
        .sort((p, q) => Math.abs(middle(nearer(p, y)) - y) - Math.abs(middle(nearer(q, y)) - y))[0];
    } else return;
    e.preventDefault();
    if (!to) return;
    const el = nearer(to, y);
    makeStop(to, el);
    el.focus({ preventScroll: true });
  });
  stage.addEventListener('keyup', () => halfPress(false));
  stage.addEventListener('focusin', (e) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>('[data-pc-tile]');
    if (!tile) return;
    mode = 'hand';
    over = true;
    window.clearTimeout(roamTimer);
    window.clearTimeout(backTimer);
    if (tile.matches(':focus-visible')) {
      const slot = slotOf.get(tile);
      if (slot) makeStop(slot, tile);
      settle(tile);
    }
    aim(tile);
  });
  stage.addEventListener('focusout', (e) => {
    if (stage.contains(e.relatedTarget as Node)) return;
    over = false;
    halfPress(false);
    cols.forEach((c) => (c.held = false));
    backTimer = window.setTimeout(() => {
      mode = 'roam';
      roam();
    }, BACK_TO_ROAM);
  });

  /* ---------- The shot ---------- */
  const shot = (tile: HTMLElement) => {
    if (reduced()) return;
    const r = tile.getBoundingClientRect();
    // The shot's flash first, then the burst around it, each taking its turn (flash-limit.ts).
    root.dispatchEvent(new CustomEvent('flashes:hush'));
    const photo = tile.querySelector('img');
    takeShot({ rect: r, src: photo?.currentSrc || photo?.src || '', name: tile.dataset.name ?? '', id: tile.dataset.keepId });
    root.dispatchEvent(new CustomEvent('flashes:burst', { detail: r }));
    // The wall behind catches it (TalentWall.astro).
    document.dispatchEvent(new CustomEvent('talent:flash', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2, size: Math.max(r.width * 1.4, 240 * uiScale()), power: 1 } }));
    tile.animate([{ scale: '1' }, { scale: '1.07' }, { scale: '1' }], { duration: 420, easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)' });
  };

  window.addEventListener(
    'click',
    (e) => {
      const tile = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-pc-tile]') : null;
      if (!tile || !root.contains(tile)) return;
      halfPress(false);
      aim(tile);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          say();
          if (tile.getAttribute('aria-pressed') === 'true') shot(tile);
          else if (!reduced()) tile.animate([{ filter: 'brightness(1.6)' }, { filter: 'none' }], { duration: 320, easing: 'ease-out' });
        }),
      );
    },
    true,
  );

  /* ---------- On to the divisions: some of the wall's photos fly into their letters ---------- */
  // The first time the division picker is well in view, once its lines have come in, a photo from the wall flies into
  // each division's name (from wherever the wall now is, above), and the name lights up with its own creators for a
  // moment (DivisionPicker.astro, .is-glimpse; its faces then stay laid in, .is-warm). The photos travel on the page, so
  // a visitor still scrolling sees them land where they're going; the picker gone from view, the flights end.
  const picker = document.querySelector<HTMLElement>('[data-picker-block]');
  const flying = new Set<HTMLElement>();
  const flyIn = () => {
    const names = [...document.querySelectorAll<HTMLElement>('[data-picker-item]')];
    const pool = [...new Map(tiles.map((t) => [t.dataset.keepId, t])).values()].sort(() => Math.random() - 0.5);
    names.forEach((word, i) => {
      const tile = pool[i % pool.length];
      const photo = tile?.querySelector('img');
      if (!tile || !photo) return;
      const r = tile.getBoundingClientRect();
      const w = word.getBoundingClientRect();
      const ghost = document.createElement('img');
      ghost.className = 'pc__fly';
      ghost.alt = '';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.src = photo.currentSrc || photo.src;
      ghost.style.left = `${r.left + window.scrollX}px`;
      ghost.style.top = `${r.top + window.scrollY}px`;
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
      document.body.append(ghost);
      flying.add(ghost);
      const dx = w.left + w.width / 2 - (r.left + r.width / 2);
      const dy = w.top + w.height / 2 - (r.top + r.height / 2);
      const s = Math.min(1, (w.height * 0.9) / r.height);
      const turn = (i % 2 ? 1 : -1) * (6 + Math.random() * 8);
      const done = () => {
        flying.delete(ghost);
        ghost.remove();
      };
      ghost
        .animate(
          [
            { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 0 },
            { opacity: 1, offset: 0.12 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${turn}deg) scale(${s})`, opacity: 0.95, offset: 0.82 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${turn}deg) scale(${s * 0.5})`, opacity: 0 },
          ],
          { duration: 1150, delay: i * 85, easing: 'cubic-bezier(0.5, 0, 0.25, 1)', fill: 'backwards' },
        )
        .finished.then(
          () => {
            done();
            word.classList.add('is-glimpse', 'is-warm');
            window.setTimeout(() => word.classList.remove('is-glimpse'), 1700);
          },
          done,
        );
    });
  };
  if (picker && !reduced()) {
    let flown = false;
    new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          flying.forEach((g) => g.getAnimations().forEach((a) => a.cancel()));
          return;
        }
        if (flown || entry.intersectionRatio < 0.45) return;
        flown = true;
        window.setTimeout(flyIn, 1500);
      },
      { threshold: [0, 0.45] },
    ).observe(picker);
  }

  /* ---------- A creator's profile over the page: the wall waits ---------- */
  document.addEventListener('sheet:open', () => {
    paused = true;
    halfPress(false);
    cancelAnimationFrame(raf);
    raf = 0;
    window.clearTimeout(roamTimer);
    window.clearTimeout(backTimer);
  });
  document.addEventListener('sheet:close', () => {
    paused = false;
    if (!inView) return;
    run();
    if (mode === 'roam') roam();
  });

  /* ---------- In view ---------- */
  let shownOnce = false;
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) {
      window.clearTimeout(roamTimer);
      return;
    }
    run();
    if (!shownOnce) {
      shownOnce = true;
      window.setTimeout(() => {
        finder.classList.add('is-on');
        if (mode === 'roam') roam();
      }, reduced() ? 0 : SHOWN_AFTER);
    } else if (mode === 'roam') roam();
  }, { threshold: 0.25 }).observe(root);
}
