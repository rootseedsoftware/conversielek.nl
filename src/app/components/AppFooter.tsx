// Dunne globale footer met juridische links + copyright. Verschijnt onder
// elke pagina (rendered in layout.tsx). Voor pagina-specifieke marketing-
// footers (zoals op de landing) is dit een aanvulling, geen vervanging.
//
// M8 update: KvK + BTW prominent toegevoegd zodat de site voldoet aan
// Dienstenwet art. 22 — de wettelijke identificatie moet "gemakkelijk
// toegankelijk" zijn op de site. Footer is het standaard-plaats. Links
// uitgebreid met cookies, sub-processors, DPA en contact.

import Link from 'next/link';
import { company } from '@/lib/data/company';

export default function AppFooter() {
  const year = new Date().getFullYear();

  // Link-helpers om dark: variants niet 6x te herhalen
  const linkClass = 'hover:text-slate-900 dark:hover:text-slate-100 transition';
  const sepClass = 'text-slate-300 dark:text-slate-700';

  return (
    <footer className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 mt-auto transition-colors">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            © {year} {company.legalName} — alle rechten voorbehouden.
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Link href="/privacy" className={linkClass}>
              Privacy
            </Link>
            <span className={sepClass}>·</span>
            <Link href="/cookies" className={linkClass}>
              Cookies
            </Link>
            <span className={sepClass}>·</span>
            <Link href="/algemene-voorwaarden" className={linkClass}>
              Algemene voorwaarden
            </Link>
            <span className={sepClass}>·</span>
            <Link href="/verwerkersovereenkomst" className={linkClass}>
              Verwerkersovereenkomst
            </Link>
            <span className={sepClass}>·</span>
            <Link href="/sub-processors" className={linkClass}>
              Sub-verwerkers
            </Link>
            <span className={sepClass}>·</span>
            <Link href="/contact" className={linkClass}>
              Contact
            </Link>
            <span className={sepClass}>·</span>
            <Link href="/developers" className={linkClass}>
              API
            </Link>
          </div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">
          KvK {company.kvk} · BTW {company.btw} · {company.address.street},{' '}
          {company.address.postalCode} {company.address.city}
        </div>
      </div>
    </footer>
  );
}
