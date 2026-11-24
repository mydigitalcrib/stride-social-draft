// What a Stride Social service's phone plays (social/ServiceHero.astro; the owner, 2026-11-17: "instead of images we
// can have videos playing like a phone ... cause we want to humanize this section"). First its case studies' own
// upright clips (a case study's `videos`, through the phone-ready file and first frame listed here; a landscape clip
// doesn't fit a phone, so it isn't listed), then Stride's creators' reels (config/creator-regions.ts, by the roster's
// rules) to fill it. Files: the four 1080×1920 clips have 540×960 copies (`-phone.mp4`, made with ffmpeg, sound kept);
// the posters are each clip's first frame. Stride's own campaign videos ("Brad X Stride Social updates", 2026-11-17:
// \`case-*.mp4\`, 720 wide, at most 40s) are listed the same way. A new case study's upright clip plays once it's added here.

export type PhoneClip = { src: string; poster: string };

const clip = (id: string, phone = false): [string, PhoneClip] => [
  `/assets/video/flowdrive-${id}.mp4`,
  { src: `/assets/video/flowdrive-${id}${phone ? '-phone' : ''}.mp4`, poster: `/assets/site/phone-flowdrive-${id}.jpg` },
];

// Stride's own campaign videos: the file and its first frame side by side.
const own = (name: string): [string, PhoneClip] => [`/assets/video/case-${name}.mp4`, { src: `/assets/video/case-${name}.mp4`, poster: `/assets/site/case-${name}.jpg` }];

/** A case study's video (its `src`) → what the phone plays for it. */
export const phoneClips: Record<string, PhoneClip> = Object.fromEntries([
  // Comfelie
  clip('VDbaPLrkg8ffAjqF0f0AG'),
  clip('4lGMMajIxr5eApG7p5kPZ'),
  // Greene King
  clip('gMHQPQtVm05hcSF8BgxPH'),
  // Holafly
  clip('HeObIJFscD3ia8AzSLKMa', true),
  clip('lrkyUl4tbIrCZB9L1mUrl'),
  clip('FLDm1lbKBfmPgt3tPPumf'),
  clip('cjk8f6Yu4Q1YvH7zk4kNl', true),
  // Overdub
  clip('4NquvO0Wu3YI7CBJpmwAn'),
  clip('QldIBv9G91zFk1lM6e6cS'),
  clip('Fd4cruQUnsvZt4OpKLghm'),
  clip('PO6QbiWHDM8zuUTrK36Z0'),
  // Papaya Gaming
  clip('QoKOHwrVK7RH9jNgRN073', true),
  // Temu
  clip('XlaHBz0jbaLXA20tZIdSs', true),
  // Stride's own (2026-11-17): Holafly, Glam AI, Papaya Gaming, Temu
  ...['holafly-1', 'holafly-2', 'holafly-3', 'holafly-4', 'holafly-5', 'holafly-7'].map((n) => own(n)),
  ...['glam-1', 'glam-2'].map((n) => own(n)),
  // Glam AI's creators' Instagram reels (the document's Glam AI sheet)
  ...['adam-godigital', 'aitrendz-xyz', 'digitalrajas-ai', 'maskedguyai', 'menu-design-jor', 'microotech007', 'raviranjan-singh', 'uxui-shrut'].map((n) => own(`glam-ig-${n}`)),
  ...['papaya-2', 'papaya-3', 'papaya-4'].map((n) => own(n)),
  ...['temu-2', 'temu-3', 'temu-4', 'temu-5', 'temu-6'].map((n) => own(n)),
]);

/** A clip chosen for a service's phone: its file, its first picture, the brand it's for (`who`, never a username), what
 *  it is (`note`), where its name leads, and the second it starts from. */
export type ServiceClip = { src: string; poster: string; who: string; note: string; href: string; from?: number };

const igReel = (code: string) => `/assets/video/ig-stridetalent-reel-${code}.mp4`;
const ssReel = (code: string) => `/assets/video/stridesociall-reel-${code}.mp4`;
const ssPoster = (code: string, kind: 'first' | 'brand' | 'at') => `/assets/site/stridesociall-reel-${code}-${kind}.jpg`;

/** The services whose phones play clips chosen by hand, each one watched against what the service says (the owner,
 *  2026-11-23: "make sure the videos we're showcasing make sense to what we're talking about inside each card"): before,
 *  a service with few case-study clips filled its phone with creators' unrelated reels. Labels name the brand, never a
 *  username. A service not listed here plays its case studies' clips. Each service's list is also its preview in the other
 *  services' pages' More Services cards ([slug].astro). Influencer Activations: creators presenting a brand; Influencer Seeding: creators unboxing or trying what they
 *  were sent; TikTok Shop: Comfelie's TikTok Shop try-ons; TikTok Shop Livestreams: a TikTok LIVE; Influencer Events:
 *  Stride's creator events (its photographs as one clip); Podcast Activations: The Fellas × TrainPal's podcast. The
 *  landscape clip has a phone version over a blurred copy of itself (`-phone.mp4`). */
export const serviceClips: Record<string, ServiceClip[]> = {
  'influencer-activations': [
    { src: ssReel('DL2JV8uo-_i'), poster: ssPoster('DL2JV8uo-_i', 'first'), who: 'Coca-Cola', note: 'Campaign', href: '/work' },
    { src: ssReel('DMNUhmzIgi2'), poster: ssPoster('DMNUhmzIgi2', 'brand'), who: 'McDonald’s', note: 'Campaign', href: '/work', from: 17 },
    // From the Twilight film on screen, under its caption "Reacting to all the Twilight films on Netflix".
    { src: igReel('DfFAs2oprqm'), poster: '/assets/site/ig-stridetalent-reel-DfFAs2oprqm-at.jpg', who: 'Netflix UK', note: 'Campaign', href: '/work', from: 9.5 },
    { src: ssReel('DHdNiXaIJgN'), poster: ssPoster('DHdNiXaIJgN', 'first'), who: 'Gauth', note: 'Campaign', href: '/work' },
    { src: ssReel('DJbpmN8Ip__'), poster: ssPoster('DJbpmN8Ip__', 'at'), who: 'Printful', note: 'Campaign', href: '/work', from: 6.5 },
  ],
  'influencer-seeding': [
    { src: igReel('DdG1xsDpXSx'), poster: '/assets/site/ig-stridetalent-reel-DdG1xsDpXSx-first.jpg', who: 'Miniso', note: 'Seeding', href: '/work', from: 1.5 },
    { src: ssReel('DNX_iB_IdgK'), poster: ssPoster('DNX_iB_IdgK', 'at'), who: 'Temu', note: 'Seeding', href: '/work', from: 8 },
    { src: ssReel('DBs7OpCxag3'), poster: ssPoster('DBs7OpCxag3', 'brand'), who: 'Nebula by Anker', note: 'Seeding', href: '/work', from: 8 },
    { src: ssReel('DRjyKlLCCSZ'), poster: ssPoster('DRjyKlLCCSZ', 'brand'), who: 'SKIN1004', note: 'Seeding', href: '/work', from: 10 },
    { src: ssReel('DNncWu9okP9'), poster: ssPoster('DNncWu9okP9', 'first'), who: 'Cosori', note: 'Seeding', href: '/work' },
  ],
  // Its case studies' UGC films, Papaya Gaming's and Temu's, as its phone played them before (listed so the other
  // services' pages can preview it too).
  'ugc-production': [
    { src: '/assets/video/flowdrive-QoKOHwrVK7RH9jNgRN073-phone.mp4', poster: '/assets/site/phone-flowdrive-QoKOHwrVK7RH9jNgRN073.jpg', who: 'Papaya Gaming', note: 'Case study', href: '/work#papaya-gaming' },
    { src: '/assets/video/flowdrive-XlaHBz0jbaLXA20tZIdSs-phone.mp4', poster: '/assets/site/phone-flowdrive-XlaHBz0jbaLXA20tZIdSs.jpg', who: 'Temu', note: 'Case study', href: '/work#temu-scaling-paid-social-with-500-ugc-videos' },
    { src: '/assets/video/case-papaya-2.mp4', poster: '/assets/site/case-papaya-2.jpg', who: 'Papaya Gaming', note: 'Case study', href: '/work#papaya-gaming' },
    { src: '/assets/video/case-temu-2.mp4', poster: '/assets/site/case-temu-2.jpg', who: 'Temu', note: 'Case study', href: '/work#temu-scaling-paid-social-with-500-ugc-videos' },
    { src: '/assets/video/case-papaya-3.mp4', poster: '/assets/site/case-papaya-3.jpg', who: 'Papaya Gaming', note: 'Case study', href: '/work#papaya-gaming' },
    { src: '/assets/video/case-temu-3.mp4', poster: '/assets/site/case-temu-3.jpg', who: 'Temu', note: 'Case study', href: '/work#temu-scaling-paid-social-with-500-ugc-videos' },
  ],
  'tiktok-shop': [
    { src: '/assets/video/flowdrive-VDbaPLrkg8ffAjqF0f0AG.mp4', poster: '/assets/site/phone-flowdrive-VDbaPLrkg8ffAjqF0f0AG.jpg', who: 'Comfelie', note: 'TikTok Shop', href: '/work#comfelie-driving-20k-in-sales' },
    { src: '/assets/video/flowdrive-4lGMMajIxr5eApG7p5kPZ.mp4', poster: '/assets/site/phone-flowdrive-4lGMMajIxr5eApG7p5kPZ.jpg', who: 'Comfelie', note: 'TikTok Shop', href: '/work#comfelie-driving-20k-in-sales' },
  ],
  'tiktok-shop-livestreams': [
    { src: igReel('DfXCUFVJBeV'), poster: '/assets/site/ig-stridetalent-reel-DfXCUFVJBeV-first.jpg', who: 'TikTok LIVE', note: 'Livestream', href: '/work' },
  ],
  'influencer-events': [
    { src: '/assets/video/social-events-reel-phone.mp4', poster: '/assets/site/social-events-reel-phone.jpg', who: 'Creator events', note: 'Stride Social', href: '/social/services/influencer-events' },
  ],
  'podcast-activations': [
    // The Fellas × TrainPal's reel alone (the owner, 2026-11-23: "delete the other two videos").
    { src: ssReel('DBNqTDKRWyH'), poster: '/assets/site/stridesociall-reel-DBNqTDKRWyH-first.jpg', who: 'TrainPal', note: 'Podcast', href: '/work#trainpal' },
  ],
};

/** How many clips a phone plays at most. */
export const PHONE_CLIPS = 8;
