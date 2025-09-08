import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { useJSON } from '../../components/useJSON';

export default function MemPage() {
  const { data, loading, error } = useJSON<any>('/mem/api', []);
  const [size, setSize] = useState('1048576');
  const alloc = async () => { await fetch(`/mem/api/alloc?size=${size}`, { method: 'POST' }); location.reload(); };
  const clear = async () => { await fetch('/mem/api/clear', { method: 'POST' }); location.reload(); };
  return <Layout>
    <h1>Memory</h1>
    {loading && <p>Loading...</p>}
    {error && <p style={{color:'red'}}>{error}</p>}
    {data && <pre style={{maxHeight:300, overflow:'auto'}}>{JSON.stringify(data.memStats, null, 2)}</pre>}
    <div style={{display:'flex', gap:8}}>
      <input value={size} onChange={e=>setSize(e.target.value)} style={{width:140}} />
      <button onClick={alloc}>Allocate</button>
      <button onClick={clear}>Clear / GC</button>
    </div>
  </Layout>;
}
