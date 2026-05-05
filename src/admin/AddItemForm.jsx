import { useEffect, useMemo, useState } from 'react';
import { useRebrickable } from '../hooks/useRebrickable.js';
import { bricklinkImageUrl, onImageError } from '../lib/bricklink.js';

// AddItemForm
//
// Used by the admin Wishlist tab and both inventory sub-tabs. The shape of
// the form depends on `mode`:
//   - "wishlist"        → all wishlist fields, Type select drives ID label
//   - "inventory-sets"  → set number + condition
//   - "inventory-minifigs" → bricklink id + name + theme + qty
//
// Rebrickable auto-fill triggers on blur of the BrickLink ID field, but only
// when Type === "Set" or mode === "inventory-sets". Soft duplicate check uses
// the existingIds prop (caller-provided). It warns; it doesn't block.

const TIER_OPTIONS = ['Monthly', 'Occasion'];
const TYPE_OPTIONS = ['Set', 'Minifig', 'Part'];
const CONDITION_OPTIONS = ['Complete', 'Incomplete'];
const MINIFIG_THEMES = ['Star Wars', 'City', 'Technic', 'Castle', 'Other'];

function emptyState(mode) {
  if (mode === 'inventory-sets') {
    return {
      setNumber: '',
      name: '',
      theme: '',
      year: '',
      pieceCount: '',
      condition: 'Complete',
    };
  }
  if (mode === 'inventory-minifigs') {
    return {
      bricklinkId: '',
      name: '',
      theme: 'Star Wars',
      quantity: 1,
    };
  }
  return {
    name: '',
    bricklinkId: '',
    type: 'Set',
    budgetTier: 'Monthly',
    rank: '',
    msrp: '',
    onSale: false,
    buyUrl: '',
    notes: '',
    theme: '',
    year: '',
    pieceCount: '',
    status: 'Wishlist',
  };
}

export default function AddItemForm({ mode = 'wishlist', existingIds = [], onSubmit }) {
  const [form, setForm] = useState(() => emptyState(mode));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const { data: rbData, loading: rbLoading, error: rbError, lookup, reset } = useRebrickable();

  // Reset form when mode changes (e.g. switching inventory sub-tab).
  useEffect(() => {
    setForm(emptyState(mode));
    reset();
    setSubmitError(null);
  }, [mode, reset]);

  // Apply Rebrickable autofill into the form when a lookup succeeds.
  useEffect(() => {
    if (!rbData) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || rbData.name || '',
      theme: prev.theme || rbData.theme || '',
      year: prev.year || rbData.year || '',
      pieceCount: prev.pieceCount || rbData.pieceCount || '',
    }));
  }, [rbData]);

  const idField = mode === 'inventory-sets' ? 'setNumber' : 'bricklinkId';
  const idValue = form[idField] || '';

  const isSetLookup =
    mode === 'inventory-sets' || (mode === 'wishlist' && form.type === 'Set');

  const duplicate = useMemo(() => {
    if (!idValue) return false;
    return existingIds.includes(idValue.trim());
  }, [idValue, existingIds]);

  const previewType =
    mode === 'inventory-sets' ? 'Set' :
    mode === 'inventory-minifigs' ? 'Minifig' :
    form.type;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleIdBlur() {
    if (!idValue.trim()) return;
    if (isSetLookup) lookup(idValue.trim());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = buildPayload(mode, form);
      await onSubmit(payload);
      setForm(emptyState(mode));
      reset();
    } catch (err) {
      setSubmitError(err.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded border p-4 space-y-3">
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 flex-shrink-0 border rounded bg-gray-50 flex items-center justify-center overflow-hidden">
          {idValue ? (
            <img
              src={bricklinkImageUrl(previewType, idValue.trim())}
              alt=""
              onError={onImageError}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-xs text-gray-400">preview</span>
          )}
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={mode === 'inventory-sets' ? 'Set Number' : 'BrickLink ID'} required>
            <input
              className="border rounded px-2 py-1 w-full"
              value={idValue}
              onChange={(e) => update(idField, e.target.value)}
              onBlur={handleIdBlur}
              placeholder={mode === 'inventory-minifigs' ? 'sw0001' : '75192'}
              required
            />
            {rbLoading && <Hint>Looking up Rebrickable…</Hint>}
            {rbError === 'not_found' && <Hint warn>Set not found on Rebrickable</Hint>}
            {rbError === 'auth' && <Hint warn>Rebrickable auth failed — check API key</Hint>}
            {rbError === 'network' && <Hint warn>Rebrickable network error</Hint>}
            {duplicate && <Hint warn>Heads up — already in this list</Hint>}
          </Field>

          {mode === 'wishlist' && (
            <Field label="Type">
              <select
                className="border rounded px-2 py-1 w-full"
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
              >
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          )}

          <Field label="Name" required={mode !== 'wishlist' || form.type !== 'Part'}>
            <input
              className="border rounded px-2 py-1 w-full"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </Field>

          <Field label="Theme">
            {mode === 'inventory-minifigs' ? (
              <select
                className="border rounded px-2 py-1 w-full"
                value={form.theme}
                onChange={(e) => update('theme', e.target.value)}
              >
                {MINIFIG_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <input
                className="border rounded px-2 py-1 w-full"
                value={form.theme || ''}
                onChange={(e) => update('theme', e.target.value)}
              />
            )}
          </Field>

          {(mode === 'wishlist' || mode === 'inventory-sets') && (
            <Field label="Year">
              <input
                type="number"
                className="border rounded px-2 py-1 w-full"
                value={form.year || ''}
                onChange={(e) => update('year', e.target.value)}
              />
            </Field>
          )}

          {(mode === 'wishlist' || mode === 'inventory-sets') && (
            <Field label="Piece Count">
              <input
                type="number"
                className="border rounded px-2 py-1 w-full"
                value={form.pieceCount || ''}
                onChange={(e) => update('pieceCount', e.target.value)}
              />
            </Field>
          )}

          {mode === 'wishlist' && (
            <>
              <Field label="Budget Tier">
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={form.budgetTier}
                  onChange={(e) => update('budgetTier', e.target.value)}
                >
                  {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Rank (blank = last)">
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-full"
                  value={form.rank || ''}
                  onChange={(e) => update('rank', e.target.value)}
                  placeholder="auto"
                />
              </Field>
              <Field label="MSRP (USD)">
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-2 py-1 w-full"
                  value={form.msrp || ''}
                  onChange={(e) => update('msrp', e.target.value)}
                />
              </Field>
              <Field label="On Sale">
                <label className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    checked={!!form.onSale}
                    onChange={(e) => update('onSale', e.target.checked)}
                  />
                  <span className="text-sm">Sale price active</span>
                </label>
              </Field>
              <Field label="Buy URL" className="md:col-span-2">
                <input
                  type="url"
                  className="border rounded px-2 py-1 w-full"
                  value={form.buyUrl || ''}
                  onChange={(e) => update('buyUrl', e.target.value)}
                  placeholder="https://"
                />
              </Field>
              <Field label="Notes" className="md:col-span-3">
                <input
                  className="border rounded px-2 py-1 w-full"
                  value={form.notes || ''}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </Field>
            </>
          )}

          {mode === 'inventory-sets' && (
            <Field label="Condition">
              <select
                className="border rounded px-2 py-1 w-full"
                value={form.condition}
                onChange={(e) => update('condition', e.target.value)}
              >
                {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          )}

          {mode === 'inventory-minifigs' && (
            <Field label="Quantity">
              <input
                type="number"
                min="1"
                className="border rounded px-2 py-1 w-full"
                value={form.quantity}
                onChange={(e) => update('quantity', e.target.value)}
              />
            </Field>
          )}
        </div>
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setForm(emptyState(mode)); reset(); }}
          className="px-3 py-1 border rounded text-sm"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, required, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="block text-gray-700 mb-1">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Hint({ children, warn }) {
  return (
    <span className={`block text-xs mt-1 ${warn ? 'text-amber-700' : 'text-gray-500'}`}>
      {children}
    </span>
  );
}

// Coerce form state into the shape that matches each Notion DB's field map.
// Empty strings become null/undefined so they don't overwrite existing values.
function buildPayload(mode, form) {
  const num = (v) => (v === '' || v == null ? null : Number(v));
  if (mode === 'inventory-sets') {
    return {
      setNumber: form.setNumber.trim(),
      name: form.name || null,
      theme: form.theme || null,
      year: num(form.year),
      pieceCount: num(form.pieceCount),
      condition: form.condition,
    };
  }
  if (mode === 'inventory-minifigs') {
    return {
      bricklinkId: form.bricklinkId.trim(),
      name: form.name || null,
      theme: form.theme,
      quantity: num(form.quantity) ?? 1,
    };
  }
  return {
    name: form.name,
    bricklinkId: form.bricklinkId.trim(),
    type: form.type,
    budgetTier: form.budgetTier,
    rank: num(form.rank),
    msrp: num(form.msrp),
    onSale: !!form.onSale,
    buyUrl: form.buyUrl || null,
    status: 'Wishlist',
    notes: form.notes || null,
    theme: form.theme || null,
    year: num(form.year),
    pieceCount: num(form.pieceCount),
  };
}
