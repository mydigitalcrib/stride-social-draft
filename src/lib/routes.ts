// Single place that decides where collection items live. During Phase 3 some items still
// render on their Phase 1 routes; switch these when the new templates ship (see 03-sitemap §5).
// If Stride keeps the old URLs (Q16), the new templates mount there and only this file changes.

export const routes = {
  caseStudy: (slug: string) => `/work/${slug}`,
  service: (slug: string) => `/social/services/${slug}`,
  workFiltered: (filter: { industry?: string; service?: string }) => `/work?${new URLSearchParams(filter)}`,
  article: (slug: string) => `/insights/${slug}`,
  insightsFiltered: (category: string) => `/insights?category=${category}`,
  /** Everything about Stride Talent's creators lives on /talent itself (the owner, 2026-11-18: the roster, the creator
   *  pages and the division pages were deleted): a creator opens there in their roster post, with their details
   *  (talent/InstaProfile.astro reads `?creator=`), and a niche's roster opens in its Roster tab (`?roster=`). */
  creator: (slug: string) => `/talent?creator=${slug}`,
  rosterFiltered: (category: string) => `/talent?roster=${category}`,
  creatorEnquiry: (slug: string) => `/talent/enquire?creator=${slug}`,
};
