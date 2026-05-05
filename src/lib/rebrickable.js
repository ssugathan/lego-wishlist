// Rebrickable API wrapper — set metadata only (minifigs aren't covered).
//
// Endpoint:  https://rebrickable.com/api/v3/lego/sets/{set_num}/
// Auth:      Authorization: key <VITE_REBRICKABLE_API_KEY>
//
// Notes / decisions not in SPEC.md:
//   1. Rebrickable set numbers require a variant suffix ("75192-1", not "75192").
//      Dad will normally type just "75192" in the admin form, so we auto-append
//      "-1" when the input has no dash.
//   2. The set endpoint returns `theme_id` (a number), not a theme name. We
//      resolve it via /lego/themes/{id}/ and memoize per session — themes
//      change rarely and there's no point hammering the endpoint.
//   3. Errors are normalized to thrown Error("not_found" | "auth" | "network")
//      so the calling hook can map them to friendly UI.

const API_BASE = 'https://rebrickable.com/api/v3/lego';
const API_KEY = import.meta.env.VITE_REBRICKABLE_API_KEY;

const themeCache = new Map();

function authHeaders() {
  if (!API_KEY) {
    throw new Error('Missing VITE_REBRICKABLE_API_KEY');
  }
  return { Authorization: `key ${API_KEY}` };
}

function normalizeSetNumber(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  return raw.includes('-') ? raw : `${raw}-1`;
}

async function fetchTheme(themeId) {
  if (themeId == null) return null;
  if (themeCache.has(themeId)) return themeCache.get(themeId);

  const res = await fetch(`${API_BASE}/themes/${themeId}/`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  themeCache.set(themeId, data.name);
  return data.name;
}

export async function fetchSetMetadata(setNumber) {
  const id = normalizeSetNumber(setNumber);
  if (!id) throw new Error('Set number required');

  const res = await fetch(`${API_BASE}/sets/${id}/`, {
    headers: authHeaders(),
  });

  if (res.status === 404) throw new Error('not_found');
  if (res.status === 401 || res.status === 403) throw new Error('auth');
  if (!res.ok) throw new Error('network');

  const data = await res.json();
  const theme = await fetchTheme(data.theme_id);

  return {
    setNumber: data.set_num,        // e.g. "75192-1"
    cleanSetNumber: data.set_num.split('-')[0],  // "75192"
    name: data.name,
    year: data.year,
    pieceCount: data.num_parts,
    theme,
    imageUrl: data.set_img_url,
  };
}
