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

/** How many clips a phone plays at most. */
export const PHONE_CLIPS = 8;
