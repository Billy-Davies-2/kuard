import React from 'react';
import Layout from '../components/Layout';
import FSBrowser from '../components/FSBrowser';

export default function FSPage(){
  return <Layout>
    <div className="animate-fade-in">
      <FSBrowser />
    </div>
  </Layout>;
}

