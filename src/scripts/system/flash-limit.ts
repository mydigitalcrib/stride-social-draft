// Never more than three flashes a second, whatever sets them off (WCAG 2.3.1, for people with photosensitive
// epilepsy): Stride Talent's camera flashes (flashes.ts) and a shot's flash (shot.ts) each take a turn, at least a
// third of a second from any other. Times are performance.now()'s.
export const FLASH_GAP = 340;

/** The turns taken, earliest first. */
const turns: number[] = [];

/** The first moment from `at` that a flash may go off, taken for it. */
export function flashTurn(at = performance.now()) {
  // The turns long past no longer matter.
  while (turns.length && turns[0] < at - 2000) turns.shift();
  let t = at;
  for (const taken of turns) if (Math.abs(taken - t) < FLASH_GAP) t = taken + FLASH_GAP;
  turns.push(t);
  turns.sort((a, b) => a - b);
  return t;
}

/** Gives back the turns taken for after `from` (their flashes won't go off). */
export function flashCancel(from = performance.now()) {
  while (turns.length && turns[turns.length - 1] > from) turns.pop();
}
