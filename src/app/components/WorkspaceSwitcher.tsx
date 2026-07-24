'use client';

// M5c — Workspace-switcher dropdown voor de header.
//
// Serveronderdeel (AuthBar) fetcht workspaces + current, geeft ze door.
// Wij tonen ze in een dropdown en callen setActiveWorkspaceAction bij
// switch — die schrijft de cookie en refresh't de router zodat elke
// server-component de nieuwe context leest.
//
// Verborgen als de user maar één workspace heeft (personal only) —
// dan is er niks te switchen. Link naar /account/team blijft dan
// zichtbaar via de account-page zelf.

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronsUpDown, Users, User, Settings } from 'lucide-react';
import type { Workspace } from '@/lib/workspace-types';
import { setActiveWorkspaceAction } from '@/lib/workspace-client-actions';

type Props = {
  workspaces: Workspace[];
  currentId: string | null;
};

export default function WorkspaceSwitcher({ workspaces, currentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Click-buiten om te sluiten
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  if (workspaces.length === 0) return null;

  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0];

  const handleSwitch = (wsId: string) => {
    if (wsId === current.id) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setActiveWorkspaceAction(wsId);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
        title="Wissel workspace"
      >
        {current.type === 'team' ? (
          <Users className="w-3.5 h-3.5 text-orange-500" />
        ) : (
          <User className="w-3.5 h-3.5" />
        )}
        <span className="max-w-[140px] truncate">{current.name}</span>
        <ChevronsUpDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            Workspaces
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {workspaces.map((w) => {
              const isActive = w.id === current.id;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => handleSwitch(w.id)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                      isActive ? 'bg-orange-50 dark:bg-orange-500/10' : ''
                    }`}
                  >
                    {w.type === 'team' ? (
                      <Users className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    ) : (
                      <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-900 dark:text-slate-100 truncate">{w.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {w.type === 'team' ? 'Team' : 'Persoonlijk'} · {w.role}
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/account/team"
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Team & workspaces beheren
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
