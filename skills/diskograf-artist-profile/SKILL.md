---
name: diskograf-artist-profile
description: Fill or fix one Diskograf artist's profile - find every verified social link, fill info fields such as birth and death dates and places, country and titles, and create or improve the biography, then save with update_artist. Use when asked to fill, complete, research or fix an artist's profile, bio, biodata, info, dates, places or social links.
---

# Diskograf artist profile

Read the `diskograf-catalogue` skill first. Work through the `diskograf` MCP tools. `update_artist` is a dry run until `confirm: true`. Read the dry run before you confirm.

Read the artist's `internal_notes` from `get_artist` before you edit. Skip work a note marks as done. Do open work first.

## 1. Confirm the person

1. `search_artists`, then `get_artist`. Note the id, aliases, `is_group` and current fields.
2. Many Malaysian artists share names. Confirm the person with the songs, labels and years in the catalogue before you use any outside source.

## 2. Find the gaps

1. `artist_missing_info` lists the empty fields.
2. `suggest_artist_info` gives Wikidata, MusicBrainz and YouTube About candidates with source URLs. For up to 10 artists, use `suggest_artist_info_batch`. Both write nothing.
3. Treat every candidate as a lead. Verify it with your own web search or browser check. Keep only fields that an official or reliable source confirms.

## 3. Info fields

Fill every empty field that a source confirms, and fix a wrong one:

- `birth_date`, `birth_place`.
- `death_date`, `death_place` and `is_deceased` for a deceased artist.
- For a group, birth is formation and death is disbandment.
- `place` (home base), `country`, `primary_job`.
- `prefix_title`, for example Dato' or Datuk Seri.
- Text aliases for real names and old spellings: `add_aliases`.

Dates use `YYYY-MM-DD`, with `01` for unknown parts, as in `diskograf-catalogue`. Never invent a day or month.

Sources, in this order:

1. The artist's official site or verified social bio.
2. Wikipedia, Malay and English.
3. Wikidata, MusicBrainz.
4. Reliable news: Berita Harian, Harian Metro, Kosmo, The Star, mStar. Two news sources are better than one.

## 4. Social links

Search for every platform: `instagram`, `facebook`, `tiktok`, `twitter` (X), `youtube`, `website`, `spotify`, `applemusic`.

1. Start from the strongest hubs:
   - the official YouTube channel About page;
   - the Spotify artist profile;
   - the official website;
   - a Linktree or similar link page;
   - Wikidata properties;
   - the links between the artist's own accounts.
2. Then search each platform by stage name and real name.
3. Keep an account only when it is the artist's own: a verification tick, a link from another verified account or the official site, or a label announcement.
4. Prefer the main personal account over a fan, fan club or label account. Never save a fan account.
5. A social account that may belong to another person goes to the user as a question. Never save it.
6. Check that each URL opens. Save the canonical URL without tracking parameters.
7. Always save both Spotify and Apple Music artist links when they exist.

## 5. Biography

The field is `biodata`.

1. If it is empty, call `draft_artist_biography`.
2. If it exists but is thin, outdated or wrong, improve it. Add verified facts: debut, key releases, awards, labels, groups and recent activity. Keep correct existing text.
3. Write plain English in a neutral tone. Use past tense for past events. No praise words, no fan language.
4. Check every fact against a source. Remove any fact that you cannot verify.
5. If the bio is too long, use `shorten_artist_biography`.

## 6. Save

1. `update_artist` with only the fields to change. Do a dry run, read it, then confirm.
2. Read the artist back with `get_artist`.
3. If the artist has no avatar, follow `diskograf-artist-avatars`.
4. `append_internal_note`: `did: <fields set>; left: <unfilled fields or none>; source: <sources>`.

## Rules

- Never set gender. Only a human sets it, through `bulk_set_artist_gender`.
- Never guess a field. A missing field is better than a wrong one.
- Source URLs are not stored. Put the main sources in the internal note.
- MCP cannot set associated acts.

## Report

List the fields set, the links added, the bio change, and each unfilled field with the reason. Put **Blocked on me** first, with any social account that needs the user's decision.
