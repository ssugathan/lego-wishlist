import { useCallback, useEffect, useRef, useState } from 'react';
import { wishlist } from '../lib/notion.js';

// useWishlist
//
// Reads the wishlist DB. Filters can scope to one tier ("Monthly" | "Occasion")
// or to status ("Wishlist" | "Purchased" | null for all). Cursor pagination
// fetches 20 items at a time; loadMore() pulls the next page until has_more
// is false.
//
// SPEC.md says kid view filters Status=Wishlist; admin sees everything. The
// hook accepts both as args so the same code serves both views.
//
// Mutations (updateRank, markPurchased, remove, create, update) optimistically
// patch local state and roll back on error so the UI feels instant.

// Notion's max page size. Matches useInventory so tab-count badges show the
// true total on first paint instead of "items loaded so far".
const PAGE_SIZE = 100;

export function useWishlist({ tier = null, status = 'Wishlist' } = {}) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Identifies the current query so a stale response can't overwrite a newer one.
  const queryIdRef = useRef(0);

  const buildFilter = useCallback(() => {
    const conds = [];
    if (tier) conds.push({ property: 'Budget Tier', select: { equals: tier } });
    if (status) conds.push({ property: 'Status', select: { equals: status } });
    if (conds.length === 0) return undefined;
    if (conds.length === 1) return conds[0];
    return { and: conds };
  }, [tier, status]);

  const fetchPage = useCallback(
    async (nextCursor) => {
      const queryId = ++queryIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const res = await wishlist.query({
          cursor: nextCursor || undefined,
          pageSize: PAGE_SIZE,
          filter: buildFilter(),
          sorts: [{ property: 'Rank', direction: 'ascending' }],
        });
        if (queryId !== queryIdRef.current) return;
        setItems((prev) => (nextCursor ? [...prev, ...res.results] : res.results));
        setCursor(res.next_cursor);
        setHasMore(Boolean(res.has_more));
      } catch (e) {
        if (queryId !== queryIdRef.current) return;
        setError(e);
      } finally {
        if (queryId === queryIdRef.current) setLoading(false);
      }
    },
    [buildFilter]
  );

  // Reload whenever filters change.
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    fetchPage(null);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore || !cursor) return;
    fetchPage(cursor);
  }, [loading, hasMore, cursor, fetchPage]);

  const reload = useCallback(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    fetchPage(null);
  }, [fetchPage]);

  // Optimistic helper: patch one item locally, rollback on error.
  const mutateLocally = useCallback(async (id, patch, remoteCall) => {
    let snapshot;
    setItems((prev) => {
      snapshot = prev;
      return prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
    });
    try {
      const updated = await remoteCall();
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updated } : it)));
      return updated;
    } catch (e) {
      setItems(snapshot);
      throw e;
    }
  }, []);

  const updateRank = useCallback(
    (id, rank) =>
      mutateLocally(id, { rank }, () => wishlist.update(id, { rank })),
    [mutateLocally]
  );

  const markPurchased = useCallback(
    (id) => {
      const today = new Date().toISOString().slice(0, 10);
      const patch = { status: 'Purchased', purchaseDate: today };
      return mutateLocally(id, patch, () => wishlist.update(id, patch));
    },
    [mutateLocally]
  );

  const updateItem = useCallback(
    (id, patch) => mutateLocally(id, patch, () => wishlist.update(id, patch)),
    [mutateLocally]
  );

  const remove = useCallback(
    async (id) => {
      let snapshot;
      setItems((prev) => {
        snapshot = prev;
        return prev.filter((it) => it.id !== id);
      });
      try {
        await wishlist.remove(id);
      } catch (e) {
        setItems(snapshot);
        throw e;
      }
    },
    []
  );

  const create = useCallback(async (obj) => {
    const created = await wishlist.create(obj);
    // Re-sort by rank ascending after insert; cheaper than refetching.
    setItems((prev) =>
      [...prev, created].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
    );
    return created;
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    reload,
    updateRank,
    markPurchased,
    updateItem,
    remove,
    create,
  };
}
