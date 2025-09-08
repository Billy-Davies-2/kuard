import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { useJSON } from '../components/useJSON';
import { useInterval } from '../components/useInterval';


interface KeyGenHistory { id: number; data: string; }
interface KeyGenStatus { config: { enable?: boolean }; history: KeyGenHistory[] }

export default function KeyGen() {
  const { data, loading, error, reload } = useJSON<KeyGenStatus>('/keygen', []);
  const [enable, setEnable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auto, setAuto] = useState(true);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => { if (data?.config?.enable !== undefined) setEnable(!!data.config.enable); }, [data]);

  // Immediate save when toggled via Start/Stop button
  async function toggleEnable() {
    const next = !enable;
    setEnable(next);
    setSaving(true);
    try {
      await fetch('/keygen', { method: 'PUT', body: JSON.stringify({ enable: next }) });
      reload();
    } finally { setSaving(false); }
  }

  // Poll for new history when enabled or auto refresh on
  useInterval(() => { if (auto) reload(); }, 2500, [auto]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [data?.history]);

  const recent = data?.history?.slice(-200) || [];

  // Prometheus metrics scrape (simple parsing) every 5s when enabled
  const [metrics, setMetrics] = useState<{ cpu?: number; rss?: number; keys?: number } | null>(null);
  useInterval(async () => {
    try {
      const res = await fetch('/metrics');
      const txt = await res.text();
      // naive parse for process_cpu_seconds_total, process_resident_memory_bytes, kuard_keygen_keys_generated_total
      const m: any = {};
      for (const line of txt.split('\n')) {
        if (line.startsWith('process_cpu_seconds_total')) {
          const v = parseFloat(line.split(' ')[1]);
          if (!isNaN(v)) m.cpu = v;
        } else if (line.startsWith('process_resident_memory_bytes')) {
          const v = parseFloat(line.split(' ')[1]);
          if (!isNaN(v)) m.rss = v;
        } else if (line.startsWith('kuard_keygen_keys_generated_total')) {
          const v = parseFloat(line.split(' ')[1]);
            if (!isNaN(v)) m.keys = v;
        }
      }
      setMetrics((prev) => ({ ...prev, ...m }));
    } catch {}
  }, 5000, [enable]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1">KeyGen Workload</h1>
        <p className="text-[12px] text-neutral-600 max-w-prose">Continuously generates 4096-bit SSH key pairs to simulate CPU load. Use the Start/Stop control below; metrics update live.</p>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-[11px] text-neutral-600">
            <span className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            {saving ? 'Saving configuration…' : 'Config synchronized'}
            {loading && <span className="ml-3 text-neutral-400 animate-pulse">Updating…</span>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-sm tracking-wide uppercase text-neutral-600">Recent Keys</h3>
              <span className="text-[11px] text-neutral-500">Showing last {recent.length}</span>
            </div>
            <ul ref={listRef} className="text-[11px] font-mono leading-tight max-h-72 overflow-auto border rounded-sm bg-neutral-50 divide-y">
              {recent.map(h => (
                <li key={h.id} className="px-2 py-1 hover:bg-white">{h.data}</li>
              ))}
              {recent.length === 0 && !loading && <li className="px-2 py-2 text-neutral-500">No data yet</li>}
            </ul>
          </div>
        </div>
        <div className="space-y-5">
          <div className="space-y-3 p-4 border rounded-sm bg-white">
            <button
              onClick={toggleEnable}
              className={`w-full relative overflow-hidden px-4 py-3 rounded-sm font-semibold text-[14px] tracking-wide shadow-subtle border transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-catalog-accent ${
                enable
                  ? 'bg-red-600 text-white border-red-700 hover:bg-red-500'
                  : 'bg-green-600 text-white border-green-700 hover:bg-green-500'
              }`}
              disabled={saving}
            >
              {enable ? 'Stop Key Generation' : 'Start Key Generation'}
            </button>
            <div className="flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" className="accent-catalog-accent" checked={auto} onChange={e => setAuto(e.target.checked)} />
                <span className="font-medium">Auto Refresh</span>
              </label>
              <button onClick={() => reload()} className="px-2 py-[3px] text-[11px] rounded border bg-white hover:bg-neutral-50">Refresh</button>
            </div>
            <p className="text-[11px] text-neutral-500">History polling every 2.5s; metrics scrape every 5s.</p>
          </div>
          <div className="space-y-3 p-4 border rounded-sm bg-white">
            <h3 className="font-medium text-sm tracking-wide uppercase text-neutral-600">Live Metrics</h3>
            <ul className="text-[11px] space-y-1">
              <li><span className="text-neutral-500">Keys Generated:</span> <span className="font-mono">{metrics?.keys ?? '—'}</span></li>
              <li><span className="text-neutral-500">Process CPU (s):</span> <span className="font-mono">{metrics?.cpu?.toFixed(2) ?? '—'}</span></li>
              <li><span className="text-neutral-500">Resident Memory:</span> <span className="font-mono">{metrics?.rss ? formatBytes(metrics.rss) : '—'}</span></li>
              <li><span className="text-neutral-500">Status:</span> <span className={`font-semibold ${enable ? 'text-green-700' : 'text-neutral-500'}`}>{enable ? 'RUNNING' : 'STOPPED'}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function formatBytes(n: number) {
  if (!n) return '0B';
  const units = ['B','KB','MB','GB','TB'];
  let i=0; let v=n;
  while (v>=1024 && i<units.length-1){ v/=1024; i++; }
  return (v<10? v.toFixed(2): v.toFixed(1)) + units[i];
}

