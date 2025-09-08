import Layout from '../components/Layout';
import Link from 'next/link';

export default function Home() {
  const quick = [
    { href: '/mem', label: 'Memory' },
    { href: '/fs', label: 'File System' },
    { href: '/memq', label: 'MemQ' },
    { href: '/dns', label: 'DNS' },
    { href: '/env', label: 'Environment' },
  ];
  return (
    <Layout>
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-wide">KUARD</h1>
        <p className="text-sm text-neutral-600 max-w-prose">Select a panel from the navigation or jump directly using the quick links below. Interface aims to evoke the fast, information-dense feel of an industrial catalog.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quick.map(q => (
            <Link key={q.href} href={q.href} className="group relative overflow-hidden rounded-sm border bg-white px-3 py-3 flex flex-col gap-1 hover:shadow-sm transition">
              <span className="text-[11px] uppercase tracking-wide text-neutral-500">Panel</span>
              <span className="font-medium text-sm group-hover:text-catalog-accent">{q.label}</span>
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-catalog-accent scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
            </Link>
          ))}
        </div>
        <p className="text-xs text-neutral-500">Former /ui/* routes now live at root (e.g. <code>/mem</code>, <code>/fs</code>).</p>
      </div>
    </Layout>
  );
}

