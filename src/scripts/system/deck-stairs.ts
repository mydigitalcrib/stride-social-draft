// Stride Academy's deck (components/experience/Deck.astro, variant "stairs", desktop): the cards are a
// staircase, rising left to right. A line runs along the tops, like the road on the level map, lit as far as
// the step under the pointer or the keyboard, with a dot standing on it. Steps rise from the floor one by one.
import { firstView, slidePill } from './deck-parts';
import { uiScale } from './scale';
import { desktop, reduced } from './env';

// On desktop the steps are sized in rem and grow with the screen past 1920×1080, so the line's gap above them and the
// steps' corners grow with them (scale.ts).
const scale = () => (desktop() ? uiScale() : 1);

export function initStairs(root: HTMLElement, tabs: HTMLButtonElement[], panels: HTMLElement[]) {
  const pill = slidePill(root, tabs);
  const ABOVE = 16; // px at 1920×1080, the line above the tops

  const stairs = panels.map((panel) => {
    const items = [...panel.querySelectorAll<HTMLElement>('.deck__cards > li')];
    const svg = panel.querySelector<SVGSVGElement>('[data-stair-line]');
    const base = svg?.querySelector<SVGPathElement>('.deck__stair-base');
    const lit = svg?.querySelector<SVGPathElement>('.deck__stair-lit');
    const climber = panel.querySelector<HTMLElement>('[data-stair-climber]');
    let at = 0;
    const show = () => {
      if (panel.hidden || !base || !lit || !climber || !items.length) return;
      const box = panel.getBoundingClientRect();
      const above = ABOVE * scale();
      const steps = items.map((li) => {
        const r = li.getBoundingClientRect();
        return { left: r.left - box.left, right: r.right - box.left, top: r.top - box.top - above };
      });
      let d = `M ${steps[0].left} ${steps[0].top}`;
      steps.forEach((s, n) => (d += `${n ? ` H ${s.left} V ${s.top}` : ''} H ${s.right}`));
      base.setAttribute('d', d);
      lit.setAttribute('d', d);
      // How far along the line the middle of this step is.
      let walked = 0;
      let total = 0;
      steps.forEach((s, n) => {
        const before = n ? s.left - steps[n - 1].right + Math.abs(s.top - steps[n - 1].top) : 0;
        total += before + (s.right - s.left);
        if (n < at) walked += before + (s.right - s.left);
        if (n === at) walked += before + (s.right - s.left) / 2;
      });
      lit.style.strokeDashoffset = String(1 - walked / total);
      const s = steps[at];
      climber.style.transform = `translate(${(s.left + s.right) / 2}px, ${s.top}px)`;
    };
    const focus = (i: number) => {
      at = i;
      items.forEach((li, n) => {
        li.classList.toggle('is-open', n === i);
        li.classList.toggle('is-climbed', n < i);
      });
      show();
    };
    items.forEach((li, n) => {
      li.addEventListener('pointerenter', () => focus(n));
      li.addEventListener('focusin', () => focus(n));
    });
    focus(0);
    const rise = () => {
      if (reduced() || !desktop()) return;
      const corner = `${(22 * scale()).toFixed(2)}px`;
      items.forEach((li, n) => {
        li.animate([{ clipPath: `inset(100% 0 0 0 round ${corner})` }, { clipPath: `inset(0 0 0 0 round ${corner})` }], {
          duration: 620,
          delay: n * 80,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'backwards',
        });
      });
      [svg, climber].forEach((el) => el?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: items.length * 80 + 200, fill: 'backwards' }));
    };
    return { show, rise };
  });

  const current = () => Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  firstView(root, () => {
    stairs[current()].show();
    stairs[current()].rise();
  });
  new ResizeObserver(() => stairs[current()].show()).observe(root);

  return (i: number) => {
    pill();
    stairs[i].show();
    stairs[i].rise();
  };
}
