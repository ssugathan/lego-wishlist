// Kid view card — image, type badge, name, meta, price (or "Added"), arrows.
// Ported from the design handoff with three production adaptations:
//   - SetImage replaces SetPlaceholder so real BrickLink photos render when
//     available, with the placeholder as the 404 fallback.
//   - Field names map to the Notion schema (pieceCount, msrp, onSale, notes,
//     dateAdded) instead of the design's prototype data shape (pieces, price,
//     sale, desc, acquired).
//   - Sale price isn't stored in Notion (SPEC.md only has MSRP + On Sale
//     checkbox), so the strikethrough/sale-price treatment from the design
//     simplifies to: msrp rendered in green when onSale is true.

import { SetImage } from './util.jsx';
import { shade } from './util.jsx';

const TYPE_COLORS = {
  Set:     { bg: '#006cb7', fg: '#ffffff', label: 'SET' },
  Minifig: { bg: '#ffcf00', fg: '#1a1a1a', label: 'MINIFIG' },
  Part:    { bg: '#7a7a7a', fg: '#ffffff', label: 'PART' },
};

export function TypeBadge({ type, big = false }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.Set;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: c.bg, color: c.fg,
      padding: big ? '8px 16px' : '5px 12px',
      borderRadius: 999,
      fontFamily: 'Fredoka, system-ui, sans-serif',
      fontWeight: 700,
      fontSize: big ? 16 : 12,
      letterSpacing: 1.2,
      lineHeight: 1,
      boxShadow: `0 2px 0 ${shade(c.bg, -0.3)}`,
    }}>{c.label}</div>
  );
}

export function SaleBadge({ big = false }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: '#22c55e', color: '#0a0a0a',
      padding: big ? '6px 14px' : '4px 10px',
      borderRadius: 8,
      fontFamily: 'Fredoka, system-ui, sans-serif',
      fontWeight: 700,
      fontSize: big ? 15 : 12,
      letterSpacing: 1,
      boxShadow: '0 2px 0 #15803d',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>★ Sale</div>
  );
}

export function Price({ set, big = false }) {
  const fontSize = big ? 28 : 20;
  const onSale = !!set.onSale;
  if (set.msrp == null) return null;
  return (
    <span style={{
      fontFamily: 'Fredoka, system-ui', fontWeight: 700, fontSize,
      color: onSale ? '#22c55e' : '#fff',
    }}>${Number(set.msrp).toFixed(2)}</span>
  );
}

function RankArrow({ dir, onClick, disabled }) {
  const isUp = dir === 'up';
  const bg = isUp ? '#22c55e' : '#3a3a3a';
  const shadow = isUp ? '#15803d' : '#1a1a1a';
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      aria-label={isUp ? 'Move up' : 'Move down'}
      style={{
        flex: 1,
        height: 64,
        background: disabled ? '#222' : bg,
        border: 'none',
        borderRadius: 14,
        boxShadow: disabled ? 'none' : `0 4px 0 ${shadow}`,
        color: disabled ? '#444' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'transform 0.08s, box-shadow 0.08s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(3px)';
        e.currentTarget.style.boxShadow = `0 1px 0 ${shadow}`;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = disabled ? 'none' : `0 4px 0 ${shadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = disabled ? 'none' : `0 4px 0 ${shadow}`;
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ transform: isUp ? '' : 'rotate(180deg)' }}>
        <path d="M12 4 L20 14 L15 14 L15 20 L9 20 L9 14 L4 14 Z" fill="currentColor" />
      </svg>
    </button>
  );
}

function formatAdded(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatMeta(set) {
  const isMulti = (set.pieceCount ?? 1) > 1;
  if (isMulti) {
    return [set.pieceCount.toLocaleString() + ' pcs', set.year]
      .filter(Boolean).join(' • ');
  }
  return [set.theme, set.year].filter(Boolean).join(' • ');
}

export default function WishlistCard({
  set, rank, index, total, onUp, onDown, onOpen, mode = 'wishlist',
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isCollection = mode === 'collection';
  const meta = formatMeta(set);

  return (
    <div
      onClick={onOpen}
      style={{
        background: '#161616',
        borderRadius: 22,
        padding: 14,
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'pointer',
        position: 'relative',
        boxShadow: '0 8px 24px #00000060, inset 0 1px 0 #ffffff08',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {rank != null && (
        <div style={{
          position: 'absolute', top: -10, left: -10, zIndex: 2,
          width: 44, height: 44,
          background: '#ffcf00',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fredoka, system-ui', fontWeight: 700, fontSize: 22,
          color: '#1a1a1a',
          boxShadow: '0 4px 0 #b8930a, 0 6px 14px #00000080',
          border: '3px solid #1a1a1a',
        }}>{rank}</div>
      )}

      <div style={{ position: 'relative' }}>
        <SetImage set={set} type={set.type || (isCollection ? null : 'Set')} variant="card" />
        {set.onSale && !isCollection && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }}>
            <SaleBadge />
          </div>
        )}
        {isCollection && (
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 3,
            background: '#22c55e', color: '#0a0a0a',
            padding: '5px 12px', borderRadius: 999,
            fontFamily: 'Fredoka, system-ui', fontWeight: 700, fontSize: 12,
            letterSpacing: 1.2, textTransform: 'uppercase',
            boxShadow: '0 2px 0 #15803d', whiteSpace: 'nowrap',
          }}>✓ Got it</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <TypeBadge type={set.type || (isCollection ? 'Set' : 'Set')} />
        </div>
        <h3 style={{
          margin: 0,
          fontFamily: 'Fredoka, system-ui',
          fontWeight: 700,
          fontSize: 22,
          lineHeight: 1.1,
          color: '#fff',
          textWrap: 'balance',
        }}>{set.name || '—'}</h3>

        {meta && (
          <div style={{
            fontFamily: 'Fredoka, system-ui',
            fontWeight: 500,
            fontSize: 14,
            color: '#888',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {meta}
          </div>
        )}

        <div style={{ marginTop: 4 }}>
          {isCollection ? (
            <span style={{
              fontFamily: 'Fredoka, system-ui', fontWeight: 600, fontSize: 16,
              color: '#888',
            }}>
              {formatAdded(set.dateAdded) ? `Added ${formatAdded(set.dateAdded)}` : 'In collection'}
            </span>
          ) : (
            <Price set={set} />
          )}
        </div>
      </div>

      {!isCollection && (
        <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
          <RankArrow dir="up"   onClick={onUp}   disabled={isFirst} />
          <RankArrow dir="down" onClick={onDown} disabled={isLast} />
        </div>
      )}
    </div>
  );
}
