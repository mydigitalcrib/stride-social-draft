// Behaviour for the site navigation: the radial scroll navigation on the left
// (components/global/EdgeNav.astro) and its expanded form, the glass menu panel that grows from
// the header's Menu button (components/global/SiteHeader.astro). Both share one active area and
// one way of moving between areas.
// - Home page: the scroll gives the active area (the last one whose section has been reached; only
//   ever one). The arc turns to it on a soft spring and always settles exactly on it, its label
//   resting level inside the glass capsule, which reshapes to the width of the label passing
//   through it. Crossing into a new area tints the screen faintly in its colours.
//   On desktop the hero belongs to no area: nothing is selected and there's no capsule until the
//   three sides arrive, which are all of Stride Group; its button goes to them, never to the hero.
// - Choosing an area (arc or panel): the arc and the capsule head for it straight away and the page
//   goes there. Meanwhile the scroll doesn't steer the arc, and a new choice cancels the last one, so
//   repeated clicks never fight.
// - Dragging the arc with the mouse (desktop), or with a finger along it (phones and tablets, where it lies at the
//   foot of the screen): it follows, and on release settles on the nearest area and goes there, as if chosen; let go
//   where it started and it just springs back.
// - Phones and tablets (the same dial at the foot of the screen): it's away (.is-away) on the first screen, on the
//   way down (with the header, header.ts) and while the page has its own bar at the foot of the screen (FOOT); the
//   rest (an open menu, a case study, a profile, the opening film, the tray) is its CSS.
// - Menu: opens and closes the glass bar beside it; it also closes with Escape, a click outside,
//   a choice or (desktop) the keyboard's focus leaving it. Left/Right (or Up/Down) move between its
//   areas. On desktop one capsule of glass slides to the area pointed at or focused in it.
// - Keyboard: focusing an area on the arc turns the arc to it; Up/Down/Home/End move between areas.
//   (Pointer focus doesn't: turning under a press would slide the label away before the click.)
// - From page to page: the page being left notes where its arc was and how fast it was
//   turning (sessionStorage), and the next one starts there and turns on to its own area as the page
//   change begins, so the dial reads as one across the site (EdgeNav.astro draws it there first). While
//   it turns, the mark at its hub turns a little with it and the capsule gives, both level at rest.
//   Leaving through the dial in a browser without page transitions blurs the page first (motion.css).
// - Reduced motion: no easing; the arc and the page jump.

import { uiScale } from './scale';
import { desktop, lenis, reduced } from './env';

// Where each area lives on the home page: Group is the three sides (the hero belongs to no area; see `sectionOf`).
// Social, Talent and Academy are rows in the three sides, not places of their own, so choosing one opens its page and
// the arc stays on Group while the home page scrolls; so do Work, About, Contact and Our Sponsoring.

const STEP = 12; // degrees between areas on the arc (phones and tablets widen it in CSS, --dial-k)
// Pixels of dragging per area, about the labels' spacing on the arc at 1920×1080; the arc is in rem, so on a larger
// screen the drag scales with it (uiScale) and a label still follows the pointer.
const DRAG_STEP = 75;
// Phones and tablets: pixels of a finger's drag along the arc per area, about the labels' spacing there.
const DRAG_STEP_TOUCH = 140;
// Pixels before a press counts as a drag rather than a click. It's the hand's slack, not the layout's, so it doesn't scale.
const DRAG_START = 4;
// Phones and tablets: what has the foot of the screen to itself (the dial steps aside while one is there): About's
// player, Our Work's controls, the homepage's rows (the open one's way in sits at its foot), the footer's last line.
const FOOT = '.story__player, .wcanvas__foot, .sides__rows, .footer__base';
const LINE = 0.3; // an area is reached when its top passes 30% of the way down the screen
// The arc's spring: settles in about a third of a second with the slightest overshoot (about 1%).
const STIFFNESS = 190;
const DAMPING = 2 * Math.sqrt(STIFFNESS) * 0.82;
// What a page leaves for the next (SiteLayout.astro and EdgeNav.astro read it too); only a fresh one counts.
const DIAL_KEY = 'stride:dial';

export function initEdgeNav() {
  const nav = document.querySelector<HTMLElement>('[data-radial]');
  if (!nav || nav.dataset.radialReady) return;
  nav.dataset.radialReady = 'true';
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const items = [...nav.querySelectorAll<HTMLAnchorElement>('[data-radial-item]')];
  const panelItems = panel ? [...panel.querySelectorAll<HTMLAnchorElement>('[data-menu-item]')] : [];
  const slots = items.map((a) => a.parentElement as HTMLElement);
  const home = nav.hasAttribute('data-home');
  const last = items.length - 1;
  const keyOf = (i: number) => items[i].dataset.radialItem ?? '';
  const docTop = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
  const sectionOf = (i: number) => (keyOf(i) === 'group' ? document.querySelector<HTMLElement>('.sides') : null);
  // Stride Group: the three sides, whichever page it's chosen from. Filling the screen, with their foot at the bottom
  // of it (the hash lands the same way, components/home/ContentsIndex.astro).
  [...items, ...panelItems].filter((a) => a.dataset.radialItem === 'group' || a.dataset.menuItem === 'group').forEach((a) => a.setAttribute('href', '/#stride-group'));
  const sidesY = (el: HTMLElement) => Math.max(0, docTop(el) + el.offsetHeight - window.innerHeight);
  const own = Number(nav.dataset.current ?? 0); // this page's own area (-1: the homepage, its hero first)

  let target = own; // where the arc is heading (always a whole area)
  let shown = target; // where it is drawn
  let speed = 0;
  let focusIndex: number | null = null; // keyboard focus on the arc overrides the scroll
  let active = -2; // nothing read yet (-1 is nothing selected)
  let raf = 0;
  let then = 0; // the last frame's time
  let moving = false; // a chosen area is on its way: the scroll doesn't steer the arc meanwhile
  let dragging = false; // the pointer is turning the arc: neither the spring nor the scroll does
  let held = false; // arrived from another page: the turn waits for the page change to begin
  let timers: number[] = [];

  // Each label's box, for the capsule.
  let widths: number[] = [];
  const measure = () => {
    widths = items.map((a) => a.offsetWidth);
    nav.style.setProperty('--glass-h', `${items[0]?.offsetHeight ?? 0}px`);
    draw();
  };

  const draw = () => {
    slots.forEach((slot, i) => {
      const d = i - shown;
      slot.style.setProperty('--a', `${(d * STEP).toFixed(2)}deg`);
      // Clear beside the active area, fading out two areas away.
      slot.style.setProperty('--o', Math.max(0, 1 - Math.abs(d) * 0.2 - d * d * 0.045).toFixed(3));
      slot.classList.toggle('is-far', Math.abs(d) > 2.6);
    });
    // The capsule takes the width of the label passing through it, so it reshapes as the arc turns.
    if (!widths.length) return;
    const lo = Math.max(0, Math.min(last, Math.floor(shown)));
    const hi = Math.min(last, lo + 1);
    const f = Math.max(0, Math.min(1, shown - lo));
    nav.style.setProperty('--glass-w', `${(widths[lo] + (widths[hi] - widths[lo]) * f).toFixed(1)}px`);
  };

  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    nav.classList.toggle('is-resting', i < 0);
    [items, panelItems].forEach((list) =>
      list.forEach((a, j) => {
        a.classList.toggle('is-active', j === i);
        if (!home) return;
        if (j === i) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      }),
    );
  };

  // The hub's mark turns with the arc's speed (areas a second) and the capsule gives a little; both are level at rest.
  let cued = false;
  const cue = (v: number) => {
    const s = reduced() ? 0 : v;
    if (!s && !cued) return;
    cued = !!s;
    nav.style.setProperty('--hub-spin', Math.max(-18, Math.min(18, -s * 7)).toFixed(2));
    nav.style.setProperty('--squash', Math.min(Math.abs(s), 4).toFixed(3));
  };

  // One spring step per frame (timed, so it runs the same at any frame rate), until it is at rest
  // exactly on the goal.
  const tick = (now: number) => {
    const goal = focusIndex ?? target;
    const dt = then ? Math.min(0.034, (now - then) / 1000) : 1 / 60;
    then = now;
    if (reduced()) {
      shown = goal;
      speed = 0;
    } else {
      speed += (STIFFNESS * (goal - shown) - DAMPING * speed) * dt;
      shown += speed * dt;
      if (Math.abs(goal - shown) < 0.0005 && Math.abs(speed) < 0.005) {
        shown = goal;
        speed = 0;
      }
    }
    draw();
    cue(speed);
    if (shown === goal) {
      raf = 0;
      then = 0;
    } else {
      raf = requestAnimationFrame(tick);
    }
  };
  const run = () => {
    if (!raf && !held) raf = requestAnimationFrame(tick);
  };

  // Arriving from another page: the arc starts where that page's was, at its speed, and the spring takes it on to
  // this page's area once the page change has begun (its view transition is ready), or straight after the page
  // shows without one. Not while the homepage's opening plays.
  if (nav.dataset.from !== undefined && !reduced() && !document.documentElement.classList.contains('opening-on')) {
    shown = Number(nav.dataset.from);
    speed = Number(nav.dataset.fromSpeed) || 0;
    held = true;
    const release = () => {
      if (!held) return;
      held = false;
      run();
    };
    type Reveal = { ready: Promise<unknown> } | null;
    const after = (vt: Reveal | undefined) => (vt ? vt.ready.then(release, release) : window.setTimeout(release, 120));
    const revealed = (window as unknown as { strideReveal?: Reveal }).strideReveal;
    if (revealed !== undefined || !('onpagereveal' in window)) after(revealed);
    else window.addEventListener('pagereveal', (e) => after((e as Event & { viewTransition?: Reveal }).viewTransition), { once: true });
    window.setTimeout(release, 700); // whatever happens, it never waits longer
  }

  // Leaving: where the arc is, for the next page.
  const remember = () => {
    try {
      sessionStorage.setItem(DIAL_KEY, JSON.stringify({ shown, speed, area: own, t: Date.now() }));
    } catch {
      /* no storage here: the next page's arc starts at its own area */
    }
  };
  window.addEventListener('pageswap', remember);
  window.addEventListener('pagehide', remember);

  const read = () => {
    if (!home || moving || dragging) return;
    // The hero is no area's: nothing selected until the three sides arrive.
    const starts = items.map((_, i) => {
      const el = sectionOf(i);
      return el ? docTop(el) - window.innerHeight * LINE : Infinity; // no place here: never reached
    });
    const y = window.scrollY;
    let i = -1;
    for (let j = 0; j <= last; j++) if (y >= starts[j]) i = j;
    target = i;
    setActive(i);
    run();
  };

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      read();
    });
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    queue();
  }, { passive: true });

  /* ---------- Phones and tablets: when the dial is there ----------
     Away on the first screen, while the header is (on the way down) and while something has the foot of the screen
     (FOOT, within its last fifth); there on the way back up past the first screen, as the header is. */
  const chrome = document.querySelector<HTMLElement>('[data-chrome]');
  const busy = new Set<Element>();
  const placeDial = () => {
    if (desktop()) return nav.classList.remove('is-away');
    const away = window.scrollY < window.innerHeight * 0.6 || !!chrome?.classList.contains('is-hidden') || busy.size > 0;
    nav.classList.toggle('is-away', away);
  };
  if ('IntersectionObserver' in window) {
    const footIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? busy.add(e.target) : busy.delete(e.target)));
        placeDial();
      },
      { rootMargin: '-80% 0px 0px 0px' },
    );
    document.querySelectorAll(FOOT).forEach((el) => footIO.observe(el));
  }
  if (chrome) new MutationObserver(placeDial).observe(chrome, { attributes: true, attributeFilter: ['class'] });
  let placing = false;
  window.addEventListener(
    'scroll',
    () => {
      if (placing) return;
      placing = true;
      requestAnimationFrame(() => {
        placing = false;
        placeDial();
      });
    },
    { passive: true },
  );
  window.addEventListener('resize', placeDial, { passive: true });
  placeDial();
  window.addEventListener('load', queue);
  setActive(target);
  measure();
  document.fonts?.ready.then(measure);
  read();

  /* ---------- The menu panel ---------- */
  // Desktop: one capsule of glass in the open bar goes to the area pointed at or focused, springing from one to the
  // next (SiteHeader.astro). It appears where it's first needed rather than sliding in, and fades where it was.
  const capsule = panel?.querySelector<HTMLElement>('[data-menu-glass]');
  let spots: { left: number; width: number }[] = [];
  let capsuleOn = false;
  // From the layout, not the boxes on screen: the areas are still sliding in as the bar opens. Each sits alone in
  // its list item, whose offset is the bar's (its own `translate` makes it the area's offset parent).
  const measureMenu = () => {
    if (!capsule) return;
    spots = panelItems.map((a) => ({ left: (a.parentElement as HTMLElement).offsetLeft, width: a.offsetWidth }));
    capsule.style.setProperty('--gh', `${panelItems[0]?.offsetHeight ?? 0}px`);
  };
  const capsuleTo = (i: number) => {
    const spot = spots[i];
    if (!capsule || !spot || !desktop()) return;
    const place = () => {
      capsule.style.setProperty('--gx', `${spot.left}px`);
      capsule.style.setProperty('--gw', `${spot.width}px`);
    };
    if (!capsuleOn) {
      // Only its fade runs: it's put in place without the slide.
      capsule.style.transitionProperty = 'opacity';
      place();
      void capsule.offsetWidth;
      capsule.style.removeProperty('transition-property');
    } else place();
    capsuleOn = true;
    capsule.classList.add('is-on');
  };
  const capsuleOff = () => {
    capsuleOn = false;
    capsule?.classList.remove('is-on');
  };

  const isOpen = () => !!panel?.classList.contains('is-open');
  const setOpen = (open: boolean, returnFocus = true) => {
    if (!panel || open === isOpen()) return;
    panel.classList.toggle('is-open', open);
    panel.toggleAttribute('inert', !open);
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      measureMenu();
      (panelItems.find((a) => a.classList.contains('is-active')) ?? panelItems[0])?.focus({ preventScroll: true });
    } else {
      capsuleOff();
      if (returnFocus && panel.contains(document.activeElement)) menuButton?.focus({ preventScroll: true });
    }
  };
  if (capsule && panel) {
    panel.classList.add('has-glass');
    panelItems.forEach((a, i) => {
      a.addEventListener('pointerenter', () => capsuleTo(i));
      a.addEventListener('focusin', () => {
        if (a.matches(':focus-visible')) capsuleTo(i);
      });
    });
    // Off the list, it fades where it is (unless the keyboard is still in it).
    panel.querySelector('ol')?.addEventListener('pointerleave', () => {
      if (!panel.querySelector(':focus-visible')) capsuleOff();
    });
    window.addEventListener('resize', () => isOpen() && measureMenu(), { passive: true });
  }
  menuButton?.addEventListener('click', () => setOpen(!isOpen()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false);
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (isOpen() && !panel?.contains(t) && !menuButton?.contains(t)) setOpen(false, false);
  });
  // Desktop: tabbing out of the open bar closes it, rather than leaving it open behind the focus.
  const onFocusOut = (e: FocusEvent) => {
    const to = e.relatedTarget;
    if (!desktop() || !isOpen() || !(to instanceof Node) || panel?.contains(to) || menuButton?.contains(to)) return;
    setOpen(false, false);
  };
  panel?.addEventListener('focusout', onFocusOut);
  menuButton?.addEventListener('focusout', onFocusOut);
  panel?.addEventListener('keydown', (e) => {
    const i = panelItems.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    panelItems[Math.min(last, Math.max(0, next))].focus();
  });

  /* ---------- Choosing an area ---------- */
  const go = (i: number, href: string) => {
    const key = keyOf(i);
    const el = home ? sectionOf(i) : null;
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
    focusIndex = null;
    setOpen(false, false);
    // The arc and the capsule head for the choice straight away; the scroll waits until the page
    // is there, then takes over again.
    moving = true;
    target = i;
    setActive(i);
    run();
    const arrived = () => {
      moving = false;
      read();
    };
    if (home && el && key === 'group') {
      // Already on the homepage: a glide down to the three sides.
      const smooth = lenis();
      if (smooth && !reduced()) {
        smooth.scrollTo(sidesY(el), { duration: 1.1 });
        timers.push(window.setTimeout(arrived, 1150));
      } else {
        window.scrollTo(0, sidesY(el));
        arrived();
      }
    } else if (home && el) {
      const y = i === 0 ? 0 : Math.max(0, docTop(el) - window.innerHeight * (LINE - 0.08));
      const smooth = lenis();
      if (smooth) smooth.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
      arrived();
    } else if (!home && i === own) {
      window.scrollTo(0, 0);
      arrived();
    } else {
      leave(href);
    }
  };
  // Desktop, in a browser without page transitions: the page blurs away first (html.is-leaving, motion.css).
  const leave = (href: string) => {
    if (!desktop() || reduced() || Reflect.has(window, 'onpagereveal')) return location.assign(href);
    document.documentElement.classList.add('is-leaving');
    timers.push(window.setTimeout(() => location.assign(href), 200));
  };

  [items, panelItems].forEach((list) =>
    list.forEach((a, i) => {
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        a.blur();
        go(i, a.href);
      });
    }),
  );

  /* ---------- Dragging the arc ---------- */
  const nearest = (v: number) => Math.min(last, Math.max(0, Math.round(v)));
  let suppressClick = false; // the click that ends a drag isn't a choice
  nav.addEventListener('pointerdown', (e) => {
    // Desktop: the mouse, up and down the arc on the left. Phones and tablets: a finger (or the mouse), along the arc at
    // the foot of the screen, so the position read is across the screen (its sideways drags never scroll the page).
    const desk = desktop();
    if ((desk && e.pointerType !== 'mouse') || e.button !== 0 || moving) return;
    const along = (ev: PointerEvent) => (desk ? ev.clientY : ev.clientX);
    const startY = along(e);
    const from = shown;
    const startArea = target;
    const source = e.target as HTMLElement;
    const step = desk ? DRAG_STEP * uiScale() : DRAG_STEP_TOUCH; // the labels' spacing on this screen
    let lastY = startY;
    let lastT = e.timeStamp;
    let velocity = 0; // areas per second
    suppressClick = false;

    const move = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.abs(along(ev) - startY) < DRAG_START) return;
        dragging = true;
        suppressClick = true;
        source.setPointerCapture(ev.pointerId);
        document.documentElement.classList.add('is-radial-dragging');
        cancelAnimationFrame(raf);
        raf = 0;
        then = 0;
        speed = 0;
      }
      // Pulling down (sideways to the right on phones) brings the area before to the capsule. Past either end it gives,
      // but only a little.
      const pulled = from - (along(ev) - startY) / step;
      shown = pulled < 0 ? pulled * 0.25 : pulled > last ? last + (pulled - last) * 0.25 : pulled;
      const dt = ev.timeStamp - lastT;
      if (dt > 0) velocity = (-(along(ev) - lastY) / step / dt) * 1000;
      lastY = along(ev);
      lastT = ev.timeStamp;
      setActive(nearest(shown));
      draw();
      cue(velocity);
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      document.removeEventListener('selectstart', noSelect);
      if (!dragging) return;
      dragging = false;
      document.documentElement.classList.remove('is-radial-dragging');
      // A pause before letting go means no flick.
      if (ev.timeStamp - lastT > 80) velocity = 0;
      velocity = Math.max(-8, Math.min(8, velocity));
      speed = velocity;
      const chosen = ev.type === 'pointerup' ? nearest(shown + velocity * 0.12) : startArea;
      if (chosen === startArea) {
        target = startArea;
        setActive(startArea);
        run();
        queue();
      } else {
        go(chosen, items[chosen].href);
      }
      // A click only follows if the press and release share an element; otherwise don't eat the next.
      window.setTimeout(() => (suppressClick = false), 0);
    };
    const noSelect = (ev: Event) => ev.preventDefault();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    document.addEventListener('selectstart', noSelect);
  });
  nav.addEventListener('dragstart', (e) => e.preventDefault()); // the browser's own dragging of links
  nav.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Keyboard focus turns the arc to the focused area; a pointer press doesn't (the label would
  // slide out from under it before the click lands).
  items.forEach((a, i) => {
    a.addEventListener('focus', () => {
      if (!a.matches(':focus-visible')) return;
      focusIndex = i;
      run();
    });
    a.addEventListener('blur', () => {
      if (focusIndex !== i) return;
      focusIndex = null;
      run();
    });
  });

  nav.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    items[Math.min(last, Math.max(0, next))].focus();
  });

  // Back from another page (bfcache): never leave the panel up, and show this page's own area again, already in place.
  window.addEventListener('pageshow', (e) => {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
    moving = false;
    document.documentElement.classList.remove('is-leaving');
    setOpen(false, false);
    if (!e.persisted) return;
    focusIndex = null;
    if (home) {
      read();
    } else {
      target = own;
      setActive(own);
    }
    shown = target;
    speed = 0;
    draw();
    cue(0);
  });
}
