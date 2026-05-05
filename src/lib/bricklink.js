// BrickLink image URL construction.
//
// URL patterns are taken verbatim from SPEC.md. The kid view is responsible
// for swapping in PLACEHOLDER_SVG via an onError handler if any of these 404
// (e.g. set with no BrickLink image yet, typo'd ID, etc).

const BASE = 'https://img.bricklink.com/ItemImage';

// Default part color = 0 ("not applicable"), matches SPEC.md's minifig URL.
// Callers can pass a real BrickLink color id when they have one.
export function bricklinkImageUrl(type, id, { colorId = 0 } = {}) {
  if (!id) return PLACEHOLDER_SVG;
  const cleanId = String(id).trim();
  switch (type) {
    case 'Set':
      return `${BASE}/SL/${cleanId}.png`;
    case 'Minifig':
      return `${BASE}/MN/0/${cleanId}.png`;
    case 'Part':
      return `${BASE}/PN/${colorId}/${cleanId}.png`;
    default:
      return PLACEHOLDER_SVG;
  }
}

// Inline LEGO-brick SVG, returned as a data URL so an <img> tag can use it
// directly in onError without a network round-trip. Two studs on a 2x1 brick.
export const PLACEHOLDER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" role="img" aria-label="Image unavailable">
      <rect x="4" y="20" width="112" height="56" rx="6" fill="#e3000b" stroke="#1a1a2e" stroke-width="3"/>
      <circle cx="36" cy="20" r="14" fill="#e3000b" stroke="#1a1a2e" stroke-width="3"/>
      <circle cx="84" cy="20" r="14" fill="#e3000b" stroke="#1a1a2e" stroke-width="3"/>
      <circle cx="36" cy="20" r="6" fill="none" stroke="#1a1a2e" stroke-width="2"/>
      <circle cx="84" cy="20" r="6" fill="none" stroke="#1a1a2e" stroke-width="2"/>
    </svg>`
  );

// Convenience for <img onError={onImageError}> — swaps to placeholder once.
export function onImageError(e) {
  if (e.currentTarget.src === PLACEHOLDER_SVG) return;
  e.currentTarget.src = PLACEHOLDER_SVG;
}
