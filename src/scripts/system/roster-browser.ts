// The searchable roster and the division picker above it (talent/RosterBrowser, talent/DivisionPicker).
// Search and filters narrow the cards already on the page, kept in the URL so a result can be shared. What's typed
// goes up on the wall in giant letters. When the result changes, the photos left out go dark one by one and the rest
// close up, new ones fading in: quickly, and a newer change overtakes it. The division picker's block of type is
// sized to its width here and brought in line by line. Without a search box (the roster
// on /talent) only the division picker narrows it. A card with a video plays it on hover.
// On /talent a division chosen in the picker is remembered at once (the URL, the word, the count), and the crowd changes
// once the page has carried the visitor down to it, where they can see it; the whole roster's tile counts its way to
// the new figure. The picker's type grows with a large screen and never stands taller than the screen allows.
import { deskScale } from './scale';
import { PHONE, desktop, lenis, reduced, tapWords } from './env';

const PARAMS = ['division', 'niche', 'relationship'] as const;
type Param = (typeof PARAMS)[number];

const LIGHTS_SPREAD = 170; // ms: how far apart the lights go out
const LIGHT_OUT = 260; // ms: as in the component
const CLOSE_UP = 420; // ms: the rest closing up
const MAX_WALL_LETTERS = 40;
const BIG_EVERY = 11; // the mosaic: one large photograph in this many
const PICKER_TRY = 100; // px: the size the division picker measures its lines at
const PICKER_GAP = 0.3; // em: the least space between its words, as in the component
const PICKER_MAX = 120; // px at 1920×1080 (growing with a larger screen): its type never bigger than this
const PICKER_TALL = 0.085; // and never taller than this share of the screen's height
const PICKER_FILL = 0.7; // its longest line's words fill this share of the width; the rest is the space between them
const PICKER_FILL_TABLET = 0.9; // a tablet: the words fill more of a narrower line, so they stay big
const PICKER_PHONE_TALL = 0.12; // a phone: one division to a line, as wide as the screen but never taller than this
// (smaller type, the owner, 2026-11-13: it was 176px, 12% of the height and 98.5% of the width)
const ROLL = 700; // ms: the whole roster's tile counting to a new figure
const IN_SIGHT = 0.35; // share of the photographs in view before the crowd changes for a division chosen above

// Choose a division: `now` changes the roster at once; otherwise it's remembered, and the change to run once it's in
// sight comes back.
let setDivision: ((id: string, now: boolean) => (() => void) | void) | null = null;

/** What's typed, up on the wall behind the search. Letters already there stay; new ones are stamped on. */
function initWallWords(root: HTMLElement, input: HTMLInputElement) {
  const wall = root.querySelector<HTMLElement>('[data-roster-wall]');
  const head = root.querySelector<HTMLElement>('.rb__head');
  if (!wall || !head) return () => {};
  const backdrop = document.querySelector<HTMLElement>('.talent-wall');
  let inView = false;
  const show = () => {
    const on = inView && wall.childElementCount > 0;
    wall.classList.toggle('is-on', on);
    backdrop?.classList.toggle('is-quiet', on);
  };
  const write = () => {
    const letters = [...input.value.trimStart()].slice(0, MAX_WALL_LETTERS);
    const there = [...wall.children];
    let same = 0;
    while (same < there.length && same < letters.length && there[same].textContent === letters[same]) same++;
    there.slice(same).forEach((s) => s.remove());
    letters.slice(same).forEach((l) => {
      const s = document.createElement('span');
      s.textContent = l;
      wall.append(s);
    });
    // The words take their new size at once and ease into it from the old one as a scale, so the giant letters
    // aren't laid out again on every frame.
    const len = String(Math.max(4, letters.length));
    if (wall.style.getPropertyValue('--len') !== len) {
      const was = parseFloat(getComputedStyle(wall).fontSize);
      wall.style.setProperty('--len', len);
      const now = parseFloat(getComputedStyle(wall).fontSize);
      if (!reduced() && wall.childElementCount && was && now && Math.abs(was - now) > 0.5) wall.animate([{ scale: String(was / now) }, { scale: '1' }], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
    show();
  };
  input.addEventListener('input', write);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    show();
  }).observe(head);
  write();
  return write;
}


export function initRosterBrowsers() {
  document.querySelectorAll<HTMLElement>('[data-roster]').forEach((root) => {
    if (root.dataset.rosterReady) return;
    root.dataset.rosterReady = 'true';
    const grid = root.querySelector<HTMLElement>('[data-roster-grid]')!;
    const cards = [...grid.querySelectorAll<HTMLElement>('[data-roster-card]')];
    // No search box: an empty one in its place, so the rest reads the same.
    const input = root.querySelector<HTMLInputElement>('[data-roster-search]') ?? document.createElement('input');
    const count = root.querySelector<HTMLElement>('[data-roster-count]')!;
    const none = root.querySelector<HTMLElement>('[data-roster-none]')!;
    // No "show more" (the roster on /talent): a stand-in, so the rest reads the same.
    const more = root.querySelector<HTMLButtonElement>('[data-roster-more]') ?? document.createElement('button');
    const size = Number(root.dataset.pageSize) || 15;
    // The glimpse on /talent: every photograph the same size, none large.
    const glimpse = root.hasAttribute('data-glimpse');
    // Only a selection on the page (the glimpse on /talent): the full counts come with it.
    const totals: Record<string, number> | null = root.dataset.totals ? JSON.parse(root.dataset.totals) : null;
    const url = new URL(location.href);
    const chosen: Record<Param, string> = { division: url.searchParams.get('division') ?? '', niche: url.searchParams.get('niche') ?? url.searchParams.get('category') ?? '', relationship: url.searchParams.get('relationship') ?? '' };
    input.value = url.searchParams.get('q') ?? '';
    let shown = size;
    const all = root.querySelector<HTMLElement>('[data-roster-all-count]');

    const matches = (c: HTMLElement) => {
      const q = input.value.trim().toLowerCase();
      return (
        (!q || q.split(/\s+/).every((word) => (c.dataset.search ?? '').includes(word))) &&
        (!chosen.division || (c.dataset.divisions ?? '').split(' ').includes(chosen.division)) &&
        (!chosen.niche || (c.dataset.niches ?? '').split(' ').includes(chosen.niche)) &&
        (!chosen.relationship || c.dataset.relationship === chosen.relationship)
      );
    };

    // The whole roster's tile, counting its way to a new figure.
    let rolling = 0;
    const roll = (to: number, animate: boolean) => {
      if (!all) return;
      cancelAnimationFrame(rolling);
      const from = Number(all.textContent) || 0;
      if (!animate || reduced() || from === to) {
        all.textContent = String(to);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / ROLL);
        all.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
        if (k < 1) rolling = requestAnimationFrame(tick);
      };
      rolling = requestAnimationFrame(tick);
    };

    // What a choice says straight away: the division's word, and how many (read out).
    const mark = (found: number) => {
      const total = totals?.[chosen.division] ?? found;
      count.textContent = `${total} ${total === 1 ? 'creator' : 'creators'}`;
      document.querySelectorAll<HTMLElement>('[data-picker-item]').forEach((a) => {
        if (a.hasAttribute('data-picker-own')) return;
        a.setAttribute('aria-pressed', String(a.dataset.pickerItem === chosen.division));
      });
      return total;
    };

    const apply = (animate = false) => {
      const found = cards.filter(matches);
      cards.forEach((c) => {
        c.hidden = true;
        c.classList.remove('is-big');
      });
      found.slice(0, shown).forEach((c, i) => {
        c.hidden = false;
        // One large every so often, for rhythm in the mosaic; a large card without a photo would be a big blank.
        c.classList.toggle('is-big', !glimpse && i % BIG_EVERY === 0 && !!c.querySelector('img'));
      });
      // A search or a filter in force: what it found stays in colour (RosterBrowser.astro).
      root.classList.toggle('is-filtered', !!(input.value.trim() || chosen.division || chosen.niche || chosen.relationship));
      const total = mark(found.length);
      // The way on to the full roster opens it on the same division, and its tile says how many are there.
      root.querySelectorAll<HTMLAnchorElement>('[data-roster-cta]').forEach((cta) => {
        cta.href = chosen.division ? `${cta.dataset.rosterCta}?division=${chosen.division}` : cta.dataset.rosterCta!;
      });
      roll(total, animate);
      none.hidden = found.length > 0;
      more.hidden = found.length <= shown;
      root.querySelectorAll<HTMLElement>('[data-roster-group]').forEach((g) => {
        const key = g.dataset.rosterGroup as Param;
        g.querySelectorAll<HTMLElement>('[data-roster-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rosterFilter === chosen[key])));
      });
      window.dispatchEvent(new Event('resize')); // the backdrop and anything measuring the page
    };

    const remember = () => {
      const next = new URL(location.href);
      next.searchParams.delete('category');
      PARAMS.forEach((p) => (chosen[p] ? next.searchParams.set(p, chosen[p]) : next.searchParams.delete(p)));
      const q = input.value.trim();
      if (q) next.searchParams.set('q', q);
      else next.searchParams.delete('q');
      history.replaceState(null, '', next);
    };

    // The rest close up where they now belong, and new ones arrive in a flash.
    const closeUp = () => {
      const before = new Map(cards.filter((c) => !c.hidden).map((c) => [c, c.getBoundingClientRect()]));
      apply(true);
      cards.forEach((c) => c.classList.remove('is-out'));
      cards.forEach((c) => {
        if (c.hidden) return;
        const now = c.getBoundingClientRect();
        if (now.top > window.innerHeight || now.bottom < 0) return;
        const was = before.get(c);
        if (!was) {
          // A plain fade in (no white flash since 2026-11-18, the owner: "very distracting").
          c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 480, delay: Math.random() * LIGHTS_SPREAD, easing: 'ease-out', fill: 'backwards' });
          return;
        }
        const dx = was.left - now.left;
        const dy = was.top - now.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(was.width - now.width) < 1) return;
        c.animate(
          [
            { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${was.width / now.width}, ${was.height / now.height})` },
            { transformOrigin: '0 0', transform: 'none' },
          ],
          { duration: CLOSE_UP, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' },
        );
      });
    };

    // Lights in the crowd: those left out go dark, one by one. The latest change wins.
    let lights = 0;
    let turn = 0;
    const change = () => {
      shown = size;
      remember();
      window.clearTimeout(lights);
      if (reduced()) return apply();
      const staying = new Set(cards.filter(matches).slice(0, shown));
      // Only the ones in sight go dark one by one (the roster has hundreds); the rest simply go.
      const going = cards.filter((c) => {
        if (c.hidden || staying.has(c)) return false;
        const r = c.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight;
      });
      staying.forEach((c) => c.classList.remove('is-out'));
      going.forEach((c) => {
        if (c.classList.contains('is-out')) return;
        c.style.setProperty('--out', `${(Math.random() * LIGHTS_SPREAD).toFixed(0)}ms`);
        c.classList.add('is-out');
      });
      const mine = ++turn;
      lights = window.setTimeout(() => {
        if (mine === turn) closeUp();
      }, going.length ? LIGHTS_SPREAD + LIGHT_OUT : 0);
    };
    const rewrite = initWallWords(root, input);

    let typing = 0;
    input.addEventListener('input', () => {
      window.clearTimeout(typing);
      typing = window.setTimeout(change, 120);
    });
    root.querySelectorAll<HTMLElement>('[data-roster-group]').forEach((g) => {
      const key = g.dataset.rosterGroup as Param;
      g.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-roster-filter]');
        if (!b) return;
        chosen[key] = b.dataset.rosterFilter ?? '';
        change();
      });
    });
    root.querySelector('[data-roster-clear]')?.addEventListener('click', () => {
      PARAMS.forEach((p) => (chosen[p] = ''));
      input.value = '';
      rewrite();
      change();
    });
    more.addEventListener('click', () => {
      shown += size * 2;
      apply();
    });
    setDivision = (id, now) => {
      chosen.division = id;
      if (now) return change();
      remember();
      mark(cards.filter(matches).length);
      return change;
    };

    // A video plays only while its card is under the pointer.
    grid.addEventListener('pointerover', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('[data-roster-card]');
      const video = card?.querySelector<HTMLVideoElement>('[data-ccc-video]');
      if (!card || !video || reduced() || card.classList.contains('is-playing')) return;
      card.classList.add('is-playing');
      video.play().catch(() => card.classList.remove('is-playing'));
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-playing');
        video.pause();
      }, { once: true });
    });

    apply();
  });
}

export function initDivisionPicker() {
  document.querySelectorAll<HTMLElement>('[data-picker]').forEach((root) => {
    if (root.dataset.pickerReady) return;
    root.dataset.pickerReady = 'true';
    const items = [...root.querySelectorAll<HTMLAnchorElement>('[data-picker-item]')];
    const block = root.querySelector<HTMLElement>('[data-picker-block]');
    const lines = [...root.querySelectorAll<HTMLElement>('[data-picker-line]')];

    // The type as big as the longest line allows; each line is told how far to squeeze in for its words to sit together.
    // A phone: one division to a line, each sized to run edge to edge on its own (--size), still a justified wall.
    const fit = () => {
      if (!block || !lines.length) return;
      block.style.setProperty('--fit', `${PICKER_TRY}px`);
      items.forEach((a) => a.style.removeProperty('--size'));
      const width = block.clientWidth;
      if (window.matchMedia(PHONE).matches) {
        items.forEach((a) => {
          const name = a.querySelector<HTMLElement>('.picker__name');
          const w = name?.offsetWidth || a.offsetWidth;
          const size = Math.min(window.innerHeight * PICKER_PHONE_TALL, (PICKER_TRY * width) / Math.max(1, w));
          a.style.setProperty('--size', `${size.toFixed(1)}px`);
        });
        lines.forEach((l) => l.style.setProperty('--pack', '0px'));
        return;
      }
      const need = lines.map((l) => {
        const words = [...l.children] as HTMLElement[];
        return words.reduce((n, w) => n + w.offsetWidth, 0) + PICKER_GAP * PICKER_TRY * (words.length - 1);
      });
      const font = Math.min(PICKER_MAX * deskScale(), window.innerHeight * PICKER_TALL, (PICKER_TRY * width * (desktop() ? PICKER_FILL : PICKER_FILL_TABLET)) / Math.max(...need));
      block.style.setProperty('--fit', `${font.toFixed(1)}px`);
      lines.forEach((l, i) => l.style.setProperty('--pack', `${Math.max(0, (width - (need[i] * font) / PICKER_TRY) / 2).toFixed(1)}px`));
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit, { passive: true });

    // Coming into view: the lines rise out of their slots and spread out, once.
    if (reduced()) root.classList.add('is-in');
    else {
      root.classList.add('is-ready');
      const seen = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        root.classList.add('is-in');
        seen.disconnect();
      }, { threshold: 0.3 });
      seen.observe(block ?? root);
    }

    // The line under the block says what the division under the pointer is, and what a click does.
    const caption = root.querySelector<HTMLElement>('[data-picker-caption-line]');
    let swap = 0;
    // On a touch screen it says what a tap does from the start.
    if (caption) caption.textContent = tapWords(caption.textContent ?? '');
    const say = (said: string) => {
      const text = tapWords(said);
      if (!caption || caption.textContent === text) return;
      window.clearTimeout(swap);
      caption.classList.add('is-swapping');
      swap = window.setTimeout(() => {
        caption.textContent = text;
        caption.classList.remove('is-swapping');
      }, 140);
    };
    // The photographs its letters fill with: the first of each division's once the block is near, the rest of a
    // division's as it's pointed at, so none flashes in empty.
    const fetched = new Set<string>();
    const fetch = (src: string) => {
      if (!src || fetched.has(src)) return;
      fetched.add(src);
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    };
    const facesOf = (a: HTMLElement) => (a.dataset.pickerFaces ?? '').split('|').filter(Boolean);
    // Pointed at once, its faces are fetched, and from then on they stay laid in its letters, faded out (.is-warm).
    const warm = (a: HTMLElement) => {
      facesOf(a).forEach(fetch);
      if (!reduced() && a.dataset.pickerFaces) a.classList.add('is-warm');
    };
    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      items.forEach((a) => fetch(facesOf(a)[0] ?? ''));
    }, { rootMargin: '60% 0px' });
    near.observe(root);

    items.forEach((a) => {
      a.addEventListener('pointerenter', () => warm(a));
      a.addEventListener('focus', () => warm(a));
      a.addEventListener('pointerenter', () => say(a.dataset.pickerCaption ?? ''));
      a.addEventListener('focus', () => say(a.dataset.pickerCaption ?? ''));
      a.addEventListener('pointerleave', () => say(caption?.dataset.hint ?? ''));
      a.addEventListener('blur', () => say(caption?.dataset.hint ?? ''));
    });

    items.forEach((a) => {
      const id = a.dataset.pickerItem!;
      if (a.hasAttribute('data-picker-own')) return;
      a.addEventListener('click', (e) => {
        const roster = document.querySelector<HTMLElement>('[data-roster]');
        if (!roster || !setDivision) return; // no script: the link still goes to the filtered roster
        e.preventDefault();
        const again = a.getAttribute('aria-pressed') === 'true';
        // In the roster (its own page) it changes at once. Above it (/talent): down to it, and the crowd changes once
        // it's in sight (the scroll there done, or enough of it in view), so the lights go out where the visitor looks.
        const inside = roster.contains(a);
        const commit = setDivision(again ? '' : id, inside || reduced());
        if (inside) return;
        let done = false;
        const run = () => {
          if (done) return;
          done = true;
          seen.disconnect();
          window.clearTimeout(late);
          commit?.();
        };
        const seen = new IntersectionObserver(([entry]) => {
          if (entry.intersectionRatio >= IN_SIGHT) run();
        }, { threshold: [IN_SIGHT] });
        seen.observe(roster.querySelector<HTMLElement>('[data-roster-grid]') ?? roster);
        const late = window.setTimeout(run, 1600);
        const smooth = lenis();
        if (smooth) smooth.scrollTo(roster.querySelector<HTMLElement>('.rb__head') ?? roster, { duration: 0.9, onComplete: run });
        else roster.scrollIntoView();
      });
    });
  });
}
