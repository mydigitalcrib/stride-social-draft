// The desktop's scale (styles/system/tokens.css): 1 up to 1920×1080, and on a larger screen as much as the root size
// has grown (the smaller of width / 1920 and height / 1080). Geometry a script sets in pixels (distances, offsets,
// canvas drawing sizes, thresholds) multiplies by it, so it keeps the same proportions as the CSS around it.
import { desktop } from './env';
let cached = 0;
const read = () => (cached = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1);

export function uiScale(): number {
  return cached || read();
}

// The same, but always 1 below desktop (1024px wide): for code that also runs on phones and tablets.
export function deskScale(): number {
  return typeof window !== 'undefined' && desktop() ? uiScale() : 1;
}

if (typeof window !== 'undefined') window.addEventListener('resize', read, { passive: true });
