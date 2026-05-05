import { useState } from 'react';
import { bricklinkImageUrl, onImageError } from '../lib/bricklink.js';

// WishlistTable
//
// Inline-editable table. Click any cell to edit; blur or Enter commits.
// Per-row buttons: Mark Purchased and Delete. Loads more on "Load more"
// click rather than via Intersection Observer — admin is desktop, not
// the kid's iPad, so a button is plenty.

const TIER_OPTIONS = ['Monthly', 'Occasion'];
const TYPE_OPTIONS = ['Set', 'Minifig', 'Part'];
const STATUS_OPTIONS = ['Wishlist', 'Purchased'];

export default function WishlistTable({
  items,
  loading,
  hasMore,
  loadMore,
  updateItem,
  markPurchased,
  remove,
}) {
  return (
    <div className="overflow-x-auto bg-white rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
          <tr>
            <Th>Rank</Th>
            <Th>Image</Th>
            <Th>Name</Th>
            <Th>BrickLink ID</Th>
            <Th>Type</Th>
            <Th>Tier</Th>
            <Th>MSRP</Th>
            <Th>On Sale</Th>
            <Th>Status</Th>
            <Th>Purchased</Th>
            <Th>Notes</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <Row
              key={it.id}
              item={it}
              updateItem={updateItem}
              markPurchased={markPurchased}
              remove={remove}
            />
          ))}
          {items.length === 0 && !loading && (
            <tr><td colSpan="12" className="p-4 text-center text-gray-500">No items.</td></tr>
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

function Row({ item, updateItem, markPurchased, remove }) {
  const [busy, setBusy] = useState(false);

  async function commit(field, value) {
    if (item[field] === value) return;
    setBusy(true);
    try {
      await updateItem(item.id, { [field]: value });
    } finally {
      setBusy(false);
    }
  }

  async function handlePurchase() {
    if (!confirm(`Mark "${item.name}" as purchased?`)) return;
    setBusy(true);
    try { await markPurchased(item.id); } finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This archives the Notion page.`)) return;
    setBusy(true);
    try { await remove(item.id); } finally { setBusy(false); }
  }

  return (
    <tr className={`border-t ${busy ? 'opacity-50' : ''}`}>
      <Td>
        <NumberCell value={item.rank} onCommit={(v) => commit('rank', v)} className="w-14" />
      </Td>
      <Td>
        <img
          src={bricklinkImageUrl(item.type || 'Set', item.bricklinkId)}
          onError={onImageError}
          alt=""
          className="w-12 h-12 object-contain"
        />
      </Td>
      <Td>
        <TextCell value={item.name} onCommit={(v) => commit('name', v)} className="min-w-40" />
      </Td>
      <Td>
        <TextCell value={item.bricklinkId} onCommit={(v) => commit('bricklinkId', v)} className="w-24" />
      </Td>
      <Td>
        <SelectCell value={item.type} options={TYPE_OPTIONS} onCommit={(v) => commit('type', v)} />
      </Td>
      <Td>
        <SelectCell value={item.budgetTier} options={TIER_OPTIONS} onCommit={(v) => commit('budgetTier', v)} />
      </Td>
      <Td>
        <NumberCell value={item.msrp} step="0.01" onCommit={(v) => commit('msrp', v)} className="w-20" />
      </Td>
      <Td>
        <input
          type="checkbox"
          checked={!!item.onSale}
          onChange={(e) => commit('onSale', e.target.checked)}
        />
      </Td>
      <Td>
        <SelectCell value={item.status} options={STATUS_OPTIONS} onCommit={(v) => commit('status', v)} />
      </Td>
      <Td>{item.purchaseDate || '—'}</Td>
      <Td>
        <TextCell value={item.notes} onCommit={(v) => commit('notes', v)} className="min-w-32" />
      </Td>
      <Td>
        <div className="flex gap-1">
          {item.status !== 'Purchased' && (
            <button
              className="text-xs px-2 py-0.5 border rounded text-green-700"
              onClick={handlePurchase}
            >
              Purchased
            </button>
          )}
          <button
            className="text-xs px-2 py-0.5 border rounded text-red-700"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </Td>
    </tr>
  );
}

function Th({ children }) {
  return <th className="px-2 py-2 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children }) {
  return <td className="px-2 py-2 align-middle">{children}</td>;
}

function TextCell({ value, onCommit, className = '' }) {
  const [v, setV] = useState(value ?? '');
  return (
    <input
      className={`border rounded px-1 py-0.5 text-sm bg-transparent ${className}`}
      value={v ?? ''}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v || null)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}
function NumberCell({ value, onCommit, step = '1', className = '' }) {
  const [v, setV] = useState(value ?? '');
  return (
    <input
      type="number"
      step={step}
      className={`border rounded px-1 py-0.5 text-sm bg-transparent ${className}`}
      value={v ?? ''}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v === '' ? null : Number(v))}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}
function SelectCell({ value, options, onCommit }) {
  return (
    <select
      className="border rounded px-1 py-0.5 text-sm bg-transparent"
      value={value || ''}
      onChange={(e) => onCommit(e.target.value || null)}
    >
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
