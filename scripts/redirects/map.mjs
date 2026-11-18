// Redirect map from the previous site's URLs to the new site (docs/phase-2/03-sitemap.md §5).
// Used by astro.config.mjs (redirect pages + the host's _redirects file) and by
// scripts/checks/redirects.mjs (every URL in the old sitemap must still resolve).
//
// Rules: unchanged URLs stay; moved sections redirect 301 (Q16 approves the moves); collection
// items redirect 1:1 when the new page exists and to their archive otherwise (e.g. a creator whose
// consent isn't confirmed yet has no profile, so /creators/x goes to the roster). The Chinese
// pages (/zh/...) redirect 302 to the English equivalent until the translation ships (Q17).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const content = path.join(root, 'src/content');

const frontmatter = (dir) =>
  fs.existsSync(path.join(content, dir))
    ? fs.readdirSync(path.join(content, dir)).filter((f) => f.endsWith('.md')).map((f) => {
        const raw = fs.readFileSync(path.join(content, dir, f), 'utf8').replace(/\r\n/g, '\n');
        return { id: f.slice(0, -3), ...YAML.parse(raw.match(/^---\n([\s\S]*?)\n---/)[1]) };
      })
    : [];

/**
 * Brand briefs and creator applications are taken by Stride OS, on its own site (the owner, 2026-11-10, with these two
 * links). The site's two form routes hand over to its forms; `via` tells Stride OS
 * they came from the website. Temporary (302): the routes stay the site's own, wherever the forms live. The site's
 * own forms for these two are parked beside where they were (src/pages/social/_enquire.astro,
 * src/pages/talent/_apply.astro).
 */
export const formRedirects = {
  '/social/enquire': 'https://join.stride-social.com/join/brand?via=wb',
  '/talent/apply': 'https://join.stride-social.com/join/creator?via=wc',
  // Talent's own brand enquiry page is gone (the owner, 2026-11-13; parked at src/pages/talent/_enquire.astro): a
  // brand booking a creator, a speaker, an athlete or a podcast sends the same brief as any brand.
  '/talent/enquire': 'https://join.stride-social.com/join/brand?via=wb',
};

/**
 * Stride Academy isn't open yet (the owner, 2026-11-10): its page says "Coming soon" and its enquiry form is parked
 * (src/pages/academy/_enquire.astro) until it opens. Temporary (302): the route comes back with the form.
 */
export const parkedRedirects = {
  '/academy/enquire': '/academy',
};

/** Section moves (exact paths). */
export const sectionRedirects = {
  // Stride Education was renamed Stride Academy (2026-11-10): its two pages moved with it (the enquiry page is
  // parked for now, so its old address goes straight to the Academy's page).
  '/education': '/academy',
  '/education/enquire': parkedRedirects['/academy/enquire'],
  '/talent/sport': '/sport',
  // The services index is gone (the owner, 2026-11-18): Stride Social's feed has its strategies.
  '/our-services': '/social',
  '/influencer-strategies': '/social',
  '/influencer-seeding': '/social/services/influencer-seeding',
  '/case-studies': '/work',
  '/blog': '/insights',
  // Our Team's own page is gone (the owner, 2026-11-18: "/team should redirect you to /about"): About has the team.
  '/team': '/about',
  '/meet-the-team': '/about',
  '/creator-sign-up': formRedirects['/talent/apply'],
};

/** Collection prefixes: old prefix → [new prefix, archive to fall back to]. */
export const collectionRedirects = {
  '/case-studies/': ['/work/', '/work'],
  '/blog/': ['/insights/', '/insights'],
  '/jobs/': ['/careers/', '/careers'],
};

/**
 * The old site's sections that are gone on purpose and show the 404 page: its creators (/creators and every
 * /creators/<name>), since the roster page and the creator pages were deleted (the owner, 2026-11-18: everything lives
 * on /talent, and old addresses of deleted pages show the 404 page).
 */
export const goneSections = ['/creators'];
export const isGone = (p) => goneSections.some((s) => p === s || p.startsWith(`${s}/`));

/** Pages that exist on both sites at the same URL. */
const unchanged = new Set(['/', '/about', '/contact', '/careers']);

/**
 * Which new collection pages exist. The roles have no pages of their own since 2026-11-18 (the owner: "Read the role"
 * opens Stride's jobs on LinkedIn), so an old job posting goes to Careers.
 */
function existingPages() {
  const work = new Set(frontmatter('work').filter((w) => w.visible !== false).map((w) => w.id));
  const insights = new Set(frontmatter('insights').filter((p) => p.visible !== false).map((p) => p.id));
  return { '/work/': work, '/insights/': insights, '/careers/': new Set() };
}

/** Where an old English path goes on the new site (or itself, if unchanged). */
function resolve(oldPath, pages) {
  const p = oldPath === '' ? '/' : oldPath.replace(/\/$/, '') || '/';
  if (unchanged.has(p)) return p;
  if (sectionRedirects[p]) return sectionRedirects[p];
  for (const [prefix, [target, archive]] of Object.entries(collectionRedirects)) {
    if (p.startsWith(prefix)) {
      const slug = p.slice(prefix.length);
      return pages[target].has(slug) ? `${target}${slug}` : archive;
    }
  }
  return null;
}

/** Old site URLs, from docs/inventory/old-sitemap.txt. */
export function oldSitemap() {
  return fs
    .readFileSync(path.join(root, 'docs/inventory/old-sitemap.txt'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'));
}

/**
 * Explicit redirects for every old URL that no longer exists as-is, plus the section moves.
 * Returns [{ from, to, status }].
 */
export function buildRedirects({ production }) {
  void production; // no rule depends on it since the roles lost their pages; the callers' options stay the same
  const pages = existingPages();
  const out = new Map();
  for (const [from, to] of Object.entries(sectionRedirects)) out.set(from, { from, to, status: 301 });
  for (const [from, to] of Object.entries(formRedirects)) out.set(from, { from, to, status: 302 });
  for (const [from, to] of Object.entries(parkedRedirects)) out.set(from, { from, to, status: 302 });
  for (const url of oldSitemap()) {
    if (url === '/zh' || url.startsWith('/zh/')) {
      const english = url === '/zh' ? '/' : url.slice(3);
      if (isGone(english)) continue;
      const to = resolve(english, pages) ?? '/';
      out.set(url, { from: url, to, status: 302 });
      continue;
    }
    if (isGone(url)) continue;
    const to = resolve(url, pages);
    if (to && to !== url) out.set(url, { from: url, to, status: 301 });
  }
  return [...out.values()];
}

/**
 * Netlify / Cloudflare Pages `_redirects` file: the explicit list first, then catch-all patterns
 * for old URLs that were never in the sitemap. `!` forces the rule over the fallback redirect page.
 */
export function redirectsFile({ production }) {
  const lines = ['# Generated by scripts/redirects/map.mjs at build time. Do not edit by hand.'];
  for (const r of buildRedirects({ production })) lines.push(`${r.from} ${r.to} ${r.status}!`);
  // Unknown old slugs land on the archive rather than risk a missing page.
  for (const [prefix, [, archive]] of Object.entries(collectionRedirects)) lines.push(`${prefix}* ${archive} 301`);
  lines.push('/zh/* /:splat 302', '/zh / 302');
  return `${lines.join('\n')}\n`;
}
