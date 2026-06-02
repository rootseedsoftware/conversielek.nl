// Pricing comparison-tabel — uitgebreid feature-overzicht per tier.
//
// Aanvulling op de drie pricing-cards die alleen de USPs tonen. Dit is
// voor bezoekers die "ja, maar wat krijg ik écht meer voor €19 vs €0"
// willen weten — een veelgestelde verkoop-vraag.
//
// Layout:
//   - Desktop: 4-koloms tabel (feature, probeer, webshop, agency)
//   - Mobile: tabel scrollt horizontaal binnen overflow-container
//   - Features gegroepeerd per categorie (Audits, Output, Account,
//     Team, Support) met sub-headers voor scan-baarheid
//
// Symbol-conventie:
//   ✓ groen = inbegrepen
//   ✗ grijs = niet inbegrepen
//   tekst   = specifieke waarde (bv. "2/maand", "Standaard", "Custom")
//   ★ oranje = highlight (uniek voor deze tier)

import { Fragment } from 'react';
import { Check, X, Star } from 'lucide-react';

type Cell = boolean | string | { value: string; highlight?: true };

type FeatureRow = {
  label: string;
  hint?: string;
  probeer: Cell;
  webshop: Cell;
  agency: Cell;
};

type FeatureGroup = {
  title: string;
  rows: FeatureRow[];
};

const groups: FeatureGroup[] = [
  {
    title: 'Audits',
    rows: [
      {
        label: 'Audits per maand',
        probeer: { value: '2' },
        webshop: { value: 'Onbeperkt', highlight: true },
        agency: { value: 'Onbeperkt' },
      },
      {
        label: 'Alle 5 flow-types',
        hint: 'Homepage, product, mandje, checkout, post-purchase',
        probeer: true,
        webshop: true,
        agency: true,
      },
      {
        label: 'Nederlandse microcopy-suggesties',
        probeer: true,
        webshop: true,
        agency: true,
      },
      {
        label: 'Vergelijking met NL-benchmarks',
        hint: 'bol.com, Coolblue, Wehkamp',
        probeer: true,
        webshop: true,
        agency: true,
      },
      {
        label: 'AVG + cookie-banner check',
        probeer: true,
        webshop: true,
        agency: true,
      },
    ],
  },
  {
    title: 'Rapporten & export',
    rows: [
      {
        label: 'Basis PDF-rapport',
        probeer: true,
        webshop: true,
        agency: true,
      },
      {
        label: 'Branded PDF-rapport',
        hint: 'Eigen logo + huisstijl in de header',
        probeer: false,
        webshop: false,
        agency: { value: 'Wit-label', highlight: true },
      },
      {
        label: 'E-mail-export naar collega/klant',
        probeer: false,
        webshop: true,
        agency: true,
      },
      {
        label: 'Voor/na-vergelijking',
        hint: 'Twee audits naast elkaar — tracking van verbeteringen',
        probeer: false,
        webshop: true,
        agency: true,
      },
    ],
  },
  {
    title: 'Account & data',
    rows: [
      {
        label: 'Account vereist',
        probeer: { value: 'Optioneel' },
        webshop: true,
        agency: true,
      },
      {
        label: 'Audits in de cloud (cross-device)',
        probeer: false,
        webshop: true,
        agency: true,
      },
      {
        label: 'Audit-geschiedenis bewaard',
        probeer: { value: 'Lokaal in browser' },
        webshop: { value: 'Onbeperkt' },
        agency: { value: 'Onbeperkt' },
      },
      {
        label: 'Issue progress tracking',
        probeer: true,
        webshop: true,
        agency: true,
      },
    ],
  },
  {
    title: 'Team & multi-tenant',
    rows: [
      {
        label: 'Aantal webshops',
        probeer: { value: '1' },
        webshop: { value: '1' },
        agency: { value: 'Onbeperkt', highlight: true },
      },
      {
        label: 'Workspaces voor klanten',
        hint: 'Aparte omgeving per klant met eigen audits',
        probeer: false,
        webshop: false,
        agency: true,
      },
      {
        label: 'Team-leden uitnodigen',
        probeer: false,
        webshop: false,
        agency: true,
      },
      {
        label: 'API-toegang',
        hint: 'Audits triggeren vanuit eigen tooling',
        probeer: false,
        webshop: false,
        agency: true,
      },
    ],
  },
  {
    title: 'Support',
    rows: [
      {
        label: 'Email-support',
        probeer: { value: 'Best effort' },
        webshop: { value: 'Voorrang' },
        agency: { value: 'Voorrang' },
      },
      {
        label: 'Onboarding-gesprek',
        probeer: false,
        webshop: false,
        agency: true,
      },
    ],
  },
];

function CellRenderer({ cell }: { cell: Cell }) {
  if (cell === true) {
    return <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline" />;
  }
  if (cell === false) {
    return <X className="w-5 h-5 text-slate-300 dark:text-slate-600 inline" />;
  }
  if (typeof cell === 'string') {
    return <span className="text-sm text-slate-700 dark:text-slate-300">{cell}</span>;
  }
  // Object met value + optional highlight
  return (
    <span
      className={
        cell.highlight
          ? 'inline-flex items-center gap-1 text-sm font-semibold text-orange-600 dark:text-orange-400'
          : 'text-sm text-slate-700 dark:text-slate-300'
      }
    >
      {cell.highlight && <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />}
      {cell.value}
    </span>
  );
}

export default function PricingComparison() {
  return (
    <div className="mt-16">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Vergelijk alle features
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Wat krijg je precies per pakket — alle features naast elkaar.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[240px]">
                  Feature
                </th>
                <th className="text-center px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                  <div className="font-bold text-slate-900 dark:text-slate-100">Probeer</div>
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    €0
                  </div>
                </th>
                <th className="text-center px-5 py-4 font-semibold min-w-[120px] bg-orange-50/50 dark:bg-orange-500/10 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                      Aanbevolen
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">Webshop</div>
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    €19 / mnd
                  </div>
                </th>
                <th className="text-center px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                  <div className="font-bold text-slate-900 dark:text-slate-100">Agency</div>
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    €59 / mnd
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, gi) => (
                <Fragment key={group.title}>
                  {/* Group header */}
                  <tr className="bg-slate-50/60 dark:bg-slate-800/50">
                    <td
                      colSpan={4}
                      className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800"
                    >
                      {group.title}
                    </td>
                  </tr>
                  {group.rows.map((row, ri) => (
                    <tr
                      key={`${gi}-${ri}`}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-3">
                        <div className="text-slate-900 dark:text-slate-100">{row.label}</div>
                        {row.hint && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {row.hint}
                          </div>
                        )}
                      </td>
                      <td className="text-center px-5 py-3">
                        <CellRenderer cell={row.probeer} />
                      </td>
                      <td className="text-center px-5 py-3 bg-orange-50/30 dark:bg-orange-500/5">
                        <CellRenderer cell={row.webshop} />
                      </td>
                      <td className="text-center px-5 py-3">
                        <CellRenderer cell={row.agency} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
        Mis je een feature? Mail{' '}
        <a
          href="mailto:rootseedsoftware@gmail.com?subject=Feature-verzoek"
          className="underline hover:text-orange-600 dark:hover:text-orange-400"
        >
          rootseedsoftware@gmail.com
        </a>{' '}
        — we plannen op basis van vraag.
      </p>
    </div>
  );
}
