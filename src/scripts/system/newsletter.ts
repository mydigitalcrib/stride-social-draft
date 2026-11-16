// Stride's LinkedIn newsletter on About (group/NewsletterPreview.astro): an edition previews over the page with
// LinkedIn's own post embed, fetched only now, when it's asked for (it sets LinkedIn's cookies). Escape, the corner or
// outside it closes it, and the page holds still meanwhile.
import { lenis } from './env';

export function initNewsletter() {
  const root = document.querySelector<HTMLElement>('[data-newsletter]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const dialog = root.querySelector<HTMLDialogElement>('[data-news-dialog]');
  const frame = dialog?.querySelector<HTMLElement>('[data-news-frame]');
  const article = dialog?.querySelector<HTMLAnchorElement>('[data-news-article]');
  if (!dialog || !frame) return;

  root.querySelectorAll<HTMLButtonElement>('[data-news-open]').forEach((button) =>
    button.addEventListener('click', () => {
      const urn = button.dataset.newsOpen ?? '';
      if (!/^urn:li:activity:\d+$/.test(urn)) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.linkedin.com/embed/feed/update/${urn}`;
      iframe.title = button.dataset.newsTitle ?? 'LinkedIn';
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
      if (article && button.dataset.newsHref) article.href = button.dataset.newsHref;
      lenis()?.stop?.();
      dialog.showModal();
    }),
  );
  dialog.querySelector('[data-news-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    frame.replaceChildren();
    lenis()?.start?.();
  });
}
