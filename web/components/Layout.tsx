import React, { PropsWithChildren } from 'react';
import Link from 'next/link';

const navItems: { href: string; label: string }[] = [
  { href: '/', label: 'Request Details' },
  { href: '/env', label: 'Server Env' },
  { href: '/mem', label: 'Memory' },
  { href: '/liveness', label: 'Liveness' },
  { href: '/readiness', label: 'Readiness' },
  { href: '/dns', label: 'DNS Query' },
  { href: '/keygen', label: 'KeyGen' },
  { href: '/memq', label: 'MemQ Server' },
  { href: '/fs', label: 'File System' }
];

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-catalog-accent text-white shadow-subtle">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold tracking-wide">KUARD</span>
            <span className="pill bg-catalog-gold text-black">Demo</span>
          </div>
          <div className="text-[11px] tracking-wide bg-catalog-accentDark/70 px-2 py-1 rounded-sm">
            Potentially sensitive diagnostic data – do not expose publicly
          </div>
        </div>
      </header>
  <div className="flex flex-1 max-w-7xl w-full mx-auto gap-8 px-5 py-6">
        <nav className="w-60 shrink-0 flex flex-col">
          <div className="panel mb-4">
            <div className="panel-header uppercase text-[11px] text-neutral-600">Navigation</div>
            <ul className="p-2 space-y-1">
              {navItems.map(i => (
                <li key={i.href}>
                  <Link prefetch={false} href={i.href} className="block px-3 py-2 rounded-sm text-[13px] font-medium hover:bg-catalog-accent/10 hover:text-catalog-accent focus:bg-catalog-accent/15 focus:outline-none transition-colors">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto text-[11px] text-neutral-500 px-2">Versioned diagnostics UI</div>
        </nav>
        <main className="flex-1 min-w-0 panel p-5 overflow-auto">
          {children}
        </main>
      </div>
      <footer className="text-[11px] text-neutral-600 text-center border-t border-neutral-300 py-4 mt-4 bg-gradient-to-b from-neutral-100 to-neutral-200">
        KUARD modernized UI • Internal diagnostic tooling
      </footer>
    </div>
  );
}
