#!/usr/bin/env node
// Bulk import of scripts/wishlist-seed.json into the Notion wishlist DB.
//
// Mirrors import-inventory.js: plain Node 18+ (built-in fetch/fs), loads .env
// manually since lib/notion.js is Vite-only. Property names match
// wishlistFields in lib/notion.js, including the Image URL column populated
// from the LEGO.com CDN URLs in the seed JSON.
//
// Run:
//   node scripts/import-wishlist.js
//
// Re-running creates duplicates — no unique constraint, no pre-query. Purge
// the DB first if you want a clean slate.

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
const DB_WISHLIST = env.VITE_NOTION_WISHLIST_DB_ID;

const NOTION_HEADERS = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

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
function buildCheckbox(v) {
  return { checkbox: !!v };
}
function buildUrl(v) {
  return { url: v || null };
}
function buildDate(v) {
  return v ? { date: { start: v } } : { date: null };
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
  if (!NOTION_TOKEN || !DB_WISHLIST) {
    console.error('Missing NOTION_API_KEY or VITE_NOTION_WISHLIST_DB_ID in .env');
    process.exit(1);
  }

  const dataPath = join(__dirname, 'wishlist-seed.json');
  const items = JSON.parse(readFileSync(dataPath, 'utf8'));

  console.log(`Importing ${items.length} wishlist items…\n`);

  let ok = 0;
  let fail = 0;
  for (const it of items) {
    const props = {
      'Name':          buildTitle(it.name),
      'BrickLink ID':  buildText(it.productNumber),
      'Type':          buildSelect('Set'),
      'Budget Tier':   buildSelect(it.budgetTier),
      'Rank':          buildNumber(it.rank),
      'MSRP':          buildNumber(it.msrp),
      'On Sale':       buildCheckbox(it.onSale),
      'Buy URL':       buildUrl(it.buyUrl),
      'Status':        buildSelect(it.status || 'Wishlist'),
      'Purchase Date': buildDate(null),
      'Theme':         buildText(it.theme),
      'Piece Count':   buildNumber(it.pieces),
      'Image URL':     buildUrl(it.imageUrl),
    };
    try {
      await notionCreate(DB_WISHLIST, props);
      console.log(`  + ${it.productNumber} ${it.name} (${it.budgetTier} #${it.rank})`);
      ok++;
    } catch (e) {
      console.log(`  ! ${it.productNumber} ${it.name}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone. ${ok} written, ${fail} failed.`);
}

main();
