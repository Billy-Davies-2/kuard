import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useInterval } from '../components/useInterval';

interface Stats { queues: Record<string, any>; }

export default function MemQ() {
  const [stats,setStats]=useState<Stats|null>(null);
  const [queue,setQueue]=useState('test');
  const [msg,setMsg]=useState('hello');
  const [auto,setAuto]=useState(true);
  const [busy,setBusy]=useState(false);
  const load=()=>fetch('/memq/server/stats').then(r=>r.json()).then(setStats).catch(()=>{});
  useEffect(()=>{ load(); },[]);
  useInterval(()=>{ if(auto) load(); }, 4000, [auto, queue]);
  async function action(fn:()=>Promise<any>) { setBusy(true); try { await fn(); } finally { setBusy(false); } }
  const create=()=>action(()=>fetch(`/memq/server/queues?queue=${queue}`,{method:'PUT'}).then(load));
  const del=()=>action(()=>fetch(`/memq/server/queues?queue=${queue}`,{method:'DELETE'}).then(load));
  const enqueue=()=>action(()=>fetch(`/memq/server/queues/enqueue?queue=${queue}`,{method:'POST', body:msg}).then(load));
  const dequeue=()=>action(()=>fetch(`/memq/server/queues/dequeue?queue=${queue}`,{method:'POST'}).then(r=> r.status===204? '(empty)': r.json()).then(load));
  return <Layout>
    <div className="flex items-start justify-between mb-4">
      <h1 className="text-xl font-semibold">MemQ Server</h1>
      <div className="flex items-center gap-3 text-[11px]">
        <label className="flex items-center gap-1"><input type="checkbox" className="accent-catalog-accent" checked={auto} onChange={e=>setAuto(e.target.checked)} /><span className="font-medium">Auto</span></label>
        <button onClick={load} className="px-2 py-[3px] border rounded bg-white">Refresh</button>
      </div>
    </div>
    <form onSubmit={e=>{e.preventDefault(); enqueue();}} className="flex flex-wrap gap-2 mb-3 text-sm">
      <input value={queue} onChange={e=>setQueue(e.target.value)} placeholder='queue name' className="border rounded px-2 py-1" />
      <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder='message' className="border rounded px-2 py-1 flex-1 min-w-[160px]" />
      <div className="flex gap-1 flex-wrap">
        <button type="button" onClick={create} className="px-2 py-1 rounded border bg-white text-[11px]">Create</button>
        <button type="button" onClick={del} className="px-2 py-1 rounded border bg-white text-[11px]">Delete</button>
        <button type="submit" className="px-2 py-1 rounded bg-indigo-600 text-white text-[11px]">Enqueue</button>
        <button type="button" onClick={dequeue} className="px-2 py-1 rounded border bg-white text-[11px]">Dequeue</button>
      </div>
      {busy && <span className="text-[11px] text-amber-600 animate-pulse">Working…</span>}
    </form>
    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
      <div>
        <h3 className="font-medium text-sm uppercase tracking-wide text-neutral-600 mb-1">Statistics</h3>
        <pre className="text-[11px] bg-neutral-50 border rounded-sm p-2 max-h-72 overflow-auto">{JSON.stringify(stats,null,2)}</pre>
      </div>
      <div className="text-[12px] space-y-2">
        <h3 className="font-medium text-sm uppercase tracking-wide text-neutral-600">Notes</h3>
        <p>Each queue resides in NATS JetStream. Simple controls allow rapid experimentation.</p>
        <ul className="list-disc pl-5 space-y-1 text-neutral-600">
          <li>Auto refresh every 4s</li>
          <li>Dequeue returns 204 when empty</li>
        </ul>
      </div>
    </div>
  </Layout>;
}

