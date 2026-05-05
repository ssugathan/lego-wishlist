// Full-screen detail modal — ported from the design's modal.jsx.
// Adaptations for production data:
//   - Hero image uses SetImage(variant="hero") so real BrickLink photos
//     render with the chunky placeholder as fallback.
//   - Description sources from set.notes (Notion wishlist) and is hidden
//     gracefully when missing (inventory items don't have a notes field).
//   - Pieces stat is hidden when pieceCount is missing or = 1, since the
//     design only shows it for Sets.

import { SetImage } from './util.jsx';
import { TypeBadge, SaleBadge, Price } from './WishlistCard.jsx';

export default function DetailModal({ set, onClose }) {
  if (!set) return null;
  const showPieces = (set.pieceCount ?? 0) > 1;
  const description = set.notes;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: '#000000ee',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 28,
        animation: 'modalIn 0.25s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f0f0f',
          borderRadius: 32,
          width: '100%',
          maxWidth: 920,
          maxHeight: '92vh',
          overflow: 'auto',
          padding: 32,
          boxShadow: '0 30px 80px #000000, inset 0 1px 0 #ffffff10',
          border: '1px solid #ffffff10',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TypeBadge type={set.type || 'Set'} big />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 56, height: 56,
              borderRadius: '50%',
              background: '#222',
              border: 'none',
              color: '#fff',
              fontSize: 28,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 0 #111',
              fontFamily: 'Fredoka, system-ui',
            }}
          >×</button>
        </div>

        <div style={{ position: 'relative' }}>
          <SetImage set={set} type={set.type || 'Set'} variant="hero" />
          {set.onSale && (
            <div style={{ position: 'absolute', top: 20, right: 20, transform: 'scale(1.3)', transformOrigin: 'top right' }}>
              <SaleBadge big />
            </div>
          )}
        </div>

        <h1 style={{
          margin: 0,
          fontFamily: 'Fredoka, system-ui',
          fontWeight: 700,
          fontSize: 56,
          lineHeight: 1,
          color: '#fff',
          textWrap: 'balance',
        }}>{set.name || '—'}</h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: showPieces ? '1fr 1fr 1fr' : '1fr 1fr',
          gap: 12,
        }}>
          <Stat label="Theme" value={set.theme || '—'} accent="#e3000b" />
          <Stat label="Year"  value={set.year || '—'}  accent="#ffcf00" />
          {showPieces && (
            <Stat label="Pieces" value={set.pieceCount.toLocaleString()} accent="#006cb7" />
          )}
        </div>

        {set.msrp != null && (
          <div style={{
            background: '#1a1a1a',
            borderRadius: 18,
            padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              fontFamily: 'Fredoka, system-ui',
              fontWeight: 600, fontSize: 14,
              color: '#888', letterSpacing: 2, textTransform: 'uppercase',
            }}>Price</div>
            <Price set={set} big />
          </div>
        )}

        {description && (
          <div>
            <div style={{
              fontFamily: 'Fredoka, system-ui',
              fontWeight: 600, fontSize: 14,
              color: '#888', letterSpacing: 2, textTransform: 'uppercase',
              marginBottom: 10,
            }}>About</div>
            <p style={{
              margin: 0,
              fontFamily: 'Fredoka, system-ui',
              fontWeight: 400, fontSize: 22,
              lineHeight: 1.4,
              color: '#e0e0e0',
              textWrap: 'pretty',
            }}>{description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: 18,
      padding: '16px 20px',
      borderTop: `4px solid ${accent}`,
    }}>
      <div style={{
        fontFamily: 'Fredoka, system-ui',
        fontWeight: 600, fontSize: 12,
        color: '#888', letterSpacing: 2, textTransform: 'uppercase',
        marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: 'Fredoka, system-ui',
        fontWeight: 700, fontSize: 26,
        color: '#fff', lineHeight: 1.1,
      }}>{value}</div>
    </div>
  );
}
