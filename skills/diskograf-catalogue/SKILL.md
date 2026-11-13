---
name: diskograf-catalogue
description: Core Diskograf catalogue guide - entities, credit roles, access levels, the admin MCP server, write rules, internal notes and every catalogue workflow (songs, artists, albums, labels, curated lists, artwork, versions, cleanup, undo). Read first for any diskograf.com catalogue task; the other diskograf-* skills build on it.
---

# Diskograf catalogue guide

Read this before any catalogue task on diskograf.com.
It covers what the site is, how to browse it, and how to edit the catalogue.

Last verified: 2026-11-10.

## Keep this file current

- This repository is the source of truth for Diskograf catalogue skills.
- Update this file when an MCP tool, a catalogue workflow, a public route, or a song `data` key changes.
- Update the "Last verified" date when you check the file against the live tools.

## 1. What Diskograf is

- Diskograf.com is a Malaysian music database.
- It links songs, artists, albums, labels, genres, credits, and curated lists.
- The site is in English and Bahasa Malaysia. Malay routes add `/ms`.
- The live site is `https://diskograf.com`. Edit only through it, Backstage, or the MCP server.

### Catalogue entities

| Entity | Key facts |
|---|---|
| Song | Needs an 11-character YouTube video ID. Has credits, genres, labels, lyrics, notes, provider links, and version links. Draft until published. |
| Artist | A person or group (`is_group`). Has aliases, profile dates, socials, avatar. Has a trash. Only `delete_empty_artists` and `empty_trash` delete permanently. |
| Album | Title, type, release date, ordered songs (max 50), artists, labels, artwork. Draft or published. |
| Label | Record label. Name, short name, former name (FKA), company, active or defunct, logo. |
| Genre | Small fixed list. Super users create and edit genres. |
| Role | Credit role, such as Lead Performer. Super users create and edit roles. |
| Curated list | Ordered songs or albums. Draft, published, or archived. Public or internal. |

### Credit roles

- Role ID 15 is Lead Performer. Every song needs at least one.
- Other common roles: 2 Composer, 3 Lyricist, 1 Producer, 17 Arranger.
- Engineering roles: 4 Mixing, 5 Mastering, 6 Recording.
- Read the full list with `list_roles`. Never guess a role ID.

### Access levels

- Visitor: reads published records.
- Registered member: submits songs and edits published songs. Edits are audited.
- Admin: publishes, manages albums, labels, lists, and version links.
- Super: merges, trash, restore, genres, roles, and privileged tools.
- Admin and super users see more tools. Ask a super user when a tool is refused.

## 2. How to browse

### Public pages

| Route | Content |
|---|---|
| `/songs` | Song browse. Filters: genre, gender, release range. Sort: date, title, views. |
| `/artists` | Artist browse. Filters: claimed, band or solo, gender, roles, genres, albums. |
| `/albums` | Album browse. |
| `/labels` | Label browse. |
| `/genres` | Genres with published songs. |
| `/contributors` | Member directory. |
| `/top/songs`, `/top/artists`, `/top/labels` | Current charts. Full results need sign-in. |
| `/top/history/all`, `/top/history/year/[year]` | Historical charts. |
| `/song/[id]-[slug]` | One song. |
| `/artist/[artist]` | One artist. Add `?view=albums` for albums. |
| `/album/[albumId]` | One album. |
| `/label/[label]` | One label. Add `?view=albums` for albums. |
| `/genre/[genre]` | One genre. |
| `/lists/[listId]` | One curated list. No `/lists` index exists. |
| `/@username` | Member profile. Claimed artists redirect here. |
| `/tools/artwork-finder` | Apple Music and Spotify artwork search. |

- Press `/` on the site for global search.
- Search tokens: `artist:`, `label:`, `genre:`, `year:`, `decade:`, quoted phrases.
- Scopes: `s:` songs, `a:` artists, `al:` albums.
- Browse URLs: sort is `o=column:dir`, page is `p`, one-based.
- Unknown URLs return 200 with `noindex`. This is intentional.
- `/llms.txt` is a plain-text site guide for AI tools.

### Plain HTTP checks

- Cloudflare challenges plain `curl`.
- Send `-H 'Accept-Language: en' -H 'Sec-Fetch-Mode: navigate'`.
- Pages stream. Raw HTML can miss text. Use a real browser to check rendered UI.

## 3. Ways to read and edit

Pick the first tool that fits the task.

| Need | Tool |
|---|---|
| Catalogue edits by an agent | Admin MCP server. See section 4. |
| Read public data from code or scripts | Public REST API. See section 5. |
| Visual or manual edits | Backstage at `/backstage`. See section 6. |
| Avatars and file uploads | `set_artist_avatar` for artist avatars. Backstage for claimed artists and manual uploads. |

- Never write catalogue data with ad hoc SQL.
- Production writes need user authorization for the target and operation.
- Read the record before you change it.

## 4. Admin MCP server

- Endpoint: `https://mcp.diskograf.com`. Stateless Streamable HTTP, `POST` only.
- Auth: `Authorization: Bearer dskg_mcp_...`.
- Tokens come from `/backstage/mcp-tokens`. They expire after 90 days.
- Admins and super users can use it. Some tools are super only. See the list below.
- Your agent shows the server as `diskograf`. Tool names may get a prefix, such as `mcp__diskograf_<tool>`.

### Rules for every write

1. Call the write tool without `confirm`. This is a dry run.
2. Read the before and after payload.
3. Call again with the same arguments and `confirm: true`.
4. Read the result. Check it with a read tool when it matters.

- To empty a field, list it in `clear`, for example `clear: ["aliases"]`.
- Some clients drop `null` and `""`. A `null` value can silently do nothing.
- `set_` tools replace the whole list. `append_` tools add to the end.
- `data` on `update_song` is a shallow merge. Other song keys stay.
- `artists`, `genres`, and `labels` on `update_song` replace the whole relation.
- Agent-created songs stay drafts. Publish only after review.
- Every confirmed write logs to `api_write_log` and clears web caches.
- **Internal notes.** Songs, albums, artists, and labels have an admin-only private note log. Read it in the `internal_notes` field of `get_*`.
  - Before you edit an item, read `internal_notes` and skip work already done.
  - Continue open work from the notes. Fix data that a note shows is wrong.
  - After you finish, append one line with `append_internal_note`. The tool adds the MYT date. It needs an `agent` name of at most 40 characters. A note holds at most 300 characters.
  - Note format: `did: <changes>; left: <open tasks or none>; source: <where you verified>`.
  - Append a note when you stop without changes too. Say why.
  - Backstage edit pages show the notes read-only to admins, with a Clear button.
- Check your own writes with `recent_edits`.
- Album research never writes. Review candidates, then use `update_album` for links.
- Use `compare_album_tracklist` before correcting album ordering.
- Select exact editions with `source_urls` when sources disagree.
- Apply complete, unique reorder suggestions through `set_album_songs`.
- Preview every correction. Never remove unmatched songs automatically.

### Tool map

| Area | Tools |
|---|---|
| Read songs | `search_songs`, `get_song`, `get_songs`, `list_pending_songs` |
| Read artists | `search_artists`, `get_artist`, `artist_role_counts` |
| Read others | `search_albums`, `get_album`, `search_labels`, `get_label`, `search_curated_lists`, `get_curated_list` |
| Lookups | `list_roles`, `list_genres`, `list_labels`, `catalogue_stats` |
| Song intake | `prepare_song`, `create_song`, `update_song` |
| Versions | `suggest_song_versions`, `add_song_versions` |
| Streaming links | `audit_missing_links`, `suggest_streaming_links`, `audit_dead_links`, `audit_link_mismatch` |
| YouTube | `youtube_artist_songs`, `official_mv_suggestion`, `set_official_mv`, `refresh_youtube`, `audit_video_quality`, `youtube_trending_candidates` |
| Publishing | `publish_songs`, `unpublish_songs`, `set_album_status`, `set_curated_list_status` |
| Albums | `create_album`, `create_album_with_songs`, `update_album`, `set_album_songs`, `append_album_songs`, `set_album_artists`, `set_album_labels` |
| Album research | `suggest_album_links`, `compare_album_tracklist` |
| Curated lists | `create_curated_list`, `create_curated_list_with_songs`, `update_curated_list`, `set_curated_list_songs`, `append_curated_list_songs`, `set_curated_list_albums`, `reorder_curated_lists` |
| Artwork | `set_artwork` for album, curated list, or label |
| Artists | `create_artist`, `update_artist`, `set_artist_avatar`, `artist_missing_info`, `suggest_artist_info`, `suggest_artist_info_batch` |
| Artist AI | `suggest_artist_profile`, `draft_artist_biography`, `shorten_artist_biography`. Read-only. Limit of 20 calls per minute per admin. |
| Credits in bulk | `bulk_add_credit`, `bulk_remove_credit`, `bulk_replace_credit` |
| Songs in bulk | `bulk_set_genres`, `bulk_set_labels`, `bulk_trash_songs` |
| Labels and taxonomy | `create_label`, `update_label`, `create_genre`, `update_genre`, `create_role`, `update_role` |
| Maintenance | `set_song_lost`, `bulk_set_artist_gender`, `refresh_artwork_colors`, `append_internal_note` |
| Discovery | `list_song_discovery`, `dismiss_song_discovery`, `set_youtube_trending_excluded` |
| Song AI | `find_lyrics`, `suggest_credits`, `classify_song_videos`. Super only. |
| Data quality | `artist_health`, `audit_alias_links`, `repair_alias_links`, `find_duplicate_artists`, `merge_facts`, `mark_not_duplicate`, `merge_artists`, `delete_empty_artists`, `recalc_artist_totals`, `rebuild_artist_roles` |
| History and trash | `list_activities`, `entity_history`, `revert_song`, `recent_edits`, `list_trash`, `trash_entity`, `restore_from_trash`, `trash_artist`, `restore_artist`, `empty_trash` |

- `list_trash` lists songs, albums, labels, and curated lists only. It cannot list artists. Use `/backstage/artists/trash` for trashed artists.
- `trash_artist` is refused while the artist has credits on a published, non-deleted song.

- Super only: `find_duplicate_artists`, `merge_facts`, `merge_artists`, `mark_not_duplicate`, `trash_entity`, `restore_from_trash`, `empty_trash`, `trash_artist`, `restore_artist`, `delete_empty_artists`, `create_genre`, `update_genre`, `create_role`, `update_role`, `find_lyrics`, `suggest_credits`, `classify_song_videos`.
- Ask a super user to run these for you.

### YouTube quota

- Daily YouTube API quota is 10,000 units.
- `refresh_youtube` costs 1 unit per call.
- `prepare_song` with a YouTube link costs 1 unit. Spotify and Apple links cost none.
- `youtube_artist_songs` and `official_mv_suggestion` use scraper search. They cost no quota.

## 5. Public REST API

- Base: `https://api.diskograf.com`. Route index: `GET /v1`. Health: `GET /health`.
- OpenAPI spec: `https://api.diskograf.com/v1` lists the routes.
- Families: `/v1/songs`, `/v1/artists`, `/v1/albums`, `/v1/labels`, `/v1/genres`, `/v1/curated-lists`, `/v1/top`, `/v1/search`, `/v1/artworks`, `/v1/youtube`, `/v1/users`, `/v1/discover`, `/v1/graph`.
- Public reads show only published, non-deleted records.
- Lists return `data` and `meta`. Errors return `error.code` and `error.message`.
- Public list `limit` caps at 80.
- Rate limit: 360 requests per 60 seconds per IP.
- Edge cache: 5 minutes. A fresh edit can show old data for that time.
- `/v1/admin/*` is internal. Use MCP instead.

## 6. Backstage

- `/backstage` needs admin. Some pages need super.
- Main pages:
  - `/backstage/songs`: search, filter, edit, publish, classify, refresh.
  - `/backstage/artists`: edit artists, artist health, avatars.
  - `/backstage/artists/trash`: restore trashed artists. Super.
  - `/backstage/artists/duplicates`: merge or dismiss duplicates. Super.
  - `/backstage/albums` and `/backstage/albums/[albumId]`: album editor.
  - `/backstage/labels`: names, FKA, status, logos.
  - `/backstage/curated-lists`: list editor.
  - `/backstage/genres` and `/backstage/roles`: super edits.
  - `/backstage/song-discovery`: daily new Malaysian release scrape.
  - `/backstage/spotify`: playlist review to song drafts.
  - `/backstage/youtube-artists`: artist video search to song drafts.
  - `/backstage/youtube-trending`: Malaysia YouTube charts.
  - `/backstage/activities`: contribution feed.
  - `/backstage/cache`: clear cache tags. Super.
- Members add songs at `/song/new` or `/song/new/wizard`.
- Admins have quick add at `/song/new/quick`.

## 7. Song data model

`get_song` returns `data` as jsonb. Known keys:

| Key | Meaning |
|---|---|
| `youtube` | Current YouTube video ID. Required. |
| `spotify` | Spotify track. Stored as `spotify:track:<id>` or an `open.spotify.com/track/<id>` URL. |
| `applemusic` | Apple Music song URL, `music.apple.com/my/album/...?i=<trackId>`. |
| `artwork`, `artworkMedium`, `artworkThumb` | Artwork URLs at three sizes, usually Spotify or Apple. |
| `artworkCustom` | Legacy custom artwork key. Do not add new values. |
| `artworkColors` | Derived colors. Do not edit by hand. |
| `duration` | Duration in milliseconds. |
| `dateType` | Release date precision: `FULL`, `MONTH`, or `YEAR`. |
| `videoClass` | Video classification for one video ID. Stored as `{ class, videoId }`. It counts only while the song's video ID matches `videoId`. Classes: `official_mv`, `official_lyric`, `official_visualizer`, `official_audio`, `live`, `fan_video`, `cover`, `karaoke`, `other`. |
| `lost` | Boolean. `set_song_lost` sets it. Lost songs leave public search and charts but keep their page. |

- `released_at` holds the date. Use `01` for unknown month or day, then set `dateType`.
- Artwork falls back in this order: Spotify or Apple URL, custom, YouTube thumbnail.
- Quality filters on `search_songs`: `without_artwork`, `without_label`, `without_genre`, `without_streaming_links`, `youtube_topic`, `lost`.

## 8. Workflows

### Add a song

1. Get one Spotify, Apple Music, or YouTube link for the song.
2. Call `prepare_song` with the link.
3. If status is `exists`, stop. Do not create a duplicate.
4. Resolve `youtube_candidates`. Prefer the official music video. See `CONTEXT.md`.
5. Resolve every warning. Check that each matched artist is the right person.
6. Call `list_genres`. Pick genres from evidence. Leave empty when unsure.
7. Add labels from `label_suggestion` only when the evidence supports it.
8. Call `create_song` as a dry run. Review it.
9. Call `create_song` again with `confirm: true`.
10. Publish with `publish_songs` only when the user asks.

- Artwork is filled automatically, in this order: Spotify, then Apple Music, then the YouTube thumbnail.
- `prepare_song` and `create_song` set `data.artwork`, `data.artworkMedium` and `data.artworkThumb` when they are missing.
- Keep those values from `draft.data`; do not replace them with a smaller image.

- One YouTube video maps to one song. A used video ID is refused.
- The title must not contain the lead performer's name.
- Keep intentional capitals only. Do not write titles in all capitals by default.
- A credit name with no match creates a new artist on confirm.
- A name that matches two or more artists fails. Pass `artist_id`.

### Find and add Spotify and Apple Music links

1. Find gaps with `audit_missing_links` (`missing`: `spotify`, `apple`, or `any`).
   - Or use `search_songs` with `quality: ["without_streaming_links"]` and a date range.
2. Call `suggest_streaming_links` with the song ID. It searches the Malaysia store.
3. Check each candidate: title, artist, and duration within about 15 seconds.
4. Apply with `update_song`:
   - `data: { "spotify": "https://open.spotify.com/track/<id>" }`
   - `data: { "applemusic": "<Apple Music song URL>" }`
5. If no candidate fits, search the web. Never save a guessed link.
- `audit_dead_links` checks saved links. A provider failure reports `unknown`, not dead.
- `audit_link_mismatch` flags provider durations more than 15 seconds apart.

### Update song artwork

- Song artwork comes from `data.artwork`, `data.artworkMedium`, and `data.artworkThumb`.
- Set all three together with `update_song` `data`.
- Use Spotify (`i.scdn.co`) or Apple (`mzstatic.com`) image URLs.
- Find candidates at `/tools/artwork-finder` or through `prepare_song`.
- Do not use Cloudinary. Do not add `artworkCustom`.
- Admins can refresh extracted colors from the floating panel on a song page.
- The action samples the current artwork and updates the background immediately.

### Correct saved artwork colors

- Call `refresh_artwork_colors` for the song after an artwork change.
- The colors re-sample on the next page view.

### Update album, list, or label artwork

1. Find an HTTPS image URL. JPEG, PNG, or WebP.
2. Call `set_artwork` with `target` (`album`, `curated_list`, `label`), `id`, `image_url`.
3. Review the dry run. Confirm.
- The Worker fetches the image and stores it in B2.
- Size caps: album and list 5 MB, label 2 MB.
- Label logos: prefer an SVG or a lossless WebP from the label's own site or YouTube channel.
- `set_artwork` accepts JPEG, PNG, and WebP only. Ask a developer for SVG logos.

### Update an artist avatar

- Preferred: `set_artist_avatar` with `artist_id` and `image_url`. Dry run first, then confirm.
- The Worker fetches an HTTPS image. JPEG, PNG, or WebP, up to 2 MB.
- It stores the image in B2 at `artists/{id}-{timestamp}.{ext}`.
- It refuses claimed artists. Their owner manages the avatar.
- Use a square photo of the artist from Spotify, Apple Music, or the YouTube channel. Never use album artwork.
- Manual path: the artist editor in `/backstage/artists` stages the image through `/api/artist-avatar-upload`.
- Both paths save the key to `artists.data.b2Avatar`.
- Groups render with a plain resize. Solo artists get a face crop.

### Find artist information

1. Find gaps with `artist_missing_info`. Default fields: country, birth date, birth place, biodata, Instagram, Facebook, YouTube.
2. Call `suggest_artist_info` or `suggest_artist_info_batch` (max 10).
   - Sources: Wikidata, MusicBrainz, YouTube channel About page.
   - Each candidate has a source URL.
3. Check each candidate with your own web search.
4. Confirm the person. Many Malaysian artists share names.

### Update artist information

- Call `update_artist` with only the fields to change.
- Fields: name, prefix title, `is_group`, disambiguator, country, place, birth and death date and place, `show_age`, primary job, biodata, socials, `is_deceased`.
- Socials: Instagram, X (`twitter`), TikTok, YouTube, Facebook, website, Spotify, Apple Music.
- Always save both Spotify and Apple Music artist links when you fill artist info.
- Dates use `YYYY-MM-DD`. Use `01` for unknown parts.
- For groups, birth is formation and death is disbandment.
- Linked aliases: `add_alias_artist_ids` or `remove_alias_artist_ids`. Links mirror to the other artist.
- Text aliases: `add_aliases` or `remove_aliases`. They do not mirror.
- MCP cannot set associated acts. Set gender only through `bulk_set_artist_gender`, which takes 1 to 100 solo artists.
- Source URLs are not stored. The edit log is the only history.
- Create a new artist with `create_artist`. A duplicate name needs a `disambiguator`.

### Link song versions

1. Call `suggest_song_versions` with the song ID.
2. Check each candidate: title, writers, release date, and audio.
3. Call `add_song_versions`:
   - `version_of`: songs this song is a version of, the originals.
   - `versions`: songs that are versions of this song.
   - `type`: `remake`, `cover`, `live`, `demo`, `radio_edit`, `remaster`, `remix`, `acoustic`, `instrumental`, or `other`.
4. Review the dry run. Confirm.
- When linking an original song, set the type to Remake.
- The tool only adds links. It never changes or removes one.
- Check current links in `get_song` `version_of` and `versions`.
- Exact type values come from `SONG_RELATION_TYPES` in `@diskograf/api-contracts`.

### Add or change an album

1. Search first with `search_albums`.
2. Make sure every member song exists and is published.
3. Call `create_album_with_songs`, or `create_album` then `set_album_songs`.
4. Set credits with `set_album_artists` and labels with `set_album_labels`.
5. Set artwork with `set_artwork`.
6. Publish with `set_album_status` when the user asks.
- An album holds at most 50 songs.
- Publishing needs at least one published member song.
- Only published, non-deleted songs can join an album.
- A failed album write rolls back entirely.
- Before a bulk tracklist or link change, save the before-state under `/tmp`.
- Apply only tracklists you checked against the provider page or MusicBrainz: track count, order and titles. Leave unverified or conflicting editions alone.
- Read back each write. Keep album membership and release metadata unchanged unless that is the task.
- If a write receipt shows `mirror_edge: 'failed'` while `api_edge_cache` and `web_pages` are ok, purge the Cloudflare cache for `diskograf.com` once. Never repeat a write to retry the cache.

### Curated lists

- Create with `create_curated_list_with_songs` or `create_curated_list`.
- Content type is songs or albums. It locks once the list has items.
- `reorder_curated_lists` needs the full order. Unlisted IDs keep their position.
- Status: draft, published, or archived through `set_curated_list_status`.

### Replace a video with the official music video

1. Find weak videos with `audit_video_quality`.
2. Call `official_mv_suggestion` for the song.
3. If it suggests a video, call `set_official_mv`. Dry run, then confirm.
- Earlier videos stay in the song's video history.

### Clean up artists

1. Run `artist_health` and `find_duplicate_artists`.
2. Compare two artists with `merge_facts` before any merge.
3. Merge with `merge_artists`, or record different people with `mark_not_duplicate`.
4. Delete empty records with `delete_empty_artists`. This is permanent.
5. Fix drift with `recalc_artist_totals` and `rebuild_artist_roles`.
- Use `trash_artist` for a reversible removal. It is refused while the artist has credits on a published song.
- Merges and deletes need explicit user approval for those artists.

### Undo a mistake

- Song: find the entry with `entity_history`, then call `revert_song`.
- Trashed song, album, label, artist, or list: `restore_from_trash`. Super. `restore_artist` also restores one artist.
- Empty a whole trash for songs, albums, artists, or lists: `empty_trash`. Super. Irreversible.
- A merge or `delete_empty_artists` cannot be undone.

## 9. Safety rules

- Links to catalogue pages use `<id>-<slug>`, for example `https://diskograf.com/song/12345-tajuk-lagu`. Genres use the slug only. Users use `/@<username>`. Never build a link from the name alone. Take the id and slug from the tool output, or follow `docs/permalinks.md` in diskograf-next.

- Search before you create. Duplicates are the most common error.
- Never publish, trash, merge, or delete without the user's request.
- Never use a published song in `bulk_trash_songs`. Unpublish it first.
- Size bulk work with `catalogue_stats` or a dry run first.
- Never print MCP tokens or database secrets.
- Report what you changed with record IDs and links.
