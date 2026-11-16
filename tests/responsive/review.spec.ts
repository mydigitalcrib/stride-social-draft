// Screenshots to look at, not to compare (REVIEW=1 npm run test:review): every page at each checkpoint width, at the top
// and further down, saved under test-results/review/<project>/. The scroll-driven stories are walked through their
// states with the finger (a swipe), as on a phone.
import { test } from '@playwright/test';
import { PAGES, PHONE_WIDTHS, TABLET_WIDTHS, open, scrollToShare, slug } from '../support/site';

test.skip(!process.env.REVIEW, 'Review screenshots only on request (REVIEW=1).');

const only = process.env.REVIEW_PAGES?.split(',');
const widths = process.env.REVIEW_WIDTHS?.split(',').map(Number);

for (const path of PAGES.filter((p) => !only || only.includes(p))) {
  test(`${path}`, async ({ page }, info) => {
    const height = page.viewportSize()?.height ?? 800;
    const list = widths ?? (info.project.name.startsWith('phone') ? PHONE_WIDTHS : TABLET_WIDTHS);
    for (const width of list) {
      await page.setViewportSize({ width, height });
      await open(page, path);
      for (const share of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        if (share > 0) await scrollToShare(page, share);
        await page.screenshot({ path: `test-results/review/${info.project.name}/${slug(path)}--${width}--${String(share * 100).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 70, animations: 'disabled', caret: 'hide', style: 'video,canvas,iframe{visibility:hidden!important}' });
      }
    }
  });
}
