// Stride Sport's LED board (talent/SportBoard.astro, every screen; on a touch screen a tap is the click): the names run along it at a steady speed; under the
// pointer the run eases to a stop and the name pointed at lights up; a click blinks it twice and opens that athlete's
// profile among the others (creator-sheet.ts, `creators:open`), growing from a square of the board where the name is.
// On the page's first opening it waits for the board to power up (its CSS animation) and then gathers speed. It holds
// still under reduced motion (pointing and clicking still work) and while off screen; at rest under the pointer it stops
// drawing altogether.
import { uiScale } from './scale';
import { openCreators } from './creator-open';
import { reduced } from './env';

const SPEED = 70; // px a second at 1920×1080 (grown with a larger screen, as the names are: scale.ts)
const EASE = 0.08; // per frame, the share of the way the speed covers towards where it's going
const BLINK = 220; // ms: the name pressed blinks twice, then its profile opens

const hold = { easing: 'steps(1, end)' };

export function initSportBoard() {
  const board = document.querySelector<HTMLElement>('[data-sport-board]');
  const track = board?.querySelector<HTMLElement>('[data-board-track]');
  if (!board || !track || board.dataset.ready) return;
  board.dataset.ready = 'true';
  const ids = (board.dataset.ids ?? '').split(' ').filter(Boolean);
  const run = track.firstElementChild as HTMLElement | null;
  const still = reduced();

  let x = 0;
  let speed = SPEED;
  let goal = SPEED;
  let last = 0;
  let raf = 0;
  let seen = true;
  let over = false;
  let booted = true;
  let width = run?.offsetWidth ?? 0;
  let lit: HTMLElement | null = null;
  let opening = false;

  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    speed += (goal - speed) * (1 - Math.pow(1 - EASE, dt * 60));
    x -= speed * uiScale() * dt;
    if (width && -x >= width) x += width;
    track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    if (seen && (goal > 0 || speed > 0.05)) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = () => {
    if (still || raf || !seen) return;
    raf = requestAnimationFrame(frame);
  };
  const aim = () => {
    goal = over || !booted ? 0 : SPEED;
    kick();
  };

  // Pointing and pressing, whatever the motion setting.
  board.addEventListener('pointerenter', () => {
    over = true;
    aim();
  });
  board.addEventListener('pointerleave', () => {
    over = false;
    aim();
    lit?.classList.remove('is-on');
    lit = null;
  });
  board.addEventListener('pointermove', (e) => {
    const item = (e.target as Element).closest<HTMLElement>('[data-board-item]');
    if (item === lit) return;
    lit?.classList.remove('is-on');
    lit = item;
    lit?.classList.add('is-on');
  });
  board.addEventListener('click', (e) => {
    const item = (e.target as Element).closest<HTMLElement>('[data-board-item]');
    if (!item || opening) return;
    // A square of the board, centred on the name: the profile's print grows from there, not stretched from the line.
    const name = (item.querySelector('b') ?? item).getBoundingClientRect();
    const strip = board.getBoundingClientRect();
    const from = new DOMRect(name.left + name.width / 2 - strip.height / 2, strip.top, strip.height, strip.height);
    const open = () => {
      opening = false;
      openCreators(ids, Number(item.dataset.boardItem), from, board.dataset.profile);
    };
    if (still) return open();
    opening = true;
    item.animate([{ opacity: 1, ...hold }, { opacity: 0.25, ...hold }, { opacity: 1, ...hold }, { opacity: 0.25, ...hold }, { opacity: 1 }], { duration: BLINK }).finished.then(open, open);
  });

  if (still) return;
  if (run) new ResizeObserver(() => (width = run.offsetWidth)).observe(run);
  new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting;
    if (seen) {
      last = 0;
      kick();
    }
  }).observe(board);

  // Powering up (the board's own CSS animation, on the page's first opening): the run waits, then gathers speed.
  const boot = board.getAnimations().find((a) => a instanceof CSSAnimation);
  if (boot) {
    booted = false;
    speed = 0;
    const ready = () => {
      booted = true;
      aim();
    };
    boot.finished.then(ready, ready);
  }
  aim();
}
