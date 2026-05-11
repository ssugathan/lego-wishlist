#!/usr/bin/env node
// Bulk import of scripts/my-sets.json into the Notion inventory_sets DB.
//
// Mirrors seed.js patterns: plain Node 18+ (built-in fetch/fs), loads .env
// manually since lib/notion.js is Vite-only. Property names match
// inventorySetsFields in lib/notion.js, plus an Image URL column populated
// from the LEGO.com CDN URLs in my-sets.json.
//
// Run:
//   node scripts/import-inventory.js
//
// Re-running creates duplicates — there is no unique constraint and we don't
// query first. Run once per fresh DB.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  const out = {};
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z0-9_]+)=([^#]*?)(\s+#.*)?$/);
    if (!m) continue;
    out[m[1]] = m[2].trim();
  }
  return out;
}

const env = loadEnv();
const NOTION_TOKEN = env.NOTION_API_KEY;
const DB_SETS = env.VITE_NOTION_INVENTORY_SETS_DB_ID;

const NOTION_HEADERS = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildTitle(v) {
  return { title: [{ type: 'text', text: { content: String(v) } }] };
}
function buildText(v) {
  return v == null
    ? { rich_text: [] }
    : { rich_text: [{ type: 'text', text: { content: String(v) } }] };
}
function buildNumber(v) {
  return { number: v == null ? null : Number(v) };
}
function buildSelect(v) {
  return v == null ? { select: null } : { select: { name: String(v) } };
}
function buildDate(v) {
  return v ? { date: { start: v } } : { date: null };
}
function buildUrl(v) {
  return { url: v || null };
}

async function notionCreate(dbId, properties) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: NOTION_HEADERS,
    body: JSON.stringify({ parent: { database_id: dbId }, properties }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function main() {
  if (!NOTION_TOKEN || !DB_SETS) {
    console.error('Missing VITE_NOTION_API_KEY or VITE_NOTION_INVENTORY_SETS_DB_ID in .env');
    process.exit(1);
  }

  const dataPath = join(__dirname, 'my-sets.json');
  const sets = JSON.parse(readFileSync(dataPath, 'utf8'));
  const today = todayIso();

  console.log(`Importing ${sets.length} sets into inventory_sets…\n`);

  let ok = 0;
  let fail = 0;
  for (const s of sets) {
    const props = {
      'Set Number':  buildTitle(s.productNumber),
      'Name':        buildText(s.name),
      'Theme':       buildText(s.theme),
      'Piece Count': buildNumber(s.pieces),
      'Image URL':   buildUrl(s.imageUrl),
      'Condition':   buildSelect('Complete'),
      'Date Added':  buildDate(today),
    };
    try {
      await notionCreate(DB_SETS, props);
      console.log(`  + ${s.productNumber} ${s.name}`);
      ok++;
    } catch (e) {
      console.log(`  ! ${s.productNumber} ${s.name}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone. ${ok} written, ${fail} failed.`);
}

main();
