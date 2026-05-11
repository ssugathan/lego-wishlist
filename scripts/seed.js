#!/usr/bin/env node
// Seed script — populates the three Notion DBs with a starter set of items
// so the kid view has something to render on first run.
//
// Wishlist sets are looked up against Rebrickable to grab real name/theme/
// year/piece count. Minifigs are hand-entered (Rebrickable doesn't cover
// minifigs per SPEC.md). Inventory sets also use Rebrickable.
//
// Run:
//   node scripts/seed.js
//
// Re-running creates duplicates — Notion has no unique constraint and we
// don't query first. Only run once on a fresh DB.
//
// Reads env from .env (same vars Vite reads). Token, DB IDs, Rebrickable key.
//
// Pure Node 18+ — uses built-in fetch and fs. No npm deps.

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
const REBRICKABLE_KEY = env.VITE_REBRICKABLE_API_KEY;
const DB_WISHLIST = env.VITE_NOTION_WISHLIST_DB_ID;
const DB_SETS = env.VITE_NOTION_INVENTORY_SETS_DB_ID;
const DB_MINIFIGS = env.VITE_NOTION_INVENTORY_MINIFIGS_DB_ID;

const NOTION_HEADERS = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
// Curated seed data
// ---------------------------------------------------------------------------

const WISHLIST = [
  // Monthly tier — smaller, frequent rewards
  { setNumber: '60386', tier: 'Monthly', rank: 1, msrp: 39.99, onSale: false,
    notes: 'Looks fun to take apart' },
  { setNumber: '71765', tier: 'Monthly', rank: 2, msrp: 139.99, onSale: false,
    notes: 'Lloyd is my favorite ninja' },
  { setNumber: '31136', tier: 'Monthly', rank: 3, msrp: 19.99, onSale: false,
    notes: 'Pretty colors!' },

  // Occasion tier — birthday / Christmas big-ticket
  { setNumber: '75192', tier: 'Occasion', rank: 1, msrp: 849.99, onSale: false,
    notes: 'Saw at Jake\'s house — coolest set ever' },
  { setNumber: '71043', tier: 'Occasion', rank: 2, msrp: 469.99, onSale: false,
    notes: 'Mommy will love it too' },
  { setNumber: '42115', tier: 'Occasion', rank: 3, msrp: 449.99, onSale: true,
    notes: 'Race car like at the auto show' },
];

const INVENTORY_SETS = [
  { setNumber: '31109', condition: 'Complete' },  // Pirate Ship (Creator 3-in-1)
  { setNumber: '60380', condition: 'Complete' },  // Downtown (City)
  { setNumber: '75333', condition: 'Complete' },  // Obi-Wan Kenobi's Jedi Starfighter
];

const INVENTORY_MINIFIGS = [
  { bricklinkId: 'sw0001a', name: 'Luke Skywalker (Tatooine)', theme: 'Star Wars', quantity: 1 },
  { bricklinkId: 'sw0017',  name: 'Han Solo',                  theme: 'Star Wars', quantity: 1 },
  { bricklinkId: 'cty0801', name: 'Police Officer',            theme: 'City',      quantity: 2 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildText(value) {
  return value == null
    ? { rich_text: [] }
    : { rich_text: [{ type: 'text', text: { content: String(value) } }] };
}
function buildTitle(value) {
  return { title: [{ type: 'text', text: { content: String(value) } }] };
}
function buildNumber(value) {
  return { number: value == null ? null : Number(value) };
}
function buildSelect(value) {
  return value == null ? { select: null } : { select: { name: String(value) } };
}
function buildCheckbox(value) {
  return { checkbox: !!value };
}
function buildDate(value) {
  return value ? { date: { start: value } } : { date: null };
}
function buildUrl(value) {
  return { url: value || null };
}

async function fetchRebrickable(setNumber) {
  const id = setNumber.includes('-') ? setNumber : `${setNumber}-1`;
  const res = await fetch(`https://rebrickable.com/api/v3/lego/sets/${id}/`, {
    headers: { Authorization: `key ${REBRICKABLE_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Rebrickable ${res.status} for ${id}`);
  }
  const data = await res.json();
  // Theme name — Rebrickable returns theme_id; resolve once per call.
  let theme = null;
  if (data.theme_id != null) {
    const t = await fetch(`https://rebrickable.com/api/v3/lego/themes/${data.theme_id}/`, {
      headers: { Authorization: `key ${REBRICKABLE_KEY}` },
    });
    if (t.ok) theme = (await t.json()).name;
  }
  return {
    setNumber: data.set_num.split('-')[0],
    name: data.name,
    year: data.year,
    pieceCount: data.num_parts,
    theme,
  };
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

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------

async function seedWishlist() {
  console.log('\n=== Wishlist ===');
  for (const item of WISHLIST) {
    try {
      const meta = await fetchRebrickable(item.setNumber);
      const props = {
        'Name':          buildTitle(meta.name),
        'BrickLink ID':  buildText(meta.setNumber),
        'Type':          buildSelect('Set'),
        'Budget Tier':   buildSelect(item.tier),
        'Rank':          buildNumber(item.rank),
        'MSRP':          buildNumber(item.msrp),
        'On Sale':       buildCheckbox(item.onSale),
        'Buy URL':       buildUrl(`https://www.lego.com/en-us/product/${meta.setNumber}`),
        'Status':        buildSelect('Wishlist'),
        'Purchase Date': buildDate(null),
        'Notes':         buildText(item.notes),
        'Theme':         buildText(meta.theme),
        'Year':          buildNumber(meta.year),
        'Piece Count':   buildNumber(meta.pieceCount),
      };
      await notionCreate(DB_WISHLIST, props);
      console.log(`  + ${meta.setNumber} ${meta.name} (${item.tier} #${item.rank})`);
    } catch (e) {
      console.log(`  ! ${item.setNumber}: ${e.message}`);
    }
  }
}

async function seedInventorySets() {
  console.log('\n=== Inventory: Sets ===');
  for (const item of INVENTORY_SETS) {
    try {
      const meta = await fetchRebrickable(item.setNumber);
      const props = {
        'Set Number':  buildTitle(meta.setNumber),
        'Name':        buildText(meta.name),
        'Theme':       buildText(meta.theme),
        'Year':        buildNumber(meta.year),
        'Piece Count': buildNumber(meta.pieceCount),
        'Condition':   buildSelect(item.condition),
        'Date Added':  buildDate(todayIso()),
      };
      await notionCreate(DB_SETS, props);
      console.log(`  + ${meta.setNumber} ${meta.name}`);
    } catch (e) {
      console.log(`  ! ${item.setNumber}: ${e.message}`);
    }
  }
}

async function seedInventoryMinifigs() {
  console.log('\n=== Inventory: Minifigs ===');
  for (const item of INVENTORY_MINIFIGS) {
    try {
      const props = {
        'BrickLink ID': buildTitle(item.bricklinkId),
        'Name':         buildText(item.name),
        'Theme':        buildSelect(item.theme),
        'Quantity':     buildNumber(item.quantity),
        'Date Added':   buildDate(todayIso()),
      };
      await notionCreate(DB_MINIFIGS, props);
      console.log(`  + ${item.bricklinkId} ${item.name}`);
    } catch (e) {
      console.log(`  ! ${item.bricklinkId}: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  if (!NOTION_TOKEN || !REBRICKABLE_KEY || !DB_WISHLIST || !DB_SETS || !DB_MINIFIGS) {
    console.error('Missing env vars in .env');
    process.exit(1);
  }
  await seedWishlist();
  await seedInventorySets();
  await seedInventoryMinifigs();
  console.log('\nSeed complete.');
})();
