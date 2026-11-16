// What a creator card may show (talent/CreatorCard.astro): everything goes through the roster's rules, so a
// figure appears only if verified, and a division is only ever one set on the entry or proposed from a matching name.
import { getCollection } from 'astro:content';
import { bioLine, divisionsOf, handleOf, platformNames, platformsOf, relationshipLabels, verifiedAudience, type Creator } from './roster';
import { routes } from './routes';

export type CreatorView = {
  id: string;
  name: string;
  handle: string | null;
  niche?: string;
  niches: string[];
  country: string | null;
  portrait: { src: string; alt: string } | null;
  relationship: string;
  relationshipKey: string;
  divisions: string[];
  platforms: { label: string; href: string }[];
  audience: { figure: string; platform: string | null } | null;
  videos: { src: string; poster?: string; caption?: string }[];
  line: string | null;
  href: string;
  enquire: string;
};

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** Niche labels by id, for `creatorView`. */
export const nicheLabels = async () => Object.fromEntries((await getCollection('categories')).map((c) => [c.id, c.data.label]));

export const creatorView = (c: Creator, labels: Record<string, string>): CreatorView => ({
  id: c.id,
  name: c.data.name,
  handle: handleOf(c),
  niche: c.data.niche ?? (c.data.mainCategory ? labels[c.data.mainCategory.id] : undefined),
  niches: [...new Set([c.data.mainCategory?.id, ...c.data.categories.map((x) => x.id)].filter((x): x is string => !!x))],
  country: c.data.country ? (countryNames.of(c.data.country) ?? c.data.country) : null,
  portrait: c.data.portrait,
  relationship: relationshipLabels[c.data.relationship],
  relationshipKey: c.data.relationship,
  divisions: divisionsOf(c),
  platforms: platformsOf(c).map((p) => ({ label: platformNames[p.key], href: p.href })),
  audience: verifiedAudience(c),
  videos: c.data.videos,
  line: bioLine(c),
  href: routes.creator(c.id),
  enquire: routes.creatorEnquiry(c.id),
});
