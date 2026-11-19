---
name: diskograf-publish-review
description: Review pending (draft) Diskograf songs before publishing - check authenticity, credits, genres, labels, title spelling, artwork, links, versions and albums, then flag fixes and publish approved songs. Use when asked to review, approve, check or publish pending songs, or to clear the Backstage queue.
---

> **First:** read the internal notes of every item before you edit it. See `diskograf-catalogue`.

# Diskograf publish review

Work through the `diskograf` MCP tools. Every write tool is a dry run until `confirm: true`.
Do not publish until the user approves the list.

## 1. Load the queue

1. `list_pending_songs` with `limit: 50`. Page with `offset` until done.
2. `get_songs` with the ids, 50 at most per call, for credits, labels and YouTube data.
   - The output is large. Summarize it with a script; do not read it whole.

## 2. Check every song

1. **Authenticity**
   - No digital copy, no write. A store release or an official upload is required. A physical copy, a scan or a tracklist alone is not enough. Reject the record.
   - The YouTube channel belongs to the artist or label, or is a Topic channel.
   - The Spotify and Apple Music track artist is the same act. Same-name artists can merge on the stores.
   - The release date matches the store release, or the upload date when no store release exists.
   - Check for duplicates with `search_songs`.
2. **Credits**
   - Compare with Spotify credits, the YouTube description and Apple Music. See `diskograf-song-credits`.
   - Lead and featured artists match the store "feat." credit.
   - Composer and lyricist are present when a source lists them.
   - Confirm any credit for the submitter against a source.
3. **Genres**
   - 1 to 3 fitting genres from `list_genres`. Leave empty when evidence is missing.
4. **Labels**
   - Set the label or distributor from the store copyright line, if one exists.
5. **Title**
   - Use the Spotify or Apple Music title exactly, including stylized case.
   - With no store title, use normal title case.
   - Remove "Official Music Video", "feat. X" and other YouTube suffixes.
   - Keep real version tags, such as "(demo)" or "(Live Session ...)".
6. **Artwork**
   - Order: Spotify, then Apple Music, then the YouTube thumbnail.
   - Set `artwork`, `artworkMedium` and `artworkThumb`, all on the Diskograf CDN.
   - The image must belong to this release. Two unrelated songs with the same artwork hash is a red flag.
   - After a change, run `refresh_artwork_colors`.
7. **Links and video**
   - YouTube, Spotify and Apple Music links are set where they exist.
   - `videoClass` is set and correct.
8. **Versions and albums**
   - A cover or remake links to its original with version type Remake.
   - Songs from one store album are linked to that album.

## 3. Report

Group the songs:

- **Must fix**: wrong data, or missing artwork, title cleanup, featured artist or version link.
- **Check**: gaps that need a source, such as labels, thin credits, title case or albums.
- **Clean**: ready to publish.

Give the song id and title with each flag. Change nothing in this step.

## 4. Fix and publish

1. Fix only what the user approves. Run each dry run, show it, then repeat with `confirm: true`.
2. `publish_songs` with the approved ids. Run the dry run, then confirm.
3. Report the published ids and anything still open.
