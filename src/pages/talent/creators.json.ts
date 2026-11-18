// The creators' details for /talent's roster posts (talent/InstaProfile.astro), fetched the first time a roster opens
// rather than written into the page: for each published creator (src/lib/roster.ts, the consent and photo rules), what
// their own page shows beside their card (the owner, 2026-11-18: that information in the roster post itself, not a
// link away): `l` their category and country, `b` their biography as paragraphs of plain text, `s` their platforms
// (name, link), `e` the brand enquiry for them. No audience figures (unverified, as on their page).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { cleanBio, getRoster, platformNames, platformsOf } from '@/lib/roster';
import { routes } from '@/lib/routes';

const text = (html: string) =>
  html
    .split(/<\/p>|<br\s*\/?>/i)
    .map((p) =>
      p
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;|&rsquo;/g, '’')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);

export const GET: APIRoute = async () => {
  const roster = await getRoster();
  const categories = Object.fromEntries((await getCollection('categories')).map((c) => [c.id, c.data.label]));
  const region = new Intl.DisplayNames(['en'], { type: 'region' });
  const out = Object.fromEntries(
    roster.map((c) => {
      const d = c.data;
      const label = [d.mainCategory ? categories[d.mainCategory.id] : 'Creator', d.country ? region.of(d.country) : null].filter(Boolean).join(' · ');
      return [c.id, { l: label, b: text(cleanBio(c.body)), s: platformsOf(c).map((p) => [platformNames[p.key], p.href]), e: routes.creatorEnquiry(c.id) }];
    }),
  );
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
