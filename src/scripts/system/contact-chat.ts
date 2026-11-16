// Behaviour for group/ContactChat.astro: tapping an answer sends it as your message; Stride types for a
// moment, then replies with what that team does and a button to reach them. "Everything else" carries on as
// a conversation: the chat asks for your details itself, then sends them through the real form hidden below it
// (form.ts), so its rules, destination and fallbacks all still apply. Every screen alike (phones since 2026-11-13).
// Motion: the conversation starts live (as the window comes into view Stride types its first message, then
// the answers come up one after another), Stride's mark turns while it types, and how long it types follows how
// long its reply is. What you send travels from where you pressed or typed it into its place in the conversation,
// the pill's glass turning into your bubble. Focus follows the conversation for the keyboard: to the choices it
// offers, to the button a reply brings, and back to the answers when it ends.
import { reduced } from './env';

const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13.5M13 6.5 18.5 12 13 17.5"></path></svg>';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SETTLE = 'cubic-bezier(0.2, 0.9, 0.25, 1)';

type Flow = { name: string; email: string; emailBad: string; topic: string; message: string; ready: string; send: string };
/** Where an answer was pressed or typed: the pill's box, or a field's text box (`typed`), and its corners. */
type From = { rect: DOMRect; typed?: boolean; radius?: string };

const wait = (ms: number) => new Promise<void>((done) => window.setTimeout(done, ms));
const fromPill = (el: HTMLElement): From => ({ rect: el.getBoundingClientRect() });
const fromField = (el: HTMLElement): From => {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const left = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
  const top = r.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
  return { rect: new DOMRect(left, top, r.right - left, r.bottom - top), typed: true, radius: cs.borderTopLeftRadius };
};

function initChat(root: HTMLElement) {
  const log = root.querySelector<HTMLElement>('[data-chat-log]');
  const answers = root.querySelector<HTMLElement>('[data-chat-answers]');
  const composer = root.querySelector<HTMLFormElement>('[data-chat-composer]');
  const win = root.querySelector<HTMLElement>('[data-chat-window]');
  if (!log || !answers) return;
  const flow = JSON.parse(root.dataset.flow ?? '{}') as Flow;
  const line = composer?.querySelector<HTMLInputElement>('input');
  const box = composer?.querySelector<HTMLTextAreaElement>('textarea');
  const marks = [...root.querySelectorAll<SVGElement>('.chat__avatar path')];
  const moving = () => !reduced();
  let timer = 0;
  let running = false;
  let turn = 0;
  let flight: Animation | null = null;

  // How long Stride types before it answers: on desktop, as long as what it's about to say (within reason).
  // (What was phones' own `usual` is no longer used: the length of what's said sets it on every screen.)
  const typingFor = (text: string | undefined, _usual: number) => (reduced() ? 0 : Math.min(1300, Math.max(550, 380 + 9 * (text?.length ?? 0))));
  // Moves focus along with the conversation, unless the visitor has gone somewhere else on the page.
  const focusHere = (el: HTMLElement | null | undefined) => {
    const at = document.activeElement;
    if (el && (!at || at === document.body || win?.contains(at))) el.focus({ preventScroll: true });
  };

  const toEnd = () => log.scrollTo({ top: log.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });
  const bubble = (who: 'me' | 'them', text: string) => {
    const p = document.createElement('p');
    p.className = `bubble bubble--${who}`;
    p.textContent = text;
    return p;
  };
  const say = (who: 'me' | 'them', text: string) => {
    log.append(bubble(who, text));
    toEnd();
  };
  const dots = () => {
    const typing = document.createElement('p');
    typing.className = 'bubble bubble--typing';
    typing.setAttribute('aria-hidden', 'true');
    typing.innerHTML = '<span></span><span></span><span></span>';
    log.append(typing);
    root.classList.add('is-typing');
    toEnd();
    return typing;
  };
  // The dots go; once nobody's typing, the mark's triangles ease back from wherever their pulse had got to.
  const stopTyping = (typing: Element | null | undefined) => {
    typing?.remove();
    if (log.querySelector('.bubble--typing') || !root.classList.contains('is-typing')) return;
    const from = moving() ? marks.map((m) => getComputedStyle(m).opacity) : [];
    root.classList.remove('is-typing');
    from.forEach((o, k) => {
      if (o !== '1') marks[k].animate([{ opacity: o }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    });
  };
  const pill = (label: string, href: string) => {
    const go = document.createElement('a');
    go.className = 'exp-pill chat__go';
    go.href = href;
    go.textContent = label;
    go.insertAdjacentHTML('beforeend', ARROW);
    log.append(go);
    toEnd();
    return go;
  };
  const speak = (text: string) =>
    new Promise<void>((done) => {
      const typing = dots();
      window.setTimeout(
        () => {
          stopTyping(typing);
          say('them', text);
          done();
        },
        typingFor(text, 750),
      );
    });

  /* ---------- Your answer, on its way into the conversation (desktop) ----------
     The real bubble goes in first, unseen (so the log still announces it), and the conversation snaps to its end; a
     copy of it then travels from where the answer was pressed or typed into its place, the pill's glass fading into
     the bubble's, and the real one takes over where it lands. Resolves a moment after it has landed, so the rhythm is
     sent, landed, then Stride typing. A new answer lands the one still on its way at once. */
  const send = async (text: string, from?: From) => {
    flight?.finish();
    if (!from || !win || !moving()) {
      say('me', text);
      return;
    }
    const p = bubble('me', text);
    p.style.opacity = '0';
    p.style.animation = 'none';
    log.append(p);
    log.scrollTop = log.scrollHeight;
    const to = p.getBoundingClientRect();
    const frame = win.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const ghost = document.createElement('div');
    ghost.className = 'chat__ghost';
    ghost.setAttribute('aria-hidden', 'true');
    const glass = document.createElement('span');
    const ink = document.createElement('span');
    glass.className = 'chat__ghost-glass';
    ink.className = 'chat__ghost-ink';
    glass.textContent = ink.textContent = text;
    ghost.append(glass, ink);
    Object.assign(ghost.style, { left: `${to.left - frame.left}px`, top: `${to.top - frame.top}px`, width: `${to.width}px`, height: `${to.height}px` });
    // From a pill: scaled to its width and centred on it. From a field: full size, its words where the typed ones were.
    const r = from.rect;
    const s = from.typed ? 1 : r.width / to.width;
    const dx = from.typed ? r.left - parseFloat(cs.paddingLeft) - to.left : r.left - to.left;
    const dy = from.typed ? r.top - parseFloat(cs.paddingTop) - to.top : r.top + (r.height - to.height * s) / 2 - to.top;
    const start = from.radius ?? `${to.height / 2}px`;
    // The bubble's corners from its four longhands (not every browser gives the shorthand back computed).
    const end = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' ');
    win.append(ghost);
    const timing: KeyframeAnimationOptions = { duration: 460, easing: SETTLE, fill: 'both' };
    const trip = ghost.animate(
      [
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`, borderRadius: start },
        { transform: 'none', borderRadius: end },
      ],
      timing,
    );
    glass.animate([{ opacity: 1 }, { opacity: 0 }], timing);
    ink.animate([{ opacity: 0 }, { opacity: 1 }], timing);
    flight = trip;
    try {
      await trip.finished;
    } catch {
      // Cancelled with the page: the bubble just shows.
    } finally {
      if (flight === trip) flight = null;
      ghost.remove();
      p.style.opacity = '';
    }
    p.animate([{ transform: 'scale(1.03)' }, { transform: 'none' }], { duration: 140, easing: 'ease-out' });
    await wait(80);
  };

  /* ---------- Asking ---------- */
  const typed = (multiline: boolean) =>
    new Promise<{ value: string; from: From }>((done) => {
      if (!composer || !line || !box) return;
      const field = multiline ? box : line;
      line.hidden = multiline;
      box.hidden = !multiline;
      composer.hidden = false;
      field.value = '';
      field.focus({ preventScroll: true });
      toEnd();
      const submit = (e: Event) => {
        e.preventDefault();
        const value = field.value.trim();
        if (!value) return field.focus();
        const from = fromField(field);
        composer.removeEventListener('submit', submit);
        field.value = '';
        composer.hidden = true;
        done({ value, from });
      };
      composer.addEventListener('submit', submit);
    });
  const chosen = (options: { value: string; label: string }[]) =>
    new Promise<{ value: string; label: string; from: From }>((done) => {
      const row = document.createElement('div');
      row.className = 'chat__choices';
      options.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chat__answer';
        b.textContent = o.label;
        b.addEventListener('click', () => {
          const from = fromPill(b);
          row.remove();
          done({ ...o, from });
        });
        row.append(b);
      });
      answers.after(row);
      toEnd();
      focusHere(row.querySelector('button'));
    });

  /* ---------- The conversation that ends in the real form ---------- */
  const converse = async (a: HTMLAnchorElement) => {
    const form = document.querySelector<HTMLFormElement>('#general form');
    const shell = form?.closest<HTMLElement>('[data-form]');
    if (!form || !shell || running) return;
    running = true;
    // A reply still on its way to an earlier answer is dropped: this conversation takes over.
    turn++;
    window.clearTimeout(timer);
    stopTyping(log.querySelector('.bubble--typing'));
    const from = fromPill(a);
    answers.hidden = true;
    await send(a.dataset.audience ?? '', from);
    if (a.dataset.reply) await speak(a.dataset.reply);

    await speak(flow.name);
    const name = await typed(false);
    await send(name.value, name.from);

    await speak(flow.email.replace('{name}', name.value));
    let email = await typed(false);
    await send(email.value, email.from);
    while (!EMAIL.test(email.value)) {
      await speak(flow.emailBad);
      email = await typed(false);
      await send(email.value, email.from);
    }

    await speak(flow.topic);
    const select = form.querySelector<HTMLSelectElement>('select[name="topic"]');
    const topic = await chosen([...(select?.options ?? [])].filter((o) => o.value).map((o) => ({ value: o.value, label: o.textContent ?? o.value })));
    await send(topic.label, topic.from);

    await speak(flow.message);
    const message = await typed(true);
    await send(message.value, message.from);

    await speak(flow.ready);
    const consent = form.querySelector('.form__consent')?.textContent?.trim();
    if (consent) say('them', consent);
    await chosen([{ value: 'send', label: flow.send }]);

    // Into the real form, and out through it.
    const fill = (field: string, value: string) => {
      const c = form.elements.namedItem(field) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (!c) return;
      c.value = value;
      c.dispatchEvent(new Event('input', { bubbles: true }));
      c.dispatchEvent(new Event('change', { bubbles: true }));
    };
    fill('name', name.value);
    fill('email', email.value);
    fill('topic', topic.value);
    fill('message', message.value);
    const typing = dots();
    const panels = ['[data-done]', '[data-unavailable]'].map((s) => shell.querySelector<HTMLElement>(s));
    const alert = form.querySelector<HTMLElement>('[data-error]');
    const watch = new MutationObserver(() => {
      const shown = panels.find((p) => p && !p.hidden);
      const failed = alert && !alert.hidden;
      if (!shown && !failed) return;
      watch.disconnect();
      stopTyping(typing);
      if (shown) say('them', shown.querySelector('.form__panel-title')?.textContent?.trim() ?? '');
      let go: HTMLElement | null = null;
      if (shown === panels[1] || failed) {
        if (failed) say('them', alert?.querySelector('p')?.textContent?.trim() ?? '');
        const mail = (shown ?? alert)?.querySelector<HTMLAnchorElement>('a[href^="mailto:"]');
        if (mail) go = pill(mail.textContent?.trim() ?? '', mail.href);
      }
      running = false;
      answers.hidden = false;
      toEnd();
      focusHere(go ?? answers.querySelector<HTMLElement>('a'));
    });
    watch.observe(shell, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    form.dataset.quiet = 'true';
    form.requestSubmit();
  };

  /* ---------- The answers ---------- */
  root.querySelectorAll<HTMLAnchorElement>('[data-chat-answers] a').forEach((a) =>
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (running) return;
      if (a.dataset.route === 'general' && composer) {
        converse(a);
        return;
      }
      // Pressed from the keyboard (no pointer click), focus goes on to the button the reply brings.
      const keyboard = e.detail === 0;
      const mine = ++turn;
      window.clearTimeout(timer);
      stopTyping(log.querySelector('.bubble--typing'));
      send(a.dataset.audience ?? a.textContent ?? '', fromPill(a)).then(() => {
        if (mine !== turn) return;
        const typing = dots();
        timer = window.setTimeout(
          () => {
            stopTyping(typing);
            if (a.dataset.reply) say('them', a.dataset.reply);
            const go = pill(a.dataset.label ?? '', a.getAttribute('href') ?? '#');
            if (keyboard) focusHere(go);
          },
          typingFor(a.dataset.reply, 900),
        );
      });
    }),
  );

  /* ---------- The log's top edge fades once the conversation has scrolled ---------- */
  {
    let queued = false;
    log.addEventListener(
      'scroll',
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          log.classList.add('is-scrollable');
          log.classList.toggle('is-scrolled', log.scrollTop > 4);
        });
      },
      { passive: true },
    );
  }

  /* ---------- Desktop: the conversation starts live ----------
     Held from the start by the component's inline script (.is-held, .is-arriving), so nothing shows and then goes:
     once the window is half in view Stride types its first message, then the answers come up one after another.
     Anything the visitor does first (focus in the window, pressing an answer) skips straight to the end. */
  if (root.classList.contains('is-arriving') && win) {
    window.clearTimeout(Number(root.dataset.arriving));
    if (!moving()) {
      root.classList.remove('is-held', 'is-arriving');
      return;
    }
    const waits: number[] = [];
    const rises: Animation[] = [];
    let typing: HTMLElement | null = null;
    let over = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e || e.intersectionRatio < 0.5) return;
        io.disconnect();
        play();
      },
      { threshold: 0.5 },
    );
    const finish = () => {
      if (over) return;
      over = true;
      io.disconnect();
      waits.forEach((w) => window.clearTimeout(w));
      stopTyping(typing);
      root.classList.remove('is-held', 'is-arriving');
      rises.forEach((r) => r.finish());
      win.removeEventListener('focusin', finish);
      answers.removeEventListener('pointerdown', finish);
    };
    const later = (ms: number, then: () => void) => waits.push(window.setTimeout(then, ms));
    const play = () => {
      later(350, () => {
        typing = dots();
        later(700, () => {
          stopTyping(typing);
          typing = null;
          root.classList.remove('is-held');
          later(200, () => {
            root.classList.remove('is-arriving');
            answers.querySelectorAll<HTMLElement>('.chat__answer').forEach((el, i) =>
              rises.push(el.animate([{ opacity: 0, transform: 'translateY(0.625rem)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 60, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' })),
            );
            Promise.all(rises.map((r) => r.finished)).then(finish, finish);
          });
        });
      });
    };
    win.addEventListener('focusin', finish);
    answers.addEventListener('pointerdown', finish);
    io.observe(win);
  }
}

export function initContactChats() {
  document.querySelectorAll<HTMLElement>('[data-chat]').forEach((root) => {
    if (root.dataset.chatReady) return;
    root.dataset.chatReady = 'true';
    initChat(root);
  });
}
