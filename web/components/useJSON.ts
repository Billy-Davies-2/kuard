import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseJSONResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

// Generic JSON fetch hook with abort + reload support.
export function useJSON<T = unknown>(url: string | null, deps: any[] = []): UseJSONResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    if (!url) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(null);
    fetch(url, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
      .then(j => setData(j))
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
  }, [url]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { data, error, loading, reload: load };
}
