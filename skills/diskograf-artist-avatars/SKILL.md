---
name: diskograf-artist-avatars
description: Find and set avatars for Diskograf artists. Finds the image with the Yab browser on Spotify, Apple Music, YouTube or Instagram, then saves it with the set_artist_avatar MCP tool. Use when asked to find, add, fix or replace artist avatars, photos or profile images.
---

> **First:** read the internal notes of every item before you edit it. See "Internal notes" below.

# Diskograf artist avatars

Work through the `diskograf` MCP tools. Every write tool is a dry run until `confirm: true`.
Use Yab (`yab-browser` tools) to browse. The user is signed in there.

## 1. Pick artists

- For one artist: `get_artist`. Check the current avatar, `is_group`, the linked account and the Spotify, Apple Music, YouTube and Instagram links.
- For a sweep: `artist_missing_info` lists artists with gaps. Start with artists that have the most songs.
- Skip claimed artists, which have a linked account. Their owner manages the image, and the tool refuses them.

## 2. Find the image

Try the sources in this order:

1. **Spotify artist page.** Get the artist URL from `data.spotify`, or from a track page in Yab. Read `og:image` from the server HTML. Do not read it from the Yab tab. The Spotify web app shares state between tabs, so a tab can show the wrong artist.

```sh
curl -s -A 'Mozilla/5.0' "https://open.spotify.com/artist/<id>" | grep -oE '<meta property="og:(title|image)" content="[^"]+"'
```

   Check that `og:title` is the right artist.
2. **Apple Music artist page.** Read `og:image` from the HTML in the same way. Change the size part of the URL to `1000x1000bb.jpg` to get a large image.
3. **YouTube channel avatar.** Read the `yt3.ggpht.com` image on the channel page. Change `=s88` or a similar size to `=s900` for a large image.
4. **Instagram profile picture.** Use it only when nothing else exists.

`close` each Yab tab when you are done.

## 3. Check the image

Before you save, check:

- It shows the artist, not album artwork, a logo or a placeholder. A logo is correct only for a group that uses one.
- For a solo artist, the face is visible. The CDN crops on the face.
- For a group, set `is_group: true` with `update_artist` first. Groups get a plain resize, not a face crop.
- It is square or close to square, and at least 300 px wide.
- It is the right person. Many names are shared. Match the artist's songs, label or country.

Ask the user when you are not sure.

## 4. Save

1. `set_artist_avatar` with `artist_id` and `image_url`. The dry run fetches and checks the image: JPEG, PNG or WebP, 2 MB maximum, HTTPS, no redirects.
2. Read `before` in the dry run. **If it shows an avatar, stop.** Never replace an existing avatar without the user's approval. A person may have chosen it. Download both images, look at them, and ask the user.
3. When `before` is empty, or the user approved the replacement, repeat the call with `confirm: true`. The old B2 image is deleted after the save.
3. Errors:
   - Redirect refused: open the final image URL in Yab and use that URL.
   - Too large: use a smaller size in the CDN URL.
   - Claimed artist: skip it.

## Report

List each artist id and name, the source of the image and the new URL. Also list skipped artists and the reason.

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
