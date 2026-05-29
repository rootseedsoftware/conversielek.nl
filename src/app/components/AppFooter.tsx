// Dunne globale footer met juridische links + copyright. Verschijnt onder
// elke pagina (rendered in layout.tsx). Voor pagina-specifieke marketing-
// footers (zoals op de landing) is dit een aanvulling, geen vervanging.

import Link from 'next/link';
import { company } from '@/lib/data/company';

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-100 bg-slate-50/40 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          © {year} {company.legalName} — alle rechten voorbehouden.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/privacy" className="hover:text-slate-900 transition">
            Privacy
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/algemene-voorwaarden" className="hover:text-slate-900 transition">
            Algemene voorwaarden
          </Link>
          <span className="text-slate-300">·</span>
          <a
            href={`mailto:${company.email.general}`}
            className="hover:text-slate-900 transition"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
