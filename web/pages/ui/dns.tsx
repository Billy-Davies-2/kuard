import React, { useState } from 'react';
import Layout from '../../components/Layout';

export default function DNS() {
  const [name,setName]=useState('example.com');
  const [type,setType]=useState('A');
  const [result,setResult]=useState<string>('');
  const query=async()=>{ const r=await fetch('/dns/api',{method:'POST',body:JSON.stringify({name,type})}); setResult(await r.text()); };
  return <Layout>
    <h1>DNS Query</h1>
    <div style={{display:'flex', gap:8}}>
      <input value={name} onChange={e=>setName(e.target.value)} />
      <input value={type} onChange={e=>setType(e.target.value)} style={{width:80}} />
      <button onClick={query}>Query</button>
    </div>
    <pre style={{marginTop:10, whiteSpace:'pre-wrap'}}>{result}</pre>
  </Layout>;
}
