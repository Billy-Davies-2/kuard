import React from 'react';
import Layout from '../components/Layout';
import { useJSON } from '../components/useJSON';

export default function Liveness() {
  const { data, error, loading } = useJSON<any>('/healthy/api', []);
  return <Layout>
    <h1>Liveness Probe</h1>
    {loading && <p>Loading...</p>}
    {error && <p style={{color:'red'}}>{error}</p>}
    {data && <pre>{JSON.stringify(data,null,2)}</pre>}
  </Layout>;
}
