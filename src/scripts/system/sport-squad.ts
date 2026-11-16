// Stride Sport's squad (talent/SportSquad.astro, desktop): the creators the tray keeps ("Meet our talents",
// shortlist.ts) on the pitch's eleven places, filled from the front in the order they were added; the rest on the bench.
// A newly added one runs on (the styles' spring); one taken out leaves its place, and the others keep theirs.
// As on a matchday: a creator added while the pitch is out of view has their place kept for them, and walks out of the
// tunnel (just past the near touchline) to it when the pitch comes into view, one after another in the order they were
// added; one added while it's in view walks out at once, and one taken out walks back. The first time it's in view its
// markings light up line by line, and the players wait for them. With all eleven on, the markings flare. With the pointer
// over the section the pitch leans, as from a camera crane. A player on the pitch opens their profile among the squad
// (creator-sheet.ts, `creators:open`). Under reduced motion none of it moves: the places fill as they're added.
import { openCreators } from './creator-open';
import { listOf, type Item } from './shortlist';
import { reduced } from './env';

const WALK = 780; // ms from the tunnel to their place
const BACK = 420; // ms back to the tunnel
const STAGGER = 160; // ms between players walking out together
const WAIT = 250; // ms after the pitch comes into view before the first walks out
const LINES = 1200; // ms the markings take to light up, on the first view (the players wait for them)
const TUNNEL = [50, 106]; // where they come out: across and down the pitch (%)
const LEAN_X = 2; // degrees the crane tilts the pitch, the pointer at the top or foot of the screen
const LEAN_Z = 2.5; // degrees it turns it, the pointer at either side
const CRANE = 0.08; // per frame (at 60 a second), the share of the way the lean covers

const gone = (el: Element) => () => el.remove();

export function initSportSquad() {
  const root = document.querySelector<HTMLElement>('[data-sport-squad]');
  const pitch = root?.querySelector<HTMLElement>('[data-squad-pitch]');
  // Set up on any screen, as before (it's hidden below desktop and only moves once in view), so a window widened to
  // desktop finds the squad already matching the tray.
  if (!root || !pitch || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const places = [...root.querySelectorAll<HTMLElement>('[data-squad-place]')];
  const players = places.map((p) => p.querySelector<HTMLElement>('.squad__player')!);
  const spots = places.map((p) => (p.dataset.at ?? '50 50').split(' ').map(Number));
  const lines = root.querySelector<SVGSVGElement>('.squad__lines');
  const count = root.querySelector<HTMLElement>('[data-squad-count]');
  const bench = root.querySelector<HTMLElement>('[data-squad-bench]');
  const meet = root.querySelector<HTMLButtonElement>('[data-squad-meet]');
  const benchWords = root.dataset.bench ?? '+{n}';
  const still = reduced();
  const where = new Map<string, number>(); // creator → their place
  const standing = new Set<number>(); // places with a player on them (or walking to them)
  const waiting: number[] = []; // places kept for players not out yet, in the order they were added
  let seen = false;
  let lit = still; // the markings have started lighting up (or never will)
  let drawn = still; // they're lit
  let full = false;

  // A player on a place, or not: the look (the styles), and whether they can be pressed.
  const stand = (k: number, on: boolean) => {
    places[k].classList.toggle('is-filled', on);
    if (on) standing.add(k);
    else standing.delete(k);
    const player = players[k];
    if (on) {
      player.removeAttribute('aria-hidden');
      player.setAttribute('role', 'button');
      player.setAttribute('aria-label', player.querySelector('.squad__name')?.textContent ?? '');
      player.tabIndex = 0;
    } else {
      player.setAttribute('aria-hidden', 'true');
      player.removeAttribute('role');
      player.removeAttribute('aria-label');
      player.removeAttribute('tabindex');
    }
  };

  // The way from the tunnel to a place, in the pitch's own plane (px from the place): a curve bowed out towards the
  // player's own side, through the point halfway along it.
  const path = (k: number, frames = 8) => {
    const [x, y] = spots[k];
    const w = pitch.offsetWidth;
    const h = pitch.offsetHeight;
    const sx = ((TUNNEL[0] - x) / 100) * w;
    const sy = ((TUNNEL[1] - y) / 100) * h;
    const bow = Math.sign(x - 50) * 0.06 * w;
    const cx = 0.4 * sx + 2 * bow; // the control point that puts the curve's middle at (0.45 sx + bow, 0.5 sy)
    const cy = 0.5 * sy;
    return Array.from({ length: frames + 1 }, (_, i) => {
      const t = i / frames;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      return { translate: `${(a * sx + b * cx).toFixed(1)}px ${(a * sy + b * cy).toFixed(1)}px`, offset: t };
    });
  };

  const settle = (player: HTMLElement) => player.getAnimations({ subtree: true }).forEach((a) => a.cancel());

  const walkOut = (k: number) => {
    const player = players[k];
    const way = still ? null : path(k); // measured before anything changes, so the page is laid out once
    settle(player);
    stand(k, true);
    if (!way) return;
    const walk = player.animate(way, { duration: WALK, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' });
    // Jogging as they go: a little bob, three strides.
    const jog = [{ translate: '0 0' }, { translate: '0 -0.25rem' }, { translate: '0 0' }];
    [...player.children].forEach((c) => c.animate(jog, { duration: WALK / 3, iterations: 3, easing: 'ease-in-out' }));
    walk.finished.then(() => arrive(k), () => {});
  };

  // On their place: the ring sends out one ripple; the eleventh to arrive lights the whole pitch.
  const arrive = (k: number) => {
    const ring = document.createElement('span');
    ring.className = 'squad__ripple';
    places[k].append(ring);
    ring.animate([{ scale: 1, opacity: 0.8 }, { scale: 1.9, opacity: 0 }], { duration: 560, easing: 'ease-out' }).finished.then(gone(ring), gone(ring));
    if (standing.size === places.length && !full) {
      full = true;
      flare();
    }
  };

  const walkBack = (k: number) => {
    const player = players[k];
    if (!standing.has(k)) return;
    // Out of view (or still): just gone, any walk out still under way stopped, so it doesn't arrive at an empty place.
    settle(player);
    if (still || !seen) return stand(k, false);
    player.setAttribute('aria-hidden', 'true');
    player.removeAttribute('tabindex');
    const frames = path(k)
      .reverse()
      .map((f, i, all) => ({ ...f, offset: i / (all.length - 1), opacity: 1 - i / (all.length - 1) }));
    const back = player.animate(frames, { duration: BACK, easing: 'ease-in', fill: 'forwards' });
    back.finished.then(() => {
      // Off the pitch: the empty place's look without its own fade (they're already gone).
      player.style.transition = 'none';
      stand(k, false);
      void getComputedStyle(player).opacity;
      back.cancel();
      player.style.transition = '';
    }, () => {});
  };

  // The markings, lighting up line by line (each shape's stroke drawn along it, data-line: when it starts, ms).
  const shapes = lines ? [...lines.querySelectorAll<SVGGeometryElement>('[data-line]')] : [];
  const dot = lines?.querySelector<SVGElement>('.squad__dot') ?? null;
  // Unlit until then (a shape whose length can't be read while hidden simply stays lit).
  const drawable: SVGGeometryElement[] = [];
  if (!still) {
    shapes.forEach((s) => {
      let len = '';
      try {
        len = String(s.getTotalLength());
      } catch {
        return;
      }
      s.style.strokeDasharray = len;
      s.style.strokeDashoffset = len;
      drawable.push(s);
    });
    if (dot) dot.style.opacity = '0';
  }
  const light = () => {
    drawable.forEach((s) => {
      const len = s.style.strokeDashoffset;
      s.style.strokeDashoffset = '0';
      s.animate([{ strokeDashoffset: len }, { strokeDashoffset: '0' }], { duration: 900, delay: Number(s.dataset.line) || 0, easing: 'cubic-bezier(0.6, 0, 0.2, 1)', fill: 'backwards' }).finished.then(
        () => (s.style.strokeDasharray = ''),
        () => {},
      );
    });
    if (dot) {
      dot.style.opacity = '';
      dot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 700, fill: 'backwards' });
    }
  };

  // Full XI: the markings flare once, and a ring of light spreads across the grass from the centre circle.
  const flare = () => {
    if (still || !lines) return;
    lines.animate([{ filter: 'drop-shadow(0 0 0.4375rem rgb(207 237 248 / 0.8))', stroke: 'rgb(207 237 248 / 0.9)', offset: 0.5 }], { duration: 900, easing: 'ease-in-out' });
    const ring = document.createElement('span');
    ring.className = 'squad__flare';
    pitch.append(ring);
    ring.animate([{ scale: 0.3, opacity: 0.7 }, { scale: 3, opacity: 0 }], { duration: 1000, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }).finished.then(gone(ring), gone(ring));
  };

  // Those waiting walk out, one after another (if they're still in the squad, and the pitch still in view).
  const release = (after: number) => {
    waiting.splice(0).forEach((k, i) =>
      window.setTimeout(() => {
        if (standing.has(k) || ![...where.values()].includes(k)) return;
        if (!seen) return void waiting.push(k);
        walkOut(k);
      }, after + i * STAGGER),
    );
  };

  const sync = (items: Item[]) => {
    const ids = new Set(items.map((i) => i.id));
    // Out: their place is free again.
    [...where].forEach(([id, k]) => {
      if (ids.has(id)) return;
      where.delete(id);
      full = false;
      const queued = waiting.indexOf(k);
      if (queued >= 0) waiting.splice(queued, 1);
      else walkBack(k);
    });
    // In: the first free place, from the front.
    items.forEach((item) => {
      if (where.has(item.id)) return;
      const k = places.findIndex((_, n) => ![...where.values()].includes(n));
      if (k < 0) return;
      where.set(item.id, k);
      const place = places[k];
      const img = place.querySelector('img');
      const name = place.querySelector<HTMLElement>('.squad__name');
      if (img) img.src = item.image ?? '';
      if (name) name.textContent = item.label;
      if (still || (seen && drawn)) walkOut(k);
      else waiting.push(k);
    });
    if (count) count.textContent = String(where.size);
    const extra = items.length - where.size;
    if (bench) bench.textContent = extra > 0 ? benchWords.replace('{n}', String(extra)) : '';
    if (meet) meet.disabled = items.length === 0;
  };

  // In view: the first time, the markings light up and the players wait for them; after that they walk out soon.
  if (!still) {
    new IntersectionObserver(
      ([entry]) => {
        seen = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        if (!seen) return;
        if (drawn) return release(WAIT);
        if (lit) return;
        lit = true;
        light();
        window.setTimeout(() => {
          drawn = true;
          release(0);
        }, LINES);
      },
      { threshold: [0, 0.35] },
    ).observe(root);
  }

  // A player on the pitch: their profile, among the squad (in the order of their places).
  const open = (k: number) => {
    if (!standing.has(k)) return;
    const order = [...where].filter(([, n]) => standing.has(n)).sort((a, b) => a[1] - b[1]);
    const index = order.findIndex(([, n]) => n === k);
    if (index < 0) return;
    const from = players[k].querySelector('img')?.getBoundingClientRect() ?? null;
    openCreators(order.map(([id]) => id), index, from, root.dataset.profile);
  };
  players.forEach((player, k) => {
    player.addEventListener('click', () => open(k));
    player.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      open(k);
    });
    player.addEventListener('pointerdown', () => {
      if (still || !standing.has(k)) return;
      [...player.children].forEach((c) => c.animate([{ scale: 1 }, { scale: 0.96, offset: 0.5 }, { scale: 1 }], { duration: 180, easing: 'ease-out' }));
    });
  });

  // The crane: the pointer over the section leans the pitch a little (tilt and turn), eased; it comes back to rest
  // when the pointer leaves. Only while the pointer moves over it.
  if (!still) {
    let tiltNow = 0;
    let turnNow = 0;
    let tilt = 0;
    let turn = 0;
    let raf = 0;
    let last = 0;
    const lean = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const k = 1 - Math.pow(1 - CRANE, dt * 60);
      tiltNow += (tilt - tiltNow) * k;
      turnNow += (turn - turnNow) * k;
      const settled = Math.abs(tilt - tiltNow) < 0.01 && Math.abs(turn - turnNow) < 0.01;
      if (settled && !tilt && !turn) {
        tiltNow = turnNow = 0;
        pitch.style.transform = '';
        last = 0;
        return;
      }
      pitch.style.transform = `rotateX(${(58 + tiltNow).toFixed(2)}deg) rotateZ(${turnNow.toFixed(2)}deg)`;
      if (settled) last = 0;
      else raf = requestAnimationFrame(lean);
    };
    const go = () => {
      if (!raf) raf = requestAnimationFrame(lean);
    };
    root.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tilt = (e.clientY / window.innerHeight - 0.5) * 2 * LEAN_X;
      turn = -(e.clientX / window.innerWidth - 0.5) * 2 * LEAN_Z;
      go();
    });
    root.addEventListener('pointerleave', () => {
      tilt = turn = 0;
      go();
    });
  }

  sync(listOf('creators'));
  document.addEventListener('shortlist:render', (e) => sync((e as CustomEvent<{ creators: Item[] }>).detail.creators));
}
