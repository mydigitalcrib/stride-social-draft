// What the browser tests share: the pages, the screen sizes, and how a page is opened and brought to a steady state.
//
// The page's own clock is the test's (Playwright's clock): its timers and animation frames only run when the test lets
// them, so the motion driven by script (Talent's drifting wall, the globe, the story's glides) plays out as it would
// and then holds still for the screenshot, instead of being turned off. CSS animations are stilled by the screenshot.
import fs from 'node:fs';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';

/** Every main page, and one of each template. */
export const PAGES = [
  '/',
  '/social',
  '/social/services',
  '/social/services/influencer-activations',
  '/social/services/influencer-seeding',
  '/social/services/ugc-production',
  '/social/services/tiktok-shop',
  '/social/services/tiktok-shop-livestreams',
  '/social/services/influencer-events',
  '/social/services/podcast-activations',
  '/talent',
  '/talent/roster',
  '/talent/roster/5atbfootball',
  '/talent/beauty',
  '/talent/gaming',
  '/sport',
  '/talent/podcasts',
  '/talent/speakers',
  '/work',
  '/about',
  '/team',
  '/history',
  '/careers',
  '/careers/talent-communications-and-partnership-specialist',
  '/insights',
  '/insights/10-essential-steps-to-create-a-successful-influencer-marketing-strategy',
  '/contact',
  '/sponsorships',
  '/academy',
  '/privacy',
  '/404',
] as const;

/** The phone and tablet widths every page is checked at (testing checkpoints, not breakpoints). */
export const PHONE_WIDTHS = [320, 360, 375, 390, 414, 430];
export const TABLET_WIDTHS = [600, 768, 820, 834, 1024];

export const slug = (path: string) => (path === '/' ? 'home' : path.slice(1).replace(/\//g, '--'));

/** The creators' photographs and other pictures served by other hosts (Foam's CDN, Google's): some fail now and then,
 *  which is the network, not the site. The desktop tests replay them from a recording made when the baseline was
 *  approved (beside it, in tests/__baselines__/_external), so they show the same on every run. */
const EXTERNAL = /usefoam\.com|googleusercontent\.com|ytimg\.com|tiktokcdn|cdninstagram|fbcdn\.net/;
export async function recordedPictures(page: Page, info: TestInfo) {
  const name = info.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
  const file = path.join('tests', '__baselines__', '_external', info.project.name, `${name}.har`);
  const approving = process.env.STRIDE_APPROVE_BASELINE === 'yes';
  // Nothing recorded (the page asked for no outside pictures then): refused now as well.
  if (!approving && !fs.existsSync(file)) return page.route(EXTERNAL, (route) => route.abort());
  await page.routeFromHAR(file, { url: EXTERNAL, update: approving, updateContent: 'embed', notFound: 'abort' });
}

/** Lets the page's time run on (its timers and animation frames), in steps, as the screen would show it. */
export const run = (page: Page, ms: number) => page.clock.runFor(ms);

// The page's clock starts at the same moment on every run, and stands still from before the page opens: everything
// that arrives over the network (the page, its pictures, its fonts) arrives in real time, while everything timed (the
// loading screen, entrances, a roaming viewfinder, a slideshow) only moves when the test lets it, by the same amount
// every time. So the screenshots never depend on how fast the network or the machine was.
const START = new Date('2026-11-13T10:00:00Z');
const clocked = new WeakSet<Page>();

/** Waits, in real time only, for the fonts and every picture on screen to be loaded and decoded. */
async function pictures(page: Page) {
  // The fonts (at most 3s of real time, timed here, as the page's own timers stand still: Playwright's WebKit on Windows
  // can leave the homepage's never settling).
  await Promise.race([page.evaluate(() => document.fonts?.ready.then(() => undefined)).catch(() => {}), page.waitForTimeout(3000)]);
  for (let tries = 0; tries < 50; tries++) {
    const pending = await page.evaluate(async () => {
      const onScreen = [...document.images].filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0 && getComputedStyle(img).visibility !== 'hidden';
      });
      await Promise.all(onScreen.filter((img) => img.complete && img.naturalWidth).map((img) => img.decode().catch(() => {})));
      return onScreen.filter((img) => !img.complete).length;
    });
    if (!pending) return;
    await page.waitForTimeout(200);
  }
}

/** A moment of real time, for the browser to deliver what the last step set off (scroll and intersection events,
 *  pictures starting to load), before the page's own time runs on. */
const breathe = (page: Page) => page.waitForTimeout(150);

/** Opens a page as a returning visitor would (the homepage's opening film already seen) and waits until it's steady
 *  (`rest`: how long its entrances are let run once the loading screen has opened; less for a layout check). */
export async function open(page: Page, path: string, rest = 3200) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('stride:intro', 'seen');
    } catch {
      /* no storage */
    }
    // The page's chance (the photocall's wall, a roaming viewfinder, a shuffle) the same on every run: a seeded
    // random number generator in place of the browser's.
    let seed = 0x5eed;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  // Once per page: opened again (another width in the same test), its clock is already standing still.
  if (!clocked.has(page)) {
    clocked.add(page);
    // Started a minute early, so a slow browser can't have run past the pause before it's asked for (the pause is
    // the same moment either way, and nothing has loaded yet for the jump to fire).
    await page.clock.install({ time: new Date(START.getTime() - 59_000) });
    await page.clock.pauseAt(new Date(START.getTime() + 1000));
  }
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Everything the page asked for, as far as it arrives (an embed from elsewhere may never finish), and the pictures on
  // the first screen.
  await page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {});
  await pictures(page);
  // Until the loading screen has opened onto the page: with everything there already, that's its own shortest time.
  for (let t = 0; t < 15_000; t += 50) {
    await run(page, 50);
    if (await page.evaluate(() => (window as unknown as { strideLoaded?: boolean }).strideLoaded === true || !document.querySelector('[data-loader]'))) break;
  }
  // The entrances that play as the page opens (a headline developing, figures counting up) run to their end.
  await settle(page, rest);
}

/** Waits for the fonts and every picture on screen (loaded and decoded), then lets the page's motion come to rest. */
export async function settle(page: Page, rest = 1200) {
  await breathe(page);
  await pictures(page);
  await run(page, rest);
  // Anything that set going (a picture swapped in, an observer's answer), delivered and settled.
  await breathe(page);
  await run(page, 100);
  await pictures(page);
}

/** Scrolls to a share of the page (0 to 1), the way the page's own smooth scroll would land there, then settles. */
export async function scrollToShare(page: Page, share: number) {
  await page.evaluate((share) => {
    const y = Math.round((document.documentElement.scrollHeight - innerHeight) * share);
    const lenis = (window as unknown as { lenis?: { scrollTo(y: number, o: object): void } }).lenis;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, share);
  await breathe(page);
  await run(page, 800);
  await settle(page);
}
