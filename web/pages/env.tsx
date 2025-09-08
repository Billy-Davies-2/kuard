import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useJSON } from '../components/useJSON';

interface EnvData { commandLine: string[]; env: Record<string,string>; }

export default function EnvPage() {
  const { data, error, loading } = useJSON<EnvData>('/env/api', []);
  const [filter,setFilter] = useState('');
  const rows = useMemo(()=>{
    if(!data?.env) return [] as [string,string][];
    const entries = Object.entries(data.env);
    return entries
      .filter(([k,v]) => !filter || k.toLowerCase().includes(filter.toLowerCase()) || v.toLowerCase().includes(filter.toLowerCase()))
      .sort((a,b)=> a[0].localeCompare(b[0]));
  },[data,filter]);
  return <Layout>
    <h1 className="text-xl font-semibold mb-4">Environment</h1>
    {loading && <p>Loading...</p>}
    {error && <p className="text-red-600">{error}</p>}
    {data && <div className="space-y-6">
      <div>
        <h2 className="font-medium mb-2">Command Line</h2>
        <code className="block text-xs bg-neutral-100 p-2 rounded border border-neutral-200 whitespace-pre-wrap break-all">{data.commandLine.join(' ')}</code>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Environment Variables</h2>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="filter" className="border rounded px-2 py-1 text-xs" />
        </div>
        <div className="border rounded bg-white max-h-[55vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-neutral-100">
              <tr><th className="text-left px-2 py-1 w-56">Key</th><th className="text-left px-2 py-1">Value</th></tr>
            </thead>
            <tbody>
              {rows.map(([k,v])=> <tr key={k} className="align-top odd:bg-neutral-50 hover:bg-catalog-accent/10">
                <td className="px-2 py-1 font-mono text-[11px] whitespace-nowrap">{k}</td>
                <td className="px-2 py-1 font-mono text-[11px]"><div className="whitespace-pre-wrap break-all">{v}</div></td>
              </tr>)}
              {rows.length===0 && <tr><td colSpan={2} className="px-2 py-4 text-center text-neutral-500">No variables (filtered)</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>}
  </Layout>;
}
