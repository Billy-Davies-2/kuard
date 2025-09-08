import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';

interface Stats { queues: Record<string, any>; }

export default function MemQ() {
  const [stats,setStats]=useState<Stats|null>(null);
  const [queue,setQueue]=useState('test');
  const [msg,setMsg]=useState('hello');
  const load=()=>fetch('/memq/server/stats').then(r=>r.json()).then(setStats);
  useEffect(()=>{ load(); },[]);
  const create=()=>fetch(`/memq/server/queues?queue=${queue}`,{method:'PUT'}).then(load);
  const del=()=>fetch(`/memq/server/queues?queue=${queue}`,{method:'DELETE'}).then(load);
  const enqueue=()=>fetch(`/memq/server/queues/enqueue?queue=${queue}`,{method:'POST', body:msg}).then(load);
  const dequeue=()=>fetch(`/memq/server/queues/dequeue?queue=${queue}`,{method:'POST'}).then(r=> r.status===204? '(empty)': r.json()).then(load);
  return <Layout>
    <h1>MemQ</h1>
    <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
      <input value={queue} onChange={e=>setQueue(e.target.value)} placeholder='queue name'/>
      <button onClick={create}>Create</button>
      <button onClick={del}>Delete</button>
      <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder='message'/>
      <button onClick={enqueue}>Enqueue</button>
      <button onClick={dequeue}>Dequeue</button>
      <button onClick={load}>Refresh</button>
    </div>
    <pre style={{marginTop:10}}>{JSON.stringify(stats,null,2)}</pre>
  </Layout>;
}
