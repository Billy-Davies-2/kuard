import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

interface PageInfo { hostname: string; addrs: string[]; version: string; requestProto: string; requestAddr: string; }

export default function RequestDetails() {
  const [info,setInfo] = useState<PageInfo|null>(null);
  useEffect(()=>{ fetch('/pageinfo').then(r=>r.json()).then(setInfo).catch(()=>{}); },[]);
  return <Layout>
    <h1 className="text-xl font-semibold mb-4">Request Details</h1>
    {!info && <p>Loading...</p>}
    {info && <div className="space-y-2 text-sm">
      <div><span className="font-medium">Hostname:</span> {info.hostname}</div>
      <div><span className="font-medium">Addresses:</span> {info.addrs?.join(', ')}</div>
      <div><span className="font-medium">Version:</span> {info.version}</div>
      <div><span className="font-medium">Proto:</span> {info.requestProto}</div>
      <div><span className="font-medium">Remote:</span> {info.requestAddr}</div>
    </div>}
  </Layout>;
}
