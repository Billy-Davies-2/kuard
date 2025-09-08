import Layout from '../components/Layout';
import Link from 'next/link';

export default function Home() {
  return <Layout>
    <h1 className="text-2xl font-semibold mb-4">KUARD</h1>
    <p className="mb-4">Select a panel from the left navigation.</p>
    <p className="text-sm text-neutral-500">All previous /ui/* routes now live at root (e.g. <code>/mem</code>, <code>/fs</code>).</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Link href="/mem" className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">Memory</Link>
      <Link href="/fs" className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">File System</Link>
      <Link href="/memq" className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">MemQ</Link>
    </div>
  </Layout>;
}
