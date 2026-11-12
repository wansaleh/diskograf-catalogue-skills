---
name: diskograf-new-releases
description: Find new Malaysian song releases that are not in the Diskograf catalogue, add them as drafts with full credits from YouTube descriptions and Spotify credits, set labels, and publish. Use when asked to look for new Malaysian music, add new releases, fill song credits, or "check new music Friday".
---

> **First:** read the internal notes of every item before you edit it. See "Internal notes" below.

# Diskograf new releases intake

Work through the `diskograf` MCP tools. Every write tool is a dry run until `confirm: true`.

## 1. Find candidates (about 2 minutes)

1. `list_song_discovery` with `view: "pending"`. The daily discovery runs already scan Spotify, Apple Music and YouTube.
2. Keep rows with `catalogue: null`. Drop vlogs and non-music videos.
3. Optional: search "New Music Friday Malaysia" for extra names. Spotify pages do not load through fetch tools.
4. List the candidates to the user before adding anything.

## 2. Draft each song

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

## 3. Complete credits from Spotify

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

## 4. Labels

1. Take the label from `℗` in the YouTube description, the Spotify "Sources" line, or a `lnk.to` link.
2. `search_labels` by a short keyword.
3. Set it with `update_song` `labels`. Skip when no label matches. Self-released songs have no label.

## 5. Lyrics (optional)

1. Add lyrics only when the user asks. Skip instrumentals.
2. Use the YouTube description when it holds full lyrics. Otherwise follow "Lyrics" in `diskograf-song-credits`.
3. Pass `lyrics` to `create_song` or `update_song`. MCP cleans the text and rejects more than 5,000 characters.

## 6. Publish

1. Get the user's approval first.
2. `publish_songs` with all ids and `confirm: true`.
3. Check the `cache` result. When `web_pages` is `failed`, report it. The public pages can be stale.

## Report

Give each song id, title, new credits, new artist ids and skipped items. Show times in MYT.

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
