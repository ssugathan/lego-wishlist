// TierTab — responsive card grid for one wishlist tier or one collection
// sub-tab. Owns the IntersectionObserver sentinel that drives infinite scroll
// per SPEC.md ("Initial load: first 20 items per tier/grid... When sentinel
// enters viewport → fetch next page → append to existing list").
//
// Density and column count are passed in by KidView so the same component can
// render Monthly, Occasion, Sets, and Minifigs without branching.

import { useEffect, useRef } from 'react';
import WishlistCard from './WishlistCard.jsx';

export default function TierTab({
  items, cols, density = 'comfy',
  loading, hasMore, loadMore,
  onUp, onDown, onOpen,
  showRank = true,
  mode = 'wishlist',
  emptyMessage = 'Nothing here yet — ask Dad to add something!',
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !loadMore) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, loadMore, items.length]);

  if (!loading && items.length === 0) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        color: '#666',
        fontFamily: 'Fredoka, system-ui',
        fontWeight: 500,
        fontSize: 22,
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: density === 'tight' ? 14 : 22,
      }}>
        {items.map((set, i) => (
          <WishlistCard
            key={set.id}
            set={set}
            rank={showRank ? i + 1 : null}
            index={i}
            total={items.length}
            onUp={() => onUp && onUp(i)}
            onDown={() => onDown && onDown(i)}
            onOpen={() => onOpen(set)}
            mode={mode}
          />
        ))}
      </div>

      <div
        ref={sentinelRef}
        style={{
          height: 40,
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
          fontFamily: 'Fredoka, system-ui',
          fontSize: 14,
        }}
      >
        {loading && hasMore && '…'}
        {loading && !hasMore && items.length === 0 && 'Loading…'}
      </div>
    </>
  );
}
