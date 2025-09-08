import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useJSON } from '../components/useJSON';
import { StatusBadge } from '../components/StatusBadge';
import { useInterval } from '../components/useInterval';

export default function Readiness() {
  const { data, error, loading, reload } = useJSON<any>('/ready/api', []);
  const [auto, setAuto] = useState(true);
  useInterval(() => { if (auto) reload(); }, 5000, [auto]);
  const ok = !error && !!data;
  return (
    <Layout>
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-xl font-semibold">Readiness Probe</h1>
        <div className="flex items-center gap-3 text-[11px]">
          <StatusBadge ok={ok} />
          <label className="flex items-center gap-1"><input type="checkbox" className="accent-catalog-accent" checked={auto} onChange={e=>setAuto(e.target.checked)} /><span className="font-medium">Auto</span></label>
          <button onClick={reload} className="px-2 py-[3px] rounded border bg-white text-[11px]">Refresh</button>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium text-sm uppercase tracking-wide text-neutral-600 mb-1">Raw Response</h3>
          {loading && <div className="text-[11px] text-neutral-500 animate-pulse mb-2">Updating…</div>}
          {data && <pre className="text-[11px] bg-neutral-50 border rounded-sm p-2 max-h-72 overflow-auto">{JSON.stringify(data,null,2)}</pre>}
        </div>
        <div className="space-y-3 text-[12px]">
          <h3 className="font-medium text-sm uppercase tracking-wide text-neutral-600">Details</h3>
          <p>Endpoint returns success when dependencies (e.g., NATS) are reachable.</p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li>Auto refresh every 5s while enabled</li>
            <li>Status derived from request success</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}

