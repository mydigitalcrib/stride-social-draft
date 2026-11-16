// The approved desktop, guarded: every page at the desktop widths, at the top and further down, and the scroll-driven
// stories at their own states (About's chapters, the Social globe's regions), compared with the baseline. Motion stays
// on: it plays out on the page's clock (support/site.ts), which holds still for each screenshot; what changes by itself
// regardless (footage, canvases, timed notifications) is hidden in place (stable.css).
import { expect, test } from '@playwright/test';
import { PAGES, open, recordedPictures, scrollToShare, settle, slug } from '../support/site';

test.beforeEach(async ({ page }, info) => recordedPictures(page, info));

// The full set of positions at the three most common widths; the top alone at 1366 and 2560.
const positionsFor = (project: string) => (/desktop-(1280|1440|1920)$/.test(project) ? [0, 0.33, 0.66, 1] : [0]);

// Pages whose motion never comes to rest can land a frame apart between runs: Talent's drifting wall and roaming
// viewfinder, Sport's running board. Up to 1.2% of their pixels (a moved or restyled element is far more).
const restless: Record<string, number> = { '/talent': 0.012, '/sport': 0.012 };

for (const path of PAGES) {
  test(`${path}`, async ({ page }, info) => {
    await open(page, path);
    for (const share of positionsFor(info.project.name)) {
      if (share > 0) await scrollToShare(page, share);
      await expect(page).toHaveScreenshot(`${slug(path)}--${String(Math.round(share * 100)).padStart(3, '0')}.png`, restless[path] ? { maxDiffPixelRatio: restless[path] } : {});
    }
  });
}

// About's story, chapter by chapter: one with a film, one with photographs and long words, one without any.
test('/about: the story\'s chapters', async ({ page }) => {
  await open(page, '/about');
  for (const k of [1, 5, 18]) {
    await page.evaluate((k) => (document.querySelectorAll('[data-story-go]')[k] as HTMLElement | undefined)?.click(), k);
    await settle(page, 1600);
    await expect(page).toHaveScreenshot(`about--chapter-${String(k + 1).padStart(2, '0')}.png`);
  }
});

// The Social globe, region by region.
test('/social: the globe\'s regions', async ({ page }) => {
  await open(page, '/social');
  await page.evaluate(() => {
    const g = document.querySelector('.globe');
    if (g) window.scrollTo(0, g.getBoundingClientRect().top + window.scrollY);
  });
  await settle(page);
  for (const k of [0, 2]) {
    await page.evaluate((k) => (document.querySelectorAll('.globe [data-globe-tab]')[k] as HTMLElement | undefined)?.click(), k);
    await settle(page, 1800);
    await expect(page).toHaveScreenshot(`social--globe-${k + 1}.png`, { maxDiffPixelRatio: 0.01 });
  }
});
