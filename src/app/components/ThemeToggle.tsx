'use client';

// Theme-toggle component voor zon/maan switching.
//
// Werking:
//   - Bij mount: lees actieve theme uit document.documentElement (zoals
//     gezet door inline ThemeScript in layout) → sync component state
//   - Bij klik: roteer light → dark → light, schrijf class op <html>,
//     persist in localStorage
//   - 'system' als optie skip ik voor MVP-eenvoud; alleen light/dark
//
// Niet gebruikt: useEffect met initiele setState — risk van flash.
// In plaats: ThemeScript in <head> zet de class al vóór hydration,
// dan vraagt deze component alleen de actuele state op bij mount.

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'cl_theme';

type Theme = 'light' | 'dark';

function readActiveTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export default function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // queueMicrotask voorkomt set-state-in-effect ESLint-rule + cascading
    // renders. Lees de class die ThemeScript al heeft gezet vóór hydration.
    queueMicrotask(() => {
      setTheme(readActiveTheme());
      setMounted(true);
    });
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    if (typeof document !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* localStorage geblokkeerd — geen probleem, OS-preference fallback */
      }
    }
  };

  const toggle = () => apply(theme === 'dark' ? 'light' : 'dark');

  // Pre-hydration: render een neutraal placeholder met dezelfde maten,
  // anders krijg je layout-shift bij hydrate.
  const sizeClasses =
    size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (!mounted) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-slate-100 dark:bg-slate-800`}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Schakel naar lichte modus' : 'Schakel naar donkere modus'}
      title={theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}
      className={`${sizeClasses} flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30`}
    >
      {theme === 'dark' ? <Sun className={iconSize} /> : <Moon className={iconSize} />}
    </button>
  );
}
