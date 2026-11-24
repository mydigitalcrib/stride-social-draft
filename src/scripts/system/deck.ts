// Behaviour for components/experience/Deck.astro: its tabs swap the row of cards (Left/Right/Home/End
// move between them), and cards grow into their big cards (grow.ts). A row with more than four cards can
// be dragged sideways, with a little throw. Arriving with a tab's anchor in the address
// (/talent#divisions) opens that tab. A big card holds the page while it's open (grow.ts).
// Each division's deck has its own way (every screen since 2026-11-13). Stride Social's (`spines`): the card under the
// pointer (a tap on touch) opens
// sideways while the others narrow to spines, cards are dealt out of the tab that's chosen, and what's added to
// the brief flies down to Start a Campaign (shortlist.ts). Stride Talent's: deck-lineup.ts. Stride Academy's:
// deck-stairs.ts. On desktop the page's tray of picks steps up under the header while a deck's bar is on screen, so it
// never covers the bar's link (the line-up does the same for itself).
import { firstView, preload, slidePill } from './deck-parts';
import { initLineup } from './deck-lineup';
import { initStairs } from './deck-stairs';
import { initGrow } from './grow';
import { uiScale } from './scale';
import { initShortlists, trayUp } from './shortlist';
import { desktop, reduced } from './env';

function openDeck(root: HTMLElement, tabs: HTMLButtonElement[], panels: HTMLElement[]) {
  // The card under the pointer or the keyboard stays open until another takes over.
  root.querySelectorAll<HTMLElement>('.deck__cards').forEach((row) => {
    row.querySelectorAll<HTMLElement>(':scope > li').forEach((li) => {
      const take = () => {
        row.querySelector(':scope > li.is-open')?.classList.remove('is-open');
        li.classList.add('is-open');
      };
      // A finger has no pointing: its tap opens a card, and a tap on the open one grows its big card (grow.ts).
      li.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && take());
      li.addEventListener('focusin', take);
      li.addEventListener(
        'click',
        (e) => {
          if (li.classList.contains('is-open')) return;
          e.preventDefault();
          e.stopPropagation();
          take();
        },
        true,
      );
    });
  });

  const place = slidePill(root, tabs);

  // The cards come out of the tab, one after another.
  const deal = (panel: HTMLElement, tab: HTMLElement) => {
    if (reduced()) return;
    const from = tab.getBoundingClientRect();
    panel.querySelectorAll<HTMLElement>('.deck__cards > li').forEach((li, n) => {
      const r = li.getBoundingClientRect();
      const x = from.left + from.width / 2 - (r.left + r.width / 2);
      const y = from.top + from.height / 2 - (r.top + r.height / 2);
      li.animate(
        [
          { transform: `translate(${x}px, ${y}px) rotate(${(n % 2 ? 1 : -1) * (5 + n * 2)}deg) scale(0.4)`, opacity: 0 },
          { opacity: 1, offset: 0.3 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 700, delay: n * 70, easing: 'cubic-bezier(0.2, 1.05, 0.3, 1)', fill: 'backwards' },
      );
    });
  };
  const current = () => Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  firstView(root, () => deal(panels[current()], tabs[current()]));
  preload(root);

  // Adding to the brief: its name flies down to Start a Campaign. On the window, so it runs before the
  // list changes (shortlist.ts) and knows this is an add.
  initShortlists();
  window.addEventListener(
    'click',
    (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-keep="brief"]');
      const goal = root.querySelector('.deck__tab--link');
      if (!b || !goal || !root.contains(b) || b.getAttribute('aria-pressed') === 'true' || reduced()) return;
      const from = b.getBoundingClientRect();
      const to = goal.getBoundingClientRect();
      // The chip is in rem on desktop (Deck.astro), so its half-width allowance grows with it (scale.ts).
      const half = 40 * (desktop() ? uiScale() : 1);
      const chip = document.createElement('span');
      chip.className = 'deck__fly';
      chip.textContent = b.dataset.keepLabel ?? '';
      chip.style.cssText = `left:${from.left}px;top:${from.top}px`;
      document.body.append(chip);
      chip
        .animate(
          [
            { transform: 'none', opacity: 1 },
            { transform: `translate(${to.left + to.width / 2 - from.left - half}px, ${to.top - from.top}px) scale(0.5)`, opacity: 0.2 },
          ],
          { duration: 620, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
        )
        .finished.finally(() => chip.remove());
    },
    true,
  );

  return (i: number) => {
    place();
    deal(panels[i], tabs[i]);
  };
}

// A card's own clip (`video`: Stride Social's campaigns): the open card plays it while its tab is shown and the deck is
// on screen; the others rest on their first frame. A big card's film playing pauses them.
function playReels(root: HTMLElement) {
  const reels = [...root.querySelectorAll<HTMLVideoElement>('video[data-deck-reel]')];
  if (!reels.length) return;
  // A clip with a start point and no run (`data-reel-from`) goes round from that point, not from its first second.
  reels.forEach((v) => {
    const start = Number(v.dataset.reelFrom);
    if (!start) return;
    v.addEventListener('ended', () => {
      v.currentTime = start;
      v.play().catch(() => {});
    });
  });
  // A card with a run of clips (`data-reel-list`): each plays from its `from` for its `cap` seconds (or to its end), then
  // the next comes in, round again; the label at the card's top says whose it is.
  reels.forEach((v) => {
    if (!v.dataset.reelList) return;
    type Clip = { src: string; credit?: string; position?: string; from?: number; cap?: number };
    const list = JSON.parse(v.dataset.reelList) as Clip[];
    const credit = v.closest('.deck__card')?.querySelector<HTMLElement>('[data-reel-credit]');
    let at = 0;
    const next = () => {
      at = (at + 1) % list.length;
      const clip = list[at];
      v.src = clip.from ? `${clip.src}#t=${clip.from}` : clip.src;
      v.style.objectPosition = clip.position ?? '';
      if (credit) credit.textContent = clip.credit ?? '';
      v.play().catch(() => {});
    };
    v.addEventListener('timeupdate', () => {
      const clip = list[at];
      if (clip.cap && v.currentTime >= (clip.from ?? 0) + clip.cap) next();
    });
    v.addEventListener('ended', next);
  });
  let seen = false;
  let held = false;
  const sync = () =>
    reels.forEach((v) => {
      const on = seen && !held && !reduced() && !document.hidden && !!v.closest('li')?.classList.contains('is-open') && !v.closest<HTMLElement>('[data-deck-panel]')?.hidden;
      if (on && v.paused) {
        v.preload = 'auto';
        v.play().catch(() => {});
      } else if (!on && !v.paused) v.pause();
    });
  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    sync();
  }, { threshold: 0.2 }).observe(root);
  const watch = new MutationObserver(sync);
  reels.forEach((v) => {
    const li = v.closest('li');
    const panel = v.closest('[data-deck-panel]');
    if (li) watch.observe(li, { attributes: true, attributeFilter: ['class'] });
    if (panel) watch.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  });
  const film = (e: Event) => {
    if (!(e.target instanceof HTMLVideoElement) || e.target.matches('[data-deck-reel]')) return;
    held = e.type === 'play';
    sync();
  };
  ['play', 'pause', 'ended'].forEach((k) => root.addEventListener(k, film, true));
  document.addEventListener('visibilitychange', sync);
  // A film's big card plays it as it opens (the press that opened it lets it play with sound) and stops it as it closes.
  root.querySelectorAll<HTMLElement>('.bigcard--film').forEach((card) => {
    const video = card.querySelector<HTMLVideoElement>('.bigcard__video');
    if (!video) return;
    new MutationObserver(() => {
      if (card.hidden) {
        video.pause();
        return;
      }
      video.currentTime = 0;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }).observe(card, { attributes: true, attributeFilter: ['hidden'] });
  });
}

export function initDecks() {
  // A video behind a section (.exp-haze) plays only while it's in view, with motion allowed; phones and tablets play
  // its smaller file (the same name with -phone).
  document.querySelectorAll<HTMLVideoElement>('[data-haze-video]').forEach((video) => {
    if (reduced()) return;
    const source = video.querySelector('source');
    if (!desktop() && source?.src.endsWith('.mp4') && !source.src.endsWith('-phone.mp4')) {
      source.src = source.src.replace(/\.mp4$/, '-phone.mp4');
      video.load();
    }
    video.defaultPlaybackRate = video.playbackRate = Number(video.dataset.speed) || 1;
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        video.preload = 'auto';
        video.play().catch(() => {});
      } else video.pause();
    }).observe(video);
  });

  document.querySelectorAll<HTMLElement>('[data-deck]').forEach((root) => {
    if (root.dataset.deckReady) return;
    root.dataset.deckReady = 'true';
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-deck-tab]')];
    const panels = [...root.querySelectorAll<HTMLElement>('[data-deck-panel]')];
    let dragged = false;
    // On desktop some cards don't grow: a `still` one says everything already and stays put, a `go` one is
    // a plain link to its page.
    root.querySelectorAll<HTMLElement>('[data-desk="still"]').forEach((card) =>
      card.addEventListener('click', (e) => {
        if (desktop()) e.preventDefault();
      }),
    );
    const grown = initGrow(root, { canOpen: (card) => !dragged && !(card.dataset.desk && desktop()), hold: true });
    const made = { spines: openDeck, lineup: initLineup, stairs: initStairs }[root.dataset.variant ?? ''];
    const chosen = made?.(root, tabs, panels);
    playReels(root);

    const bar = root.querySelector('.deck__bar');
    const tray = document.querySelector<HTMLElement>('.tray[data-tray]');
    // (The last entry is the bar's state now: a quick scroll can queue it going in and out at once.)
    if (bar && tray && desktop() && root.dataset.variant !== 'lineup') new IntersectionObserver((e) => trayUp(tray, root, e[e.length - 1].isIntersecting)).observe(bar);

    root.querySelectorAll<HTMLElement>('.deck__cards').forEach((row) => {
      let pressed = false;
      let lastX = 0;
      let lastT = 0;
      let speed = 0;
      let moved = 0;
      let raf = 0;
      const glide = () => {
        speed *= 0.94;
        if (Math.abs(speed) < 0.3) return;
        row.scrollLeft -= speed;
        raf = requestAnimationFrame(glide);
      };
      row.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.pointerType !== 'mouse' || row.scrollWidth <= row.clientWidth + 2) return;
        pressed = true;
        moved = 0;
        lastX = e.clientX;
        lastT = e.timeStamp;
        speed = 0;
        cancelAnimationFrame(raf);
        row.style.scrollSnapType = 'none';
      });
      window.addEventListener('pointermove', (e) => {
        if (!pressed) return;
        const dx = e.clientX - lastX;
        moved += Math.abs(dx);
        row.scrollLeft -= dx;
        speed = (dx / Math.max(1, e.timeStamp - lastT)) * 16;
        lastX = e.clientX;
        lastT = e.timeStamp;
      });
      window.addEventListener('pointerup', () => {
        if (!pressed) return;
        pressed = false;
        row.style.removeProperty('scroll-snap-type');
        if (moved > 6) {
          dragged = true;
          window.setTimeout(() => (dragged = false), 0);
          raf = requestAnimationFrame(glide);
        }
      });
      row.addEventListener('dragstart', (e) => e.preventDefault());
      row.addEventListener(
        'click',
        (e) => {
          if (!dragged) return;
          e.preventDefault();
          e.stopPropagation();
        },
        true,
      );
    });

    const show = (i: number) => {
      grown.close(false);
      tabs.forEach((t, n) => {
        t.setAttribute('aria-selected', String(n === i));
        t.tabIndex = n === i ? 0 : -1;
      });
      panels.forEach((p, n) => {
        p.hidden = n !== i;
      });
      chosen?.(i);
    };

    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    root.querySelector('[data-deck-tabs]')?.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key;
      const at = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (at < 0) return;
      const next = { ArrowRight: (at + 1) % tabs.length, ArrowLeft: (at - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[key];
      if (next === undefined) return;
      e.preventDefault();
      show(next);
      tabs[next].focus();
    });

    const fromHash = () => {
      const i = tabs.findIndex((t) => t.dataset.deckAnchor && `#${t.dataset.deckAnchor}` === location.hash);
      if (i >= 0) show(i);
    };
    window.addEventListener('hashchange', fromHash);
    fromHash();
  });
}
