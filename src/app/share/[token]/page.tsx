// Sprint 8 (klant-portal) — Publieke read-only share-pagina.
//
// Iemand met een geldige token-URL ziet hier het audit-rapport zonder
// Conversielek-account. Geen edit, geen resolve, geen compare — pure
// view. Score, samenvatting, NL-checks, AVG-checks, sterke punten,
// issues en quick wins.
//
// Server Component met dynamic = 'force-dynamic' want we tracken access
// op elke render (we willen géén cached share-pagina serveren — anders
// klopt access_count niet).
//
// Bij ongeldig/verlopen token: 404 via notFound().

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertCircle, Award, ShoppingCart, TrendingUp, Calendar,
} from 'lucide-react';
import { resolveSharedAudit } from '@/lib/audit-shares';
import { flowTypes } from '@/lib/data/flow-types';
import { productCategories } from '@/lib/data/categories';
import { severityLabels } from '@/lib/data/severity';
import ScoreRing from '@/app/components/ScoreRing';
import NlDeepChecksSection from '@/app/components/NlDeepChecksSection';
import AvgDeepChecksSection from '@/app/components/AvgDeepChecksSection';
import IssueConfidenceBadge from '@/app/components/IssueConfidenceBadge';
import IcePriorityPill from '@/app/components/IcePriorityPill';
import { company } from '@/lib/data/company';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Geen indexering — share-links zijn privé
export const metadata = {
  robots: { index: false, follow: false },
};

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30',
  },
  high: {
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-500/30',
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  low: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30',
  },
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function SharedAuditPage({ params }: Props) {
  const { token } = await params;
  const data = await resolveSharedAudit(token);

  if (!data) notFound();

  const { audit, share, branding } = data;
  const flow = flowTypes.find((f) => f.value === audit.flowType);
  const category = productCategories.find((p) => p.value === audit.productCategory);
  const reportDate = new Date(audit.createdAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header — gradient + logo komen uit branding van audit-eigenaar */}
      <header
        className="text-white"
        style={{
          background: `linear-gradient(135deg, ${branding.primaryHex}, ${branding.secondaryHex})`,
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-6">
            {branding.logoUrl ? (
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.logoUrl}
                  alt={`${branding.brandName} logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="font-bold text-white">{branding.brandName}</div>
              <div className="text-[10px] text-white/80">
                {branding.isWhiteLabel ? 'Conversie-audit' : 'Gedeeld audit-rapport'}
              </div>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {audit.webshopName}
          </h1>
          {share.recipientName && (
            <p className="text-white/90 mb-2">
              Voor: <span className="font-semibold">{share.recipientName}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {reportDate}
            </span>
            {flow && (
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                {flow.label}
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                {category.label}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Optionele note van de afzender */}
        {share.note && (
          <div className="mb-8 p-4 bg-white dark:bg-slate-900 border-l-4 border-orange-500 rounded-r-xl shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">
              Bericht van de afzender
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {share.note}
            </p>
          </div>
        )}

        {/* Score-block */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={audit.result.overall_score} size={140} strokeWidth={11} />
            <div className="flex-1 text-center sm:text-left">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Overall UX-score
              </div>
              <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
                {audit.result.summary}
              </p>
              {audit.result.conversion_impact_estimate && (
                <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                  💶 {audit.result.conversion_impact_estimate}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Trust */}
        {audit.result.trust_assessment && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Vertrouwen{' '}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                ({audit.result.trust_score}/10)
              </span>
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {audit.result.trust_assessment}
            </p>
          </div>
        )}

        {/* NL deep checks */}
        <NlDeepChecksSection checks={audit.result.nl_deep_checks} />

        {/* AVG deep checks */}
        <AvgDeepChecksSection checks={audit.result.avg_deep_checks} />

        {/* Sterke punten */}
        {audit.result.strengths.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
              Sterke punten
            </h2>
            <ul className="space-y-2">
              {audit.result.strengths.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg"
                >
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {audit.result.issues.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Verbeterpunten ({audit.result.issues.length})
              </h2>
            </div>
            <div className="space-y-3">
              {audit.result.issues.map((issue, i) => {
                const colors = severityColors[issue.severity] ?? severityColors.medium;
                return (
                  <div
                    key={i}
                    className={`border rounded-xl p-4 ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {issue.title}
                      </h3>
                      <span
                        className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${
                          issue.severity === 'critical'
                            ? 'bg-red-600'
                            : issue.severity === 'high'
                            ? 'bg-orange-500'
                            : issue.severity === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      >
                        {severityLabels[issue.severity]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {issue.category}
                      </span>
                      <IssueConfidenceBadge confidence={issue.confidence} />
                      <IcePriorityPill ice={issue.ice} />
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                      {issue.description}
                    </p>
                    {issue.conversion_impact && (
                      <div className="bg-white dark:bg-slate-900 rounded-md p-2.5 mb-2 text-xs">
                        <span className="font-semibold text-orange-700 dark:text-orange-400">
                          Conversie-impact:{' '}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {issue.conversion_impact}
                        </span>
                      </div>
                    )}
                    <div className="bg-white dark:bg-slate-900 rounded-md p-2.5 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Aanbeveling:{' '}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {issue.recommendation}
                      </span>
                    </div>
                    {issue.microcopy_suggestion && (
                      <div className="bg-blue-50 dark:bg-blue-500/10 border-l-3 border-blue-500 rounded-md p-2.5 mt-2 text-xs">
                        <span className="font-semibold text-blue-900 dark:text-blue-300">
                          Microcopy:{' '}
                        </span>
                        <span className="text-blue-900 dark:text-blue-300 italic">
                          &quot;{issue.microcopy_suggestion}&quot;
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick wins */}
        {audit.result.quick_wins.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-500/10 dark:to-amber-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
              ⚡ Quick wins — binnen 1 uur
            </h2>
            <ol className="space-y-2">
              {audit.result.quick_wins.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg"
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${branding.primaryHex}, ${branding.secondaryHex})`,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer — white-label krijgt eigen tekst + "Powered by" credit,
             default-stijl behoudt Conversielek-funnel-CTA */}
        {branding.isWhiteLabel ? (
          <div className="mt-12 mb-6">
            {branding.footerText && (
              <div
                className="p-5 rounded-2xl text-center text-sm leading-relaxed mb-4"
                style={{
                  background: `${branding.primaryHex}10`,
                  color: branding.primaryHex,
                  borderLeft: `4px solid ${branding.primaryHex}`,
                }}
              >
                <div className="font-bold text-base mb-1">{branding.brandName}</div>
                <div className="whitespace-pre-line opacity-90">{branding.footerText}</div>
              </div>
            )}
            <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
              Powered by{' '}
              <Link
                href="/"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                {company.tradeName}
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center mt-12 mb-6 text-sm text-slate-500 dark:text-slate-400">
            <p className="mb-2">
              Dit rapport is gedeeld via{' '}
              <Link
                href="/"
                className="text-orange-600 dark:text-orange-400 font-semibold hover:underline"
              >
                {company.tradeName}
              </Link>{' '}
              — Nederlandse UX-audit voor webshops.
            </p>
            <p className="text-xs">
              Wil je zelf zo&apos;n rapport voor je shop?{' '}
              <Link
                href="/"
                className="text-orange-600 dark:text-orange-400 hover:underline"
              >
                Start gratis op {company.domain}
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
