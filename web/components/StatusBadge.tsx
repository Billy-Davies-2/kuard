import React from 'react';

export function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-sm text-[11px] font-medium border tracking-wide ${
        ok
          ? 'bg-green-100 border-green-300 text-green-800'
          : 'bg-red-100 border-red-300 text-red-800'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
      />
      {label || (ok ? 'HEALTHY' : 'UNHEALTHY')}
    </span>
  );
}
