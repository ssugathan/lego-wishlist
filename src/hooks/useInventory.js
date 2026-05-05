import { useCallback, useEffect, useRef, useState } from 'react';
import { inventorySets, inventoryMinifigs } from '../lib/notion.js';

// useInventory
//
// Reads either the sets or minifigs DB depending on `kind` ("sets" | "minifigs").
// Same cursor-pagination pattern as useWishlist; sorted by Date Added desc per
// SPEC.md ("Sort is always by ... Date Added descending (inventory)"). Mutations
// are optimistic with rollback.

const PAGE_SIZE = 20;

const SOURCES = {
  sets: inventorySets,
  minifigs: inventoryMinifigs,
};

export function useInventory(kind = 'sets') {
  const source = SOURCES[kind];
  if (!source) throw new Error(`Unknown inventory kind: ${kind}`);

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const queryIdRef = useRef(0);

  const fetchPage = useCallback(
    async (nextCursor) => {
      const queryId = ++queryIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const res = await source.query({
          cursor: nextCursor || undefined,
          pageSize: PAGE_SIZE,
          sorts: [{ property: 'Date Added', direction: 'descending' }],
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
    [source]
  );

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

  const create = useCallback(
    async (obj) => {
      const withDate = obj.dateAdded ? obj : { ...obj, dateAdded: today() };
      const created = await source.create(withDate);
      setItems((prev) => [created, ...prev]);
      return created;
    },
    [source]
  );

  const remove = useCallback(
    async (id) => {
      let snapshot;
      setItems((prev) => {
        snapshot = prev;
        return prev.filter((it) => it.id !== id);
      });
      try {
        await source.remove(id);
      } catch (e) {
        setItems(snapshot);
        throw e;
      }
    },
    [source]
  );

  const updateItem = useCallback(
    async (id, patch) => {
      let snapshot;
      setItems((prev) => {
        snapshot = prev;
        return prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
      });
      try {
        const updated = await source.update(id, patch);
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updated } : it)));
        return updated;
      } catch (e) {
        setItems(snapshot);
        throw e;
      }
    },
    [source]
  );

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    reload,
    create,
    remove,
    updateItem,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
