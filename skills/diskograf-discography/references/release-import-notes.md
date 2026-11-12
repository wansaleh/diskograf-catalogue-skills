# Release import notes

Field notes from earlier album and EP imports. Read them with section 4 of `SKILL.md`.

## Before you write

- Run `search_albums` for every planned release first. Many already exist.
- Read one recent album with `get_album` and one song with `get_song`. Copy their genres, labels and `data` fields.
- Build the release list from Apple, Spotify, Wikipedia, Discogs and 45cat for 1970s EPs. Leave out compilations and reissues. Work oldest first.

## Tracklists and links

- Apple track order: `https://itunes.apple.com/lookup?id=<collectionId>&entity=song&country=MY`.
- Apple artist releases: `https://itunes.apple.com/lookup?id=<artistId>&entity=album&limit=200&country=MY`.
- Cross-check with the Spotify album and the YouTube Music `OLAK5uy_` playlist.
- `suggest_album_links` works only for albums that already exist.

## YouTube video

- Prefer the artist's Topic upload ("Provided to YouTube by ...") whose description names this release.
- `prepare_song` with the Apple or Spotify link returns candidates. `youtube_artist_songs` is free.
- Never guess a video id.

## Reuse or create

- Reuse a song only for the same recording: same Apple track, Spotify track or YouTube id.
- Same titles are often compilations, covers or re-recordings. Create a new song for those.
- A 1970s original of a song later re-recorded is a new song. Do not reuse the later recording.
- Compilation tracks of the same recording: reuse when the Apple duration matches within about 1 second.

## Album type

- `ep` for 4 to 6 tracks. `album` for 8 or more.
- Wikipedia and Discogs wording beats Apple's type.
- Many 1970s EPs have no YouTube Music playlist. Leave the link empty and say so.

## Write order

1. `create_song` per missing track. Search again before each create.
2. `publish_songs` for the batch.
3. `create_album_with_songs` in Apple order.
4. `set_album_artists`, `set_album_labels`, `update_album` links, `set_artwork` with the Apple 1200x1200 image.
5. `set_album_status` published, then `get_album`.

- Writers: credit only an exact single `search_artists` match. Skip "Traditional", "Unknown" and surname-only names.
- Labels: read the ℗ line in the Topic description.
- Song `data`: Spotify track link, Apple track link with `?i=`, and the three artwork sizes.
- Do not change existing songs during an import. List fix candidates in the report.

## Checking the result

- `https://api.diskograf.com/v1/albums/<id>` shows title, type, track count, artwork and links.
- That payload has no labels or status. A release that appears there is published.
- Receipts with `mirror_edge: failed` are routine. Never repeat a write to retry a cache purge. Tell a developer if pages stay stale after 5 minutes.
- Large batches: split songs across at most 4 agents. Give each its own batch file and output folder.
