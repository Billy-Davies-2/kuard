import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useJSON } from '../components/useJSON';
import { useInterval } from '../components/useInterval';

function formatBytes(n?: number) {
  if (!n && n !== 0) return '-';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length-1) { v/=1024; i++; }
  return v.toFixed(v < 10 ? 2 : 1) + ' ' + units[i];
}

export default function MemPage() {
  const { data, loading, error, reload } = useJSON<any>('/mem/api', []);
  const [size, setSize] = useState('1MB');
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(true);
  useInterval(() => { if (auto) reload(); }, 5000, [auto]);

  const mem = data?.memStats || {};
  const cards = useMemo(() => [
    { k: 'Alloc', v: formatBytes(mem.Alloc) },
    { k: 'HeapAlloc', v: formatBytes(mem.HeapAlloc) },
    { k: 'HeapSys', v: formatBytes(mem.HeapSys) },
    { k: 'HeapIdle', v: formatBytes(mem.HeapIdle) },
    { k: 'HeapObjects', v: mem.HeapObjects },
    { k: 'NumGC', v: mem.NumGC },
  ], [mem]);

  function parseSize(s: string): number | null {
    const m = /^([0-9]+)([KMG]B?)?$/i.exec(s.replace(/\s+/g,''));
    if (!m) return Number(s) || null;
    const base = Number(m[1]);
    const unit = (m[2]||'').toUpperCase();
    const mult = unit.startsWith('K') ? 1024 : unit.startsWith('M') ? 1024**2 : unit.startsWith('G') ? 1024**3 : 1;
    return base * mult;
  }

  const doAlloc = async () => {
    const bytes = parseSize(size);
    if (bytes == null) return alert('Invalid size');
    setBusy(true);
    try { await fetch(`/mem/api/alloc?size=${bytes}`, { method: 'POST' }); await reload(); } finally { setBusy(false); }
  };
  const doClear = async () => {
    setBusy(true);
    try { await fetch('/mem/api/clear', { method: 'POST' }); await reload(); } finally { setBusy(false); }
  };

  return (
    <Layout>
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-xl font-semibold">Memory</h1>
        <div className="flex items-center gap-3 text-[11px]">
          <label className="flex items-center gap-1"><input type="checkbox" className="accent-catalog-accent" checked={auto} onChange={e=>setAuto(e.target.checked)} /><span className="font-medium">Auto</span></label>
          <button onClick={reload} className="px-2 py-[3px] rounded border bg-white">Refresh</button>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.k} className="bg-neutral-50 border rounded-sm p-3 flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-neutral-500">{c.k}</span>
            <span className="text-sm font-semibold tabular-nums">{c.v}</span>
          </div>
        ))}
      </div>
      <div className="mb-6">
        {loading && <div className="text-[11px] text-neutral-500 animate-pulse mb-2">Updating…</div>}
        {data && <pre className="text-[11px] bg-neutral-50 border rounded-sm p-2 max-h-80 overflow-auto">{JSON.stringify(mem, null, 2)}</pre>}
      </div>
      <div className="space-y-3">
        <h3 className="font-medium text-sm uppercase tracking-wide text-neutral-600">Allocate</h3>
        <div className="flex flex-wrap gap-2 items-center text-[12px]">
          <input value={size} onChange={e=>setSize(e.target.value)} className="border rounded-sm px-2 py-1 text-sm w-32" />
          <div className="flex gap-1">
            {['1MB','5MB','10MB','50MB','100MB'].map(p => <button key={p} onClick={()=>setSize(p)} className="px-2 py-[3px] text-[11px] rounded border bg-white hover:bg-neutral-50">{p}</button>)}
          </div>
          <button disabled={busy} onClick={doAlloc} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm disabled:opacity-50">Allocate</button>
          <button disabled={busy} onClick={doClear} className="px-3 py-1 rounded bg-neutral-700 text-white text-sm disabled:opacity-50">Clear / GC</button>
          {busy && <span className="text-[11px] text-amber-600 animate-pulse">Working…</span>}
        </div>
      </div>
    </Layout>
  );
}

