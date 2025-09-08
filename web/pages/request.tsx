import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useInterval } from '../components/useInterval';

interface PageInfo { hostname: string; addrs: string[]; version: string; requestProto: string; requestAddr: string; }

export default function RequestDetails() {
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    const t0 = performance.now();
    fetch('/pageinfo')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(j => setInfo(j))
      .catch(e => setError(e.message))
      .finally(()=> { setLatency(performance.now() - t0); setLoading(false); });
  };
  useEffect(() => { load(); }, []);
  useInterval(() => { if (auto) load(); }, 6000, [auto]);

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(()=>{});
  }

  const items: { label: string; value: string | string[] | undefined; mono?: boolean }[] = [
    { label: 'Hostname', value: info?.hostname },
    { label: 'Addresses', value: info?.addrs?.join(', ') },
    { label: 'Version', value: info?.version },
    { label: 'Proto', value: info?.requestProto },
    { label: 'Remote Addr', value: info?.requestAddr, mono: true },
  ];

  return (
    <Layout>
      <div className="flex items-start justify-between mb-5">
        <h1 className="text-xl font-semibold">Request Details</h1>
        <div className="flex items-center gap-3 text-[11px]">
          <label className="flex items-center gap-1"><input type="checkbox" className="accent-catalog-accent" checked={auto} onChange={e=>setAuto(e.target.checked)} /><span className="font-medium">Auto</span></label>
          <button onClick={load} className="px-2 py-[3px] rounded border bg-white">Refresh</button>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {items.map(i => (
          <div key={i.label} className="bg-neutral-50 border rounded-sm p-3 flex flex-col gap-1 group">
            <span className="text-[11px] uppercase tracking-wide text-neutral-500">{i.label}</span>
            <div className={`text-sm font-medium break-all ${i.mono ? 'font-mono' : ''}`}>{i.value || (loading ? '…' : '-')}</div>
            {i.value && <button onClick={()=>copy(String(i.value))} className="opacity-0 group-hover:opacity-100 transition text-[10px] self-end mt-1 px-1.5 py-[2px] rounded border bg-white hover:bg-neutral-100">Copy</button>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-neutral-600 mb-4">
        {loading && <span className="animate-pulse">Loading…</span>}
        {latency != null && !loading && <span>Last fetch: {latency.toFixed(1)} ms</span>}
        <span className="text-neutral-400">Polling every 6s while Auto is on.</span>
      </div>
      {info && <pre className="text-[11px] bg-neutral-50 border rounded-sm p-2 max-h-72 overflow-auto">{JSON.stringify(info,null,2)}</pre>}
    </Layout>
  );
}

