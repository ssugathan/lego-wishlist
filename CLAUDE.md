# CLAUDE.md — LEGO Wishlist

## What this is
Two-route React PWA. Kid browses wishlist on iPad.
Dad manages via /admin. Notion as DB. Full spec in SPEC.md.

## Read first
SPEC.md — complete architecture, DB schema, build sequence.
Follow the build sequence order. Don't skip ahead.

## Vibe coding defaults
- Give context + guardrails, then reason and plan independently
- One targeted change per iteration unless changes are tightly related
- Speed without breaking architecture
- Don't over-constrain or reduce to a stenographer

## Stack
React + Vite, Notion API, Rebrickable API, BrickLink image URLs
PWA (manifest.json + service worker)
Tailwind for styling

## Schema notes
inventory_sets has an `Image URL` column (URL type) for LEGO.com CDN
photos populated by `scripts/import-inventory.js`. Render path prefers
it over the BrickLink-constructed URL when present.

## Env vars
See .env.example — never commit actual values
