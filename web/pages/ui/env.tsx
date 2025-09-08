import React from 'react';
import Layout from '../../components/Layout';
import { useJSON } from '../../components/useJSON';

export default function EnvPage() {
  const { data, error, loading } = useJSON<any>('/env/api', []);
  return <Layout>
    <h1>Environment</h1>
    {loading && <p>Loading...</p>}
    {error && <p style={{color:'red'}}>{error}</p>}
    {data && <>
      <h3>Command Line</h3>
      <pre>{JSON.stringify(data.commandLine, null, 2)}</pre>
      <h3>Env</h3>
      <pre style={{maxHeight:300, overflow:'auto'}}>{JSON.stringify(data.env, null, 2)}</pre>
    </>}
  </Layout>;
}
