// The team as the field of faces shows it (group/TeamField.astro): on Our Team and, on desktop, under About's story.
// Leadership first, then everyone else in their set order (byOrder); a department only if someone is in it.
import { getCollection, type CollectionEntry } from 'astro:content';
import { asHtml, paragraphs } from './experience';

/** The team's set order; people who share a number go in name order, so it's the same every build. */
export const byOrder = (a: CollectionEntry<'team'>, b: CollectionEntry<'team'>) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name, 'en');

export const teamLabels = { leadership: 'Leadership', talent: 'Talent', campaigns: 'Campaigns', social: 'Social media', sales: 'Sales', operations: 'Operations' } as const;

export async function teamField() {
  const team = (await getCollection('team', (m) => m.data.visible)).sort(byOrder);
  const ordered = [...team.filter((m) => m.data.department === 'leadership'), ...team.filter((m) => m.data.department !== 'leadership')];
  const people = ordered.map((m) => ({
    id: m.id,
    name: m.data.name,
    role: m.data.role,
    department: m.data.department,
    lead: m.data.department === 'leadership',
    photo: m.data.photo,
    photoAlt: m.data.photoAlt,
    card: {
      name: m.data.name,
      text: m.data.role,
      href: `#${m.id}`,
      image: m.data.photoAlt ?? m.data.photo,
      chips: [teamLabels[m.data.department]],
      html: m.data.bio ? asHtml(paragraphs(m.data.bio)) : undefined,
      action: m.data.linkedin ? { label: 'LinkedIn', href: m.data.linkedin, external: true } : undefined,
    },
  }));
  const departments = (Object.keys(teamLabels) as (keyof typeof teamLabels)[]).filter((d) => team.some((m) => m.data.department === d)).map((id) => ({ id, label: teamLabels[id] }));
  return { people, departments };
}
