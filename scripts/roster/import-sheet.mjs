#!/usr/bin/env node
// Second step of the roster import (docs/ROSTER-IMPORT.md): Stride's sheet, with Foam's descriptions and
// photos where a creator is on both, into src/content/roster/.
//   npm run roster:import -- sheet.json [foam.json]            shows what would change, writes nothing
//   npm run roster:import -- sheet.json [foam.json] --write    writes the files
// The sheet is the list: everyone on it is signed. The rules hold here too: nobody is marked as having
// confirmed consent, follower figures stay unverified (so they don't show), and a sentence with a figure
// in it is dropped from a description. Who belongs to which division is proposed from their niche and tags.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'src/content/roster');
const args = process.argv.slice(2);
const write = args.includes('--write');
const [sheetFile, foamFile] = args.filter((a) => !a.startsWith('--'));
if (!sheetFile) {
  console.error('Usage: npm run roster:import -- sheet.json [foam.json] [--write]');
  process.exit(1);
}
for (const f of [sheetFile, foamFile]) {
  if (f && path.resolve(f).startsWith(root + path.sep)) {
    console.error('Keep these files outside this repository: it is public.');
    process.exit(1);
  }
}

const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
// A link pasted twice over ("instagram.com/https://instagram.com/x") counts as its last one.
const lastUrl = (raw) => (raw ?? '').slice(Math.max(0, (raw ?? '').lastIndexOf('http')));
const NOT_HANDLES = new Set(['t', 'p', 'reel', 'reels', 'stories', 'share', 'www', 'https', 'http', '_u', 'channel']);
const handleIn = (link) => {
  const found = lastUrl(link).match(/(?:tiktok\.com\/@?|instagram\.com\/|youtube\.com\/@|youtube\.com\/c\/|youtube\.com\/user\/)([\w.-]+)/i)?.[1];
  return found && !NOT_HANDLES.has(found.toLowerCase()) ? found : undefined;
};
const urlOf = (raw) => {
  if (!raw) return null;
  const clean = lastUrl(raw);
  const candidate = /^https?:/i.test(clean) ? clean : /\.(com|be)\b/i.test(clean) ? `https://${clean}` : null;
  try {
    return candidate ? new URL(candidate).href : null;
  } catch {
    return null;
  }
};

// ---------- Niche: tidied from the sheet's words, and which filter and division each word leads to ----------
const tidy = { lifesyle: 'lifestyle', mum: 'motherhood', mom: 'motherhood', book: 'books', sports: 'sport', tech: 'tech', grwm: 'GRWM', diy: 'DIY', ugc: 'UGC' };
const wordsFor = {
  sport: /football|soccer|basketball|golf|cricket|sport|running|rugby|tennis|athlet|hyrox|\bboxing|baseball|\bnfl\b|\bnba\b|hockey|\bswim|\bcycling|\bsurf|\bski(ing)?\b|\bmma\b/,
  fitness: /fitness|\bgym|wellness|health|yoga|pilates/,
  family: /family|motherhood|parent|\bdad\b|father/,
  beauty: /beauty|skincare|makeup|grwm|\bhair/,
  fashion: /fashion|\bstyle\b|outfit/,
  food: /food|baking|cook|dessert|recipe/,
  gaming: /gaming|gamer/,
  technology: /tech|coding|\bai\b/,
  books: /books|author/,
  travel: /travel/,
  music: /music/,
  podcasts: /podcast/,
  entertainment: /entertainment|comedy|dance|actor|film/,
  pets: /\bpet|\bcat\b|\bdog/,
  creative: /\bart\b|craft|diy|creativ|design/,
  lifestyle: /lifestyle|home|clean|student|couple|self-improvement|decor/,
};
const titled = (w) => (/[A-Z]{2}/.test(w) ? w : w.replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()));
const nicheWords = (raw) => [
  ...new Set(
    (raw ?? '')
      .split(/[,/&+]|\band\b|\s-\s/i)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 1)
      .map((w) => tidy[w] ?? w),
  ),
];
const categoriesOf = (words) => [...new Set(words.flatMap((w) => Object.keys(wordsFor).filter((id) => wordsFor[id].test(w.toLowerCase()))))];
const tagDivisions = { Beauty: 'beauty', Family: 'family', Fashion: 'fashion', Gaming: 'gaming', Lifestyle: 'lifestyle', Travel: 'travel', Pet: 'pets', Creativity: 'creative', Art: 'creative', Sport: 'sport' };
const pickerDivisions = new Set(Object.values(tagDivisions));

// ---------- Country ----------
const countries = {
  uk: 'GB', 'united kingdom': 'GB', england: 'GB', scotland: 'GB', wales: 'GB', ni: 'GB', us: 'US', usa: 'US', 'u.s.': 'US', 'united states': 'US', canada: 'CA', can: 'CA', ca: 'CA', australia: 'AU', aus: 'AU', au: 'AU', jamaica: 'JM',
  germany: 'DE', ger: 'DE', netherlands: 'NL', nl: 'NL', philippines: 'PH', ph: 'PH', italy: 'IT', ita: 'IT', sweden: 'SE', denmark: 'DK', spain: 'ES', 'south africa': 'ZA', uae: 'AE', 'united arab emirates': 'AE', dubai: 'AE',
  finland: 'FI', india: 'IN', portugal: 'PT', bali: 'ID', indonesia: 'ID', bulgaria: 'BG', 'south korea': 'KR', ireland: 'IE', ire: 'IE', nz: 'NZ', 'new zealand': 'NZ', fr: 'FR', france: 'FR', singapore: 'SG', thailand: 'TH', romania: 'RO',
  moldova: 'MD', 'czech republic': 'CZ', prague: 'CZ', austria: 'AT', vietnam: 'VN', norway: 'NO', belgium: 'BE', poland: 'PL', greece: 'GR', turkey: 'TR', mexico: 'MX', brazil: 'BR', japan: 'JP', switzerland: 'CH',
};
const unknownCountries = new Set();
const countryOf = (raw) => {
  const text = (raw ?? '').toLowerCase().replace(/^from\s+/, '').trim();
  if (!text) return null;
  const code = countries[text] ?? countries[text.split(/[/,]/)[0].trim()];
  if (!code) unknownCountries.add(raw);
  return code ?? null;
};

// ---------- Foam ----------
const FIGURE = /\d|follower|subscriber|\bviews\b|\bmillion\b/i;
const FILLER = /unlock|elevate|seamless|cutting-edge/i;
const cleanBio = (bio) =>
  (bio ?? '')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s && !FIGURE.test(s) && !FILLER.test(s))
    .join(' ');
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k` : String(n));
const foam = foamFile ? JSON.parse(fs.readFileSync(foamFile, 'utf8')).filter((m) => m.visible !== false) : [];
const foamBy = new Map();
for (const m of foam) {
  for (const p of ['instagram', 'tiktok', 'youtube']) {
    for (const h of [m[p]?.handle, handleIn(m[p]?.link)]) if (h && !foamBy.has(norm(h))) foamBy.set(norm(h), m);
  }
  if (m.slug && !foamBy.has(norm(m.slug))) foamBy.set(norm(m.slug), m);
}

// ---------- The site's files as they are ----------
const read = (id) => {
  const raw = fs.readFileSync(path.join(dir, `${id}.md`), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return { data: YAML.parse(m[1]), body: m[2] };
};
const ids = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
const onSite = new Map();
for (const id of ids) {
  const { data } = read(id);
  for (const k of [id, ...Object.values(data.platforms ?? {}).map(handleIn), data.handle]) if (k && !onSite.has(norm(k))) onSite.set(norm(k), id);
}

// ---------- The sheet: one entry per creator ----------
// Only the same handle makes the same creator. Two rows can share a link by mistake, so a link belongs to
// the row whose handle it is, or else the first row with it; the other row loses it and gets reported.
const seen = new Map();
const rows = JSON.parse(fs.readFileSync(sheetFile, 'utf8'));
let duplicates = 0;
for (const r of rows) {
  const known = seen.get(norm(r.handle));
  if (known) {
    duplicates++;
    for (const f of ['instagram', 'tiktok', 'youtube', 'niche', 'country']) known[f] ||= r[f];
  } else seen.set(norm(r.handle), { ...r });
}
const LINKS = ['instagram', 'tiktok', 'youtube'];
const linkOwner = new Map();
const linkClashes = [];
for (const r of seen.values()) {
  for (const p of LINKS) {
    const k = norm(handleIn(r[p]));
    if (!k) continue;
    const owner = seen.has(k) ? seen.get(k) : (linkOwner.get(k) ?? r);
    linkOwner.set(k, owner);
    if (owner !== r) {
      linkClashes.push(`${r.handle}: its ${p} link is ${owner.handle}'s`);
      r[p] = '';
    }
  }
}
for (const r of seen.values()) r.keys = [norm(r.handle), ...LINKS.map((p) => norm(handleIn(r[p])))].filter(Boolean);
const creators = [...seen.values()].map((r) => {
  const f = r.keys.map((k) => foamBy.get(k)).find(Boolean) ?? null;
  const biggest = f ? ['instagram', 'tiktok', 'youtube'].map((p) => ({ p, ...f[p] })).filter((x) => x.followers > 0).sort((a, b) => b.followers - a.followers)[0] : null;
  return { r, f, biggest, reach: biggest?.followers ?? 0 };
});
creators.sort((a, b) => Number(!!b.f?.avatar) - Number(!!a.f?.avatar) || b.reach - a.reach);

const counts = { created: 0, updated: 0, withBio: 0, withPhoto: 0, withCountry: 0 };
const signedIds = new Set();
const usedIds = new Set(ids);
const out = [];
creators.forEach(({ r, f, biggest }, i) => {
  const existing = r.keys.map((k) => onSite.get(k)).find(Boolean);
  let id = existing;
  if (!id) {
    const base = r.handle.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `creator-${i}`;
    id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
  }
  signedIds.add(id);
  const old = existing ? read(existing) : { data: {}, body: '' };
  // Foam's name without emoji and symbols; the handle if that leaves nothing to call them.
  const foamName = (f?.name ?? '').replace(/[^\p{L}\p{M}\p{N} .'’-]/gu, '').replace(/\s+/g, ' ').trim();
  const name = /\p{L}.*\p{L}/u.test(foamName) ? foamName : r.handle.replace(/^@/, '').trim();
  const fromSheet = nicheWords(r.niche);
  const words = fromSheet.length ? fromSheet : (f?.tags ?? []).map((t) => t.toLowerCase());
  const categories = categoriesOf(words.length ? words : []);
  // Speakers and Podcasts are set by hand on the site (the sheet has no word for them): an import keeps them.
  const byHand = (old.data.divisions ?? []).filter((d) => d === 'speakers' || d === 'podcasts');
  const divisions = [...new Set([...categories.filter((c) => pickerDivisions.has(c)), ...(f?.tags ?? []).map((t) => tagDivisions[t]).filter(Boolean), ...byHand])];
  const platforms = { ...old.data.platforms };
  for (const p of ['instagram', 'tiktok', 'youtube']) {
    const link = urlOf(r[p]) ?? urlOf(f?.[p]?.link);
    if (link) platforms[p] = link;
  }
  const portrait = old.data.portrait ?? (f?.avatar ? { src: f.avatar, alt: `Portrait of ${name}` } : null);
  const country = countryOf(r.country) ?? old.data.country ?? null;
  const bio = cleanBio(f?.name?.trim() && f.name.trim() !== name ? f.bio.split(f.name.trim()).join(name) : f?.bio);
  const body = bio ? `<p>${bio.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>\n` : old.body;
  const data = {
    ...old.data,
    name: existing && !f ? old.data.name : name,
    handle: r.handle.replace(/^@/, '').trim().replace(/\s+/g, ''),
    portrait,
    mainCategory: categories[0] ?? 'other',
    categories: categories.slice(1),
    categoryStatus: 'proposed',
    legacyCategory: old.data.legacyCategory ?? null,
    niche: words.slice(0, 3).map(titled).join(', ') || null,
    divisions,
    country,
    platforms,
    relationship: 'managed',
    audience: biggest
      ? { figure: compact(biggest.followers), platform: { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' }[biggest.p], source: `Foam, updated ${String(biggest.updated ?? '').slice(0, 10)}`, status: 'unverified' }
      : (old.data.audience ?? null),
    order: i + 1,
    consent: old.data.consent?.status === 'confirmed' ? old.data.consent : { status: 'listed' },
  };
  counts[existing ? 'updated' : 'created']++;
  if (bio) counts.withBio++;
  if (portrait) counts.withPhoto++;
  if (country) counts.withCountry++;
  out.push({ id, data, body });
});

// Whoever the old site called managed but the sheet doesn't list isn't confirmed as signed.
const unconfirmed = ids.filter((id) => !signedIds.has(id) && read(id).data.relationship === 'managed');

if (write) {
  for (const { id, data, body } of out) fs.writeFileSync(path.join(dir, `${id}.md`), `---\n${YAML.stringify(data, { lineWidth: 0 }).trimEnd()}\n---\n${body}`);
  for (const id of unconfirmed) {
    const file = path.join(dir, `${id}.md`);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^relationship: managed/m, 'relationship: unconfirmed'));
  }
}
console.log(`${rows.length} rows, ${duplicates} repeated: ${creators.length} creators. ${counts.created} new, ${counts.updated} already on the site.`);
console.log(`${counts.withBio} with a description, ${counts.withPhoto} with a photo, ${counts.withCountry} with a country.`);
console.log(`${ids.length - counts.updated} on the site but not on the sheet (${unconfirmed.length} of them no longer shown as signed).`);
if (unknownCountries.size) console.log(`Countries not understood: ${[...unknownCountries].join(', ')}`);
if (linkClashes.length) console.log(`Links to check in the sheet:\n  ${linkClashes.join('\n  ')}`);
console.log(write ? 'Written. Run npm run build to validate.' : 'Nothing written. Add --write to write the files.');
