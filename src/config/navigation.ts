// Navigation for the Stride group site (spec: docs/phase-2/03-sitemap.md §2).
// Header, mega menus, mobile menu, division bars and footer all read from here.

export type DivisionKey = 'group' | 'social' | 'talent' | 'education';

export type NavLink = { label: string; href: string; description?: string };

export type MegaMenu = {
  columns: { title?: string; links: NavLink[] }[];
  /** Which feature tile the header renders on the right of the panel. */
  feature: 'latest-article' | 'featured-case-study' | 'roster-portrait' | 'education';
};

export type PrimaryItem = {
  label: string;
  href: string;
  division?: DivisionKey;
  menu?: MegaMenu;
};

export const services: NavLink[] = [
  { label: 'Influencer Activations', href: '/social/services/influencer-activations' },
  { label: 'Influencer Seeding', href: '/social/services/influencer-seeding' },
  { label: 'UGC Production', href: '/social/services/ugc-production' },
  { label: 'TikTok Shop', href: '/social/services/tiktok-shop' },
  { label: 'TikTok Shop Livestreams', href: '/social/services/tiktok-shop-livestreams' },
  { label: 'Influencer Events', href: '/social/services/influencer-events' },
  { label: 'Podcast Activations', href: '/social/services/podcast-activations' },
];

export const talentDivisions: NavLink[] = [
  { label: 'Stride Sport', href: '/sport' },
  { label: 'Stride Podcasts', href: '/talent/podcasts' },
  { label: 'Stride Speakers', href: '/talent/speakers' },
];

export const primaryNav: PrimaryItem[] = [
  {
    label: 'Our Group',
    href: '/about',
    menu: {
      columns: [
        {
          links: [
            { label: 'About Stride', href: '/about' },
            { label: 'Our History', href: '/history' },
            { label: 'Our Sponsorships', href: '/sponsorships' },
            { label: 'Careers', href: '/careers' },
            { label: 'Insights', href: '/insights' },
          ],
        },
      ],
      feature: 'latest-article',
    },
  },
  {
    label: 'Stride Social',
    href: '/social',
    division: 'social',
    menu: {
      columns: [
        {
          links: [
            { label: 'Overview', href: '/social', description: 'Influencer marketing, content, campaigns and commerce.' },
            { label: 'Our Work', href: '/work' },
            { label: 'Start a campaign', href: '/social/enquire' },
          ],
        },
        { title: 'Services', links: services },
      ],
      feature: 'featured-case-study',
    },
  },
  {
    label: 'Stride Talent',
    href: '/talent',
    division: 'talent',
    menu: {
      columns: [
        {
          links: [
            { label: 'Overview', href: '/talent', description: 'Representation, opportunities and long-term career management.' },
            { label: 'Apply for management', href: '/talent/apply' },
          ],
        },
        { title: 'Divisions', links: talentDivisions },
      ],
      feature: 'roster-portrait',
    },
  },
  {
    label: 'Stride Academy',
    href: '/academy',
    division: 'education',
    menu: {
      columns: [
        {
          links: [
            // Coming soon (the owner, 2026-11-10): one page for now. Its sections and its enquiry page come back
            // with it: "What you'll learn" (/academy#learn), "The experience" (/academy#experience), "Enquire"
            // (/academy/enquire).
            { label: 'Overview', href: '/academy', description: 'Coming soon.' },
          ],
        },
      ],
      feature: 'education',
    },
  },
  { label: 'Our Work', href: '/work' },
  { label: 'About', href: '/about' },
];

export const contactLink: NavLink = { label: 'Contact', href: '/contact' };

/**
 * The areas of the radial navigation (global/EdgeNav.astro), in arc order.
 * `links` are the pages the menu shows for the selected mode (reusing the lists above).
 */
export type ModeKey = 'group' | 'social' | 'talent' | 'sport' | 'podcasts' | 'speakers' | 'education' | 'work' | 'about' | 'contact' | 'sponsoring';
export type Mode = { key: ModeKey; label: string; /** What the Menu bar says on phones and tablets, where it has no room. */ short?: string; href: string; links: NavLink[] };

const menuLinks = (label: string) => primaryNav.find((i) => i.label === label)?.menu?.columns.flatMap((c) => c.links) ?? [];

export const modes: Mode[] = [
  { key: 'group', label: 'Stride Group', short: 'Group', href: '/', links: [{ label: 'Home', href: '/' }, { label: 'Insights', href: '/insights' }, contactLink] },
  { key: 'social', label: 'Stride Advertising', short: 'Social', href: '/social', links: menuLinks('Stride Social') },
  { key: 'talent', label: 'Stride Talent', short: 'Talent', href: '/talent', links: menuLinks('Stride Talent') },
  // Stride Talent 2.0, every talent as stories (talent/TalentStories.astro), beside /talent so the two can be compared
  // (the brief, 2026-11-16).
  // Sport, Podcasts and Speakers, in that order (the owner's; Podcasts added 2026-11-11): desktop only for now,
  // phones and tablets keep their list (the Menu bar hides them). Each has a page of its own
  // (talent/SpecialistPage.astro).
  { key: 'sport', label: 'Stride Sport', short: 'Sport', href: '/sport', links: [{ label: 'Stride Sport', href: '/sport' }] },
  { key: 'podcasts', label: 'Stride Podcasts', short: 'Podcasts', href: '/talent/podcasts', links: [{ label: 'Stride Podcasts', href: '/talent/podcasts' }] },
  { key: 'speakers', label: 'Stride Speakers', short: 'Speakers', href: '/talent/speakers', links: [{ label: 'Stride Speakers', href: '/talent/speakers' }] },
  { key: 'work', label: 'Our Work', short: 'Work', href: '/work', links: [{ label: 'Our Work', href: '/work' }, { label: 'Start a campaign', href: '/social/enquire' }] },
  { key: 'about', label: 'About', href: '/about', links: menuLinks('Our Group') },
  { key: 'contact', label: 'Contact', href: '/contact', links: [contactLink] },
  { key: 'sponsoring', label: 'Our Sponsoring', href: '/sponsorships', links: [{ label: 'Our Sponsoring', href: '/sponsorships' }] },
  { key: 'education', label: 'Stride Academy', short: 'Academy', href: '/academy', links: menuLinks('Stride Academy') },
];

/** Which mode a page belongs to, from its path (the home page and anything unlisted is Group). */
export function modeOf(path: string): ModeKey {
  const p = path.replace(/\/$/, '') || '/';
  if (p.startsWith('/work')) return 'work';
  if (p.startsWith('/social')) return 'social';
  if (p.startsWith('/sport')) return 'sport';
  if (p.startsWith('/talent/podcasts')) return 'podcasts';
  if (p.startsWith('/talent/speakers')) return 'speakers';
  if (p.startsWith('/talent')) return 'talent';
  if (p.startsWith('/academy')) return 'education';
  if (p.startsWith('/contact')) return 'contact';
  if (p.startsWith('/sponsorships')) return 'sponsoring';
  if (['/about', '/history', '/careers'].some((s) => p.startsWith(s))) return 'about';
  return 'group';
}

export const footerColumns: { title: string; links: NavLink[] }[] = [
  {
    title: 'Group',
    links: [
      // About tells the history itself (its road), so History isn't listed beside it; the page stays (/history).
      { label: 'About', href: '/about' },
      { label: 'Sponsorships', href: '/sponsorships' },
      { label: 'Careers', href: '/careers' },
      { label: 'Insights', href: '/insights' },
    ],
  },
  {
    title: 'Stride Social',
    links: [
      // "Influencer Strategies" (the owner, 2026-11-23; "Services" from 2026-11-18): /social is the feed of its strategies.
      { label: 'Influencer Strategies', href: '/social' },
      { label: 'Our Work', href: '/work' },
      { label: 'Start a campaign', href: '/social/enquire' },
    ],
  },
  {
    title: 'Stride Talent',
    links: [
      { label: 'Overview', href: '/talent' },
      { label: 'Apply', href: '/talent/apply' },
    ],
  },
  // No Stride Academy column (the owner, 2026-11-23: the footer only; the page stays and the menus keep it).
];

export const legalLinks: NavLink[] = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'Terms', href: '/terms' },
];

/**
 * Pages that are in the approved sitemap but not built yet. Each renders a clearly labelled,
 * noindex placeholder (src/pages/[...planned].astro) so no link is a dead end. `current` links to
 * the Phase 1 page with the same content until the new one replaces it.
 * Remove an entry when its real page ships.
 */
export const plannedPages: { path: string; title: string; stage: string; summary: string; current?: string }[] = [
];
