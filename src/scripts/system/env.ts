// What many scripts ask, in one place: whether the visitor wants less motion, whether this is a desktop screen, the
// page's smooth scroll, and a number held between two others. The screen sizes are the design system's: desktop from
// 1024px wide, tablet 768–1023px, phone up to 767px (the CSS uses the same widths: styles/system/tokens.css). A script
// that runs inline in a page (`is:inline`) can't import this, so it writes the same media query out.
import type Lenis from 'lenis';

export const DESKTOP = '(min-width: 1024px)';
export const TABLET = '(min-width: 768px) and (max-width: 1023px)';
export const PHONE = '(max-width: 767px)';
export const REDUCED = '(prefers-reduced-motion: reduce)';

/** The visitor has asked for less motion (read each time, so a change of setting applies at once). */
export const reduced = () => window.matchMedia(REDUCED).matches;

/** A desktop screen: 1024px wide and up. */
export const desktop = () => window.matchMedia(DESKTOP).matches;

/** The page's smooth scroll (smooth-scroll.ts), when it runs: never with reduced motion, nor before it starts. */
export const lenis = () => (window as unknown as { lenis?: Lenis }).lenis;

/** `v` held between `lo` and `hi` (0 and 1 unless said). */
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** A screen without a pointer that hovers (a phone, a tablet). */
export const touch = () => window.matchMedia('(hover: none)').matches;

/** The interface's words for a pointer (interactions.yaml: "Click to…", "Point at…") as a finger's, on a touch screen. */
export const tapWords = (text: string) => (touch() ? text.replace(/\bClick\b/g, 'Tap').replace(/\bclick\b/g, 'tap').replace(/\bPoint at\b/g, 'Tap') : text);
