# Importing the roster

The roster comes from Stride's Excel sheet (the "Exclusive Roster"), with descriptions and photos from Foam where a creator is on both. Everyone on the sheet shows as **Signed**.

**Keep the sheet and the Foam data outside this repository.** The repository is private now, but the Foam share link's data includes managers' emails, so neither belongs in it, and the link isn't kept here either.

```bash
python scripts/roster/sheet-to-json.py "C:/path/to/roster.xlsx" "C:/somewhere/sheet.json"
npm run roster:import -- "C:/somewhere/sheet.json" "C:/somewhere/foam.json"           # shows what would change
npm run roster:import -- "C:/somewhere/sheet.json" "C:/somewhere/foam.json" --write   # writes src/content/roster/
```

The first step needs `pip install openpyxl`. It reads only the handle, the three platform links, niche and country: never the talent manager, email set-up or Stride OS columns.

## What it does

- **Who's published:** new creators get consent status `listed`. They show in preview builds, not in production. Production needs `consent.status: confirmed`, which only Stride can give, per creator.
- **Follower figures:** stored from Foam as `unverified`, with the date, and not shown. Change a creator's `audience.status` to `verified` when Stride confirms the figure.
- **Descriptions:** Foam's, minus any sentence with a figure or follower count in it, or a word on the site's filler list. Treat them as draft until Stride approves them.
- **Niche and divisions:** niche is tidied from the sheet's words (Foam's tags if the sheet has none). Divisions are proposed from those and Foam's tags. Stride Speakers has none, because neither source names speakers.
- **Photos:** Foam's addresses, loaded from Foam's servers. Download copies into `public/assets/` before launch, or they stop working if Foam changes them.
- **Creators with no photo:** not shown at all. `src/lib/roster.ts` publishes a creator only with a `portrait` on the entry, so without one there is no card, no profile page and no link (the owner's call); set a portrait and they are back. (A photo that fails to load still gives way to the creator's drawn initial, `talent/CreatorCard.astro`.) Two stand-ins fill most of those Foam had no photo for, both the creator's own profile picture from the account on the sheet, so both need the creator's OK with the rest of the profile, and a real photo from Stride should replace them:
  - 27 whose YouTube channel is on the sheet: `portrait` points at that channel's picture, by address.
  - 64 whose Instagram is on the sheet: their Instagram profile picture, copied to `public/assets/roster/<entry>.jpg` (re-encoded, at most 800px), read with the owner's own signed-in Instagram at the owner's request. They are served by the live website: deploying publishes them.

  Still without a photo, so not shown (19): creators with no Instagram on the sheet, one handle that doesn't exist on Instagram (`kayla`: sailorquardian), and three legacy entries the owner chose to leave out (ariffathulhakim, julianassada, papachestyp; no picture is kept for them). Nothing was taken from TikTok or from a web search by name. The import writes `portrait` again from the sheet and Foam, so re-add or replace these after running it.
- **Stride Speakers:** set by hand, at the owner's word (2026-11-11): Jack Durkin (`jackdurkin2`, now named in full)
  and Tom Painter (`tpainterx`) are in `speakers` as well as `sport`, and Oli Christie (`oli-christie`) was added by
  hand, as signed (the owner's word), since he isn't on the sheet or on Foam. The import writes `divisions` and `name` again from the sheet, so
  put these back after running it; it leaves `oli-christie.md` alone.
- **Stride Podcasts:** five shows added by hand, at the owner's word (2026-11-11): Back Side, Building Wealth
  Without Borders, Attaché, Eggchasers Rugby and the Dodge Woodall Podcast (`back-side`,
  `building-wealth-without-borders`, `attache`, `eggchasers-rugby`, `dodge-woodall-podcast`). They come from Stride's
  podcast deck, which is marked strictly confidential: only which shows, and the YouTube link beside each, were
  taken from it; never its talent managers, its testimonials or its figures. Each show's name, channel and picture
  (the channel's own, by address) are as on YouTube. The deck says "not all podcasts on the right are signed to
  Stride", so all five are `unconfirmed` (no label) until the owner says which are signed and which are partners.
  The deck also names a brand deal for each: not on the site, since showing the brand needs its approval.
- **Not on the sheet:** left in place. Anyone the old site called managed changes to `unconfirmed`, so they no longer show as signed.
