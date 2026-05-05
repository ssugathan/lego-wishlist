import { useCallback, useRef, useState } from 'react';
import { fetchSetMetadata } from '../lib/rebrickable.js';

// useRebrickable
//
// Imperative lookup hook — caller invokes lookup(setNumber) on blur/confirm
// and reads {data, loading, error}. Concurrent calls are de-duped by request
// id so a slow earlier call can't clobber a faster later one.
//
// `error` is the same string Rebrickable's wrapper throws ("not_found" |
// "auth" | "network") so the form can map them to friendly messages.

export function useRebrickable() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const lookup = useCallback(async (setNumber) => {
    const id = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSetMetadata(setNumber);
      if (id !== requestIdRef.current) return null;
      setData(result);
      return result;
    } catch (e) {
      if (id !== requestIdRef.current) return null;
      setError(e.message || 'network');
      setData(null);
      return null;
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current++;
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, lookup, reset };
}
