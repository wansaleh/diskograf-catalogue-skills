---
name: diskograf-release-scan
description: "Scan YouTube, Spotify and Apple Music for new Malaysian music releases, compile the songs missing from the Diskograf catalogue, and add them as drafts with credits through the song add flow, then publish on approval. Use for \"scan new releases\", \"what's new this week\", \"new music Friday\"."
---

# Diskograf release scan

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
Read skill `diskograf-new-releases` first and follow its steps 2 to 4 per song:

1. Read `internal_notes` of the matched artists.
2. `prepare_song` with the YouTube link. Use its `youtube_candidates` when the row has no YouTube id.
3. Fill missing Spotify or Apple links with `suggest_streaming_links`. Every song needs both.
4. Credits from the YouTube description, then Spotify credits in Yab.
5. Release date from the store, not the YouTube upload.
6. `create_song` dry run; fix `ambiguous_artist`; then `confirm: true`. Songs stay drafts.
7. `version of <id>` rows: `add_song_versions` after create, dry run then confirm.
8. Label with `update_song` `labels`.
9. `append_internal_note` on each new song.
10. Record the new song id in the compile file. On failure record the error and continue.

Avoid parallel `get_song` calls (rate limit 429).

## 9. Publish

- Show the drafts and ask once for approval. Then `publish_songs` all approved ids with `confirm: true`.
- Report `cache.web_pages` failures.

## 10. Report

- Added: id, title, artist, credits count, label.
- Skipped: title and reason.
- New artist ids created.
- Times in MYT.
