// Shared kid-view helpers: color shading, deterministic per-item color picking,
// the chunky brick-stack placeholder, and a SetImage that prefers the real
// BrickLink photo and falls back to the placeholder on 404.
//
// The placeholder + shade() are ported directly from the design handoff
// (lego-wishlist/project/placeholder.jsx) so the visual matches pixel-for-pixel.
// Adapted in two ways for production data:
//   1. Notion items don't carry a `color` field — colorForSet() hashes the
//      bricklinkId/id to pick from the LEGO palette so the placeholder bg is
//      stable across renders.
//   2. SetImage wraps the placeholder so a successful BrickLink fetch trumps it.

import { useState } from 'react';
import { bricklinkImageUrl } from '../lib/bricklink.js';

export function shade(hex, amt) {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  const toHex = (c) => adj(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const PLACEHOLDER_PALETTE = [
  '#0d4f8f', '#0a7a3f', '#7a4422', '#5a7a2a', '#6a6a6a',
  '#4a2a6a', '#c41a1a', '#9a9a9a', '#7a5a2a', '#a83a1a',
  '#1a5a8a', '#c4a014',
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorForSet(set) {
  const seed = String(set.bricklinkId || set.setNumber || set.id || set.name || '');
  return PLACEHOLDER_PALETTE[hash(seed) % PLACEHOLDER_PALETTE.length];
}

export function seedForSet(set) {
  return hash(String(set.bricklinkId || set.setNumber || set.id || set.name || '0'));
}

// Chunky brick-stack placeholder — used as the BrickLink image fallback.
export function SetPlaceholder({ color = '#0d4f8f', seed = 0, size = 240 }) {
  const rand = (n) => {
    const x = Math.sin(seed * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };
  const palette = [color, '#ffcf00', '#e3000b', '#ffffff', '#1a1a1a', '#006cb7'];
  const cols = 6, rows = 5;
  const placed = new Set();
  const bricks = [];
  for (let i = 0; i < 8; i++) {
    const w = 1 + Math.floor(rand(i * 3) * 3);
    const h = 1 + Math.floor(rand(i * 3 + 1) * 2);
    const x = Math.floor(rand(i * 3 + 2) * (cols - w));
    const y = Math.floor(rand(i * 7) * (rows - h));
    const key = `${x},${y}`;
    if (placed.has(key)) continue;
    placed.add(key);
    bricks.push({ x, y, w, h, color: palette[i % palette.length] });
  }
  const cell = size / cols;
  const padding = cell * 0.15;
  return (
    <div style={{
      width: '100%', aspectRatio: '1 / 1',
      background: `radial-gradient(circle at 30% 25%, ${color}55, ${color}22 60%, #0a0a0a 100%)`,
      borderRadius: 18,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, #ffffff10 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }} />
      <div style={{ position: 'relative', width: `${cols * cell}px`, height: `${rows * cell}px` }}>
        {bricks.map((b, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: b.x * cell + padding,
            top: b.y * cell + padding,
            width: b.w * cell - padding * 2,
            height: b.h * cell - padding * 2,
            background: `linear-gradient(180deg, ${b.color}, ${shade(b.color, -0.18)})`,
            borderRadius: cell * 0.12,
            boxShadow: `inset 0 ${cell * 0.08}px 0 #ffffff30, 0 ${cell * 0.06}px 0 ${shade(b.color, -0.35)}, 0 ${cell * 0.12}px ${cell * 0.2}px #00000080`,
            display: 'flex', flexDirection: 'row', flexWrap: 'wrap',
            padding: cell * 0.18,
            gap: cell * 0.1,
            alignContent: 'flex-start',
          }}>
            {Array.from({ length: b.w }).map((_, sx) => (
              <div key={sx} style={{
                width: cell * 0.32,
                height: cell * 0.18,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, #ffffff80, ${b.color} 55%, ${shade(b.color, -0.2)})`,
                marginLeft: sx === 0 ? cell * 0.05 : 0,
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SetPlaceholderLarge({ color, seed }) {
  return (
    <div style={{
      width: '100%', aspectRatio: '4 / 3',
      background: `radial-gradient(circle at 30% 25%, ${color}66, ${color}22 55%, #0a0a0a 100%)`,
      borderRadius: 24,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, #ffffff14 1.5px, transparent 1.5px)',
        backgroundSize: '20px 20px',
      }} />
      <div style={{ width: '70%', transform: 'scale(1.4)' }}>
        <SetPlaceholder color={color} seed={seed} size={300} />
      </div>
    </div>
  );
}

// SetImage tries the real BrickLink photo, falls back to the chunky placeholder.
// `variant` controls aspect ratio: 'card' is square, 'hero' is 4:3 like the
// design's modal hero.
export function SetImage({ set, type, variant = 'card' }) {
  const [errored, setErrored] = useState(false);
  const id = set.bricklinkId || set.setNumber;
  const resolvedType = type || set.type || 'Set';
  const color = colorForSet(set);
  const seed = seedForSet(set);

  if (!id || errored) {
    return variant === 'hero'
      ? <SetPlaceholderLarge color={color} seed={seed} />
      : <SetPlaceholder color={color} seed={seed} />;
  }

  return (
    <div style={{
      width: '100%',
      aspectRatio: variant === 'hero' ? '4 / 3' : '1 / 1',
      borderRadius: variant === 'hero' ? 24 : 18,
      overflow: 'hidden',
      background: `radial-gradient(circle at 30% 25%, ${color}55, ${color}22 60%, #0a0a0a 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img
        src={bricklinkImageUrl(resolvedType, id)}
        alt={set.name || ''}
        onError={() => setErrored(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}
