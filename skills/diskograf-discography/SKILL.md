---
name: diskograf-discography
description: Complete one artist's discography in the Diskograf catalogue - find missing songs and albums on Spotify, Apple Music and YouTube, add them with credits, fix release dates and album tracklists, audit dates and dead videos, and log the result on the Notion "Diskograf discography completions" page. Use when asked to complete, fill, audit or finish an artist's discography, songs or albums, or to run many artists in parallel.
---

> **First:** read the internal notes of every item before you edit it. See "Internal notes" below.

# Diskograf discography completion

Read the `diskograf-catalogue` skill first. Work through the `diskograf` MCP tools. Every write tool is a dry run until `confirm: true`. Read the dry run before you confirm.
Give an ETA first. A large discography takes 1 to 3 hours per artist. Keep a short plan file in your working folder.

Related skills:

- `diskograf-release-scan`: draft one song with credits (step 8).
- `diskograf-song-credits`: Spotify credits through Yab.
- `diskograf-better-video`: official video swaps.
- `diskograf-artist-avatars`: artist images.

## 0. Pick the mode

- **Full completion**: sections 1 to 7. Use for "complete X's discography". Section 7 writes the log on the Notion page. The Notion page is the only log.
- **Many artists at once**: read section 8 first.
- **Date audit**: section 9. Use when dates look implausible.
- **Dead video audit**: section 10.
- **Follow-up on a logged artist**: read the artist's row in the log, then do only its listed gaps.

## 1. Read what exists

1. `search_artists`, then `get_artist`. Note the artist id, aliases, `is_group` and store links. Several artists share a name. Confirm the identity.
2. List every song: `search_songs` with `artist_id` and `role_id: 15`, both statuses. `limit` is at most 50. Page with `cursor`.
3. List albums: `search_albums` by artist. Use `get_album` for tracklists.
4. Find the artist's entries on the Notion log page. See "Notion log" in section 7. Do not repeat earlier work, and pick up its listed gaps.

## 2. Build the reference discography

Collect the release list in this order:

1. **Spotify artist discography**, through Yab: `open.spotify.com/artist/<id>/discography/all`. Read albums, EPs and singles with release dates and track lists. Read `og:image` from the HTML with `curl`, not from the Yab tab.
2. **Apple Music artist page**: albums and singles with dates.
3. **YouTube**: `youtube_artist_songs` lists the channel songs. It costs no quota. Old songs often exist only as fan uploads.
4. **Wikipedia, Wikidata, MusicBrainz and Discogs**: older albums, dates and tracklists. `compare_album_tracklist` checks these sources for one album.
5. Pre-2000 albums with no store release: use a collector scan, a newspaper advertisement or a label compilation tracklist (for example EMI Getaran Nostalgia). Write the source in the log.

Verify every claim before you write it. A research report from another model can contain errors.

### Browser research

- Use a real browser for the store pages. Yab is the suggested one (see the `yab-browser` skill). Plain `curl` and web search miss most store data.
- Spotify web has the best credits. Open the track, then "Show credits". It lists composer, lyricist, producer, arranger and featured artists. Sign in to Spotify in Yab first.
- Also use Spotify web for the full discography, album tracklists with durations, release dates and the artist's related releases.
- Apple Music web gives the album date, the track order, durations and the ℗ line. Checked on 2026-11-06 in Yab, signed out: song pages show no credits, and the track menu only offers Share, Copy Link and Copy Embed Code. Do not look for credits there. Use it for dates, order and links.
- **YouTube video descriptions are usually the first place to look for credits.** Read the description before Spotify. Labels and Topic uploads often list composer, lyricist, producer and arranger. `prepare_song` returns it as `youtube_description`. Use Spotify credits to fill what the description lacks. Where the two disagree, say so in the log.
- YouTube also shows the channel, the Topic upload and the ℗ year.
- Use the browser for Discogs, Wikipedia and label pages when search results are thin.
- Close the tabs when you are done.

### Cheaper models for research

- Send read-only research to a lower-cost model, for example DeepSeek flash, or a Sonnet 5.5 explorer. Do not use Haiku.
- One agent per artist, or per era for a large artist. Give it the artist id and the catalogue gaps from section 1.
- Tell it: read-only, no database writes, no repo edits, write the report to `/tmp/discog/<artist>-research.md`.
- Ask for a table: title, release, date, store links, credits, source URL. Ask it to mark each row verified or unverified.
- Treat the report as leads. The writer agent or the main agent re-checks every date, link and credit in a browser before any write.
- Keep the final writes and all judgment calls with the stronger model.

## 3. Find the gaps

Make one table with:

- missing songs;
- missing albums;
- songs with wrong release dates;
- albums with a wrong order or missing tracks;
- songs with the wrong recording (see section 4, step 7).

Match by title and duration, not by title only. Check `similar_songs` and versions: live, remix, acoustic and remake are separate songs. Show the table to the user before large writes, unless the user ordered unsupervised work.

## 4. Add songs

Album and EP imports: read `references/release-import-notes.md` first.

For each missing song:

1. `prepare_song` with the YouTube, Spotify or Apple link. It returns `youtube_description` for credits. A Spotify or Apple link costs no YouTube quota. Avoid `refresh_youtube`.
2. Every song needs a YouTube video id. Prefer the official video, then the Topic upload, then the best fan upload. A video id that is already used is refused (`youtube_id_taken`). Find the song that owns it.
3. Release date: use the Spotify or Apple Music single or album date. Do not use the YouTube upload date. Use year precision when only the year is known. Do not use a compilation placeholder such as 1989-01-01 as a real date.
4. Credits: lead performer role 15, composer 2, lyricist 3, producer 1, arranger 17. Use `list_roles`. The description first, then Spotify credits through Yab, as in `diskograf-song-credits`. Add composer and lyricist to every new song when a source confirms them.
5. A name that matches two artists returns `ambiguous_artist`. Pass `artist_id`. Two people with the same name are not the same person. Check before you reuse an id.
6. Before you create a new artist for a credit, `search_artists` for spelling variants. A past run created a duplicate "Mohamad Nasir". It could not be deleted for 48 hours.
7. Check the recording. A fan or compilation upload can be a different version. Compare the duration with Apple Music and the ℗ year in the description. If it differs, swap the video.
8. Set artwork from the release cover: Spotify (`i.scdn.co`) or Apple (`mzstatic.com`). YouTube thumbnail only as a fallback. See "Artwork" below.
9. `labels` takes objects: `{ "label_id": 1 }` or `{ "name": "X" }`, exactly one key each. Never bare ids or strings.
10. `create_song` dry run, check `similar_songs`, then confirm. Songs stay drafts.
11. A song that only exists on a compilation: use the original album date when a source confirms it.
12. Remakes and covers: `add_song_versions`, with `version_of` as objects. Set the original's link type to Remake.
13. Lyrics are optional. Add them only when the user asks. Follow "Lyrics" in `diskograf-song-credits`. `create_song` and `update_song` clean the text and reject more than 5,000 characters. Never write lyrics from memory.

### Artwork

- Artwork priority is always Spotify or Apple Music first, then YouTube. Use the YouTube thumbnail only as a fallback when no store cover exists.
- `set_artwork` fails with "HTTP 403" or "redirected". Pass the final HTTPS image URL. Resolve redirects with `curl -sIL`.
- Wikimedia and Discogs block hotlinking. Try Spotify, Apple, then a blog or Encyclopaedia Metallum scan. Say in the log when a cover is small or watermarked.
- `i.discogs.com` returns HTTP 403 to the `set_artwork` Worker, because Cloudflare blocks a request with no browser fingerprint. Do not fall back to a video thumbnail yet. Wrap the Discogs image in the wsrv.nl image proxy and pass that URL instead. It works as of 2026-11-10.
  - Get the image URL from `https://api.discogs.com/releases/<id>` or `https://api.discogs.com/masters/<id>` in `images[].uri`.
  - Percent-encode the whole URL and add the width and JPEG output, for example `https://wsrv.nl/?url=https%3A%2F%2Fi.discogs.com%2F...jpeg&w=800&output=jpg`.
  - `images.weserv.nl` is the same service and also works. Both return the image with permissive headers, so the Worker can fetch it.
  - Check the dry run: it reports `content_type: image/jpeg` and the byte size. A JSON body means the proxy refused the source.
  - Say in the log that the cover came through the proxy.
- An album needs artwork before it is published. The easiest source is the artwork of one of its member songs. Use a song cover only when no release cover exists, and say so in the log.

## 5. Albums

1. `search_albums` first. Duplicates are the most common error.
2. Every member song must exist and be published.
3. `create_album_with_songs` needs `title`, `album_type`, `released_at` and `song_ids`, in store order. An album holds at most 50 songs.
4. `set_album_artists`, `set_album_labels`, `suggest_album_links` then `update_album`, and `set_artwork` with the cover. Make sure the album has artwork before you publish it. Use the release cover first. If none exists, copy the artwork from one of its member songs.
5. For an existing album, `compare_album_tracklist` then `set_album_songs` with the full verified order. Add missing tracks first.
6. Skip live albums, compilations, remix albums and karaoke albums unless the user asks. Note each skip in the log.
7. A duet or joint album goes under the lead artist whose catalogue it fits. Do not create it twice.
8. A track with no video or no store release: add the album without it and list the gap.

## 6. Publish

Get the user's approval first, or use the standing approval of an unsupervised order. Then:

1. `publish_songs` for the new songs.
2. `set_album_status` for the new albums. Check each album has artwork first. If it has none, set one from a member song before publishing.
3. Check the `cache` result in each response. A `mirror_edge` failure is known and harmless when the other caches clear. A later write clears all three.

## 7. Profile and log

1. `update_artist`: both Spotify and Apple Music artist links, and socials only when verified. A social account that may belong to another person goes to the user as a question. Never save it. Never set gender.
2. Add the artist to the Notion log page under today's date, newest first. See "Notion log" below.
   - a table row with the artist, artist id, song ids added and album ids added;
   - a note with the remaining gaps: songs with no store release, missing videos, missing covers, skipped albums, possible duplicates, and dates left unchanged.
3. The Notion page is the only log. There is no repo log file. Do not create one.

### Notion log

Do this in the same run, before you report. Never report before the Notion page is written and checked.

1. Read the page first with the Notion fetch tool. Read the saved full output file, because the returned text is truncated. Note the exact shape of the newest section.
   - Page: "Diskograf discography completions", id `411713c9-e1f2-8123-873e-dd8fd8e1b924`, workspace Wan Saleh. Do not use any other page.
   - URL: `https://app.notion.com/p/411713c9e1f28123873edd8fd8e1b924`.
   - Existing sections as of 2026-11-07: "2026-11-07, run 3 (Naim Daniel, Salammusik, Mas Idayu, Elyana, Ical Mosh)" above "2026-11-07, run 2 (Noh Salleh, Uji Rashid, Hael Husaini, Megat Fazly, Guccimith)" above "2026-11-07". A date alone is run 1 of that date.
2. Add a new dated section at the top of the page. Use the same shape as the existing sections:
   - a date heading, with the run label and the artist names when the run has several artists;
   - one table per section, with the same columns as the existing tables;
   - notes under the table, with catalogue ids.
3. Keep newest first. Never reorder, edit or delete older sections.
4. Write with `notion-update-page`. Prepend the new section. Do not rewrite the whole page body.
5. Fetch the page again and confirm the new section landed at the top. Check the heading, the table rows and the notes.
6. If the Notion write or the check fails, say so in the report under **Blocked on me**. Give the error text and the page id. Do not report the run as complete.

## 8. Many artists at once

Use this only when the user asks to delegate or orchestrate.

1. **Research**: one read-only agent per artist on a lower-cost model, for example DeepSeek flash (see "Cheaper models for research"). It writes `/tmp/discog/<artist>-research.md`. It writes no database and no repo file. For a very large artist, split by era.
2. **Write**: one Sonnet 5.5 agent per artist, up to six at once. Each agent has its own artist, so no two agents touch one song or album.
3. The writer brief must contain:
   - the artist name and id;
   - the research file, with the warning that it can contain errors;
   - the read order: the `diskograf-catalogue` skill, then the Notion log page;
   - the rules in this skill: dry run first, search before create, role ids, version type Remake, no guessed link or credit, no merge, trash or delete;
   - the scope: studio albums, EPs, singles and lead collaborations;
   - the done condition: everything published, then re-read with `get_album` and `search_songs`;
   - "do not edit code, do not deploy";
   - the final report format: at most 25 lines, with ids, fixes, skips and gaps.
4. The main agent checks each report against the catalogue. Then it writes one Notion section for the whole run, as in section 7.
5. Merges, trashes and deletes stay with the main agent, and only on the user's request.
6. Search tools rate limit on the free tier. Retry later, or use another source.

### Next N top singers

For "next N top singers" or "do N more artists":

1. Read the Notion log page first. List every artist already logged.
2. Rank candidates with `artist_role_counts` or `catalogue_stats` by song count, singers only.
3. Drop artists already on the log, unless their entry lists open gaps the user asked to close.
4. Show the N picks with ids and the reason before writing. Then run section 7 per artist, or section 8 when delegation is asked.

## 9. Release date audit

1. Sort the artist's songs by suspicion. Tier 1: wrong by years, or dated at the YouTube upload. Tier 2: day or month unverified.
2. Take the date from Spotify or Apple Music, then Wikipedia, then a YouTube description.
3. Where only the year is known, set year precision. Do not invent a day.
4. If Spotify shows a 01-01 placeholder and Apple has a real date, use Apple.
5. Apply by tier. Show the user each tier before the next one, unless the order is unsupervised.
6. In the log, list the songs that stay unresolved, with the reason.

## 10. Dead video audit

1. Check every video id of the artist for availability. In the Wings and Search audits (2026-11-05), 1 dead video appeared in about 140 songs per artist.
2. For each dead video, find the Topic or official upload. Use `update_song` with the new id.
3. Run `refresh_youtube`. It costs 1 quota unit per song. Then set the video class by hand (`official_audio`, `official_lyric`). The classifier can keep the old class.
4. Log the count checked and each song fixed.

## Rules

- Search before you create.
- Never publish, trash, merge or delete without the user's request or a standing order that names it.
- A song must be unpublished before it can be trashed. Trash is restorable by a super user.
- A merge cannot be undone. Dry run it, show it, then confirm. Add the old spelling as a text alias on the survivor. Check that credits moved.
- The artist delete tool refuses artists younger than 48 hours. Write the earliest date in the log.
- Duplicate song rows are report-only. Remove one only on approval, and keep the one with more links and credits.
- Never infer artist gender. Ask the user.
- A wrong credit is worse than a missing credit. Leave unclear names out, and report them.
- Never copy release dates from YouTube upload dates.
- In the `execute` sandbox `globalThis` is missing and spread of async iterables fails. Use plain loops. Pass required ids to every `get_*` call.

## Report

Give the songs added, albums added, dates fixed and remaining gaps, with ids. The last line must confirm the Notion log section was written and read back. Without that line the run is not complete. Show times in MYT. Put **Blocked on me** first.

## Internal notes

Internal notes are the shared work log on each song, album, artist, and label. Use them on every item you touch.

1. **Read first.** Before you change an item, read `internal_notes` from `get_song`, `get_album`, `get_artist`, or `get_label`.
2. **Skip done work.** Do not repeat a step a note marks as done, unless the data has changed since that note.
3. **Continue open work.** Do the tasks that notes list as left, blocked, or unverified first.
4. **Fix, do not redo.** If a note is wrong or the data is now worse, fix the data. Then say so in your note.
5. **Report after.** When you finish with an item, call `append_internal_note` once. Use a dry run, then repeat with `confirm: true`.
   - `agent`: your short name, such as `claude-discography`.
   - `note`: 300 characters or fewer, one line. The tool adds the date.
   - Format: `did: <changes>; left: <open tasks or none>; source: <where you verified>`.
   - Example: `did: added Spotify and Apple links, 3 credits; left: lyricist unknown; source: Apple credits`.
6. **Note blockers too.** If you stop without changes, append why, such as `did: none; left: no store release found; source: Spotify, Apple, YouTube search`.
7. **Never put secrets, emails, or private user data in a note.** Admins see notes read-only in Backstage and can clear them.
