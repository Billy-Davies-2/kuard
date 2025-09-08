import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Entry { name: string; path: string; size: number; mode: string; isDir: boolean; modTime: string; symlink?: boolean; target?: string; }
type SortKey = 'name' | 'size' | 'modTime';
interface SortState { key: SortKey; dir: 'asc' | 'desc'; }

export default function FSBrowser() {
  const [cwd, setCwd] = useState('/');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [offset, setOffset] = useState(0);
  const [limit] = useState(200);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [pendingQ, setPendingQ] = useState('');

  const fetchPage = useCallback((dir: string, newOffset: number, reset: boolean) => {
    setLoading(true); setErr(null);
    const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
    fetch(`/fsapi?path=${encodeURIComponent(dir)}&limit=${limit}&offset=${newOffset}${qParam}`)
      .then(r => { if(!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(j => {
        setCwd(j.cwd);
        setTotal(j.total || 0);
        setHasMore(!!j.hasMore);
        setOffset(j.offset || 0);
        if (reset) setEntries(j.entries || []); else setEntries(prev => [...prev, ...(j.entries||[])]);
      })
      .catch(e => setErr(e.message))
      .finally(()=> setLoading(false));
  }, [limit, query]);

  // Load initial directory
  useEffect(()=>{ fetchPage(cwd, 0, true); }, [cwd, query, fetchPage]);

  const go = (e: Entry) => { if (e.isDir) { setOffset(0); setEntries([]); setQuery(''); setPendingQ(''); setCwd(e.path); } };
  const up = () => { if (cwd === '/') return; const parent = cwd.substring(0, cwd.lastIndexOf('/')) || '/'; setOffset(0); setEntries([]); setQuery(''); setPendingQ(''); setCwd(parent); };

  const crumbs = useMemo(() => {
    const parts = cwd === '/' ? [''] : cwd.split('/');
    let acc = '';
    return parts.map((p,i)=>{
      acc = i===0? '/': (acc.endsWith('/')? acc+p: acc+'/'+p);
      if (acc !== '/' && acc.endsWith('//')) acc='/';
      const label = p === '' ? '/' : p;
      return { path: acc === '//' ? '/' : acc, label };
    });
  }, [cwd]);

  const toggleSort = (key: SortKey) => setSort(s => s.key===key? { key, dir: s.dir==='asc'? 'desc':'asc'}: { key, dir: 'asc' });
  const sorted = useMemo(()=>{
    const copy = [...entries];
    copy.sort((a,b)=>{
      // dirs first
      if (a.isDir !== b.isDir) return a.isDir? -1: 1;
      let av:any; let bv:any;
      if (sort.key==='name') { av=a.name.toLowerCase(); bv=b.name.toLowerCase(); }
      else if (sort.key==='size') { av=a.size; bv=b.size; }
      else { av=new Date(a.modTime).getTime(); bv=new Date(b.modTime).getTime(); }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir==='asc'? cmp : -cmp;
    });
    return copy;
  }, [entries, sort]);

  const loadMore = () => { if (hasMore && !loading) fetchPage(cwd, offset + limit, false); };
  const applySearch = (e: React.FormEvent) => { e.preventDefault(); setOffset(0); setEntries([]); setQuery(pendingQ); };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-3">
        Filesystem Browser
        <span className="text-xs font-normal text-neutral-500">{entries.length} / {total} {hasMore && '(partial)'}</span>
      </h2>
      <form onSubmit={applySearch} className="flex items-center gap-2 flex-wrap text-sm">
        <button type="button" onClick={up} disabled={cwd === '/'} className="px-2 py-1 border rounded disabled:opacity-40 bg-white">Up</button>
        <nav className="flex items-center gap-1 flex-wrap text-xs">
          {crumbs.map((c,i)=> <span key={c.path} className="flex items-center">{i>0 && <span className="text-gray-400">/</span>}<button type="button" className="hover:underline" onClick={()=>{ setEntries([]); setOffset(0); setQuery(''); setPendingQ(''); setCwd(c.path);} } disabled={i===crumbs.length-1}>{c.label}</button></span>)}
        </nav>
        <div className="flex items-center gap-1 ml-auto">
          <input value={pendingQ} onChange={e=>setPendingQ(e.target.value)} placeholder="filter (substring)" className="border rounded px-2 py-1 text-xs" />
          <button className="px-2 py-1 border rounded bg-catalog-accent text-white text-xs" type="submit">Apply</button>
          {query && <button type="button" onClick={()=>{setQuery(''); setPendingQ('');}} className="px-2 py-1 border rounded text-xs">Clear</button>}
        </div>
      </form>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="overflow-auto max-h-[60vh] border rounded bg-white">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-neutral-100">
            <tr className="text-left">
              <th className="px-2 py-1 cursor-pointer" onClick={()=>toggleSort('name')}>Name {sort.key==='name' && (sort.dir==='asc'?'▲':'▼')}</th>
              <th className="px-2 py-1 cursor-pointer w-20" onClick={()=>toggleSort('size')}>Size {sort.key==='size' && (sort.dir==='asc'?'▲':'▼')}</th>
              <th className="px-2 py-1">Mode</th>
              <th className="px-2 py-1 cursor-pointer w-44" onClick={()=>toggleSort('modTime')}>Modified {sort.key==='modTime' && (sort.dir==='asc'?'▲':'▼')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(e => <tr key={e.path} className="hover:bg-catalog-accent/10 transition cursor-pointer" onClick={()=>go(e)}>
              <td className="px-2 py-1 whitespace-nowrap">{e.isDir? '📁': e.symlink? '🔗': '📄'} {e.name}{e.symlink && e.target && <span className="text-gray-400"> → {e.target}</span>}</td>
              <td className="px-2 py-1 text-right tabular-nums">{e.isDir? '': e.size}</td>
              <td className="px-2 py-1 font-mono">{e.mode}</td>
              <td className="px-2 py-1 whitespace-nowrap">{new Date(e.modTime).toLocaleString()}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs pt-1">
        <div>Offset {offset} • Showing {entries.length} of {total}{query && ` (filtered by "${query}")`}</div>
        {hasMore && <button disabled={loading} onClick={loadMore} className="px-3 py-1 rounded bg-catalog-accent text-white disabled:opacity-40">{loading? 'Loading…':'Load more'}</button>}
      </div>
    </div>
  );
}
