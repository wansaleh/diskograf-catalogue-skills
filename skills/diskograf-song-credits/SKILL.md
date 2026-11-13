---
name: diskograf-song-credits
description: Complete the credits of an existing Diskograf song from Spotify credits (through the Yab browser), the YouTube description and Apple Music. Use when asked to complete, fill, fix or check a song's credits, composer, lyricist, producer, musicians or backing vocals.
---

> **First:** read the internal notes of every item before you edit it. See "Internal notes" below.

# Diskograf song credits

Work through the `diskograf` MCP tools. Every write tool is a dry run until `confirm: true`.
Spotify gives the best credits, with instruments and backing vocals. It needs a signed-in browser. Use Yab (`yab-browser` tools), where the user is signed in to Spotify.

## 1. Read the song

1. `get_song` with `song_id`. Note:
   - the current `artists` list, as artist id and role id pairs;
   - `data.spotify` and `data.applemusic`;
   - `youtube_data.description`.
2. `get_song` may return no Spotify link. Then find it with `suggest_streaming_links`, or with `prepare_song` on the YouTube link.

## 2. Collect credits

Use the sources in this order. Stop when the credits are complete.

1. **Spotify, through Yab.**
   1. `open` the track URL in an agent tab. Close the cookie dialog if present.
   2. Run this with `eval`. It returns only the credits text:

```js
const sleep=t=>new Promise(r=>setTimeout(r,t));let b;
for(let i=0;i<25&&!b;i++){await sleep(400);b=document.querySelector('button[aria-label^="More options for"]');}
b.click();await sleep(800);
[...document.querySelectorAll('[role=menuitem]')].find(x=>x.textContent.includes('View credits')).click();
for(let i=0;i<20;i++){await sleep(400);const t=document.body.innerText;const k=t.lastIndexOf('\nCredits\n');
if(k>=0&&t.indexOf('Report error',k)>0)return t.slice(k,t.indexOf('Report error',k));}
return 'timeout';
```

   3. For more songs, `navigate` the same tab and run the script again.
   4. `close` the tab when you finish the track. Do not leave it open.
   5. If it returns `timeout` twice, take one `snapshot`. Then report the problem to the user. Do not retry in a loop.
2. **YouTube description.** It is in `youtube_data.description`. An official MV description often lists composer, lyricist, producer, MV director and label. A "Provided to YouTube by" description lists `Musician:` names without instruments.
3. **Apple Music.** Checked 2026-11-06 in Yab, signed out: the web song page shows no credits. Do not rely on it. Use it for dates and track order.

## 3. Map roles

Get the role ids with `list_roles`.

| Spotify or description | Role id |
|---|---|
| Main Artist, Vocalist, Lead Vocalist | 15 Lead Performer, only when already a lead |
| Composer, Author, Songwriter | 2 Composer |
| Lyricist, Author | 3 Lyricist |
| Producer, Studio Producer | 1 Producer |
| Arranger, Recording Arranger | 17 Arranger |
| Mixing Engineer | 4 |
| Mastering Engineer | 5 |
| Recording Engineer | 6 |
| Background Vocalist, Mixed Background Vocalist, Choir | 20 Backing Vocals |
| Guitar of any kind, Oud, Gambus, Ukulele | 8 Guitars |
| Bass | 9 |
| Piano, Keyboards, Synthesizer | 7 Keys/Synths |
| Drums | 10 |
| Violin, Viola, Cello | 11 Strings |
| Flute, Wood Flute | 12 Woodwinds |
| Trumpet, Saxophone | 16 Brass/Horns |
| Percussion Instrument | 13 Percussions |
| Other instrument | 14 Other Sessionist |
| MV Director | 23 Music Video |

"Author" alone means composer and lyricist.

## 4. Resolve artists

1. `search_artists` for each name.
   - One clear match: use its id.
   - Several matches: do not guess. Check the other credits and the era. Ask the user when it is still unclear.
   - No match: `create_artist` once. Then use the new id in every role.
2. The two sources may disagree on one name while the counts match. Then it is the same person. Example: YouTube "Azim" and Spotify "JIM BO". Create the Spotify name and add the other name with `update_artist` `add_aliases`.
3. Do not credit companies as people, for example "<Name> Production House". The Spotify "Sources" line is the label, not a person.
4. Ask the user before you set gender. Never infer gender from a name.

## 5. Save

1. `update_song` replaces the whole `artists` list. Send every existing credit plus the new credits. Keep `order` on lead performers.
2. Run the dry run first. Check that no existing credit disappears. Then confirm.
3. A label missing from the song: `search_labels`, then set `labels`. Skip it when no label matches.

## 6. Lyrics (only when asked, or when the song has none)

1. `get_song` first. A song with lyrics keeps them unless the user asks to replace them. Skip instrumentals.
2. Sources, in order: the YouTube description (some labels paste full lyrics), a lyrics site or Spotify through Yab, then `find_lyrics` (super token only, writes nothing). Never write lyrics from memory or guess a line.
3. Check that the text matches the recording. A remake or live version can have other words.
4. `update_song` with `lyrics` and the dry run. MCP cleans the text like the Backstage field: section headings become `[Verse 1]`, web debris and URLs go, ALL CAPS is recased. The dry run shows `lyrics_cleanup` when it changed anything.
5. Text over 5,000 characters after cleanup fails with an error. Nothing is cut. Ask the user before you shorten it.
6. Send `lyrics` alone. Credits stay as they are when you omit `artists`.

## Report

For each song, list the new credits by role with artist ids. Also list:

- songs where you added lyrics, with the source;
- new artists you created;
- matches you made by name only, which the user should check;
- names you skipped and the reason.

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
