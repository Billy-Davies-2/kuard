import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useInterval } from '../components/useInterval';

export default function DNS() {
  const [name,setName]=useState('example.com');
  const [type,setType]=useState('A');
  const [result,setResult]=useState<string>('');
  const [auto,setAuto]=useState(false);
  const [loading,setLoading]=useState(false);
  const query=async()=>{ setLoading(true); try { const r=await fetch('/dns/api',{method:'POST',body:JSON.stringify({name,type})}); setResult(await r.text()); } finally { setLoading(false);} };
  useInterval(()=>{ if(auto) query(); }, 8000, [auto,name,type]);
  return <Layout>
    <div className="flex items-start justify-between mb-4">
      <h1 className="text-xl font-semibold">DNS Query</h1>
      <div className="flex items-center gap-2 text-[11px]">
        <label className="flex items-center gap-1"><input type="checkbox" className="accent-catalog-accent" checked={auto} onChange={e=>setAuto(e.target.checked)} /><span className="font-medium">Auto</span></label>
        <button onClick={query} className="px-2 py-[3px] border rounded bg-white">Run</button>
      </div>
    </div>
    <form onSubmit={e=>{e.preventDefault();query();}} className="flex flex-wrap gap-2 mb-3 text-sm">
      <input value={name} onChange={e=>setName(e.target.value)} className="border rounded px-2 py-1" placeholder="hostname" />
      <input value={type} onChange={e=>setType(e.target.value)} className="border rounded px-2 py-1 w-24" placeholder="type" />
      <button className="px-3 py-1 rounded bg-indigo-600 text-white text-sm" type="submit">Query</button>
    </form>
    {loading && <div className="text-[11px] text-neutral-500 animate-pulse mb-2">Querying…</div>}
    <DNSResultView raw={result} />
  </Layout>;
}

function DNSResultView({ raw }: { raw: string }) {
  // Backend returns JSON like {"result":"<multi-line message>"}
  const parsed = useMemo(() => {
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw) as { result?: string };
      return obj.result || '';
    } catch { return raw; }
  }, [raw]);
  if (!raw) return <div className="text-[11px] text-neutral-400">No query yet.</div>;
  if (typeof parsed !== 'string') return <pre className="text-[11px] bg-neutral-50 border rounded-sm p-2 whitespace-pre-wrap leading-tight max-h-80 overflow-auto">{raw}</pre>;

  // Split sections by blank lines; first line = header
  const lines = parsed.split(/\r?\n/).filter(l=>l.length>0);
  const sections: { title: string; rows: string[] }[] = [];
  let current: { title: string; rows: string[] } | null = null;
  for (const ln of lines) {
    if (/^;;/.test(ln)) {
      if (current) sections.push(current);
      current = { title: ln.replace(/^;;\s*/, ''), rows: [] };
    } else if (current) {
      current.rows.push(ln);
    }
  }
  if (current) sections.push(current);

  const tableSection = (s: { title: string; rows: string[] }) => {
    // Heuristically split columns on whitespace (DNS answer format)
    const cells = s.rows.map(r => r.trim().split(/\s+/));
    const maxCols = Math.max(0, ...cells.map(c => c.length));
    return (
      <div key={s.title} className="mb-4">
        <h3 className="font-medium text-[11px] uppercase tracking-wide text-neutral-600 mb-1">{s.title}</h3>
        <div className="overflow-auto border rounded-sm bg-white">
          <table className="w-full text-[11px] font-mono leading-tight">
            <tbody>
              {cells.map((c,i)=>(
                <tr key={i} className="odd:bg-neutral-50 hover:bg-catalog-accent/10 transition-colors">
                  {Array.from({length:maxCols}).map((_,j)=>(<td key={j} className="px-2 py-1 whitespace-nowrap align-top">{c[j]||''}</td>))}
                </tr>
              ))}
              {cells.length===0 && <tr><td className="px-2 py-2 text-neutral-400">(empty)</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Group interesting sections
  const interesting = sections.filter(s => /ANSWER|QUESTION|AUTHORITY|ADDITIONAL/i.test(s.title));
  if (interesting.length === 0) {
    return <pre className="text-[11px] bg-neutral-50 border rounded-sm p-2 whitespace-pre-wrap leading-tight max-h-80 overflow-auto">{parsed}</pre>;
  }
  return (
    <div className="space-y-2 animate-fade-in">
      {interesting.map(tableSection)}
      <details className="text-[11px]">
        <summary className="cursor-pointer select-none text-neutral-600">Raw Output</summary>
        <pre className="mt-2 bg-neutral-50 border rounded-sm p-2 whitespace-pre-wrap max-h-60 overflow-auto">{parsed}</pre>
      </details>
    </div>
  );
}


