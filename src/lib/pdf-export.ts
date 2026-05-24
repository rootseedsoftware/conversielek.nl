// PDF-export (genereert HTML in nieuwe tab + window.print).
//
// P1.1 fix: ALLE dynamische content (AI-output + user input) gaat door
// escapeHtml voordat het in de template literal terechtkomt. De oude code
// interpoleerde rauw — één tekenreeks als "</style>..." in een
// AI-respons zou de print-window slopen.

import type { AuditResult } from '@/lib/claude';
import type { FlowType } from '@/lib/data/flow-types';
import { flowTypes } from '@/lib/data/flow-types';
import { productCategories } from '@/lib/data/categories';
import { severityLabels } from '@/lib/data/severity';

const severityStyles: Record<AuditResult['issues'][number]['severity'], string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const sourceTypeMap: Record<string, string> = {
  research: 'source-type-research',
  book: 'source-type-book',
  statistic: 'source-type-statistic',
  guideline: 'source-type-guideline',
  nl_specific: 'source-type-nl',
};

const sourceLabelMap: Record<string, string> = {
  research: 'Onderzoek',
  book: 'Boek',
  statistic: 'Statistiek',
  guideline: 'Richtlijn',
  nl_specific: 'NL',
};

/**
 * HTML-escape voor alle dynamische content in de PDF-template.
 * Voorkomt dat AI- of user-output de template-structuur kan breken.
 */
function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type PdfExportInput = {
  audit: AuditResult;
  flowType: FlowType['value'];
  webshopName: string;
  productCategory: string;
};

export function exportAuditAsPdf({
  audit,
  flowType,
  webshopName,
  productCategory,
}: PdfExportInput): void {
  const scoreColor =
    audit.overall_score >= 8
      ? '#10b981'
      : audit.overall_score >= 6
      ? '#eab308'
      : audit.overall_score >= 4
      ? '#f97316'
      : '#dc2626';
  const flowLabel = flowTypes.find((f) => f.value === flowType)?.label ?? '';
  const categoryLabel = productCategories.find((p) => p.value === productCategory)?.label ?? '';

  // De style-block en numerieke score zijn zelf-gegenereerd → géén escape.
  // Alles wat van AI of user komt → escapeHtml().
  const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Conversielek Audit</title>
<style>
@page { size: A4; margin: 20mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; margin: 0; padding: 20px; background: white; }
.header { border-bottom: 3px solid #f97316; padding-bottom: 24px; margin-bottom: 32px; }
.header-title { font-size: 32px; font-weight: 800; margin: 0 0 8px 0; }
.header-meta { color: #64748b; font-size: 13px; }
.badge { display: inline-block; padding: 4px 12px; background: #fff7ed; color: #c2410c; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.score-card { display: flex; align-items: center; justify-content: space-between; padding: 32px; background: linear-gradient(135deg, #f8fafc 0%, #fff7ed 100%); border-radius: 16px; margin-bottom: 32px; border: 1px solid #e2e8f0; }
.score-big { font-size: 72px; font-weight: 800; color: ${scoreColor}; line-height: 1; }
.score-label { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.score-out { font-size: 28px; color: #94a3b8; font-weight: 600; }
.summary { padding: 20px; background: #f8fafc; border-radius: 12px; font-size: 15px; max-width: 60%; }
.section { margin-bottom: 40px; page-break-inside: avoid; }
.section-title { font-size: 22px; font-weight: 700; margin-bottom: 16px; }
.impact-box { background: linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%); padding: 24px; border-radius: 16px; border: 1px solid #fde68a; margin-bottom: 24px; }
.impact-label { font-size: 11px; font-weight: 700; color: #92400e; letter-spacing: 0.5px; margin-bottom: 6px; }
.impact-text { font-size: 16px; font-weight: 500; color: #78350f; }
.strength-list, .quickwins-list { list-style: none; padding: 0; }
.strength-item { padding: 12px 16px; background: #ecfdf5; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #10b981; }
.quickwin-item { padding: 12px 16px; background: #fff7ed; border-radius: 8px; margin-bottom: 8px; display: flex; gap: 12px; align-items: flex-start; }
.quickwin-number { flex-shrink: 0; width: 24px; height: 24px; background: #f97316; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.issue { border-radius: 12px; padding: 20px; margin-bottom: 16px; page-break-inside: avoid; }
.issue-title { font-size: 17px; font-weight: 700; margin: 0 0 6px 0; }
.severity-badge { padding: 3px 10px; border-radius: 999px; color: white; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.category-tag { color: #64748b; font-size: 12px; font-weight: 500; }
.issue-desc { font-size: 14px; color: #1e293b; margin: 10px 0; }
.issue-box { background: rgba(255,255,255,0.7); padding: 12px; border-radius: 8px; margin-top: 8px; }
.box-label { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
.box-content { font-size: 13px; color: #1e293b; }
.microcopy-box { background: #f0f9ff; border-left: 3px solid #0284c7; padding: 12px; border-radius: 8px; margin-top: 8px; }
.microcopy-label { font-size: 10px; font-weight: 700; color: #0c4a6e; letter-spacing: 0.5px; margin-bottom: 4px; }
.microcopy-content { font-size: 13px; color: #0c4a6e; font-style: italic; }
.sources-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-top: 8px; }
.sources-label { font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px; }
.source-item { font-size: 11px; margin-bottom: 6px; display: flex; gap: 8px; align-items: flex-start; }
.source-type { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; text-transform: uppercase; }
.source-type-research { background: #f3e8ff; color: #7c3aed; }
.source-type-book { background: #fef3c7; color: #b45309; }
.source-type-statistic { background: #d1fae5; color: #047857; }
.source-type-guideline { background: #dbeafe; color: #1d4ed8; }
.source-type-nl { background: #ffedd5; color: #c2410c; }
.source-content { flex: 1; }
.source-name { font-weight: 600; color: #1e293b; font-size: 11px; }
.source-detail { color: #475569; font-size: 11px; margin-top: 2px; line-height: 1.5; }
.principle { font-size: 12px; color: #64748b; font-style: italic; margin-top: 8px; }
.benchmark { background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 10px; }
.benchmark-shop { font-weight: 700; color: #c2410c; font-size: 13px; }
.nl-check { background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 8px; }
.nl-check-label { font-weight: 600; font-size: 13px; color: #0f172a; margin-bottom: 4px; }
.nl-check-text { font-size: 13px; color: #475569; }
.footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head><body>
<div class="header">
  <div class="badge">Conversielek Audit · ${escapeHtml(flowLabel)}</div>
  <h1 class="header-title">${escapeHtml(webshopName || 'Webshop')} — Conversie Audit</h1>
  <div class="header-meta">${escapeHtml(
    new Date().toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  )}<br>Categorie: ${escapeHtml(categoryLabel)} · Flow: ${escapeHtml(flowLabel)}</div>
</div>
<div class="score-card">
  <div><div class="score-label">Overall UX Score</div><div><span class="score-big">${audit.overall_score}</span><span class="score-out">/10</span></div></div>
  <div class="summary">${escapeHtml(audit.summary)}</div>
</div>
${
  audit.conversion_impact_estimate
    ? `<div class="impact-box"><div class="impact-label">💶 Geschatte conversie-impact</div><div class="impact-text">${escapeHtml(
        audit.conversion_impact_estimate
      )}</div></div>`
    : ''
}
${
  audit.trust_assessment
    ? `<div class="section"><h2 class="section-title">Vertrouwen (${audit.trust_score}/10)</h2><div style="background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">${escapeHtml(
        audit.trust_assessment
      )}</div></div>`
    : ''
}
${
  audit.nl_specific_checks
    ? `<div class="section"><h2 class="section-title">Nederlandse webshop-checks</h2>
<div class="nl-check"><div class="nl-check-label">💳 iDEAL zichtbaarheid</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.ideal_visible)}</div></div>
<div class="nl-check"><div class="nl-check-label">🛍️ Achteraf betalen (Klarna/Riverty)</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.afterpay_klarna)}</div></div>
<div class="nl-check"><div class="nl-check-label">🚚 Gratis verzending communicatie</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.free_shipping_communication)}</div></div>
<div class="nl-check"><div class="nl-check-label">🛡️ Trust badges / keurmerken</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.trust_badges)}</div></div>
<div class="nl-check"><div class="nl-check-label">🍪 AVG / Cookie-conformiteit</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.gdpr_cookies)}</div></div></div>`
    : ''
}
${
  audit.dutch_benchmarks && audit.dutch_benchmarks.length > 0
    ? `<div class="section"><h2 class="section-title">Wat NL-benchmarks beter doen</h2>${audit.dutch_benchmarks
        .map(
          (b) =>
            `<div class="benchmark"><div class="benchmark-shop">${escapeHtml(b.example_shop)}: ${escapeHtml(
              b.what
            )}</div><div style="font-size:13px; color:#475569; margin-top:6px;">${escapeHtml(b.why)}</div></div>`
        )
        .join('')}</div>`
    : ''
}
<div class="section"><h2 class="section-title">Sterke punten</h2><ul class="strength-list">${audit.strengths
    .map((s) => `<li class="strength-item">✓ ${escapeHtml(s)}</li>`)
    .join('')}</ul></div>
<div class="section"><h2 class="section-title">Gevonden issues (${audit.issues.length})</h2>${audit.issues
    .map((issue) => {
      const color = severityStyles[issue.severity];
      return `<div class="issue" style="background: ${color}11; border: 1px solid ${color}33;"><h3 class="issue-title">${escapeHtml(
        issue.title
      )}</h3><div><span class="severity-badge" style="background: ${color};">${escapeHtml(
        severityLabels[issue.severity]
      )}</span> <span class="category-tag">${escapeHtml(
        issue.category
      )}</span></div><div class="issue-desc">${escapeHtml(issue.description)}</div>${
        issue.conversion_impact
          ? `<div class="issue-box" style="border-left: 3px solid #f97316;"><div class="box-label">💶 Conversie-impact</div><div class="box-content">${escapeHtml(
              issue.conversion_impact
            )}</div></div>`
          : ''
      }<div class="issue-box"><div class="box-label">Aanbeveling</div><div class="box-content">${escapeHtml(
        issue.recommendation
      )}</div></div>${
        issue.microcopy_suggestion
          ? `<div class="microcopy-box"><div class="microcopy-label">✏️ Microcopy-suggestie</div><div class="microcopy-content">${escapeHtml(
              issue.microcopy_suggestion
            )}</div></div>`
          : ''
      }${
        issue.sources && issue.sources.length > 0
          ? `<div class="sources-box"><div class="sources-label">📚 Bronvermelding</div>${issue.sources
              .map(
                (s) =>
                  `<div class="source-item"><span class="source-type ${
                    sourceTypeMap[s.type] || 'source-type-research'
                  }">${escapeHtml(
                    sourceLabelMap[s.type] || 'Bron'
                  )}</span><div class="source-content"><div class="source-name">${escapeHtml(
                    s.name
                  )}</div>${s.detail ? `<div class="source-detail">${escapeHtml(s.detail)}</div>` : ''}</div></div>`
              )
              .join('')}</div>`
          : ''
      }<div class="principle">Principe: ${escapeHtml(issue.principle)}</div></div>`;
    })
    .join('')}</div>
<div class="section"><h2 class="section-title">Quick Wins (binnen 1 uur)</h2><ul class="quickwins-list">${audit.quick_wins
    .map(
      (q, i) => `<li class="quickwin-item"><span class="quickwin-number">${i + 1}</span><span>${escapeHtml(q)}</span></li>`
    )
    .join('')}</ul></div>
<div class="footer">Conversielek.nl · Nederlandse Webshop UX Audit · Gegenereerd ${escapeHtml(
    new Date().toLocaleString('nl-NL')
  )}</div>
<script>window.onload = () => setTimeout(() => window.print(), 500);</script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url);
  if (!printWindow) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversielek-${webshopName || 'export'}-${Date.now()}.html`;
    link.click();
  }
}
