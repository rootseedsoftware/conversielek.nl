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

  return (
    <footer className="border-t border-slate-100 bg-slate-50/40 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            © {year} {company.legalName} — alle rechten voorbehouden.
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Link href="/privacy" className="hover:text-slate-900 transition">
              Privacy
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/cookies" className="hover:text-slate-900 transition">
              Cookies
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/algemene-voorwaarden" className="hover:text-slate-900 transition">
              Algemene voorwaarden
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/verwerkersovereenkomst" className="hover:text-slate-900 transition">
              Verwerkersovereenkomst
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/sub-processors" className="hover:text-slate-900 transition">
              Sub-verwerkers
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/contact" className="hover:text-slate-900 transition">
              Contact
            </Link>
          </div>
        </div>
        <div className="text-slate-400">
          KvK {company.kvk} · BTW {company.btw} · {company.address.street},{' '}
          {company.address.postalCode} {company.address.city}
        </div>
      </div>
    </footer>
  );
}
