// The niches' stories, shared by Stride Talent 2.0 (talent/TalentStories.astro: its rings and cards) and Stride Talent's
// Instagram profile (talent/InstaProfile.astro: its highlights, the owner, 2026-11-17): each niche's top ten (the owner's
// picks in src/content/pages/talent2.yaml, through the roster's rules, then its signed and partner creators with the
// largest audience figures), each creator's story (their own clip, else the Social globe's reel of them, else their
// photograph), and the player's words. Creators only through src/lib/roster.ts (consent, a photo).
import { getEntry } from 'astro:content';
import { getRoster, type Creator } from '@/lib/roster';
import { creatorRegions } from '@/config/creator-regions';
import { routes } from '@/lib/routes';

type Section = { items?: { key?: string; label: string; href?: string }[] } | undefined;
export const itemOf = (section: Section, key: string) => section?.items?.find((i) => i.key === key);
export const wordOf = (section: Section, key: string, fallback: string) => itemOf(section, key)?.label ?? fallback;

const TOP = 10; // a niche's cards and stories

export async function talentStories() {
  const page = await getEntry('pages', 'talent2');
  if (!page) throw new Error('Missing src/content/pages/talent2.yaml');
  const s = page.data.sections;
  const roster = await getRoster();
  const byId = new Map(roster.map((c) => [c.id, c]));
  // A creator's niches, as the roster's filter reads them (lib/creator-view.ts): their main category and the others.
  const inNiche = (c: Creator, key: string) => c.data.mainCategory?.id === key || c.data.categories.some((x) => x.id === key);
  // The audience figure on the roster sheet as a number, only to choose who fills a niche (unverified: never shown).
  const reach = (c: Creator) => {
    const m = c.data.audience?.figure.match(/([\d.,]+)\s*([km])?/i);
    if (!m) return 0;
    const unit = m[2]?.toLowerCase();
    return parseFloat(m[1].replace(/,/g, '')) * (unit === 'm' ? 1e6 : unit === 'k' ? 1e3 : 1);
  };
  // The same person twice on the roster (two entries, one account): the first one only.
  const accounts = (c: Creator) => Object.values(c.data.platforms ?? {}).map((u) => String(u).toLowerCase().split('?')[0].replace(/\/$/, ''));
  const once = (list: Creator[]) => {
    const taken = new Set<string>();
    return list.filter((c) => {
      const keys = accounts(c);
      if (keys.some((k) => taken.has(k))) return false;
      keys.forEach((k) => taken.add(k));
      return true;
    });
  };
  const clipId = (key: string, i: number) => `${key}-clip-${i + 1}`;
  const rosterId = (key: string) => `${key}-roster`;
  const niches = (s.hero.niches ?? [])
    .map((n) => {
      const picks = n.creators.flatMap((id) => byId.get(id) ?? []);
      const fill = roster
        .filter((c) => inNiche(c, n.key) && c.data.relationship !== 'unconfirmed' && !picks.includes(c))
        .sort((a, b) => reach(b) - reach(a));
      const top = once([...picks, ...fill]).slice(0, TOP);
      const members = roster.filter((c) => inNiche(c, n.key));
      // The last card: a few more of its faces, not in the ten.
      const more = members.filter((c) => !top.includes(c)).slice(0, 9).map((c) => c.data.portrait!.src);
      // A niche with its own clips plays those alone (the owner, 2026-11-17: "only leave the 4 videos i add in this chat
      // in lifestyle"), its ring showing the first clip; the others play their top ten, the ring their first face.
      const ids = n.clips.length ? n.clips.map((_, i) => clipId(n.key, i)) : top.map((c) => c.id);
      const face = n.clips[0]?.poster ?? top[0]?.data.portrait!.src;
      // Where the niche has its roster post (`rosterPost`), its stories end on a card offering the full roster
      // (the owner, 2026-11-18): the player's queue gets it; the cards on /talent-2 don't.
      const queue = n.rosterPost ? [...ids, rosterId(n.key)] : ids;
      return { key: n.key, label: n.label, top, count: members.length, more, clips: n.clips, ids, queue, face, members, rosterPost: n.rosterPost };
    })
    .filter((n) => n.ids.length);
  const reels = new Map(creatorRegions.flatMap((r) => r.reels ?? []).map((r) => [r.creator, { src: r.src, poster: r.poster }]));
  const storyOf = (c: Creator) => {
    const clip = c.data.videos[0] ? { src: c.data.videos[0].src, poster: c.data.videos[0].poster ?? null } : (reels.get(c.id) ?? null);
    return { id: c.id, n: c.data.name, p: c.data.portrait!.src, v: clip?.src ?? null, vp: clip?.poster ?? null, u: routes.creator(c.id) };
  };
  // A niche's own clips (talent2.yaml `clips`) play under their creator's name, photo and page when the clip names one
  // (`creator`, a roster id, shown only through the roster's rules), else under Stride Talent's name and mark. `pic` is
  // the picture their card on /talent-2 shows (a creator's card shows their photograph, `p`).
  const clipStories = niches.flatMap((n) =>
    n.clips.map((c, i) => {
      const by = c.creator ? byId.get(c.creator) : undefined;
      const who = by
        ? { n: by.data.name, p: by.data.portrait!.src, u: routes.creator(by.id) }
        : { n: 'Stride Talent', p: '/assets/site/stride-talent-avatar.svg', u: routes.rosterFiltered(n.key) };
      return { id: clipId(n.key, i), ...who, pic: c.poster, v: c.src, vp: c.poster };
    }),
  );
  const played = niches.filter((n) => !n.clips.length).flatMap((n) => n.top);
  // The card after a niche's last story: Stride Talent's, over the niche's first picture blurred; `end` says how many
  // creators its roster has. Its link is the niche's Roster tab on /talent (routes.rosterFiltered).
  const rosterCards = niches
    .filter((n) => n.rosterPost)
    .map((n) => ({ id: rosterId(n.key), n: 'Stride Talent', p: '/assets/site/stride-talent-avatar.svg', v: null, vp: null, u: routes.rosterFiltered(n.key), end: { count: once(n.members).length, bg: n.face } }));
  const stories = [...clipStories, ...new Map(played.map((c) => [c.id, storyOf(c)])).values(), ...rosterCards];
  const groups = niches.map((n) => ({ k: n.key, l: n.label, ids: n.queue }));
  // Each roster post (/talent's profile, its third tab): the niche's whole roster, one picture each, through the
  // roster's rules (consent, a photo), one entry per person.
  const rosterPosts = niches
    .filter((n) => n.rosterPost)
    .map((n) => {
      const creators = once(n.members).map((c) => ({ id: c.id, n: c.data.name, p: c.data.portrait!.src, u: routes.creator(c.id) }));
      return { key: n.key, label: n.label, count: creators.length, creators };
    });
  const words = Object.fromEntries((s.story?.items ?? []).map((i) => [i.key ?? '', i.label]));
  return { s, niches, stories, groups, words, rosterPosts, join: itemOf(s.hero, 'join') };
}
