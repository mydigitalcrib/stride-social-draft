// Behaviour for talent/VideoWall.astro, every screen (on phones and tablets the screen is above the list, and a tap
// brings it into view as it puts a video on it): a video in the list pointed at shows on the screen (its picture, who,
// what), a click puts it there (instead of going to YouTube; a modified click still does), and the screen's play button
// loads it from YouTube's privacy-enhanced player, playing, from its moment if it has one (`data-start`, seconds).
// Choosing another while one plays puts the new one in, playing. A Spotify episode (`data-kind`) shows its own picture,
// whole, and its play button loads Spotify's player (the episode then plays from Spotify's own button). One whose channel
// has turned off playing it elsewhere (`data-out`) isn't put on the screen by a click: the list's link opens it on
// YouTube, and the screen's button, an arrow while it's shown, does the same.
// The screen's picture changes only once the next one has loaded and decoded, in the picture behind, which then comes in
// over it; one pointed at and left again before it's ready never shows. The largest size is fetched only for one that
// stays on the screen a moment. The running order scrolls under the wheel when it's longer than its box (smooth scrolling
// leaves it alone), and follows the keyboard. While a video plays, the footage behind the page rests (`spec:hush`,
// spec-reel.ts), until the screen leaves the view.
import { desktop, lenis, reduced } from './env';
const BIG_AFTER = 150; // ms on the screen before the largest picture is fetched
const yt = (id: string, size: string) => `https://i.ytimg.com/vi/${id}/${size}.jpg`;

export function initVideoWalls() {
  document.querySelectorAll<HTMLElement>('[data-video-wall]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const screen = root.querySelector<HTMLElement>('[data-vwall-screen]');
    const posters = [...root.querySelectorAll<HTMLImageElement>('[data-vwall-poster]')];
    const play = root.querySelector<HTMLButtonElement>('[data-vwall-play]');
    const who = root.querySelector<HTMLElement>('[data-vwall-who]');
    const title = root.querySelector<HTMLElement>('[data-vwall-title]');
    const note = root.querySelector<HTMLElement>('[data-vwall-note]');
    const list = root.querySelector<HTMLElement>('[data-vwall-list]');
    const items = [...root.querySelectorAll<HTMLAnchorElement>('[data-vwall-item]')];
    if (!screen || posters.length < 2 || !play || !items.length) return;
    const playWords = root.dataset.playWords ?? 'Play';
    let current = items[0];
    let shown = items[0];
    let front = 0; // which of the two pictures is in front
    let token = 0; // the picture asked for last: anything older that finishes loading is dropped
    let bigTimer = 0;

    // A picture onto the screen: into the one behind, and once it's decoded, to the front.
    const put = (src: string, mine: number, art = false) => {
      const back = posters[1 - front];
      back.classList.toggle('is-art', art);
      back.src = src;
      // Once only: two puts into the same picture before it came forward (the large size arriving before the first
      // had decoded) would otherwise swap twice and leave neither picture in front.
      const swap = () => {
        if (mine !== token || back === posters[front]) return;
        back.classList.add('is-front');
        posters[front].classList.remove('is-front');
        front = 1 - front;
      };
      back.decode().then(swap, swap);
    };
    // The largest size, when (and if) YouTube has it, for one still on the screen.
    const sharpen = (id: string, mine: number) => {
      window.clearTimeout(bigTimer);
      bigTimer = window.setTimeout(() => {
        const big = new Image();
        big.referrerPolicy = 'no-referrer';
        big.onload = () => {
          if (mine === token && big.naturalWidth > 480) put(big.src, mine);
        };
        big.src = yt(id, 'maxresdefault');
      }, BIG_AFTER);
    };

    // On the screen (not playing): its picture and words.
    const show = (a: HTMLAnchorElement) => {
      if (a === shown || screen.classList.contains('is-playing')) return;
      shown = a;
      const id = a.dataset.vwallItem!;
      const spotify = a.dataset.kind === 'spotify';
      const out = a.dataset.out === 'true';
      const mine = ++token;
      put(spotify ? (a.dataset.image ?? '') : yt(id, 'hqdefault'), mine, spotify);
      if (spotify) window.clearTimeout(bigTimer);
      else sharpen(id, mine);
      screen.classList.toggle('is-out', out);
      if (who) who.textContent = a.dataset.who ?? '';
      if (title) title.textContent = a.dataset.title ?? '';
      if (note) note.textContent = a.dataset.note ?? '';
      play.setAttribute('aria-label', `${playWords}: ${a.dataset.title ?? ''}${out ? ' (on YouTube, in a new tab)' : ''}`);
    };

    // The footage behind the page rests while a video plays and the screen is in view.
    const hush = (on: boolean) => document.dispatchEvent(new CustomEvent('spec:hush', { detail: { on } }));
    new IntersectionObserver(([entry]) => {
      if (screen.classList.contains('is-playing')) hush(entry.isIntersecting);
    }).observe(screen);

    const start = (a: HTMLAnchorElement) => {
      if (a.dataset.out === 'true') {
        window.open(a.href, '_blank', 'noopener');
        return;
      }
      const frame = document.createElement('iframe');
      if (a.dataset.kind === 'spotify') {
        frame.src = `https://open.spotify.com/embed/episode/${a.dataset.vwallItem}`;
        frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      } else {
        const from = Number(a.dataset.start) > 0 ? `&start=${a.dataset.start}` : '';
        frame.src = `https://www.youtube-nocookie.com/embed/${a.dataset.vwallItem}?autoplay=1&rel=0&modestbranding=1&playsinline=1${from}`;
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      }
      frame.title = a.dataset.title ?? 'Video';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      screen.querySelector('iframe')?.remove();
      screen.append(frame);
      screen.classList.add('is-playing');
      frame.focus();
      hush(true);
    };

    const choose = (a: HTMLAnchorElement) => {
      current = a;
      items.forEach((x) => x.classList.toggle('is-on', x === a));
      const playing = screen.classList.contains('is-playing');
      if (playing) start(a);
      else show(a);
    };

    // The running order follows the keyboard: the one focused is brought into its box (the list, not the page).
    const reveal = (a: HTMLAnchorElement) => {
      if (!list) return;
      const top = a.offsetTop;
      const bottom = top + a.offsetHeight;
      const to = top < list.scrollTop ? top : bottom > list.scrollTop + list.clientHeight ? bottom - list.clientHeight : null;
      if (to !== null) list.scrollTo({ top: to, behavior: reduced() ? 'auto' : 'smooth' });
    };

    items.forEach((a) => {
      a.addEventListener('pointerenter', () => show(a));
      a.addEventListener('focus', () => {
        show(a);
        reveal(a);
      });
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || a.dataset.out === 'true') return;
        e.preventDefault();
        choose(a);
        // Under the screen (phones, tablets): the screen comes into view if it's out of it.
        if (desktop()) return;
        const r = screen.getBoundingClientRect();
        if (r.top >= 0 && r.bottom <= window.innerHeight) return;
        const l = lenis();
        const to = window.scrollY + r.top - Math.max(0, (window.innerHeight - r.height) / 2);
        if (l) l.scrollTo(to, { duration: 0.7 });
        else window.scrollTo({ top: to, behavior: reduced() ? 'auto' : 'smooth' });
      });
    });
    // Off the list, the screen goes back to the one chosen.
    list?.addEventListener('pointerleave', () => show(current));
    play.addEventListener('click', () => start(shown));

    // When the list is longer than its box, the wheel scrolls it rather than the page (smooth-scroll.ts's Lenis
    // leaves anything marked data-lenis-prevent to the browser); when it all fits, the wheel goes on scrolling the page.
    if (list) {
      const fits = () => list.toggleAttribute('data-lenis-prevent', list.scrollHeight > list.clientHeight + 1);
      new ResizeObserver(fits).observe(list);
    }
    if (items[0].dataset.kind !== 'spotify') sharpen(items[0].dataset.vwallItem!, token);
  });
}
