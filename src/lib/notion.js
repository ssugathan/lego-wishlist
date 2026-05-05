const API_BASE = '/api/notion';
const NOTION_VERSION = '2022-06-28';
const API_KEY = import.meta.env.VITE_NOTION_API_KEY;

export const DB_IDS = {
  wishlist: import.meta.env.VITE_NOTION_WISHLIST_DB_ID,
  inventorySets: import.meta.env.VITE_NOTION_INVENTORY_SETS_DB_ID,
  inventoryMinifigs: import.meta.env.VITE_NOTION_INVENTORY_MINIFIGS_DB_ID,
};

export const wishlistFields = {
  name: { notion: 'Name', type: 'title' },
  bricklinkId: { notion: 'BrickLink ID', type: 'rich_text' },
  type: { notion: 'Type', type: 'select' },
  budgetTier: { notion: 'Budget Tier', type: 'select' },
  rank: { notion: 'Rank', type: 'number' },
  msrp: { notion: 'MSRP', type: 'number' },
  onSale: { notion: 'On Sale', type: 'checkbox' },
  buyUrl: { notion: 'Buy URL', type: 'url' },
  status: { notion: 'Status', type: 'select' },
  purchaseDate: { notion: 'Purchase Date', type: 'date' },
  notes: { notion: 'Notes', type: 'rich_text' },
  theme: { notion: 'Theme', type: 'rich_text' },
  year: { notion: 'Year', type: 'number' },
  pieceCount: { notion: 'Piece Count', type: 'number' },
};

export const inventorySetsFields = {
  setNumber: { notion: 'Set Number', type: 'title' },
  name: { notion: 'Name', type: 'rich_text' },
  theme: { notion: 'Theme', type: 'rich_text' },
  year: { notion: 'Year', type: 'number' },
  pieceCount: { notion: 'Piece Count', type: 'number' },
  condition: { notion: 'Condition', type: 'select' },
  dateAdded: { notion: 'Date Added', type: 'date' },
};

export const inventoryMinifigsFields = {
  bricklinkId: { notion: 'BrickLink ID', type: 'title' },
  name: { notion: 'Name', type: 'rich_text' },
  theme: { notion: 'Theme', type: 'select' },
  quantity: { notion: 'Quantity', type: 'number' },
  dateAdded: { notion: 'Date Added', type: 'date' },
};

function extractProperty(property) {
  if (!property) return null;
  switch (property.type) {
    case 'title':
      return property.title.map((t) => t.plain_text).join('');
    case 'rich_text':
      return property.rich_text.map((t) => t.plain_text).join('');
    case 'number':
      return property.number;
    case 'select':
      return property.select?.name ?? null;
    case 'checkbox':
      return property.checkbox;
    case 'url':
      return property.url;
    case 'date':
      return property.date?.start ?? null;
    default:
      return null;
  }
}

function buildProperty(value, type) {
  switch (type) {
    case 'title':
      return { title: value ? [{ type: 'text', text: { content: String(value) } }] : [] };
    case 'rich_text':
      return { rich_text: value ? [{ type: 'text', text: { content: String(value) } }] : [] };
    case 'number':
      return { number: value === '' || value == null ? null : Number(value) };
    case 'select':
      return { select: value ? { name: String(value) } : null };
    case 'checkbox':
      return { checkbox: Boolean(value) };
    case 'url':
      return { url: value || null };
    case 'date':
      return { date: value ? { start: value } : null };
    default:
      return null;
  }
}

export function pageToObject(page, fields) {
  const obj = { id: page.id };
  for (const [key, { notion }] of Object.entries(fields)) {
    obj[key] = extractProperty(page.properties[notion]);
  }
  return obj;
}

export function objectToProperties(obj, fields) {
  const properties = {};
  for (const [key, { notion, type }] of Object.entries(fields)) {
    if (obj[key] !== undefined) {
      properties[notion] = buildProperty(obj[key], type);
    }
  }
  return properties;
}

async function notionFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function queryDatabase(dbId, fields, { cursor, sorts, filter, pageSize = 20 } = {}) {
  const body = { page_size: pageSize };
  if (cursor) body.start_cursor = cursor;
  if (sorts) body.sorts = sorts;
  if (filter) body.filter = filter;

  const data = await notionFetch(`/v1/databases/${dbId}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return {
    results: data.results.map((page) => pageToObject(page, fields)),
    next_cursor: data.next_cursor,
    has_more: data.has_more,
  };
}

export async function createPage(dbId, fields, obj) {
  const data = await notionFetch('/v1/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties: objectToProperties(obj, fields),
    }),
  });
  return pageToObject(data, fields);
}

export async function updatePage(pageId, fields, obj) {
  const data = await notionFetch(`/v1/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties: objectToProperties(obj, fields) }),
  });
  return pageToObject(data, fields);
}

export async function archivePage(pageId) {
  await notionFetch(`/v1/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true }),
  });
}

export const wishlist = {
  query: (opts) => queryDatabase(DB_IDS.wishlist, wishlistFields, opts),
  create: (obj) => createPage(DB_IDS.wishlist, wishlistFields, obj),
  update: (id, obj) => updatePage(id, wishlistFields, obj),
  remove: (id) => archivePage(id),
};

export const inventorySets = {
  query: (opts) => queryDatabase(DB_IDS.inventorySets, inventorySetsFields, opts),
  create: (obj) => createPage(DB_IDS.inventorySets, inventorySetsFields, obj),
  update: (id, obj) => updatePage(id, inventorySetsFields, obj),
  remove: (id) => archivePage(id),
};

export const inventoryMinifigs = {
  query: (opts) => queryDatabase(DB_IDS.inventoryMinifigs, inventoryMinifigsFields, opts),
  create: (obj) => createPage(DB_IDS.inventoryMinifigs, inventoryMinifigsFields, obj),
  update: (id, obj) => updatePage(id, inventoryMinifigsFields, obj),
  remove: (id) => archivePage(id),
};
