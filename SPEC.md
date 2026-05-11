# LEGO Wishlist App — SPEC.md
> Version 0.1 | May 2026
> Built for: Sid's 5-year-old son | Primary device: iPad (Safari PWA)

---

## Overview

A two-route React web app for managing a child's LEGO wishlist and inventory. Notion is the database. Rebrickable API auto-fills set metadata. The kid browses and prioritizes; dad adds and edits via a separate admin route.

**Core jobs:**
- Kid browses his wishlist by budget tier, sees what's next in line
- Kid reorders his own priorities (up/down arrows, long-press to top/bottom)
- Dad adds items, marks purchases, maintains inventory
- Inventory feeds lego-ai-builder later (Phase 2)

---

## Routes

| Route | Audience | Description |
|---|---|---|
| `/` | Kid | Browse-only PWA view |
| `/admin` | Dad | Add/edit/delete, no auth needed |

No authentication. `/admin` is obscurity-protected — personal tool.

---

## Data Layer: Notion DBs

### DB 1: `wishlist`

| Field | Notion Type | Notes |
|---|---|---|
| Name | Title | e.g. "Millennium Falcon" |
| BrickLink ID | Text | Set: `75192` · Minifig: `sw0001` |
| Type | Select | Set / Minifig / Part |
| Budget Tier | Select | Monthly / Occasion |
| Rank | Number | Per-tier rank. 1 = top. No cross-tier ranking. |
| MSRP | Number | USD, set by dad |
| On Sale | Checkbox | Toggled by n8n or manually in admin |
| Buy URL | URL | LEGO.com / BrickLink / Amazon (dad use only) |
| Status | Select | Wishlist / Purchased |
| Purchase Date | Date | Set when marked Purchased |
| Notes | Text | Personal context ("saw at Jake's house") |
| Theme | Text | Auto-filled by Rebrickable |
| Year | Number | Auto-filled by Rebrickable |
| Piece Count | Number | Auto-filled by Rebrickable (sets only) |
| Image URL | URL | Optional LEGO.com CDN URL (from bulk import); falls back to BrickLink construction when null |

### DB 2: `inventory_sets`

| Field | Notion Type | Notes |
|---|---|---|
| Set Number | Title | Clean numeric string e.g. `75192` |
| Name | Text | Auto-filled by Rebrickable |
| Theme | Text | Auto-filled |
| Year | Number | Auto-filled |
| Piece Count | Number | Auto-filled |
| Image URL | URL | Optional LEGO.com CDN URL (from bulk import); falls back to BrickLink construction when null |
| Condition | Select | Complete / Incomplete |
| Date Added | Date | |

### DB 3: `inventory_minifigs`

| Field | Notion Type | Notes |
|---|---|---|
| BrickLink ID | Title | e.g. `sw0001` |
| Name | Text | Manual entry (Rebrickable doesn't cover minifigs) |
| Theme | Select | Star Wars / City / Technic / Castle / Other |
| Quantity | Number | |
| Date Added | Date | |

---

## Image URL Construction

Constructed at render time from ID field. No manual image URL entry.

```
Set:     https://img.bricklink.com/ItemImage/SL/{id}-1.png
Minifig: https://img.bricklink.com/ItemImage/MN/0/{id}.png
Part:    https://img.bricklink.com/ItemImage/PN/{color_id}/{part_id}.png
```

Set images need the `-1` variant suffix — BrickLink stores set images by
variant, and `-1` is the canonical first release. `lib/bricklink.js`
auto-appends `-1` when the stored id has no dash, so dad can keep typing
bare set numbers (`75192`) in admin.

Fallback: if image 404s, show a LEGO brick placeholder SVG.

---

## Rebrickable API

Used for auto-filling set metadata on add.

- **Endpoint:** `https://rebrickable.com/api/v3/lego/sets/{set_number}/`
- **Auth:** Free API key (register at rebrickable.com)
- **Returns:** name, year, theme, num_parts, set_img_url
- **When called:** On set number entry in admin add form — fires on blur/confirm
- **Minifigs:** Not covered by Rebrickable — name entered manually by dad
- Store the API key in `.env` as `VITE_REBRICKABLE_API_KEY`

---

## App Structure

```
/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker (offline shell)
│   └── icon-lego.png          # Home screen icon (LEGO brick)
├── src/
│   ├── App.jsx                # Router: / and /admin
│   ├── routes/
│   │   ├── KidView.jsx        # Tab shell: Monthly | Occasion
│   │   └── AdminView.jsx      # Tab shell: Wishlist | Inventory
│   ├── kid/
│   │   ├── TierTab.jsx        # Ranked card list for one tier
│   │   ├── WishlistCard.jsx   # Card: image, name, badge, rank controls
│   │   └── DetailModal.jsx    # Full-screen tap detail view
│   ├── admin/
│   │   ├── WishlistTable.jsx  # Editable table of wishlist items
│   │   ├── InventoryTable.jsx # Sets + minifig tables
│   │   └── AddItemForm.jsx    # Shared form: ID entry + Rebrickable lookup
│   ├── hooks/
│   │   ├── useWishlist.js     # Read/write wishlist DB via Notion MCP
│   │   ├── useInventory.js    # Read/write inventory DBs via Notion MCP
│   │   └── useRebrickable.js  # Set metadata lookup
│   └── lib/
│       ├── notion.js          # DB IDs, field mappings, Notion API calls
│       ├── bricklink.js       # Image URL constructor
│       └── rebrickable.js     # API wrapper
```

---

## Kid View (`/`)

### Shell
- PWA, full-screen on iPad (no browser chrome)
- Two tabs at top or bottom: **Monthly** | **Occasion**
- Each tab is an independent ranked list
- Bold, image-forward design — think toy catalog meets modern product page
- LEGO primary colors: red, yellow, blue on dark tab bar
- Large chunky typography (he's 5, reading along with dad)

### Card

Each card shows:
- BrickLink image (large, top of card)
- Name (large text)
- Type badge (color-coded: blue=Set, yellow=Minifig, grey=Part)
- Theme + Year (sets)
- Piece count (sets)
- Price — with 🟢 sale badge if On Sale = true
- Rank controls: ↑ ↓ arrows (large tap targets, min 44pt)
  - Long-press ↑ → move to rank 1 (top of list)
  - Long-press ↓ → move to last rank (bottom of list)

**No buy button. No edit controls. No delete.**

### Card tap → Detail Modal

Full-screen slide-up sheet:
- Large hero image
- Name, Type badge
- Theme, Year, Piece count (sets)
- Price + sale indicator
- Notes field (dad's personal description if present)
- Structured line: "{Theme} · {Year} · {Piece Count} pieces"
- Close button — large, top right

### Rank update behavior
- ↑↓ writes new rank to Notion immediately
- Optimistic UI update (don't wait for Notion round-trip to reorder visually)
- On error: revert and show a small toast

### Purchased items
- Not shown in kid view at all
- Filtered out at query time (Status = Wishlist only)

---

## Admin View (`/admin`)

### Shell
- Not PWA
- Two tabs: **Wishlist** | **Inventory**
- Functional UI — clean table layout, no design budget spent here
- Desktop-friendly (this is dad's view, likely on laptop)

### Wishlist Tab

**Table columns:** Rank · Image (small) · Name · Type · Tier · MSRP · On Sale · Status · Purchase Date · Notes · Actions

**Actions per row:**
- Edit (inline edit any field)
- Mark Purchased (sets Status=Purchased, records today's date)
- Delete

**Add Item form (top of page):**
1. Enter BrickLink Set Number or Minifig ID
2. On blur → Rebrickable API lookup fires for sets
3. Auto-fills: Name, Theme, Year, Piece Count
4. Dad confirms/edits, adds: Budget Tier, MSRP, Notes, Buy URL
5. Rank defaults to last in tier (dad can adjust)
6. Soft duplicate check against inventory: "This set is already in his inventory" (warning, not block)
7. Save → writes to Notion wishlist DB

### Inventory Tab

Two sub-tabs: **Sets** | **Minifigs**

**Sets table:** Set Number · Image · Name · Theme · Year · Pieces · Condition · Date Added · Delete

**Minifigs table:** BrickLink ID · Image · Name · Theme · Qty · Date Added · Delete

**Add item flow (same for both):**
- Enter ID → Rebrickable lookup (sets) or manual entry (minifigs)
- Soft duplicate warning if ID already in DB
- Save to appropriate Notion DB

---

## PWA Config

`manifest.json`:
```json
{
  "name": "LEGO Wishlist",
  "short_name": "My LEGO",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#e3000b",
  "icons": [{ "src": "/icon-lego.png", "sizes": "192x192", "type": "image/png" }]
}
```

Service worker: cache-first for shell, network-first for Notion API calls. Offline state shows cached last-known wishlist with a "you're offline" banner.

---

## Responsive Layout

| Orientation | Card grid | Next pick panel |
|---|---|---|
| iPad portrait | 2 columns | Bottom strip |
| iPad landscape | 3 columns | Right sidebar |
| Desktop (admin) | Table layout | N/A |

---

## Pagination: Infinite Scroll

Both kid view (per-tier card lists) and inventory grids use infinite scroll — no pagination controls.

**Implementation:**
- Initial load: first 20 items per tier/grid
- Notion API returns 100 results per page with a `next_cursor` — use cursor-based pagination
- Intersection Observer watches a sentinel element at the bottom of each list
- When sentinel enters viewport → fetch next page → append to existing list
- Show a subtle loading spinner at the bottom during fetch
- Stop fetching when Notion returns `has_more: false`
- Sort is always by Rank ascending (kid view) or Date Added descending (inventory)

**In `lib/notion.js`:** all query functions accept `cursor` param and return `{ results, next_cursor, has_more }`. Hooks manage cursor state and list accumulation.

---

## Phase 2 (architect for, don't build yet)

- **n8n price check:** Weekly workflow queries Notion wishlist → fetches current price from LEGO.com or BrickLink API → toggles On Sale if price < MSRP × 0.85 → appends sale items to morning digest email
- **BrickLink API name lookup:** Auto-fill minifig names on ID entry (requires BrickLink OAuth — non-trivial, defer)
- **lego-ai-builder integration:** Reads `inventory_sets` Notion DB → calls BrickLink set→parts API → builds parts manifest → passes as constraint to voxel pipeline. Set Number must stay a clean queryable field for this to work.
- **Voice-controlled fuzzy search (inventory):** Microphone button in inventory tab → Web Speech API (built into Safari on iPad, no library needed) captures spoken query → fuse.js fuzzy matches against Name + Theme + Notes fields → highlights matching cards. Designed for a non-reader: "the dragon one" or "Darth Vader" should work. Notes field ("the one from Jake's house") intentionally included in search corpus for this reason. No backend needed — runs entirely client-side against the in-memory loaded inventory.

---

## Environment Variables

```
VITE_NOTION_API_KEY=
VITE_NOTION_WISHLIST_DB_ID=
VITE_NOTION_INVENTORY_SETS_DB_ID=
VITE_NOTION_INVENTORY_MINIFIGS_DB_ID=
VITE_REBRICKABLE_API_KEY=
```

---

## Build Sequence (recommended for Claude Code)

1. Notion DB setup (manual or script — see note below)
2. `lib/notion.js` — API wrapper + field mappings
3. `lib/bricklink.js` — image URL constructor
4. `lib/rebrickable.js` — set lookup
5. `hooks/useWishlist.js` + `hooks/useInventory.js`
6. Admin view — WishlistTable + AddItemForm (get data flowing first)
7. Kid view — TierTab + WishlistCard (read-only, then add rank controls)
8. DetailModal
9. PWA manifest + service worker
10. Responsive layout pass

---

## Notion DB Setup: Manual vs Script

**Manual (recommended for first run):**
Create the three DBs in Notion by hand, copy the DB IDs into `.env`. Faster to start, easier to tweak schema as you go. DB IDs are in the URL: `notion.so/{workspace}/{DB_ID}?v=...`

**Setup script (useful if you ever recreate from scratch):**
A `scripts/setup-notion.js` that calls the Notion API to create all three DBs with correct schema. Good to have as a backup/documentation artifact even if you create manually first. Claude Code can generate this alongside the main app — just don't run it if DBs already exist.

**Recommendation:** Create manually first. Have Claude Code generate the setup script as documentation. Both take ~15 minutes.

---

*Last updated: May 2026*
