// Phones and tablets: every page at every checkpoint width, in Chromium and WebKit. Nothing wider than the screen (no
// sideways scroll), no errors in the console or the page, and the menu opens and closes.
import { expect, test, type Page } from '@playwright/test';
import { PAGES, PHONE_WIDTHS, TABLET_WIDTHS, open } from '../support/site';

const widthsFor = (project: string) => (project.startsWith('phone') ? PHONE_WIDTHS : TABLET_WIDTHS);

/** What sticks out past the right edge of the screen (the deepest elements, so the cause and not its parents). */
const overflowing = (page: Page) =>
  page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of document.body.querySelectorAll<HTMLElement>('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= w + 1) continue;
      // Only what the page can actually be scrolled sideways to: not inside something that clips it.
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (o.overflowX !== 'visible' || o.position === 'fixed') {
          clipped = true;
          break;
        }
      }
      if (clipped || [...el.children].some((c) => (c as HTMLElement).getBoundingClientRect().right > w + 1)) continue;
      out.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} → ${Math.round(r.right)}px`);
    }
    return { scrollWidth: document.documentElement.scrollWidth, width: w, out: out.slice(0, 8) };
  });

// One test per page and width (each short enough for WebKit, which is slower), the other device's widths skipped.
for (const path of PAGES) {
  for (const width of [...PHONE_WIDTHS, ...TABLET_WIDTHS]) {
    test(`${path} @${width}`, async ({ page }, info) => {
      test.skip(!widthsFor(info.project.name).includes(width), 'not this device');
      // The heaviest page (Talent's profile, its rosters and stories): Playwright's WebKit on Windows needs
      // longer to draw them.
      if (path === '/talent') test.slow();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // Not the page's: the network (pictures from elsewhere, embeds) and the test browser's lack of an audio device
      // (the notifications' chime, chime.ts).
      page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR|youtube|tiktok|linkedin|AudioContext encountered an error/i.test(m.text()) && errors.push(m.text()));
      await page.setViewportSize({ width, height: page.viewportSize()?.height ?? 800 });
      await open(page, path, 800);
      const o = await overflowing(page);
      expect.soft(o.scrollWidth, `${path} at ${width}px scrolls sideways: ${o.out.join(', ')}`).toBeLessThanOrEqual(o.width + 1);
      expect.soft(errors, `${path} at ${width}px: errors`).toEqual([]);
    });
  }
}

test('the menu opens and closes', async ({ page }) => {
  await open(page, '/');
  const button = page.locator('.header__menu-btn').first();
  await button.click();
  await expect(page.locator('[data-menu-panel]').first()).toHaveClass(/is-open/);
  await button.click();
  await expect(page.locator('[data-menu-panel]').first()).not.toHaveClass(/is-open/);
});
