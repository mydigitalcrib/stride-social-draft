// Stride Social's photographs side by side: behind /social's closing row ("Start your campaign now.") and behind the
// homepage's Stride Social row (the owner, 2026-11-18: "same background"). Stride's own photographs, Advertising's and
// Talent's in turn: a creator dinner, a creator Stride Talent features, a creator event, the team at the Ideal Home Show
// (one of Talent's stories), a street interview, another featured creator, and a team member at a conference. The
// creators come through the roster's rules (consent, a photo).
import { getEntry } from 'astro:content';
import { getRoster } from '@/lib/roster';

export type SidePicture = { src: string; position?: string };

export async function getSocialPictures(): Promise<SidePicture[]> {
  const talent = await getEntry('pages', 'talent');
  const roster = await getRoster();
  const featured = (talent?.data.sections.hero?.featured ?? []).flatMap((id) => roster.filter((c) => c.id === id && c.data.portrait));
  const creator = (k: number): SidePicture[] => (featured[k]?.data.portrait ? [{ src: featured[k].data.portrait!.src, position: '50% 25%' }] : []);
  return [
    { src: '/assets/site/social-events-dinner.jpg', position: '60% 50%' },
    ...creator(0),
    { src: '/assets/site/social-events-beach.jpg', position: '40% 50%' },
    { src: '/assets/site/stride-story-1.jpg', position: '50% 60%' },
    { src: '/assets/site/social-street-interview.jpg', position: '78% 35%' },
    ...creator(1),
    { src: '/assets/site/social-influencer-campaigns.webp', position: '58% 30%' },
  ];
}
