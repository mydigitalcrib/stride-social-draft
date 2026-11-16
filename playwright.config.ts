// Browser tests (Playwright). `npm run test` runs them against the built site, served by `astro preview` on port 4330
// (started here, after a build, unless a preview is already running there).
//
// - desktop-*: the approved desktop, compared with its baseline at five widths (tests/desktop). Chromium.
// - phone-* / tablet-*: the responsive checks (tests/responsive) in Chromium and WebKit (Safari's engine, which every
//   iPhone browser uses), across the phone and tablet widths.
//
// Baselines (the approved desktop's screenshots) live in tests/__baselines__, out of Git (they run to hundreds of MB),
// with their fingerprints in tests/baselines.manifest.json, which is in Git. They're only ever rewritten on purpose:
// `npm run test:baseline:approve` (scripts/visual/approve-baseline.mjs). Updating them any other way is refused below.
import { defineConfig, devices } from '@playwright/test';

const updating = process.argv.some((a) => a === '-u' || a.startsWith('--update-snapshots'));
if (updating && process.env.STRIDE_APPROVE_BASELINE !== 'yes') {
  throw new Error('The desktop baseline is the approved design: update it only with `npm run test:baseline:approve`.');
}

// Another port (STRIDE_PORT=4331) tests a second build served there, e.g. dist-next while dist/ serves the approved desktop.
const PORT = Number(process.env.STRIDE_PORT ?? 4330);
const desktop = (width: number, height: number) => ({
  name: `desktop-${width}`,
  testDir: 'tests/desktop',
  use: { ...devices['Desktop Chrome'], viewport: { width, height }, deviceScaleFactor: 1 },
});

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/../__baselines__/{projectName}/{arg}{ext}',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  expect: {
    timeout: 20_000,
    // Anti-aliasing and a picture finishing its decode a frame later aren't changes; a moved or restyled element is.
    toHaveScreenshot: { maxDiffPixelRatio: 0.003, threshold: 0.2, animations: 'disabled', caret: 'hide', stylePath: './tests/support/stable.css' },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    desktop(1280, 800),
    desktop(1366, 768),
    desktop(1440, 900),
    desktop(1920, 1080),
    desktop(2560, 1440),
    { name: 'phone-chromium', testDir: 'tests/responsive', use: { ...devices['Pixel 7'] } },
    // WebKit with reduced motion (footage as its poster, motion still): Playwright's Windows build of WebKit runs out of
    // memory drawing the pages' footage and motion, two pages at a time; what it checks here is the layout.
    { name: 'phone-webkit', testDir: 'tests/responsive', use: { ...devices['iPhone 15'], reducedMotion: 'reduce' } },
    { name: 'tablet-chromium', testDir: 'tests/responsive', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'tablet-webkit', testDir: 'tests/responsive', use: { ...devices['iPad Pro 11'], reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: `npm run build && npx astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 15 * 60_000,
  },
});
