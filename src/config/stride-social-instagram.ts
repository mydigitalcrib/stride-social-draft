// Stride Social's own case-study reels on Instagram (instagram.com/stridesociall/reels), for Stride Advertising's Featured
// Work (/social, social/SocialMenu.astro, the first eight; first chosen for its feed, the owner, 2026-11-18: "use the case studies here as videos ... only use case studies ...
// use the most relevant brands"). Twenty of the account's brand case studies (its other reels are tips and trends),
// ordered by how well known the brand is, the same creator never twice in a row. Each played whole on the site:
// public/assets/video/stridesociall-reel-<code>.mp4, its first frame as poster (-first.jpg) and its Instagram cover
// ("case study: <brand>", stridesociall-reel-<code>.jpg). `title` and `text` are its caption as posted, without the
// hashtags (read 2026-11-18; a caption with no opening line has the client's name as its title); `creator` and `client`
// as the caption names them.

export const strideSocialInstagram = {
  handle: 'stridesociall',
  href: 'https://www.instagram.com/stridesociall/',
  reels: [
    { code: 'DMNUhmzIgi2', creator: '@owenreeman', client: 'McDonald’s', title: '@owenreeman x @mcdonalds ✨', text: 'We partnered up with our client McDonald’s and our amazing creator Owen to produce this great piece of content✨' },
    { code: 'DL2JV8uo-_i', creator: '@tomiwatp', client: 'Coca-Cola', title: '@tomiwatp x Coke ✨', text: 'We partnered up with our client coke and our amazing creator Tomiwa to produce this great piece of content✨' },
    { code: 'DKzMnP9IMWh', creator: '@spencer.sebastian.yang', client: 'Opera', title: '@spencer.sebastian.yang x OPERA📈', text: 'We partnered up with our client OPERA and our amazing creator Spencer to produce this great piece of content📈' },
    { code: 'DNX_iB_IdgK', creator: '@thesliceofjess', client: 'Temu', title: '@thesliceofjess x Temu ✨', text: 'We partnered up with our client Temu and our amazing creator Jess to produce this great piece of content✨' },
    { code: 'DIlk79voZ3U', creator: 'Eden Faith', client: 'MUBI', title: 'MUBI', text: 'We partnered up with our client MUBI and our amazing creator Eden Faith to produce this great piece of content ✨' },
    { code: 'DKjv8O8ovst', creator: '@spencer.sebastian.yang', client: 'Megalopolis', title: '@spencer.sebastian.yang x Megalapolis📖', text: 'We partnered up with our client Megalapolis and our amazing creator Spencer to produce this great piece of content📖' },
    { code: 'DBs7OpCxag3', creator: 'radoslavbali', client: 'Nebula by Anker', title: 'radoslavbali x nebula_byanker', text: 'We partnered up with our client Anker and our amazing creator Rad to produce this great piece of content' },
    { code: 'DRjyKlLCCSZ', creator: '@ninamaureengaly', client: 'SKIN1004', title: '@ninamaureengaly × SKIN1004✨', text: 'We partnered up with our client Skin1004 and our amazing creators to produce this great piece of content✨' },
    { code: 'DRCT4sLiIxv', creator: '@misfitmommyy', client: 'Dreame', title: '@misfitmommyy × Dreame', text: 'We partnered up with our client Dreame and our amazing creators to produce this great piece of content✨' },
    { code: 'DMxcLDwI1iL', creator: '@jackmjchalmers', client: 'Block Blast', title: '@jackmjchalmers x Block Blast 💥', text: 'We partnered up with our client Block Blast and our amazing creator @jackmjchalmers to produce this great piece of content ✨' },
    { code: 'DNncWu9okP9', creator: '@thesliceofjess', client: 'Cosori', title: '@thesliceofjess x Cosori ✨', text: 'We partnered up with our client Cosori and our amazing creator Jess to produce this great piece of content✨' },
    { code: 'DI1FLSgIMN9', creator: '', client: 'Ecovacs', title: 'Ecovacs', text: 'We partnered up with our client Ecovacs and our amazing creator to produce this great piece of content☀️' },
    { code: 'DGfoB-OouUA', creator: '@techdropp', client: 'EZVIZ', title: '@techdropp X EZVIZ 🧼🫧', text: 'Our Talent partnered up with EZVIZ for this global campaign🫧' },
    { code: 'DJbpmN8Ip__', creator: '@jodiedyerofficial', client: 'Printful', title: '@jodiedyerofficial x Printful☀️', text: 'We partnered up with our client Printful and our amazing creator Jodie to produce this great piece of content☀️' },
    { code: 'DHdNiXaIJgN', creator: '@im.myat', client: 'Gauth', title: '@im.myat X @gauthofficial 📖☕️', text: 'Our Talent Mya partnered up with Gauth for this global campaign 📖' },
    { code: 'DMh63EAob7d', creator: '@spencer.sebastian.yang', client: 'Talkie AI', title: '@spencer.sebastian.yang x Talkie AI✨', text: 'We partnered up with our client Talkie AI and our amazing creator Spencer to produce this great piece of content✨' },
    { code: 'DJT7QZvohFD', creator: 'Nina', client: 'Printify', title: 'Nina x Printify☀️', text: 'We partnered up with our client Printify and our amazing creator Nina to produce this great piece of content☀️' },
    { code: 'DBNqTDKRWyH', creator: '@thefellasinsta', client: 'TrainPal', title: '@thefellasinsta X @Trainpal', text: '' },
    { code: 'DQEgxWriEeV', creator: '@tayandalexx', client: 'Saily', title: '@tayandalexx × Sailyworld ✨', text: 'We partnered up with our client Sailyworld and our amazing creators to produce this great piece of content☀️' },
    { code: 'DHsqS6mocUR', creator: '@jodielynnofficial', client: 'Ulike', title: '@jodielynnofficial x ULIKE 🕺', text: 'We partnered up with our client ULIKE and our amazing creator Jodie to produce this great piece of content📢' },
  ] as { code: string; creator: string; client: string; title: string; text: string }[],
};
