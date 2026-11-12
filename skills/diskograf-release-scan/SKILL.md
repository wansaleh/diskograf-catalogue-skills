---
name: diskograf-release-scan
description: "Scan YouTube, Spotify and Apple Music for new Malaysian music releases, compile the songs missing from the Diskograf catalogue, and add them as drafts with credits through the song add flow, then publish on approval. Use for \"scan new releases\", \"add new releases\", \"look for new Malaysian music\", \"what's new this week\", \"new music Friday\"."
---

# Diskograf release scan

> **First:** read the internal notes of every item before you edit it. See "Internal notes" at the end.

Scan, compile, then add. Steps 1 to 6 are read-only. Step 8 writes draft songs. Step 9 publishes only after user approval.

ETA: scan about 10 minutes for a 7-day window; add about 2 minutes per song. Time-box each source to 4 minutes; use partial results.

## 0. Set the window

- Default window: last 7 days, MYT (UTC+8). Friday is the main release day.
- Record `from` and `to` as YYYY-MM-DD.

## 1. Discovery queue first (all three stores, 1 call)

1. `list_song_discovery` `view: "pending"`. Daily runs already merge Spotify, Apple and YouTube.
2. Keep rows with `catalogue: null` and release date inside the window.
3. Also check `view: "low"` for Malaysian artists the scorer missed.

## 2. Apple Music (no auth)

- Watched artists: for each Apple artist id stored on active catalogue artists, call
  `curl -s "https://itunes.apple.com/lookup?id=<artistId>&entity=song&country=my&sort=recent&limit=20"`.
  Keep `releaseDate` inside the window.
- Active artists: `search_songs` with `released_from` = 180 days ago, collect their lead artist ids, then read `data.applemusic` artist links via `get_artist`.
- Chart sweep: `curl -sL https://rss.applemarketingtools.com/api/v2/my/music/most-played/100/songs.json`. Mostly foreign; keep Malaysian artists only. (`new-releases` feed returns nothing for `my`.)
- Keyword sweep: `itunes.apple.com/search?term=<term>&country=my&entity=song&limit=50`; terms: `single`, `OST`, `raya`, `feat`. Filter by `releaseDate`. Results are noisy and include Indonesian acts.

## 3. Spotify (signed-in Yab browser)

Fetch tools do not load Spotify pages. Use `yab-browser` tools.

1. `open` the "New Music Friday Malaysia" playlist (search Spotify for it; save its id in the report).
2. Read rows with `eval` returning `document.body.innerText`, not a snapshot.
3. Also open "Fresh Finds Malaysia" and "Lagu Baru" editorial playlists when present.
4. Per row keep title, artist, track URL. `close` the tab after.

## 4. YouTube

- `youtube_artist_songs` for each active artist from step 2 (cached 24 h; free).
- `youtube_trending_candidates` for the stored Malaysia chart; keep new uploads.
- Drop vlogs, teasers, shorts, reaction, cover-by-fans, and lyric re-uploads by non-owners.

## 5. Malaysian filter

Keep a candidate when at least one is true:
- Artist already in catalogue (`search_artists` `keyword`).
- Label is Malaysian (`search_labels` matches the `℗` or Spotify source line).
- Malay/Malaysian-English title plus a Malaysian channel, label or press source.
Indonesian and Singaporean acts: drop unless the artist is already in the catalogue.

## 6. Dedupe

1. Merge rows across sources by normalized title + lead artist.
2. Check each against the catalogue: `search_songs` `keyword` = title, plus `artist_id`.
3. Mark `in_catalogue` with the song id, or `new`.
4. Remasters, sped-up, and acoustic versions are separate songs; flag them as versions.

## 7. Compile

Write the merged list to `/tmp/release-scan/<from>_<to>.json`, newest first. One row per song:
`{release_date, title, artists, youtube, spotify, applemusic, label, sources, status}`.

- Status: `new`, `in_catalogue <id>`, `version of <id>`, `unsure`.
- Show the user the table: | Release date | Title | Artist | Sources (YT/SP/AM) | Status |.
- `unsure` rows are not added; list them with the reason.

## 8. Add the songs

Run the add flow for every `new` and `version of` row. Do not stop to ask between rows.
Per song: read `internal_notes` of matched artists first (see Internal notes). Fill missing Spotify or Apple links with `suggest_streaming_links`; every song needs both. Use `prepare_song` `youtube_candidates` when the row has no YouTube id.

### 8a. Draft the song

1. `prepare_song` with the **YouTube link**. It returns `youtube_description`. Store links and album links do not.
2. Read credits from `youtube_description`. Common lines: `Composer`, `Lyricist`, `Producer`, `Arranger`, `Mix/Master`, `MV Director`, `℗ <label>`. Auto-generated "Provided to YouTube by" descriptions also list `Musician:` names without instruments.
3. Role ids (`list_roles`):
   - 15 Lead Performer, 2 Composer, 3 Lyricist, 1 Producer, 17 Arranger
   - 4 Mixing, 5 Mastering, 6 Recording, 20 Backing Vocals
   - 8 Guitars (also oud, gambus), 9 Bass, 7 Keys, 10 Drums, 11 Strings (violin, viola)
   - 12 Woodwinds (flute), 13 Percussions, 23 Music Video
4. Release date: use the store release date, not the YouTube upload date.
5. `create_song` dry run. Check `artists_resolved`:
   - `ambiguous_artist`: do not guess. Leave the credit out and confirm from another source.
   - A new name used in several roles: create it once with `create_artist`, then pass `artist_id`. This avoids duplicate artists.
   - A real name of a stage name (for example the channel "Priskila Oktaviani (ciloqciliq)"): credit the existing artist and add the real name with `update_artist` `add_aliases`.
6. Genres: keep `draft.genres` only when the artist history fits. Leave empty otherwise.
7. Confirm. Songs stay drafts.

### 8b. Complete credits from Spotify

The user's signed-in Spotify is in Yab (`yab-browser` tools). Spotify credits are richer: instruments, backing vocals and the source label.

1. `open` the track URL in an agent tab. Close the cookie dialog if present.
2. Use `eval` to open credits and read them. This avoids large snapshots:

```js
const sleep=t=>new Promise(r=>setTimeout(r,t));let b;
for(let i=0;i<25&&!b;i++){await sleep(400);b=document.querySelector('button[aria-label^="More options for"]');}
b.click();await sleep(800);
[...document.querySelectorAll('[role=menuitem]')].find(x=>x.textContent.includes('View credits')).click();
for(let i=0;i<20;i++){await sleep(400);const t=document.body.innerText;const k=t.lastIndexOf('\nCredits\n');
if(k>=0&&t.indexOf('Report error',k)>0)return t.slice(k,t.indexOf('Report error',k));}
return 'timeout';
```

3. For the next song, `navigate` the same tab and run the script again. `close` the tab at the end.
4. Compare the two lists. When one name differs and the counts match, it is the same person. Example: YouTube "Azim" was Spotify "JIM BO". Create the Spotify name and add the other name as an alias.
5. Resolve names with `search_artists`. Create the rest with `create_artist`.
6. `update_song` replaces the whole `artists` list. Always send the full list, including the existing credits.
7. Do not credit companies as people. Example: "MoneyDen Production House" as producer.

### 8c. Labels

1. Take the label from `℗` in the YouTube description, the Spotify "Sources" line, or a `lnk.to` link.
2. `search_labels` by a short keyword.
3. Set it with `update_song` `labels`. Skip when no label matches. Self-released songs have no label.

### 8d. Lyrics (optional)

1. Add lyrics only when the user asks. Skip instrumentals.
2. Use the YouTube description when it holds full lyrics. Otherwise follow "Lyrics" in `diskograf-song-credits`.
3. Pass `lyrics` to `create_song` or `update_song`. MCP cleans the text and rejects more than 5,000 characters.

### 8e. Finish each song

1. `version of <id>` rows: `add_song_versions` after create, dry run then confirm.
2. `append_internal_note` on each new song.
3. Record the new song id in the compile file. On failure record the error and continue.
4. Avoid parallel `get_song` calls (rate limit 429).

## 9. Publish

- Show the drafts and ask once for approval. Then `publish_songs` all approved ids with `confirm: true`.
- Check the `cache` result. When `web_pages` is `failed`, report it. The public pages can be stale.

## 10. Report

- Added: id, title, artist, credits count, label.
- Skipped: title and reason.
- New artist ids created.
- Times in MYT.

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
