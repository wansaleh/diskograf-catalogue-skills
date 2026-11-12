# Diskograf catalogue skills

Agent skills for managing the [Diskograf](https://diskograf.com) music catalogue.
This repository is the source of truth for them.

They are for catalogue admins, not developers. They need no code checkout.

## Skills

| Skill | Use it to |
|---|---|
| `diskograf-catalogue` | Learn the catalogue, the MCP tools and the write rules. Read first. |
| `diskograf-release-scan` | Find new Malaysian releases on YouTube, Spotify and Apple Music, then add them. |
| `diskograf-discography` | Complete or audit one artist's songs and albums. |
| `diskograf-song-credits` | Fill or fix song credits and lyrics. |
| `diskograf-better-video` | Swap a song's video for the official music video. |
| `diskograf-artist-avatars` | Add or replace artist photos. |

## Setup

1. Get an admin account on diskograf.com.
2. Create an MCP token at `https://diskograf.com/backstage/mcp-tokens`. It lasts 90 days. Keep it private.
3. Add the MCP server to your agent:
   - URL: `https://mcp.diskograf.com`
   - Header: `Authorization: Bearer <your token>`
4. Install the skills. Pick one:
   - Claude Code, Codex, Cursor and others: `npx skills add wansaleh/diskograf-catalogue-skills`
   - Claude desktop or claude.ai: zip one folder from `skills/` and upload it in Settings, Capabilities, Skills.
5. Ask your agent, for example: "Complete Siti Nurhaliza's discography on Diskograf."

## Rules

- Every write tool is a dry run until `confirm: true`. Read the dry run first.
- Agent-created songs stay drafts until an admin publishes them.
- Never paste your token into a chat, a note or this repository.

## Changing a skill

- Edit the `SKILL.md` here and open a pull request.
- Do not keep private copies of these skills elsewhere. Pull updates with the install command again.
