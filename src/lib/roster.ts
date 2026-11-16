// Which creators may appear on the site (CLAUDE.md: roster profiles only with recorded consent), and only with a
// photograph: a creator whose entry has no portrait isn't listed, built or linked until one is set (the owner's call).
// Preview builds show confirmed, legacy and listed profiles (legacy = public on the previous site,
// listed = on Stride's roster sheet, both to be confirmed); production shows confirmed consent only. Every roster listing,
// profile page and link goes through here, so a creator can never be linked but not built.
import { getCollection, type CollectionEntry } from 'astro:content';
import { isProduction } from './env';

export type Creator = CollectionEntry<'roster'>;

export const isPublished = (c: Creator) =>
  c.data.visible !== false &&
  !!c.data.portrait &&
  (c.data.consent.status === 'confirmed' || (!isProduction && ['legacy', 'listed'].includes(c.data.consent.status)));

/** Signed creators first, then everyone else. */
const rank = (c: Creator) => (c.data.relationship === 'managed' ? 0 : 1);

/** Published creators in roster order. */
export async function getRoster() {
  return (await getCollection('roster', isPublished)).sort((a, b) => rank(a) - rank(b) || a.data.order - b.data.order);
}

/** Two-letter platform labels for cards; full names for profile links. */
export const platformNames = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitch: 'Twitch',
  podcast: 'Podcast',
  x: 'X',
  website: 'Website',
} as const;
export type Platform = keyof typeof platformNames;

/** Platform links in a fixed order, skipping empty ones. */
export const platformsOf = (c: Creator) =>
  (Object.keys(platformNames) as Platform[]).filter((p) => c.data.platforms[p]).map((p) => ({ key: p, href: c.data.platforms[p] as string }));

/** @handle: read from the first platform link that shows it, or else as set on the entry (the roster sheet's
    "handle" column is sometimes the creator's name). */
export const handleOf = (c: Creator) => {
  const { tiktok, instagram, youtube, x, twitch } = c.data.platforms;
  for (const link of [tiktok, instagram, youtube, x, twitch]) {
    const first = link && new URL(link).pathname.split('/').filter(Boolean)[0];
    if (first && /^@?[\w.-]+$/.test(first) && !['channel', 'c', 'user'].includes(first)) return first.replace(/^@?/, '@');
  }
  return c.data.handle ? c.data.handle.replace(/^@?/, '@') : null;
};

/** Which picker divisions a creator belongs to: as set on the entry; until then, proposed from the
    old site's category, only where the names match. A division with no match stays empty, not guessed. */
const proposedDivisions: Record<string, string> = { Beauty: 'beauty', Family: 'family', Fashion: 'fashion', Gaming: 'gaming', Lifestyle: 'lifestyle', Travel: 'travel' };
export const divisionsOf = (c: Creator) => {
  if (c.data.divisions.length) return c.data.divisions.map((d) => d.id);
  const proposed = c.data.legacyCategory ? proposedDivisions[c.data.legacyCategory] : undefined;
  return proposed ? [proposed] : [];
};

/** Signed or partnered, in the words the site uses. */
export const relationshipLabels = { managed: 'Signed', partner: 'Partner', unconfirmed: '' } as const;

/** The creator's audience figure, only if it's verified (CLAUDE.md: every figure needs a source). */
export const verifiedAudience = (c: Creator) => (c.data.audience?.status === 'verified' ? c.data.audience : null);

/** A line for the page: the bio's first sentence with no figures in it (the old ones are unverified). */
export const bioLine = (c: Creator) =>
  cleanBio(c.body)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .find((s) => s.length > 30 && s.length < 200 && !/\d/.test(s)) ?? null;

/** Old-site bios carry empty spacer paragraphs and editor comments; drop them. */
export const cleanBio = (html: string | undefined) =>
  (html ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<p>(\s|&nbsp;|‍|<br\s*\/?>)*<\/p>/g, '')
    .trim();
