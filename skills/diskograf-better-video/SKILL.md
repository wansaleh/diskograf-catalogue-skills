---
name: diskograf-better-video
description: Replace a Diskograf song's YouTube video with a better official version, such as a fan upload or Topic audio swapped for the official music video. Use when asked to update, upgrade, swap or fix a song's YouTube video, find the official MV, or clean up fan and unclassified videos.
---

> **First:** read the internal notes of every item before you edit it. See "Internal notes" below.

# Diskograf better video

Work through the `diskograf` MCP tools. Every write tool is a dry run until `confirm: true`.

## Video ranking

Better to worse:

1. `official_mv`
2. `official_visualizer`, `official_lyric`
3. `official_audio`, which includes Topic channel uploads
4. `fan_video` and unclassified videos

`live` and `cover` are different versions of the song, not better videos. Never swap them onto the studio song. Add them as their own songs, and link them with `add_song_versions`.

## 1. Find songs to fix

- For one song: `get_song`, then read `data.videoClass.class` and `youtube_data`.
- For a sweep: `audit_video_quality` lists fan videos and unclassified videos. Page with `cursor`.
- For songs without a class: `classify_song_videos`. It is super-admin only, and uses no YouTube quota.

## 2. Get a candidate

1. `official_mv_suggestion` with `song_id`. It uses the free scraper search. Verdicts are cached for 24 hours.
2. Check the candidate before you swap:
   - The channel is the artist's channel, a VEVO channel or the label's channel.
   - The title names the same song and artist.
   - The video is not live, a cover, a remix, a "sped up" edit or karaoke.
   - The length is close to the current video or the Spotify duration. An MV can be a little longer because of an intro.
3. No suggestion, or a wrong one? Search YouTube yourself, for example with `youtube_artist_songs` or a web search.

## 3. Swap

- **Suggested video:** `set_official_mv` with `song_id` and `video_id`. Run the dry run, then confirm. It accepts only the cached suggestion. It fails if another live song already uses the video.
- **Video you found yourself:** `update_song` with `youtube_id`. Run the dry run, then confirm. This sends the new video to the classifier.
- After the swap, check that `video_classified` is true, or that `data.videoClass.class` is the expected class.

## 4. Keep

- Keep the store links and artwork. Artwork comes from Spotify or Apple Music, not from the video.
- The old video is gone from the song. If the old video was a real live or cover performance, add it as its own song.
- `refresh_youtube` costs 1 YouTube quota unit. Use it only when the stored snapshot is wrong.

## Lost songs re-audit

A song flagged lost (`set_song_lost`) has no public video. Recheck lost songs from time to time:

1. List lost songs with `search_songs` and the lost quality filter.
2. For each, search YouTube for an official upload, a label channel upload, or a public cover. A cover goes on as its own song, not as the lost song's video.
3. If an official video now exists, set it with `update_song` and clear the lost flag.
4. A lost song must not keep Spotify or Apple Music links that point to a different recording. Check each link's title, artist and duration. Remove wrong links with `clear`; keep correct ones.
5. Keep songs held for a public cover as "lost candidates" until a cover exists. Do not mark them lost early.
6. Report per song: id, old state, new state, sources.

## Report

List each song id and title with the old video id, the old class, the new video id and the new class. Also list skipped songs and the reason.

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
