'use client';

// Avatar-dropdown voor ingelogde gebruikers — vervangt de eerdere
// "Ingelogd als x · Uitloggen"-tekststrip die slechte UX gaf (account-
// link was alleen een onderlijnd email-adres, niet ontdekbaar).
//
// Volgt het standaard SaaS-pattern (Stripe/Vercel/Notion): initialen-
// cirkel met chevron rechtsboven, klik opent dropdown met email-header
// + clear actiekeuzes + uitloggen.
//
// Accessibility:
//  - aria-haspopup + aria-expanded op de trigger
//  - Escape sluit
//  - Klik buiten dropdown sluit
//  - keyboard-bediening via native button + Link focus

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Settings, ListChecks, Zap, Shield } from 'lucide-react';
import { signOut } from '@/app/auth/actions';

export default function UserMenu({
  email,
  showAdminLink = false,
}: {
  email: string;
  showAdminLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sluit bij klik buiten dropdown
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Sluit bij Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const initial = email[0]?.toUpperCase() ?? '?';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account-menu openen"
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30"
      >
        <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
          {initial}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 origin-top-right"
        >
          {/* Email-header */}
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Ingelogd als
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={email}>
              {email}
            </div>
          </div>

          {/* Acties */}
          {/* Buttons + window.location ipv <Link>: forceert page.tsx
              remount waardoor de useEffect die ?view leest opnieuw runt.
              Next Link doet soft-navigation, dan firet de mount-effect
              niet opnieuw als user al op / is. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              window.location.href = '/?view=audit';
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
          >
            <Zap className="w-4 h-4 text-slate-400" />
            Nieuwe audit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              window.location.href = '/?view=history';
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
          >
            <ListChecks className="w-4 h-4 text-slate-400" />
            Mijn audits
          </button>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            Account &amp; pakket
          </Link>

          {showAdminLink && (
            <>
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition font-medium"
              >
                <Shield className="w-4 h-4 text-orange-500" />
                Admin
              </Link>
            </>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Uitloggen
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
