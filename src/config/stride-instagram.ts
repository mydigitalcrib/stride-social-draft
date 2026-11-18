// Stride Talent's Instagram profile, as /talent opens on it (talent/InstaProfile.astro; the owner, 2026-11-17: "for the
// beginning of Stride Talent I want this exactly first ... recreate this", instagram.com/stridetalent). Everything here is
// read off the profile itself on 2026-11-17: the figures from the profile (they change every day: update them with
// the posts), the bio as written there and six of its posts, the slide of each the owner chose (fetched through
// Instagram's public embeds). Post pictures: public/assets/site/ig-stridetalent-<code>.jpg (720 wide). Its
// highlights on the site are Talent 2.0's niches instead (the owner, 2026-11-17; talent/InstaProfile.astro). Its
// Reels tab is its case-study reels (`reels`, 2026-11-18), played on the site.

export const strideInstagram = {
  handle: 'stridetalent',
  href: 'https://www.instagram.com/stridetalent/',
  name: 'Stride Social - Influencer Talent Agency',
  verified: true,
  /** As the profile shows them on 2026-11-17 (source: instagram.com/stridetalent). */
  stats: [
    { value: '557', label: 'posts' },
    { value: '13.5K', label: 'followers' },
    { value: '3,817', label: 'following' },
  ],
  statsSource: 'Instagram, instagram.com/stridetalent, 2026-11-17',
  category: 'Social Media Agency',
  bio: ['Growth Partner For Creators.', '⭐ Part of @StrideSociall & StrideSport', '📍 London | NYC | CAD | Paris | Berlin | NORDIC', '📞 +44 020 3633 9553'],
  link: { label: 'www.stride-social.com', href: 'https://www.stride-social.com' },
  /** Its grid, in the owner's order (2026-11-17, drawn on the grid: the signature series, CreatorFest, the best time to
   *  post, brand behaviour, what creators say about Stride, story hooks), each showing its first picture, its cover (the
   *  owner, 2026-11-17: "all these posts should be in slide 1"; `slide`, Instagram's `img_index`). "What creators say
   *  about Stride" is the owner's own four pictures (2026-11-18, in place of Karla's signing), not found on the profile
   *  yet, so `href` points to the profile and `code` only names its files; `alts` are its pictures' own words. `kind` is a carousel or a reel, as Instagram marks them.
   *  `slides`: how many pictures the post has, all on the site (public/assets/site/ig-stridetalent-<code>-<n>.jpg), so a
   *  post opens in the page's own viewer and its pictures are swiped there (the owner, 2026-11-17: "sin que me redirija
   *  al ig"). */
  posts: [
    { code: 'DdlvXYSDAfo', slide: 1, slides: 6, kind: 'carousel', alt: 'Every creator needs a signature series: here’s how to find yours' },
    { code: 'DBiRc6gT8pQ', slide: 1, slides: 3, kind: 'carousel', alt: 'Stride attended CreatorFest: three of the Stride team at the event' },
    { code: 'DV_Bl8jjM1G', slide: 1, slides: 7, kind: 'carousel', alt: 'The best time to post: posting times for each day of the week' },
    { code: 'DZFWP_NjGfN', slide: 1, slides: 6, kind: 'carousel', alt: 'Brand behaviour that signals a smart influencer strategy' },
    {
      code: 'creators-say',
      slides: 4,
      kind: 'carousel',
      href: 'https://www.instagram.com/stridetalent/',
      alt: 'What creators say about Stride',
      alts: [
        'What creators say about Stride: a creator smiling at the camera',
        'What creators say about Stride. “Stride Social have been amazing to work with! Not only do they give creators freedom and flexibility, but they are also fun to work with. Looking forward to many years collaborating with them.” Justice Buys, creator',
        'What creators say about Stride. “Stride has helped me work with some amazing brands. They are a pleasure to work with and recommend them to any other creator!” Sam Shan Shops, talent',
        'What creators say about Stride. “Honestly, the best management ever! Always on hand to give you any help you need! Can’t recommend enough!” Jack Chalmers, talent',
      ],
    },
    { code: 'DbViw-ijPc9', slide: 1, slides: 5, kind: 'carousel', alt: 'Story hooks that actually make people stop scrolling' },
  ] as { code: string; slide?: number; slides: number; kind: 'carousel' | 'reel' | 'post'; alt: string; alts?: string[]; href?: string }[],
  /** Its own stories, played from its profile picture, which wears Instagram's green ring for them (the owner,
   *  2026-11-18: "only the logo to have all these stories and like a green circle"): the owner's pictures and clips of
   *  the Stride team at events, in the owner's order (public/assets/site/stride-story-<n>.jpg; the clips
   *  public/assets/video/stride-story-<n>.mp4, up to 30 seconds, with a poster of the same name). `alt` says what the
   *  story shows, its own words first. */
  stories: [
    // These two first (the owner, 2026-11-18: "add those 2 videos at first").
    { video: '/assets/video/stride-story-11.mp4', poster: '/assets/site/stride-story-11.jpg', alt: 'Bali × IFA Berlin Show! One of the team talks in the Bali office' },
    { video: '/assets/video/stride-story-13.mp4', poster: '/assets/site/stride-story-13.jpg', alt: 'Viva Technology: one of the team talks to the camera as he walks through the show' },
    { img: '/assets/site/stride-story-1.jpg', alt: 'Two of the Stride team on a balcony above the Ideal Home Show' },
    { img: '/assets/site/stride-story-2.jpg', alt: 'Stride Team at @thebabyshowofficial Today! One of the team hugs Tommee Tippee’s owl mascot' },
    { img: '/assets/site/stride-story-3.jpg', alt: 'Exciting day for some of the Stride Team. Learning about the new brands that are hitting the UK market! A momo kombucha presentation, and two of the team in front of a Spill the Beans banner' },
    { img: '/assets/site/stride-story-4.jpg', alt: '@insta360 x Stride Social: three people at Insta360’s stand' },
    { img: '/assets/site/stride-story-5.jpg', alt: 'Successful Campaign with @laifen_tech: one of the team beside Laifen’s stand at CES, Las Vegas Convention Center' },
    { img: '/assets/site/stride-story-6.jpg', alt: '@influencershow x Stride Social: the Stride Social sign on the floor of the show' },
    { img: '/assets/site/stride-story-7.jpg', alt: 'One of the team in front of TikTok’s moss logo in Cannes' },
    { img: '/assets/site/stride-story-8.jpg', alt: 'Great day at @icelondonuk: one of the team at ICE London' },
    { img: '/assets/site/stride-story-9.jpg', alt: 'The Team heading to @icelondonuk: one of the team on the train, a Stride Social sticker on his laptop' },
    { video: '/assets/video/stride-story-10.mp4', poster: '/assets/site/stride-story-10.jpg', alt: 'Bali office team expanding! The office and its balcony among palm trees' },
    { video: '/assets/video/stride-story-12.mp4', poster: '/assets/site/stride-story-12.jpg', alt: '@vivatech x Stride: a robot dinosaur walks across the floor at VivaTech' },
  ] as ({ img: string; alt: string } | { video: string; poster: string; alt: string })[],
  /** Its Reels tab: Stride Talent's case studies, newest first, from the latest down to @joannbitar × Time Phoria (the
   *  owner, 2026-11-18: "agrega los case studies de aquí, descarga los vídeos", "con la portada y todo"), each played on
   *  the site whole: public/assets/video/ig-stridetalent-reel-<code>.mp4 and its Instagram cover,
   *  public/assets/site/ig-stridetalent-reel-<code>.jpg ("case study: <client>"). `title` and `text` are its caption as
   *  posted, without the hashtags (read 2026-11-18); `creator` and `client` as the caption names them. */
  reels: [
    { code: 'DfpD4rnpsor', creator: '@meyserakca', client: 'Expressions', title: 'A little golden glow goes a long way! ✨💛', text: 'Our creator @meyserakca partnered with Expressions to showcase their CryoGold Firming Gel, bringing a touch of luxury to her everyday self-care routine!\n\nWith 279K followers, Meysera shares beauty, lifestyle and motherhood content, making this collaboration a natural fit for her audience. 💙' },
    { code: 'DfmfDHeJcIC', creator: '@sincerelyjord_', client: 'Ilso', title: 'Skincare that speaks for itself! 🧖‍♀️✨', text: 'Our creator @sincerelyjord_ , known for her holistic skincare and scar healing content, partnered with Ilso_global to put their Super Melting Sebum Softener to the test!\n\nWith 140.9K followers on TikTok, Jordan brings her authentic approach to skincare into this collaboration. 💙' },
    { code: 'DfXCUFVJBeV', creator: '@callum_wm17', client: 'TikTok', title: 'One question for football legend R9 Ronaldo! ⚽️👀', text: 'Our creator @callum_wm17 teamed up with TikTok to get fans involved ahead of an exciting TikTok LIVE moment, with the campaign reaching 92.1K views! 🔥' },
    { code: 'DfUdgGFpV9c', creator: '@cookingwithtubz', client: 'Dola', title: '@cookingwithtubz X Dola', text: 'We partnered up with our client Dola and our amazing creators to produce this great piece of content!🌟' },
    { code: 'DfFAs2oprqm', creator: '@joshandjem', client: 'Netflix UK', title: '@joshandjem X Netflix UK', text: 'We partnered up with our client Netflix UK and our amazing creators to produce this great piece of content🌸' },
    { code: 'DfCb-Fvp7I-', creator: '@lifewithhaaliyah', client: 'Refilled', title: '@lifewithhaaliyah X Refilled', text: 'We partnered up with our client Refilled and our amazing creators to produce this great piece of content!🌟' },
    { code: 'Dey_JuJJwlI', creator: '@feelgoodhealthfitness', client: 'Huawei', title: '@feelgoodhealthfitness X Huawei', text: 'We partnered up with our client Huawei and our amazing creators to produce this great piece of content!🎀' },
    { code: 'DewaY0jJ5x4', creator: '@finding_alessi', client: 'Casetify', title: '@finding_alessi X Casetify', text: 'We partnered up with our client Casetify and our amazing creators to produce this great piece of content!🌟' },
    { code: 'Deg9pfqJaBz', creator: 'RLopez', client: 'Meitu', title: 'RLopez X Meitu', text: 'We partnered up with our client Meitu and our amazing creators to produce this great piece of content!' },
    { code: 'DeeY1SkpnrN', creator: '@thehijabiballer', client: 'Underarmour fc', title: '@thehijabiballer X Underarmour fc', text: 'We partnered up with our client Underarmour fc and our amazing creators to produce this great piece of content✨' },
    { code: 'DeO8CNnpPaS', creator: '@bymuye', client: 'Oma', title: '@bymuye X Oma', text: 'We partnered up with our client Oma and our amazing creators to produce this great piece of content🌱' },
    { code: 'DeMXMhRJPYV', creator: '@oneresetaday', client: 'Ronseal', title: '@oneresetaday X Ronseal', text: 'We partnered up with our client Ronseal and our amazing creators to produce this great piece of content✨' },
    { code: 'Dd86b4Qp0l3', creator: '@itschickiana', client: 'Temu', title: '@itschickiana X Temu', text: 'We partnered up with our client Temu and our amazing creators to produce this great piece of content🌟' },
    { code: 'Dd6VsSJJrLf', creator: '@aaliyahdaniels_', client: 'Hiya Health', title: '@aaliyahdaniels_ X Hiya Health', text: 'We partnered up with our client Hiya Health and our amazing creators to produce this great piece of content🌱' },
    { code: 'Ddq49klpZDw', creator: '@meyserakca', client: 'Hoto', title: '@meyserakca X Hoto', text: 'We partnered up with our client Hoto and our amazing creators to produce this great piece of content🌸' },
    { code: 'DdoUD2BJkut', creator: '@feelgoodhealthfitness', client: 'Issviva', title: '@feelgoodhealthfitness X Issviva', text: 'We partnered up with our client Issviva and our amazing creators to produce this great piece of content🌟' },
    { code: 'DdY3Xjsp_Ch', creator: '@paigetbrown', client: 'Glacier Fresh', title: '@paigetbrown X Glacier Fresh', text: 'We partnered up with our client Glacier Fresh and our amazing creators to produce this great piece of content🌸' },
    { code: 'DdWSimrpw_c', creator: '@ourwritesmatter', client: 'Inkalloy', title: '@ourwritesmatter X Inkalloy', text: 'We partnered up with our client Inkalloy and our amazing creators to produce this great piece of content🌟' },
    { code: 'DdG1xsDpXSx', creator: '@musaandstellaa', client: 'Miniso', title: '@musaandstellaa X Miniso', text: 'We partnered up with our client Miniso and our amazing creators to produce this great piece of content🫧' },
    { code: 'DdEQ8ZzpWXc', creator: '@crayspace', client: 'Dola AI', title: '@crayspace X Dola AI', text: 'We partnered up with our client Dola AI and our amazing creators to produce this great piece of content🌟' },
    { code: 'Dc00L38o5CR', creator: '@rothna.a', client: 'CoCreate & Alibaba', title: '@rothna.a X CoCreate & Alibaba', text: 'We partnered up with our client CoCreate & Alibaba and our amazing creators to produce this great piece of content🌸' },
    { code: 'DcyPeWRIOmi', creator: '@the_fatgirldiaries', client: 'ZozoFit', title: '@the_fatgirldiaries X ZozoFit', text: 'We partnered up with our client ZozoFit and our amazing creators to produce this great piece of content🌸' },
    { code: 'Dciyrt6I2Dm', creator: '@feelgoodhealthfitness', client: 'WomenofVoy', title: '@feelgoodhealthfitness X WomenofVoy', text: 'We partnered up with our client WomenofVoy and our amazing creators to produce this great piece of content🌟' },
    { code: 'DcgN1LBosTF', creator: '@joshandjem', client: 'WePlay Global', title: '@joshandjem X WePlay Global', text: 'We partnered up with our client WePlay Global and our amazing creators to produce this great piece of content🌟' },
    { code: 'DcQxFs_InaH', creator: '@sophierix98', client: 'Tester Up app', title: '@sophierix98 X Tester Up app', text: 'We partnered up with our client Tester Up app and our amazing creators to produce this great piece of content🌟' },
    { code: 'DcOMPrWoWMU', creator: '@louie_kingg00', client: 'Fit Foods', title: '@louie_kingg00 X Fit Foods', text: 'We partnered up with our client Fit Foods and our amazing creators to produce this great piece of content🤝' },
    { code: 'Db-7IrUMSRm', creator: '@winserpt', client: 'Budget Energy', title: '@winserpt X Budget Energy', text: 'We partnered up with our client Budget Energy and our amazing creators to produce this great piece of content🤝' },
    { code: 'Db8KuOdIiPp', creator: '@lifewithhaaliyah', client: 'Uber', title: '@lifewithhaaliyah X Uber', text: 'We partnered up with our client Uber and our amazing creators to produce this great piece of content⭐️' },
    { code: 'Dbst80Wo3jo', creator: '@callum_wm17', client: 'Kalshi', title: '@callum_wm17 X Kalshi', text: 'We partnered up with our client Kalshi and our amazing creators to produce this great piece of content🌟' },
    { code: 'DbqJJRiItBF', creator: '@whythepigment.studio', client: 'Pitaka', title: '@whythepigment.studio X Pitaka', text: 'We partnered up with our client Pitaka and our amazing creators to produce this great piece of content✨' },
    { code: 'DbasYWaIMkA', creator: '@stephbooty_', client: 'Plaude Note Pin', title: '@stephbooty_ X Plaude Note Pin', text: 'We partnered up with our client Plaude Note Pin and our amazing creators to produce this great piece of content🌸' },
    { code: 'DbYHpr5o1PK', creator: '@stephbooty_', client: 'Airlearn', title: '@stephbooty_ X Airlearn', text: 'We partnered up with our client Airlearn and our amazing creators to produce this great piece of content✨' },
    { code: 'DbGGFVpI84H', creator: '@jackdurkss', client: 'Sure Deodorant', title: '@jackdurkss X Sure Deodorant', text: 'We partnered up with our client Sure Deodorant and our amazing creators to produce this great piece of content✨' },
    { code: 'Da0Eed2oBa8', creator: '@lifewithhaaliyah', client: 'Axis-Y', title: '@lifewithhaaliyah X Axis-Y', text: 'We partnered up with our client Axis-Y and our amazing creators to produce this great piece of content🌺' },
    { code: 'DaiC4Bwo2Bp', creator: '@whythepigment.studio', client: 'CapCut Design Studio', title: '@whythepigment.studio X CapCut Design Studio', text: 'We partnered up with our client CapCut Design Studio and our amazing creators to produce this great piece of content⭐️' },
    { code: 'DaQBYbJIuDF', creator: '@taynotalexx', client: 'Luxury Escapes', title: '@taynotalexx X Luxury Escapes', text: 'We partnered up with our client Luxury Escapes and our amazing creators to produce this great piece of content🙌🏼' },
    { code: 'DZ9_xwgoVTR', creator: '@bhavanachowdaryy', client: 'RingConn', title: '@bhavanachowdaryy X RingConn', text: 'We partnered up with our client RingConn and our amazing creators to produce this great piece of content🙌🏼' },
    { code: 'DZr-QFvIAla', creator: '@liviaahrnt', client: 'Air Brush', title: '@liviaahrnt X Air Brush', text: 'We partnered up with our client Air Brush and our amazing creators to produce this great piece of content⭐️' },
    { code: 'DZZ7_gbsNEe', creator: '@paigetbrown', client: 'Anker Solix', title: '@paigetbrown X Anker Solix', text: 'We partnered up with our client Anker Solix and our amazing creators to produce this great piece of content✨' },
    { code: 'DZH7Erxs3qp', creator: '@whythepigment.studio', client: 'Adobe Express', title: '@whythepigment.studio X Adobe Express', text: 'We partnered up with our client Adobe Express and our amazing creators to produce this great piece of content ⭐️' },
    { code: 'DXwV0i3oybR', creator: '@reidcard28', client: 'Mureka', title: '@reidcard28 X Mureka', text: 'We partnered up with our client Mureka and our amazing creators to produce this great piece of content✨' },
    { code: 'DXeTDo1IJsd', creator: '@tayandalexx', client: 'SailyWorld', title: '@tayandalexx X SailyWorld', text: 'We partnered up with our client SailyWorld and our amazing creators to produce this great piece of content✨' },
    { code: 'DXHH9S1Inbv', creator: '@ninamaureengaly', client: 'Booster Sonic', title: '@ninamaureengaly X Booster Sonic', text: 'We partnered up with our client Booster Sonic and our amazing creators to produce this great piece of content✨' },
    { code: 'DWToA_UIn5M', creator: '@stephbooty_', client: 'Smol Products', title: '@stephbooty_ X Smol Products ✨', text: 'We partnered up with our client Smol Products and our amazing creators to produce this great piece of content✨' },
    { code: 'DVI87jyiDu7', creator: '@itschickiana', client: 'Temu', title: '@itschickiana X Temu', text: 'We partnered up with our client Temu and our amazing creators to produce this great piece of content🌺' },
    { code: 'DUsXDqUjAEj', creator: '@joannbitar', client: 'Time Phoria', title: '@joannbitar X Time Phoria', text: 'We partnered up with our client Time Phoria and our amazing creators to produce this great piece of content🌺' },
  ] as { code: string; creator: string; client: string; title: string; text: string }[],
};
