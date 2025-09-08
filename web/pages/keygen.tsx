import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useJSON } from '../components/useJSON';

interface KeyGenHistory { id: number; data: string; }
interface KeyGenStatus { config: { enable?: boolean }; history: KeyGenHistory[] }

export default function KeyGen() {
  const { data, loading, error, reload } = useJSON<KeyGenStatus>('/keygen', []);
  const [enable, setEnable] = useState(true);
  useEffect(()=>{ if (data?.config?.enable !== undefined) setEnable(!!data.config.enable); },[data]);
  const save = async () => {
    await fetch('/keygen', { method: 'PUT', body: JSON.stringify({ enable }) });
    reload();
  };
  return <Layout>
    <h1 className="text-xl font-semibold mb-4">KeyGen Workload</h1>
    {loading && <p>Loading...</p>}
    {error && <p className="text-red-600">{error}</p>}
    {data && <div className="space-y-4">
      <label className="flex items-center gap-2"><input type='checkbox' checked={enable} onChange={e=>setEnable(e.target.checked)}/> <span>Enable</span></label>
      <button onClick={save} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Save / Restart</button>
      <div>
        <h3 className="font-medium mb-1">History (latest last)</h3>
        <ul className="text-xs max-h-60 overflow-auto border rounded p-2 space-y-1">
          {data.history?.slice(-50).map(h => <li key={h.id}><code>{h.data}</code></li>)}
        </ul>
      </div>
    </div>}
  </Layout>;
}
