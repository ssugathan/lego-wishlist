import { useState } from 'react';
import { bricklinkImageUrl, onImageError } from '../lib/bricklink.js';

// InventoryTable
//
// Renders either the sets or minifigs inventory table based on `kind`.
// Columns differ between the two but the row mechanics (delete, load more)
// are identical, so a single component keeps things simple.

export default function InventoryTable({ kind, items, loading, hasMore, loadMore, remove }) {
  const isSets = kind === 'sets';
  return (
    <div className="overflow-x-auto bg-white rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
          <tr>
            <Th>{isSets ? 'Set #' : 'BrickLink ID'}</Th>
            <Th>Image</Th>
            <Th>Name</Th>
            <Th>Theme</Th>
            {isSets && <Th>Year</Th>}
            {isSets && <Th>Pieces</Th>}
            {isSets ? <Th>Condition</Th> : <Th>Qty</Th>}
            <Th>Date Added</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <Row key={it.id} kind={kind} item={it} remove={remove} />
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={isSets ? 9 : 7} className="p-4 text-center text-gray-500">No items.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="p-3 flex justify-center">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-sm px-3 py-1 border rounded disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : (
          loading ? <span className="text-xs text-gray-500">Loading…</span> : null
        )}
      </div>
    </div>
  );
}

function Row({ kind, item, remove }) {
  const isSets = kind === 'sets';
  const id = isSets ? item.setNumber : item.bricklinkId;
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const label = isSets ? `set ${id}` : `minifig ${id}`;
    if (!confirm(`Delete ${label}? This archives the Notion page.`)) return;
    setBusy(true);
    try { await remove(item.id); } finally { setBusy(false); }
  }

  return (
    <tr className={`border-t ${busy ? 'opacity-50' : ''}`}>
      <Td>{id}</Td>
      <Td>
        <img
          src={item.imageUrl || bricklinkImageUrl(isSets ? 'Set' : 'Minifig', id)}
          onError={onImageError}
          alt=""
          className="w-12 h-12 object-contain"
        />
      </Td>
      <Td>{item.name || '—'}</Td>
      <Td>{item.theme || '—'}</Td>
      {isSets && <Td>{item.year ?? '—'}</Td>}
      {isSets && <Td>{item.pieceCount ?? '—'}</Td>}
      <Td>{isSets ? (item.condition || '—') : (item.quantity ?? '—')}</Td>
      <Td>{item.dateAdded || '—'}</Td>
      <Td>
        <button
          onClick={handleDelete}
          className="text-xs px-2 py-0.5 border rounded text-red-700"
        >
          Delete
        </button>
      </Td>
    </tr>
  );
}

function Th({ children }) {
  return <th className="px-2 py-2 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children }) {
  return <td className="px-2 py-2 align-middle whitespace-nowrap">{children}</td>;
}
