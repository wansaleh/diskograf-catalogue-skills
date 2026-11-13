// One-way sync: skills/*/ in this repo -> one Notion page per skill under NOTION_PARENT_PAGE_ID.
// Each run replaces the page body. Pages for removed skills are archived.
// Usage: NOTION_TOKEN=... NOTION_PARENT_PAGE_ID=... node scripts/notion-sync.mjs [--dry-run]
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const TOKEN = process.env.NOTION_TOKEN;
const PARENT = process.env.NOTION_PARENT_PAGE_ID;
const SHA = (process.env.COMMIT_SHA || 'local').slice(0, 7);
const DRY = process.argv.includes('--dry-run');
const API = 'https://api.notion.com/v1';
const MAX_TEXT = 2000;

if (!DRY && (!TOKEN || !PARENT)) {
  console.error('NOTION_TOKEN and NOTION_PARENT_PAGE_ID are required.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function notion(method, path, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      await sleep(Number(res.headers.get('retry-after') || 1) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
    await sleep(350); // stay under ~3 requests per second
    return res.json();
  }
  throw new Error(`${method} ${path} -> rate limited`);
}

// ---- Markdown to Notion blocks (inline code, bold, italic, links) ----

const chunk = (content, annotations, link) => {
  const parts = [];
  for (let i = 0; i < content.length; i += MAX_TEXT) {
    const t = { content: content.slice(i, i + MAX_TEXT) };
    if (link) t.link = { url: link };
    const p = { type: 'text', text: t };
    if (annotations) p.annotations = annotations;
    parts.push(p);
  }
  return parts;
};
const plain = (s) => chunk(s);
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|(?<![\w*])\*(?!\s)([^*]+?)\*(?!\w)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const text = (s) => {
  const parts = [];
  let last = 0;
  for (const m of s.matchAll(INLINE)) {
    if (m.index > last) parts.push(...chunk(s.slice(last, m.index)));
    if (m[1] !== undefined) parts.push(...chunk(m[1], { code: true }));
    else if (m[2] !== undefined) parts.push(...chunk(m[2], { bold: true }));
    else if (m[3] !== undefined) parts.push(...chunk(m[3], { italic: true }));
    else parts.push(...chunk(m[4], null, m[5]));
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(...chunk(s.slice(last)));
  if (parts.length > 100) return plain(s); // Notion caps rich_text at 100 items
  return parts.length ? parts : [{ type: 'text', text: { content: '' } }];
};
const block = (type, s, extra = {}) => ({ object: 'block', type, [type]: { rich_text: type === 'code' ? plain(s) : text(s), ...extra } });

function toBlocks(md) {
  const blocks = [];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let para = [];
  const flush = () => {
    if (para.length) blocks.push(block('paragraph', para.join(' ')));
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*```(\w*)/);
    if (fence) {
      flush();
      const code = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
      blocks.push(block('code', code.join('\n'), { language: codeLanguage(fence[1]) }));
      continue;
    }
    let m;
    if (!line.trim()) flush();
    else if ((m = line.match(/^(#{1,3})\s+(.*)/))) { flush(); blocks.push(block(`heading_${m[1].length}`, m[2])); }
    else if ((m = line.match(/^#{4,}\s+(.*)/))) { flush(); blocks.push(block('heading_3', m[1])); }
    else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { flush(); blocks.push(block('bulleted_list_item', m[1])); }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { flush(); blocks.push(block('numbered_list_item', m[1])); }
    else if ((m = line.match(/^>\s?(.*)/))) { flush(); blocks.push(block('quote', m[1])); }
    else if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flush(); blocks.push({ object: 'block', type: 'divider', divider: {} }); }
    else para.push(line.trim());
  }
  flush();
  return blocks;
}

const LANGS = new Set(['bash', 'shell', 'javascript', 'typescript', 'json', 'sql', 'python', 'markdown', 'yaml', 'html', 'css']);
function codeLanguage(l) {
  const map = { sh: 'shell', zsh: 'shell', js: 'javascript', ts: 'typescript', md: 'markdown', yml: 'yaml' };
  const lang = map[l] || l;
  return LANGS.has(lang) ? lang : 'plain text';
}

// ---- Read skills from the repo ----

function parseSkill(dir) {
  const raw = readFileSync(join(dir, 'SKILL.md'), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (fm) for (const l of fm[1].split('\n')) {
    const m = l.match(/^(\w+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  const body = fm ? raw.slice(fm[0].length) : raw;
  const refs = [];
  const refDir = join(dir, 'references');
  if (existsSync(refDir)) {
    for (const f of readdirSync(refDir).sort()) {
      if (f.endsWith('.md')) refs.push({ name: f, body: readFileSync(join(refDir, f), 'utf8') });
    }
  }
  return { meta, body, refs };
}

function skillBlocks(name, { meta, body, refs }) {
  const header = [
    { object: 'block', type: 'callout', callout: {
      rich_text: text(`Generated from diskograf-catalogue-skills/skills/${name} at commit ${SHA}. Do not edit here. Edit the repo.`),
      icon: { type: 'emoji', emoji: '📄' },
      color: 'gray_background',
    } },
  ];
  if (meta.description) header.push(block('quote', meta.description));
  const out = [...header, ...toBlocks(body)];
  for (const r of refs) {
    out.push({ object: 'block', type: 'divider', divider: {} });
    out.push(block('heading_1', `Reference: ${r.name}`));
    out.push(...toBlocks(r.body));
  }
  return out;
}

// ---- Notion page operations ----

async function listChildren(id) {
  const all = [];
  let cursor;
  do {
    const q = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100';
    const r = await notion('GET', `/blocks/${id}/children${q}`);
    all.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return all;
}

async function append(id, blocks) {
  for (let i = 0; i < blocks.length; i += 100) {
    await notion('PATCH', `/blocks/${id}/children`, { children: blocks.slice(i, i + 100) });
  }
}

async function main() {
  const root = 'skills';
  const names = readdirSync(root).filter((n) => statSync(join(root, n)).isDirectory() && existsSync(join(root, n, 'SKILL.md'))).sort();

  if (DRY) {
    for (const n of names) console.log(`${n}: ${skillBlocks(n, parseSkill(join(root, n))).length} blocks`);
    return;
  }

  const existing = new Map();
  for (const b of await listChildren(PARENT)) {
    if (b.type === 'child_page') existing.set(b.child_page.title, b.id);
  }

  for (const n of names) {
    const blocks = skillBlocks(n, parseSkill(join(root, n)));
    // The hash covers the body only, so a new commit SHA alone does not force a rewrite.
    const hash = createHash('sha256').update(JSON.stringify(blocks.slice(1))).digest('hex').slice(0, 12);
    blocks[0].callout.rich_text.push(...plain(` Content hash ${hash}.`));
    let id = existing.get(n);
    if (id) {
      const first = (await notion('GET', `/blocks/${id}/children?page_size=1`)).results[0];
      const header = first?.callout?.rich_text.map((t) => t.plain_text).join('') ?? '';
      if (header.includes(`Content hash ${hash}.`)) {
        console.log(`skip ${n}`);
        existing.delete(n);
        continue;
      }
      for (const b of await listChildren(id)) await notion('DELETE', `/blocks/${b.id}`);
      console.log(`update ${n}`);
    } else {
      const page = await notion('POST', '/pages', {
        parent: { page_id: PARENT },
        properties: { title: { title: text(n) } },
      });
      id = page.id;
      console.log(`create ${n}`);
    }
    await append(id, blocks);
    existing.delete(n);
  }

  for (const [title, id] of existing) {
    await notion('PATCH', `/pages/${id}`, { archived: true });
    console.log(`archive ${title}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
