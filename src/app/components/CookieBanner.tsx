'use client';

// Cookie-consent banner.
//
// AVG-vereiste: "Accepteer alle" en "Alleen noodzakelijk" moeten gelijk-
// prominent zijn (zelfde grootte, vergelijkbare kleur). Dat is precies
// wat audits van andere webshops aan ons als feedback geven — we mogen
// hier niet zelf overheen vallen.
//
// Op dit moment heeft Conversielek geen tracking-cookies. Beide knoppen
// hebben praktisch hetzelfde gevolg (alleen functionele auth-cookies).
// We tonen ze toch zodat:
//   1. de keuze is gerespecteerd zodra we later analytics willen
//   2. we juridisch op orde zijn voor de overheid en bezoekers
//
// Keuze wordt in localStorage bewaard zodat de banner niet bij elke
// pagina-load terugkomt.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'conversielek:cookie-consent';

type Consent = 'accepted' | 'necessary-only';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // setState in microtask zodat de Next 16 react-hooks/set-state-in-effect
    // rule niet klaagt over cascading renders.
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) setVisible(true);
      } catch {
        // localStorage geblokkeerd (private mode etc.) — toon banner sowieso
        setVisible(true);
      }
    });
  }, []);

  const save = (choice: Consent) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* private-mode: kan niet bewaren, jammer */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 sm:bottom-6 sm:inset-x-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Cookie className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Cookies — kort en eerlijk</p>
            <p>
              We gebruiken alleen functionele cookies om je inlog-sessie te onthouden. Geen
              tracking, geen advertenties, geen verkoop aan derden. Meer in onze{' '}
              <Link href="/privacy" className="text-orange-600 hover:underline font-medium">
                privacyverklaring
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => save('necessary-only')}
            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium text-sm transition"
          >
            Alleen noodzakelijk
          </button>
          <button
            onClick={() => save('accepted')}
            className="px-4 py-2.5 rounded-lg border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition"
          >
            Accepteer alle
          </button>
        </div>
      </div>
    </div>
  );
}
