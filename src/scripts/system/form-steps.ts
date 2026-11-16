// One question at a time, on the forms in experience/FormStage.astro: a long form becomes a short
// conversation, with a progress bar and Next and Back. Each step is checked before moving on, by the same
// rules as the whole form (form.ts), which still does the sending. Without the script, or below desktop, it's
// the ordinary form with every field showing.
// It moves like a conversation: the question being left steps out first, then the next comes in from the right
// (Back: the one before from the left; FormStage.astro); Next on an answer that isn't right yet shakes the question a
// little and brings its error line up. None of it under reduced motion.
import { checkWithin } from './form';
import { desktop, reduced } from './env';

function initSteps(panel: HTMLElement) {
  const form = panel.querySelector('form');
  const grid = form?.querySelector<HTMLElement>(':scope > [class*="__grid"]');
  if (!form || !grid) return;
  const steps = [...grid.children] as HTMLElement[];
  if (steps.length < 2) return;

  const bar = document.createElement('div');
  bar.className = 'form-steps__bar';
  const label = document.createElement('p');
  label.className = 'exp-label';
  label.setAttribute('aria-live', 'polite');
  const track = document.createElement('span');
  track.className = 'form-steps__track';
  track.append(document.createElement('span'));
  bar.append(label, track);

  const nav = document.createElement('div');
  nav.className = 'form-steps__nav';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'exp-pill exp-pill--ghost';
  back.textContent = panel.dataset.stepsBack ?? 'Back';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'exp-pill';
  next.textContent = panel.dataset.stepsNext ?? 'Next';
  nav.append(back, next);

  grid.before(bar);
  grid.after(nav);
  panel.classList.add('is-stepped');
  steps.forEach((s) => s.classList.add('form-step'));

  let now = 0;
  const place = (i: number, focus: boolean) => {
    now = i;
    steps.forEach((s, k) => s.classList.toggle('is-now', k === i));
    const last = i === steps.length - 1;
    panel.classList.toggle('is-last', last);
    back.hidden = i === 0;
    next.hidden = last;
    label.textContent = (panel.dataset.stepsCount ?? '{n} / {total}').replace('{n}', String(i + 1)).replace('{total}', String(steps.length));
    (track.firstElementChild as HTMLElement).style.transform = `scaleX(${(i + 1) / steps.length})`;
    if (focus) steps[i].querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')?.focus({ preventScroll: true });
  };
  // The question being left steps out (140ms) before the next comes in; a new move meanwhile first finishes this one.
  let leaving: { out: Animation; to: number; focus: boolean } | null = null;
  const settle = () => {
    if (!leaving) return;
    const { out, to, focus } = leaving;
    leaving = null;
    out.cancel();
    place(to, focus);
  };
  const show = (i: number, focus = true) => {
    settle();
    if (i === now) return place(i, focus);
    const way = i > now ? 1 : -1;
    panel.classList.toggle('is-forward', way > 0);
    panel.classList.toggle('is-backward', way < 0);
    if (reduced()) return place(i, focus);
    const out = steps[now].animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-way * 0.75}rem)` }], { duration: 140, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' });
    leaving = { out, to: i, focus };
    out.finished.then(
      () => {
        if (leaving?.out === out) settle();
      },
      () => {},
    );
  };
  // Not yet: the question shakes a little and its error line comes up.
  const nudge = () => {
    if (reduced()) return;
    steps[now].animate(
      [{ transform: 'none' }, { transform: 'translateX(-0.5rem)' }, { transform: 'translateX(0.375rem)' }, { transform: 'translateX(-0.25rem)' }, { transform: 'none' }],
      { duration: 360, easing: 'ease-out' },
    );
    steps[now].querySelectorAll('.field__error:not([hidden]), .checks__error:not([hidden])').forEach((line) =>
      line.animate([{ opacity: 0, transform: 'translateY(0.375rem)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }),
    );
  };
  const forward = () => {
    if (leaving) return; // on its way to the next question already
    const invalid = checkWithin(steps[now]);
    if (invalid.length) {
      nudge();
      return invalid[0].focus();
    }
    if (now < steps.length - 1) show(now + 1);
    else form.requestSubmit();
  };

  // Back counts from where the last move was going, so Next and then Back at once returns to the same question.
  back.addEventListener('click', () => {
    settle();
    if (now > 0) show(now - 1);
  });
  next.addEventListener('click', forward);
  form.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.key !== 'Enter' || t instanceof HTMLTextAreaElement || t instanceof HTMLButtonElement || t instanceof HTMLAnchorElement) return;
    e.preventDefault();
    forward();
  });
  // Sending: back to the first question that still needs an answer.
  form.addEventListener(
    'submit',
    (e) => {
      const wrong = steps.findIndex((s) => checkWithin(s).length > 0);
      if (wrong < 0) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      show(wrong);
    },
    { capture: true },
  );
  place(0, false);
}

export function initFormSteps() {
  if (!desktop()) return;
  document.querySelectorAll<HTMLElement>('[data-steps]').forEach((panel) => {
    if (panel.dataset.stepsReady) return;
    panel.dataset.stepsReady = 'true';
    initSteps(panel);
  });
}
