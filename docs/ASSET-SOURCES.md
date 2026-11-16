# Where outside material came from

Stock footage and other material that isn't Stride's own. Check the licence again before launch, and replace
anything Stride would rather shoot or commission itself.

Before adding stock footage, read the licence on the item's own page: libraries mix licences. On Mixkit, clips
marked "Mixkit Stock Video Free License" may be used commercially; clips marked "Mixkit Restricted License" are for
personal use only and must not go on this site (every on-stage speaker clip there is restricted, checked 2026-11-09).

## Stride Sport: the footage behind the page (`/sport`)

One clip, played whole and round again behind the page (`talent/SpecialistPage.astro`, `src/scripts/system/spec-reel.ts`).

| File | What it is | Source | Licence | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/video/stride-sport-stadium.mp4` | A football match seen from the stands under the floodlights: three shots of the crowd and the pitch, 14 seconds | Supplied by the owner on 2026-11-11, a cut made in CapCut (`1111.mp4`, 1920×1080, 11 MB). Compressed with ffmpeg to 1600×900 (5.2 MB), sound removed, nothing else changed | Stride's own recording (confirmed by the owner, 2026-11-11) | 2026-11-11 |
| `public/assets/site/stride-sport-poster.jpg` | The clip's first frame, shown before the footage loads and with reduced motion | Made from the clip | As the clip | 2026-11-11 |

Notes:

- It replaces the two Mixkit clips used from 2026-11-09 (items 43492 and 43494, Mixkit Stock Video Free License: a
  penalty at night), which are no longer in the site.
- In frame: a professional match (the players and the clubs' colours), the stadium, advertising boards with other
  companies' names, the big screen, and people in the crowd, mostly from behind and a few in profile. Footage shot
  on a phone inside a stadium is often limited by the ticket's terms, and match footage by the competition's
  rights: Stride should be comfortable with that on a commercial site, or swap in footage it holds the rights to.
  Nobody in it is presented as Stride's talent.

## Stride Podcasts: the footage behind the page (`/talent/podcasts`)

One clip, played whole and round again behind the page (the same component and script as Stride Sport).

| File | What it is | Source | Licence | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/video/stride-podcasts-studio.mp4` | The Back Side podcast's studio: one host, then two, then all three under the show's neon sign; 17.8 seconds | A screen recording the owner made on 2026-11-11 (1920 by 1080, 19 seconds, 21 MB) of an episode on the show's YouTube channel, "Why One Scandal Built YouTube, Lewis Helping The Police & ChrisMD's Theo Baker Tribute" (https://www.youtube.com/watch?v=lvcKHJ9vMeM, from about 3:19) | **Back Side's footage.** The show is on Stride's podcast deck, which says not every show on it is signed: needs the show's OK, or the owner's word that Stride has it | 2026-11-11 |
| `public/assets/site/stride-podcasts-poster.jpg` | The clip's first frame, shown before the footage loads and with reduced motion | Made from the clip | As the clip | 2026-11-11 |
| `public/assets/site/stride-podcasts-studio-wide.jpg` | A frame from 13 seconds into the clip: all three hosts under the show's neon sign (1600 by 900) | Made from the clip with ffmpeg | As the clip | 2026-11-12 |

Notes:

- The poster and the wide frame are also Stride Social's Podcast Activations pictures (its page, its story on
  /social/services, its card in "More services"; `src/content/services/podcast-activations.md`): the owner, 2026-11-12,
  "you can use any picture from our podcast section". The same condition as the clip applies.
- Made with ffmpeg: stopped at 17.8 seconds (the player's title and controls come up after that), 1600 by 900,
  1.6 MB, sound removed. The cuts are the episode's own.
- The three hosts' faces are in it throughout, and the site's rule is never to show anyone as Stride's talent who
  isn't: it stays only while Back Side is Stride's (signed or partner) and is happy to be shown.
- In frame: the show's neon sign, and makers' and sponsors' marks on the hosts' shirts.
- The five shows listed on the page have their own YouTube channel pictures, by address (`docs/ROSTER-IMPORT.md`).

## Stride Speakers: the footage behind the page (`/talent/speakers`)

One short clip behind the page (the same component and script as Stride Sport): a television studio's stage, lit,
seen from behind its audience.

| File | What it is | Source | Licence | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/video/stride-speakers-studio.mp4` | The set of the game show "Call Yourself a Fan?" from the back of the studio: the stage and its screen, a camera crew, the audience at tables | A video from Jack Durkin's Instagram post about his day on the show (https://www.instagram.com/p/DQMmjpiCJfo/), supplied by the owner on 2026-11-11 as a file: 720 by 960, 3 seconds, 0.3 MB, no sound | Jack Durkin's post; he is on Stride's roster. **His OK for this use is to be recorded** with the rest of his profile | 2026-11-11 |
| `public/assets/site/stride-speakers-poster.jpg` | The clip's first frame, shown before the footage loads and with reduced motion | Made from the clip | As the clip | 2026-11-11 |

Notes:

- Made with ffmpeg: the three seconds play forward, then backward, in one file (6 seconds, 0.9 MB), so it goes
  round without a jump. Nothing else is changed. The clip is upright and small: on a wide screen only the band
  with the stage shows, enlarged, so it is soft there. A larger original would be sharper.
- In frame: the show's name on its screen and its sponsor's on the desk, the people on the set (small, not
  recognisable), the crew, and the audience from behind. It is another company's programme: Stride should be
  comfortable showing its set, or swap in footage of its own speakers when there is some. Nobody in it is presented
  as Stride's talent.
- Used before it, and no longer in the site: two stretches of Jack Durkin talking to his camera, from his video
  "I Went To The Irish FA Cup Final!" (2026-11-11, a few hours), and before that a Pexels clip (video 35451425 by
  JD Montoro; from 2026-11-09). Mixkit's theatre clips (items 36825 and 12984 among them) are still not to be
  used: their licence is the restricted one.

## Stride Speakers: where they've spoken (`/talent/speakers`)

Four pictures from Instagram posts the owner gave on 2026-11-11, each the one picture of the post the owner pointed
at, saved from the post's public page and resized (`src/content/pages/speakers.yaml`, `placements.items`). Each
picture on the page links to its post.

| File | What it is | Source | Rights | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/site/stride-speakers-oli-christie-summit.jpg` | Oli Christie giving the welcome speech at Global Marketing Summit 2026 | The first picture of https://www.instagram.com/p/Ded3g-piscl/ (posted by @globalmarketingsummit with @olichristiecoach) | **The summit's photograph**, with its and its sponsors' marks behind him: needs the summit's or Oli Christie's OK | 2026-11-11 |
| `public/assets/roster/oli-christie.jpg` | His picture on his card: a part of the photograph above | Made from the file above | As above | 2026-11-11 |
| `public/assets/site/stride-speakers-jack-durkin-game-show.jpg` | Jack Durkin and two other guests on the set of "Call Yourself a Fan?" | The fourth item of https://www.instagram.com/p/DQMmjpiCJfo/ (@jackdurkss), which is a video: this is its cover frame, 720 by 960 | Jack Durkin's post; the show's set and two other people are in it | 2026-11-11 |
| `public/assets/site/stride-speakers-jack-durkin-20vs1.jpg` | Jack Durkin at the 20vs1 debate table, across from Michael Owen | The second picture of https://www.instagram.com/p/De2GFDAiCB2/ (@jackdurkss) | Jack Durkin's post; Michael Owen, the host and other guests are in it, and the organiser's mark | 2026-11-11 |
| `public/assets/site/stride-speakers-tom-painter-20vs1.jpg` | Tom Painter at a microphone during the 20vs1 debate | The second picture of https://www.instagram.com/p/De2DViUjQ8l/ (@tpainterx) | Tom Painter's post; other guests behind him, out of focus | 2026-11-11 |

Notes:

- The words beside each say only what its post says: the event, what he did there and the month.
- Pictures from a creator's own post need that creator's OK with the rest of their profile, and these show other
  people too (a well-known footballer among them): Stride should be comfortable showing them, or swap in pictures
  it has the rights to.

## The team's photographs (`/about`, `/team`)

The people behind Stride, as slide 15 of Stride's own talent deck shows them ("Behind Stride Talent", 2026): the
owner pointed at that slide on 2026-11-11 and asked for its blue-background photographs.

| Files | What they are | Source | Rights | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/team/*.jpg` (72) | One photograph per person on the slide, on a pale blue background | The slide's own pictures, as the deck's public view link serves them (about 490 pixels square), saved as JPEG; nothing else changed | Stride's own staff photographs, from Stride's deck | 2026-11-11 |

Notes:

- The deck is marked "Strictly Confidential - Please do not share". Only slide 15 was used, and from it only each
  person's first name (with an initial where the slide gives one), role and photograph, which is what the team
  page shows. Nothing else of the deck is in the site.
- `src/content/team/` follows the slide: 72 entries, in the slide's order. Fourteen of them had an entry of the
  same name already and were updated in place (the old photographs stay in `public/assets/cms/`, unused).
  Sixteen talent managers from the previous site who aren't on the slide are hidden (`visible: false`), not
  deleted; three people who aren't in talent roles (Bella, Blossom, Sasha) are kept with the photographs they had.
  Stride should say who of those nineteen is still there.
- Departments are proposed from the roles, as before.

## Our Work: following the hand through the camera (`/work`, "Move with your hand")

A hand-tracking model that runs in the visitor's browser, on their device, only once they turn the camera on
(`src/scripts/system/hand-motion.ts`, `hand-worker.ts`). Nothing from the camera is recorded or sent anywhere; the
files below are only downloaded from this site.

| File | What it is | Source | Licence | Fetched |
| --- | --- | --- | --- | --- |
| `@mediapipe/tasks-vision` 1.2.2 (npm, in `package.json`) | MediaPipe's vision library and its engine (`vision_wasm_module_internal.js` and `.wasm`, 14.6 MB, which the build copies into the site) | Google, https://www.npmjs.com/package/@mediapipe/tasks-vision | Apache 2.0 | 2026-11-10 |
| `public/assets/vendor/mediapipe/gesture_recognizer.task` | The gesture recogniser's model (8.4 MB): a hand's joints, and whether it's open or a fist | Google, https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task | Apache 2.0 (MediaPipe's models, as documented at https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer) | 2026-11-10 |

Notes:

- About 23 MB in all, fetched only when a visitor presses "Move with your hand". The engine is pinned to the exact
  version in `package.json`; the model is a file in this repository, and must be replaced by hand if the library is
  ever updated to one that needs a newer model.
- It runs on the processor, on a thread of its own, at some ten readings a second. On the graphics card it was faster
  but took the card from the canvas (see `hand-worker.ts`).
- Check the model's licence page again before launch.

## Stride Academy on the homepage (`/`, the Academy row of "Three sides of Stride", desktop)

Academy has no photography of its own yet, so its row on the homepage shows a stock photograph behind it, in the
row's slate colour (`home/ContentsIndex.astro`). The owner asked for a picture on 2026-11-12 and approved this one.

| File | What it is | Source | Licence | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/site/academy-creator-setup.jpg` | A phone on a tripod under a ring light, recording; the person it films shows small on the phone's screen | Pexels photo 6347621 by Liza Summer, "Faceless lady filming video on mobile while demonstrating dress" (https://www.pexels.com/photo/faceless-lady-filming-video-on-mobile-while-demonstrating-dress-6347621/), Pexels' own 1920-pixel version (1920×1280), saved as JPEG (177 KB); nothing else changed | Pexels License: free to use, commercial use included, no attribution required (as the photo's page says) | 2026-11-12 |

Notes:

- It shows a creator's setup, not a person: the one on the phone's screen is small and isn't presented as Stride's
  talent or as an Academy student.
- Replace it with Academy's own photography once there is some.

## Stride Social: the night sky behind the page (`/social`, desktop)

One clip behind the menu that opens the page and behind the creator globe after it, so the two read as one sky
(`experience/Deck.astro`'s `background.stars`, `social/CreatorGlobe.astro`'s `.globe__haze`), at its own speed.
The owner supplied it on 2026-11-12 as a file.

| File | What it is | Source | Licence | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/video/social-sky.mp4` | A dark night sky: stars, faint clouds of nebula and now and then a shooting star; 16 seconds, made to loop | Supplied by the owner as `Shooting Stars Night Sky #backgroundvideo #stockfootage #stockvideo #loop #video #sky #stars_1080p.mp4` (1920 by 1080, 16 seconds, 2.4 MB, with a sound track). Compressed with ffmpeg to 1600 by 900 (2 MB), sound removed; on 2026-11-12 the black bars at its top and foot (the original's letterbox) were cropped off and the rest scaled back to 1600 by 900 (1.8 MB). Nothing else changed | The owner's own (confirmed by the owner, 2026-11-12) | 2026-11-12 |
| `public/assets/site/social-sky-poster.jpg` | The clip's first frame, shown before the footage loads and with reduced motion | Made from the clip | As the clip | 2026-11-12 |

Notes:

- It replaces the two starfields the page had before (`social-globe-background.mp4` behind the globe and
  `social-menu-background.mp4`, a blurred photograph, behind the menu); both were deleted on 2026-11-15 and are in
  the Git history.

## Careers: the blue behind the page (desktop)

An abstract clip, never literal (the owner, 2026-11-12: "a blue background video"), behind the whole page under Stride's
navy and the grain (`core/BackVideo.astro`): no people, no faces, no logos, no text. Each licence was read on the clip's
own page on 2026-11-12. Each file was compressed with ffmpeg to 900 pixels high, without sound, and made to loop: its
first moments fade in over its last, so the loop has no jump. Nothing else was changed.

| File | What it is | Source | Licence | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/video/careers-blue.mp4` (+ `site/careers-blue-poster.jpg`) | Blue silk moving softly, close up; 18 seconds, 3 MB | Pexels video 7677240 by Mikhail Nilov, "Close-Up Video of a Blue Silk Cloth" (https://www.pexels.com/video/close-up-video-of-a-blue-silk-cloth-7677240/), the 1920×1080 file | Pexels License: free to use, commercial use included, no attribution required (as the clip's page says) | 2026-11-12 |

Notes:

- About, Insights, Contact and Stride Academy use the homepage's own showreel (`stride-showreel-desktop`) as its
  opening shows it (monochrome, in Stride's blue, blurred, the grain), so they need no new footage (the owner,
  2026-11-12). The two clips first fetched for Contact and Academy (Pexels 7565814, Pixabay 100469) were removed.

## Stride Social's services: pictures from Stride's own decks

The services' pictures (their pages, their stories on /social/services, the cards that list them) and the four "Our
approach" cards on /social, cut from slides of Stride's own decks on StrideDecks, which the owner linked on 2026-11-12
(influencer-seeding, tiktok-shop, influencer-events, ugc-management, street-interview-ugc, mobile-app-growth-strategy,
influencer-activation-management at https://stridedecks.com/d/...). Each slide was screenshotted from the deck's own
viewer and only the photograph was kept: no client logos, figures, quotes or slide text.

| File | What it is | Used on |
| --- | --- | --- |
| `public/assets/site/social-seeding-products.jpg` | Products ready to send to creators | Influencer Seeding |
| `public/assets/site/social-ugc-creator.jpg` | A creator smiling at the camera, holding a product up | UGC Production |
| `public/assets/site/social-ugc-neon.jpg` | A bedroom lit by LED panels, set up for filming | UGC Production |
| `public/assets/site/social-street-interview.jpg` | A presenter interviewing a young man in the street | UGC Production; "Creator Selection" |
| `public/assets/site/social-tiktok-phones.jpg` | Three phones: a TikTok Shop video, the product page, the checkout | TikTok Shop; TikTok Shop Livestreams; "Reporting" |
| `public/assets/site/social-team.jpg` | The Stride Social team in their office, in black and white | Influencer Activations; "Strategy" |
| `public/assets/site/social-events-dinner.jpg` | A candlelit dinner on a terrace at night | Influencer Events; "Campaign Execution" |
| `public/assets/site/social-events-run.jpg` | A run club event in a city street | Influencer Events |
| `public/assets/site/social-events-garden.jpg` | A garden pop-up with guests filming | Influencer Events |
| `public/assets/site/social-events-beach.jpg` | Creators on a brand trip around a vintage car | Influencer Events |
| `public/assets/site/social-activation-platterbox.jpg` | A creator holding up a platter box in a kitchen (a frame of a campaign video; Influencer Seeding deck, Platterbox case study) | Influencer Activations (its first picture) |
| `public/assets/site/social-activation-beach.jpg` | A creator on a beach chair playing a phone game (a frame of a campaign video; Influencer Activation deck, Papaya Gaming case study) | Influencer Activations |
| `public/assets/site/social-activation-desk.jpg` | A creator's desk under a neon name sign (a frame of a campaign video; Influencer Seeding deck, Autonomous case study) | Influencer Activations |
| `public/assets/site/social-seeding-coaster.jpg` | A creator holding up a coaster to the camera (a frame of a campaign video; Influencer Seeding deck, Autonomous case study) | Influencer Seeding |
| `public/assets/site/social-shop-platterbox.jpg` | A creator holding an open platter box (a frame of a campaign video; TikTok Shop and Influencer Seeding decks, Platterbox case study) | TikTok Shop |

Notes:

- The decks are Stride's own sales material (Canva), so the photographs are Stride's or its campaigns'. Some show
  creators and brands' products from past campaigns: Stride should be comfortable showing them on the site, as it
  is in the decks. None is presented as a result or a case study.
- The rest of each service's pictures were already on the site (Stride Social's Strategies).
- 2026-11-13 (the owner: "I told you to add new images inside services... I'm seeing services with the old images"):
  every service now opens on a picture from the decks, and the old site's three photographs
  (`social-influencer-campaigns.webp`, `social-commerce.webp`, `social-experiences.webp`) are no longer among the
  services' pictures. The five frames above were taken from the slides at twice the resolution, each video rewound to
  its first frame, and cut to the picture alone: no logo, figure or slide text. Their case studies' figures are not
  used anywhere with them.

## Our Sponsorships: the events' photographs (`/sponsorships`)

Supplied by the owner on 2026-11-12 in the conversation, with their captions; saved as JPEG at the size they came
(about 768 by 1024), nothing else changed (`src/content/sponsorships/`).

| File | What it is | Source | Rights | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/sponsorships/london-creatorfest-2024.jpg` | Three Stride Social team members at London CreatorFest, October 2024 | The owner | Stride's own photograph (its staff, its banner and floor sign) | 2026-11-12 |
| `public/assets/sponsorships/influencer-marketing-show-2023.jpg` | A Stride Social team member on the event's staircase printed with the Stride Social logo, Influencer Marketing Show, October 2023 | The owner | Stride's own photograph; the event's signs are in the background | 2026-11-12 |
| `public/assets/sponsorships/louie-the-reporter-2026.jpg` | LouieTheReporter, sponsored by Stride for the 2026 season, interviewing a guest in a Stride Social T-shirt | The owner (2026-11-13) | The owner's photograph of a creator Stride sponsors | 2026-11-13 |
| `public/assets/sponsorships/lisbon-retreat-2026-1.jpg` to `-6.jpg` | The Stride team's retreat in Lisbon, September 2026 (on About's timeline since 2026-11-13: a retreat, not a sponsorship): lunch on a boat, the team with a Stride Group sign, a beach bar, the boat's deck, padel, dinner in a garden | The owner: five iPhone photos (HEIC, from Downloads) and one JPEG, with the caption "Lisbon Retreat for Stride Team September 2026". The HEIC ones decoded with ffmpeg (their tiles stacked; two turned upright by hand), each scaled to 2000 pixels on its long side and saved as JPEG; nothing else changed | Stride's own photographs of its staff | 2026-11-12 |

## About: Stride's history in pictures (`/about`, desktop)

Supplied by the owner on 2026-11-13 in the conversation, each with its date and what it shows, for About's story
(`src/content/history/milestones.yaml` `images`, and `about.yaml`'s `founders.images`). Photographs saved as JPEG at
no more than 2000 pixels on their long side (the two iPhone ones decoded from HEIC with ffmpeg), nothing else changed.

| File | What it is | Source | Rights | Fetched |
| --- | --- | --- | --- | --- |
| `public/assets/history/founders-together.jpg`, `founders-portrait-1.jpg`, `founders-portrait-2.jpg` | Alex and Ollie together on a sofa, and a portrait of each in the office | The owner | Stride's own photographs of its founders | 2026-11-13 |
| `public/assets/video/history-2019-alxhendy-1.mp4`, `-2.mp4` (posters `public/assets/history/2019-alxhendy-1.jpg`, `-2.jpg`) | Two of Alex's own TikToks from @alxhendy: a lie-detector prank, and a sour candy prank on his sister | The owner (TikTok downloads, with TikTok's watermark); re-encoded without sound at 480x854, 30 frames a second, the whole clip | Alex's own videos | 2026-11-13 |
| `public/assets/history/2021-first-logo-1.jpg`, `-2.jpg` | Stride Social's first logo on a screen, a member of the team beside it (two photos) | The owner (iPhone HEIC) | Stride's own photographs | 2026-11-13 |
| `public/assets/history/2021-influencer-marketing-show.jpg` | Alex Hendy and Ollie Kitson with their Influencer Marketing Show badges, 2021 | The owner | Stride's own photograph | 2026-11-13 |
| `public/assets/history/2021-influencer-marketing-show-card.jpg` | The Influencer Marketing Show Europe's title card (26 October 2023), on the 2021 chapter at the owner's request | The owner (a screenshot) | The show's own title card, shown as part of Stride's story | 2026-11-13 |
| `public/assets/history/2024-influencer-marketing-show.jpg` | Three members of the Stride team at Stride Social's stand at the Influencer Marketing Show, on About's 2024 chapter for the show | The owner (sent in the session, 2026-11-13), saved as JPEG; nothing else changed | Stride's own photograph of its staff | 2026-11-13 |
| `public/assets/history/2024-influencer-marketing-show-card.jpg` | The Influencer Marketing Show USA's title card (3 to 4 June 2024), on About's 2024 chapter for the show at the owner's request | The owner (sent in the session, 2026-11-13), saved as JPEG; nothing else changed | The show's own title card, shown as a record of the event, as the 2021 chapter's is | 2026-11-13 |
| `public/assets/history/2024-ces-las-vegas.jpg`, `-2.jpg`, `-3.jpg` | Stride with Insta360 at CES, Las Vegas, 2024; Ollie under the CES sign; the #CES2024 letters outside | The owner | Stride's own photograph | 2026-11-13 |
| `public/assets/history/2024-first-christmas.jpg` | Stride's first Christmas, 2024: the team packing gifts for its talent | The owner | Stride's own photograph | 2026-11-13 |
| `public/assets/history/2024-first-christmas-2.jpg` | Wrapped Christmas presents on a wooden table, out of focus, the chapter's second picture | The owner (a picture, blurred as it came) | To confirm: it looks like a stock photograph; if it is, its licence must allow commercial use | 2026-11-13 |
| `public/assets/history/2025-socialjet-1.jpg`, `-2.jpg` | Stride × SocialJet, 2025: two Instagram stories (@stridetalent × @socialjet.sg) | The owner | Stride's own stories | 2026-11-13 |
| `public/assets/history/2025-europe-stride-group.jpg` | The Stride Group neon sign in a doorway, for Stride Talent in Europe | The owner | Stride's own photograph | 2026-11-13 |
| `public/assets/history/2025-europe.jpg` | The flag of the European Union, for Stride Talent's German and French departments, November 2025 | The owner | The EU flag, used to illustrate Europe, no endorsement implied | 2026-11-13 |
| `public/assets/history/2025-ugc-production-1.jpg`, `-2.jpg` | Stride's first in-house UGC production shoot, November 2025: the briefs on a table, the shoot in a living room | The owner | Stride's own photographs | 2026-11-13 |
| `public/assets/history/2026-youdao-netease-1.jpg`, `-2.jpg` | Stride with the Youdao Ads team at NetEase in China, October 2026, and NetEase's office | The owner | Stride's own photographs | 2026-11-13 |

## Insights: the articles' covers (`/insights`)

Every article's cover (`public/assets/insights/<article>.jpg`, 42) was drawn for this site on 2026-11-12 (the owner:
"new placeholder images, no copyright"): Stride's blues in soft light, its triangles in outline and glass, a fine
grain, laid out from the article's own name so no two are alike. Nothing in them comes from anyone else, so they
need no licence. The script that made them is not part of the site; replace any of them with a real picture whenever
there is one (the article's `cover`). The old covers stay where they were, unused.
