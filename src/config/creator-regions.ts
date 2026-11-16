// Regions for the Stride Social creator globe (components/social/CreatorGlobe.astro), west to east:
// the order the globe turns through them, so a swipe or scroll always moves the same way round.
// Positions are each region's rough centre (latitude, longitude).
//
// `reels` are the region's creators and their videos, which the phone plays one after another. Each shows only
// where that creator (a roster id) is published (src/lib/roster.ts: in production, with confirmed consent) and
// their country is recorded, so the globe never claims a location we don't have. With none to show, the phone
// shows `work`, a case study whose own footage stands in (labelled "Interim" on screen), or a labelled empty state.
// The region list itself is a proposal from the brief; confirm it with Stride.

export type CreatorRegion = {
  key: string;
  label: string;
  lat: number;
  lon: number;
  /** `place` replaces the creator's country on the phone, where the owner places them in another region than the roster sheet. */
  reels?: { creator: string; src: string; poster: string; place?: string }[];
  work: string | null;
};

export const creatorRegions: CreatorRegion[] = [
  { key: 'north-america', label: 'North America', lat: 40, lon: -98, work: 'papaya-gaming', reels: [
    { creator: 'jacob-suarez', src: '/assets/video/reel-biggieclean.mp4', poster: '/assets/site/reel-biggieclean.jpg' },
    { creator: 'iconicgreen1', src: '/assets/video/reel-iconicgreen1.mp4', poster: '/assets/site/reel-iconicgreen1.jpg' },
    { creator: 'mtgproductions', src: '/assets/video/reel-mtgproductions.mp4', poster: '/assets/site/reel-mtgproductions.jpg' },
    { creator: 'rae-kim-raek-mp4', src: '/assets/video/reel-raek.mp4', poster: '/assets/site/reel-raek.jpg' },
  ] },
  { key: 'latin-america', label: 'Latin America', lat: -12, lon: -62, work: null, reels: [
    { creator: 'hannahroseyb', src: '/assets/video/reel-hannahroseyb.mp4', poster: '/assets/site/reel-hannahroseyb.jpg' },
    { creator: 'jayyduran', src: '/assets/video/reel-jayyduran.mp4', poster: '/assets/site/reel-jayyduran.jpg', place: 'Latin America' },
  ] },
  { key: 'europe', label: 'UK & Europe', lat: 51, lon: 6, work: 'temu-scaling-paid-social-with-500-ugc-videos', reels: [
    { creator: 'fatimavsb', src: '/assets/video/reel-fatimavsb.mp4', poster: '/assets/site/reel-fatimavsb.jpg' },
    { creator: 'savage', src: '/assets/video/reel-savage.mp4', poster: '/assets/site/reel-savage.jpg' },
  ] },
  { key: 'asia', label: 'Asia', lat: 20, lon: 105, work: 'holafly-app---driving-app-downloads-with-travel-influencers', reels: [
    { creator: 'kawaiimln', src: '/assets/video/reel-kawaiimln.mp4', poster: '/assets/site/reel-kawaiimln.jpg' },
    { creator: 'umi-chii', src: '/assets/video/reel-umi-chii.mp4', poster: '/assets/site/reel-umi-chii.jpg' },
  ] },
  { key: 'australia', label: 'Australia', lat: -25, lon: 134, work: null, reels: [
    { creator: 'stitchedbyscott', src: '/assets/video/reel-stitchedbyscott.mp4', poster: '/assets/site/reel-stitchedbyscott.jpg' },
    { creator: 'lvgkcoaching', src: '/assets/video/reel-lvgk.mp4', poster: '/assets/site/reel-lvgk.jpg' },
  ] },
];
