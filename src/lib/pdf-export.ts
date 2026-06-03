// PDF-export — genereert HTML in nieuwe tab + window.print.
//
// UI-ronde 2 design-upgrade:
//   - Cover-page op A4 met groot logo + SVG score-ring + meta-blok
//   - Severity-overzicht bovenaan content (kritiek/hoog/middel/laag pills)
//   - Page-break-before voor major secties zodat sectie-koppen niet
//     onderaan een pagina worden afgekapt
//   - Betere typografie: grotere section-titles, meer whitespace, accent-
//     balk links van section-titles
//   - Issue-cards: zwaardere kop met grotere severity-pill + flow-icoon
//   - Header/footer op elke pagina via @page running-elements (waar
//     browser ondersteunt — fallback graceful)
//
// Security: ALLE dynamische content (AI-output + user input) blijft via
// escapeHtml. Style-block en numerieke score zelf-gegenereerd, geen escape.

import type { AuditResult } from '@/lib/claude';
import type { FlowType } from '@/lib/data/flow-types';
import { flowTypes } from '@/lib/data/flow-types';
import { productCategories } from '@/lib/data/categories';
import { severityLabels } from '@/lib/data/severity';
import { getConfidenceConfig, calculateIceScore, getIcePriorityLabel } from '@/lib/data/confidence';
import { company } from '@/lib/data/company';

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

/** HTML-escape voor alle dynamische content in de PDF-template. */
function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * SVG circular score-ring voor de cover-page. Schaalbaar — print rendert
 * SVG crisp op elke resolutie. Geen JS nodig.
 */
function renderScoreRingSvg(score: number, color: string, size = 220): string {
  const clamped = Math.max(0, Math.min(10, score));
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 10) * circumference;
  const cx = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(-90deg);">
    <circle cx="${cx}" cy="${cx}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${strokeWidth}" />
    <circle cx="${cx}" cy="${cx}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
  </svg>`;
}

/** Tel issues per severity voor het overzichts-blok. */
function countBySeverity(issues: AuditResult['issues']): Record<string, number> {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of issues) {
    if (i.severity in counts) counts[i.severity]++;
  }
  return counts;
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
      ? '#059669'
      : audit.overall_score >= 6
      ? '#ca8a04'
      : audit.overall_score >= 4
      ? '#ea580c'
      : '#dc2626';
  const scoreLabel =
    audit.overall_score >= 8
      ? 'Uitstekend'
      : audit.overall_score >= 6
      ? 'Voldoende'
      : audit.overall_score >= 4
      ? 'Aandacht nodig'
      : 'Kritiek';
  const flowLabel = flowTypes.find((f) => f.value === flowType)?.label ?? '';
  const categoryLabel = productCategories.find((p) => p.value === productCategory)?.label ?? '';
  const sevCounts = countBySeverity(audit.issues ?? []);
  const totalIssues = (audit.issues ?? []).length;
  const reportDate = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Conversielek Audit — ${escapeHtml(webshopName || 'Webshop')}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
@page :first { margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.6; background: white; font-size: 13px; }

/* ============ COVER PAGE ============ */
.cover { width: 210mm; height: 297mm; padding: 28mm 22mm; display: flex; flex-direction: column; position: relative; page-break-after: always; background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%); }
.cover-brand { display: flex; align-items: center; gap: 10px; margin-bottom: auto; }
.cover-logo { width: 44px; height: 44px; background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 22px; box-shadow: 0 4px 14px rgba(249,115,22,0.25); }
.cover-brand-text { font-weight: 700; font-size: 18px; color: #0f172a; letter-spacing: -0.01em; }
.cover-brand-tag { font-size: 10px; color: #64748b; }
.cover-main { margin: 60px 0; }
.cover-badge { display: inline-block; padding: 6px 14px; background: #fff7ed; color: #c2410c; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; border: 1px solid #fed7aa; }
.cover-title { font-size: 44px; font-weight: 800; line-height: 1.05; margin: 0 0 14px 0; letter-spacing: -0.025em; color: #0f172a; }
.cover-subtitle { font-size: 16px; color: #475569; max-width: 70%; }
.cover-score-block { display: flex; align-items: center; gap: 32px; margin: 50px 0 60px 0; padding: 36px; background: white; border-radius: 24px; box-shadow: 0 4px 24px rgba(15,23,42,0.06); border: 1px solid #f1f5f9; }
.cover-score-svg { position: relative; flex-shrink: 0; }
.cover-score-number { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.cover-score-num { font-size: 60px; font-weight: 800; color: ${scoreColor}; line-height: 1; }
.cover-score-out { font-size: 14px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
.cover-score-meta { flex: 1; }
.cover-score-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 6px; }
.cover-score-verdict { font-size: 28px; font-weight: 800; color: ${scoreColor}; margin-bottom: 12px; line-height: 1.1; }
.cover-score-summary { font-size: 13px; color: #475569; line-height: 1.55; }
.cover-meta { margin-top: auto; padding-top: 30px; border-top: 1px solid #fed7aa; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 12px; color: #64748b; }
.cover-meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
.cover-meta-value { font-size: 13px; color: #0f172a; font-weight: 600; }
.cover-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 22mm; background: #fff7ed; border-top: 1px solid #fed7aa; font-size: 9px; color: #c2410c; text-align: center; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; }

/* ============ CONTENT PAGES ============ */
.page-header { display: flex; align-items: center; justify-content: space-between; padding: 0 0 16px 0; margin-bottom: 28px; border-bottom: 2px solid #f97316; }
.page-header-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: #0f172a; }
.page-header-logo { width: 24px; height: 24px; background: linear-gradient(135deg, #f97316, #dc2626); border-radius: 6px; }
.page-header-meta { font-size: 11px; color: #64748b; }

.severity-overview { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px; padding: 18px 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
.severity-overview-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 12px; align-self: center; }
.sev-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.sev-pill-num { font-family: 'SF Mono', Menlo, monospace; opacity: 0.7; }
.sev-pill.critical { background: #fee2e2; color: #991b1b; }
.sev-pill.high { background: #ffedd5; color: #9a3412; }
.sev-pill.medium { background: #fef3c7; color: #854d0e; }
.sev-pill.low { background: #dbeafe; color: #1e40af; }
.sev-pill.total { background: #0f172a; color: white; }

.section { margin-bottom: 36px; page-break-inside: avoid; }
.section-major { page-break-before: always; padding-top: 8px; }
.section-title { font-size: 22px; font-weight: 800; margin: 0 0 18px 0; padding-left: 14px; border-left: 4px solid #f97316; line-height: 1.2; letter-spacing: -0.015em; }
.section-subtitle { font-size: 13px; color: #64748b; margin: -10px 0 18px 14px; }

.impact-box { background: linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%); padding: 22px 24px; border-radius: 16px; border: 1px solid #fde68a; margin-bottom: 28px; display: flex; gap: 16px; align-items: flex-start; }
.impact-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #f97316, #dc2626); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; flex-shrink: 0; }
.impact-label { font-size: 10px; font-weight: 700; color: #92400e; letter-spacing: 1px; margin-bottom: 4px; text-transform: uppercase; }
.impact-text { font-size: 15px; font-weight: 600; color: #78350f; line-height: 1.5; }

.strength-list, .quickwins-list { list-style: none; padding: 0; margin: 0; }
.strength-item { padding: 12px 16px; background: #ecfdf5; border-radius: 10px; margin-bottom: 8px; border-left: 3px solid #059669; font-size: 13px; color: #064e3b; }
.quickwin-item { padding: 14px 18px; background: white; border: 1px solid #fed7aa; border-radius: 12px; margin-bottom: 10px; display: flex; gap: 14px; align-items: flex-start; }
.quickwin-number { flex-shrink: 0; width: 28px; height: 28px; background: linear-gradient(135deg, #f97316, #dc2626); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; }
.quickwin-text { font-size: 14px; color: #1e293b; line-height: 1.5; }

.issue { border-radius: 14px; padding: 20px 22px; margin-bottom: 14px; page-break-inside: avoid; border: 1px solid #e2e8f0; background: white; }
.issue-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.issue-title { font-size: 16px; font-weight: 700; margin: 0; flex: 1; line-height: 1.35; }
.severity-badge { padding: 4px 10px; border-radius: 999px; color: white; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
.category-tag { display: inline-block; color: #64748b; font-size: 11px; font-weight: 600; padding: 3px 8px; background: #f1f5f9; border-radius: 6px; margin-bottom: 10px; }
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; align-items: center; }
.meta-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; border: 1px solid; }
.ice-score-mini { font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: #64748b; font-weight: 600; }
.issue-desc { font-size: 13px; color: #334155; margin: 8px 0 12px 0; line-height: 1.55; }
.issue-box { background: #f8fafc; padding: 12px 14px; border-radius: 10px; margin-top: 8px; border-left: 3px solid #cbd5e1; }
.issue-box.impact { border-left-color: #f97316; background: #fff7ed; }
.box-label { font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 0.5px; margin-bottom: 4px; text-transform: uppercase; }
.box-content { font-size: 12px; color: #1e293b; line-height: 1.55; }
.microcopy-box { background: #eff6ff; border-left: 3px solid #2563eb; padding: 12px 14px; border-radius: 10px; margin-top: 8px; }
.microcopy-label { font-size: 10px; font-weight: 700; color: #1e3a8a; letter-spacing: 0.5px; margin-bottom: 4px; text-transform: uppercase; }
.microcopy-content { font-size: 12px; color: #1e3a8a; font-style: italic; line-height: 1.55; }
.sources-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 14px; border-radius: 10px; margin-top: 10px; }
.sources-label { font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase; }
.source-item { font-size: 11px; margin-bottom: 7px; display: flex; gap: 8px; align-items: flex-start; }
.source-type { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.3px; }
.source-type-research { background: #f3e8ff; color: #7c3aed; }
.source-type-book { background: #fef3c7; color: #b45309; }
.source-type-statistic { background: #d1fae5; color: #047857; }
.source-type-guideline { background: #dbeafe; color: #1d4ed8; }
.source-type-nl { background: #ffedd5; color: #c2410c; }
.source-content { flex: 1; }
.source-name { font-weight: 600; color: #1e293b; font-size: 11px; }
.source-detail { color: #475569; font-size: 11px; margin-top: 2px; line-height: 1.5; }
.principle { font-size: 11px; color: #64748b; font-style: italic; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }

.benchmark { background: white; border: 1px solid #e2e8f0; padding: 16px 18px; border-radius: 12px; margin-bottom: 10px; }
.benchmark-shop { font-weight: 700; color: #c2410c; font-size: 13px; margin-bottom: 4px; }
.benchmark-desc { font-size: 13px; color: #475569; line-height: 1.5; }

.nl-check { background: #f8fafc; padding: 14px 16px; border-radius: 10px; margin-bottom: 8px; border-left: 3px solid #f97316; }
.nl-check-label { font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px; }
.nl-check-text { font-size: 12px; color: #475569; line-height: 1.55; }

.footer { margin-top: 40px; padding-top: 18px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; line-height: 1.6; }
.footer-grid { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.footer-brand { flex: 1; min-width: 180px; }
.footer-brand-name { color: #c2410c; font-weight: 700; font-size: 13px; margin-bottom: 2px; letter-spacing: -0.01em; }
.footer-brand-tagline { color: #64748b; font-size: 11px; }
.footer-company { text-align: right; color: #64748b; font-size: 10px; min-width: 180px; }
.footer-company-name { color: #475569; font-weight: 600; margin-bottom: 2px; }
.footer-meta { margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #94a3b8; }
</style></head><body>

<!-- ============ COVER PAGE ============ -->
<section class="cover">
  <div class="cover-brand">
    <div class="cover-logo">C</div>
    <div>
      <div class="cover-brand-text">${escapeHtml(company.tradeName)}</div>
      <div class="cover-brand-tag">Nederlandse webshop UX-audit</div>
    </div>
  </div>

  <div class="cover-main">
    <div class="cover-badge">${escapeHtml(flowLabel)} · Conversie-audit</div>
    <h1 class="cover-title">${escapeHtml(webshopName || 'Webshop')}</h1>
    <p class="cover-subtitle">Concrete conversie-acties op basis van NL-benchmarks en bewezen UX-principes.</p>

    <div class="cover-score-block">
      <div class="cover-score-svg" style="width:220px; height:220px;">
        ${renderScoreRingSvg(audit.overall_score, scoreColor, 220)}
        <div class="cover-score-number">
          <div class="cover-score-num">${escapeHtml(audit.overall_score)}</div>
          <div class="cover-score-out">/ 10</div>
        </div>
      </div>
      <div class="cover-score-meta">
        <div class="cover-score-label">Overall UX-score</div>
        <div class="cover-score-verdict">${escapeHtml(scoreLabel)}</div>
        <div class="cover-score-summary">${escapeHtml(audit.summary)}</div>
      </div>
    </div>
  </div>

  <div class="cover-meta">
    <div>
      <div class="cover-meta-label">Rapport-datum</div>
      <div class="cover-meta-value">${escapeHtml(reportDate)}</div>
    </div>
    <div>
      <div class="cover-meta-label">Categorie</div>
      <div class="cover-meta-value">${escapeHtml(categoryLabel)}</div>
    </div>
    <div>
      <div class="cover-meta-label">Flow geanalyseerd</div>
      <div class="cover-meta-value">${escapeHtml(flowLabel)}</div>
    </div>
    <div>
      <div class="cover-meta-label">Issues gevonden</div>
      <div class="cover-meta-value">${totalIssues} ${totalIssues === 1 ? 'issue' : 'issues'}</div>
    </div>
  </div>

  <div class="cover-footer">Gegenereerd door ${escapeHtml(company.tradeName)}.nl · ${escapeHtml(company.legalName)} · KvK ${escapeHtml(company.kvk)}</div>
</section>

<!-- ============ CONTENT PAGE 1 — OVERZICHT ============ -->
<div class="page-header">
  <div class="page-header-brand">
    <div class="page-header-logo"></div>
    <span>${escapeHtml(company.tradeName)} · ${escapeHtml(webshopName || 'Webshop')}</span>
  </div>
  <div class="page-header-meta">Score ${escapeHtml(audit.overall_score)}/10 · ${escapeHtml(reportDate)}</div>
</div>

${
  totalIssues > 0
    ? `<div class="severity-overview">
  <span class="severity-overview-label">Issues per niveau</span>
  <span class="sev-pill total">Totaal <span class="sev-pill-num">${totalIssues}</span></span>
  ${sevCounts.critical > 0 ? `<span class="sev-pill critical">Kritiek <span class="sev-pill-num">${sevCounts.critical}</span></span>` : ''}
  ${sevCounts.high > 0 ? `<span class="sev-pill high">Hoog <span class="sev-pill-num">${sevCounts.high}</span></span>` : ''}
  ${sevCounts.medium > 0 ? `<span class="sev-pill medium">Middel <span class="sev-pill-num">${sevCounts.medium}</span></span>` : ''}
  ${sevCounts.low > 0 ? `<span class="sev-pill low">Laag <span class="sev-pill-num">${sevCounts.low}</span></span>` : ''}
</div>`
    : ''
}

${
  audit.conversion_impact_estimate
    ? `<div class="impact-box">
  <div class="impact-icon">€</div>
  <div>
    <div class="impact-label">Geschatte conversie-impact</div>
    <div class="impact-text">${escapeHtml(audit.conversion_impact_estimate)}</div>
  </div>
</div>`
    : ''
}

${
  audit.trust_assessment
    ? `<div class="section"><h2 class="section-title">Vertrouwen <span style="color:#64748b; font-weight:600; font-size:16px;">(${audit.trust_score}/10)</span></h2>
<div style="background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; font-size: 13px; line-height: 1.6;">${escapeHtml(audit.trust_assessment)}</div></div>`
    : ''
}

${
  audit.strengths.length > 0
    ? `<div class="section"><h2 class="section-title">Sterke punten</h2>
<ul class="strength-list">${audit.strengths.map((s) => `<li class="strength-item">✓ ${escapeHtml(s)}</li>`).join('')}</ul></div>`
    : ''
}

<!-- ============ CONTENT PAGE 2 — NL CHECKS ============ -->
${
  audit.nl_specific_checks
    ? `<div class="section section-major"><h2 class="section-title">Nederlandse webshop-checks</h2>
<p class="section-subtitle">Specifieke heuristieken voor de NL-markt — iDEAL, achteraf betalen, AVG.</p>
<div class="nl-check"><div class="nl-check-label">iDEAL zichtbaarheid</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.ideal_visible)}</div></div>
<div class="nl-check"><div class="nl-check-label">Achteraf betalen (Klarna / Riverty)</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.afterpay_klarna)}</div></div>
<div class="nl-check"><div class="nl-check-label">Gratis verzending — communicatie</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.free_shipping_communication)}</div></div>
<div class="nl-check"><div class="nl-check-label">Trust-badges / keurmerken</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.trust_badges)}</div></div>
<div class="nl-check"><div class="nl-check-label">AVG / Cookie-conformiteit</div><div class="nl-check-text">${escapeHtml(audit.nl_specific_checks.gdpr_cookies)}</div></div></div>`
    : ''
}

${
  audit.dutch_benchmarks && audit.dutch_benchmarks.length > 0
    ? `<div class="section"><h2 class="section-title">Wat NL-benchmarks beter doen</h2>
<p class="section-subtitle">Concrete voorbeelden uit bol.com, Coolblue, Wehkamp en andere referenties.</p>
${audit.dutch_benchmarks
  .map(
    (b) =>
      `<div class="benchmark"><div class="benchmark-shop">${escapeHtml(b.example_shop)}: ${escapeHtml(b.what)}</div><div class="benchmark-desc">${escapeHtml(b.why)}</div></div>`
  )
  .join('')}
</div>`
    : ''
}

<!-- ============ CONTENT PAGE 3 — ISSUES (major break) ============ -->
${
  totalIssues > 0
    ? `<div class="section section-major"><h2 class="section-title">Gevonden issues <span style="color:#64748b; font-weight:600; font-size:16px;">(${totalIssues})</span></h2>
<p class="section-subtitle">Gesorteerd op ernst. Elke issue heeft conversie-impact, aanbeveling en bronvermelding.</p>
${audit.issues
  .map((issue) => {
    const color = severityStyles[issue.severity];
    const confCfg = getConfidenceConfig(issue.confidence);
    const iceScore = calculateIceScore(issue.ice);
    const iceLabel = getIcePriorityLabel(iceScore);
    const iceColors: Record<string, { bg: string; text: string; border: string }> = {
      emerald: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
      slate: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
      amber: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    };
    const iceClr = iceColors[iceLabel.color] ?? iceColors.slate;
    return `<div class="issue" style="border-left: 4px solid ${color};">
  <div class="issue-head">
    <h3 class="issue-title">${escapeHtml(issue.title)}</h3>
    <span class="severity-badge" style="background: ${color};">${escapeHtml(severityLabels[issue.severity])}</span>
  </div>
  <div class="tag-row">
    <span class="category-tag" style="margin-bottom: 0;">${escapeHtml(issue.category)}</span>
    ${
      issue.confidence
        ? `<span class="meta-pill" style="background:${confCfg.hex.bg}; color:${confCfg.hex.text}; border-color:${confCfg.hex.border};">${escapeHtml(confCfg.short)}</span>`
        : ''
    }
    ${
      iceLabel.label
        ? `<span class="meta-pill" style="background:${iceClr.bg}; color:${iceClr.text}; border-color:${iceClr.border};">${escapeHtml(iceLabel.label)}</span><span class="ice-score-mini" title="Impact × Ease">ICE ${iceScore}/100</span>`
        : ''
    }
  </div>
  <div class="issue-desc">${escapeHtml(issue.description)}</div>
  ${
    issue.conversion_impact
      ? `<div class="issue-box impact"><div class="box-label">Conversie-impact</div><div class="box-content">${escapeHtml(issue.conversion_impact)}</div></div>`
      : ''
  }
  <div class="issue-box"><div class="box-label">Aanbeveling</div><div class="box-content">${escapeHtml(issue.recommendation)}</div></div>
  ${
    issue.microcopy_suggestion
      ? `<div class="microcopy-box"><div class="microcopy-label">Microcopy-suggestie</div><div class="microcopy-content">"${escapeHtml(issue.microcopy_suggestion)}"</div></div>`
      : ''
  }
  ${
    issue.sources && issue.sources.length > 0
      ? `<div class="sources-box"><div class="sources-label">Bronvermelding</div>${issue.sources
          .map(
            (s) =>
              `<div class="source-item"><span class="source-type ${sourceTypeMap[s.type] || 'source-type-research'}">${escapeHtml(sourceLabelMap[s.type] || 'Bron')}</span><div class="source-content"><div class="source-name">${escapeHtml(s.name)}</div>${s.detail ? `<div class="source-detail">${escapeHtml(s.detail)}</div>` : ''}</div></div>`
          )
          .join('')}</div>`
      : ''
  }
  <div class="principle">Principe: ${escapeHtml(issue.principle)}</div>
</div>`;
  })
  .join('')}
</div>`
    : ''
}

<!-- ============ CONTENT PAGE 4 — QUICK WINS ============ -->
${
  audit.quick_wins.length > 0
    ? `<div class="section section-major"><h2 class="section-title">Quick wins — binnen 1 uur</h2>
<p class="section-subtitle">Start hier: directe acties met de hoogste impact per geïnvesteerd uur.</p>
<ul class="quickwins-list">${audit.quick_wins.map((q, i) => `<li class="quickwin-item"><span class="quickwin-number">${i + 1}</span><span class="quickwin-text">${escapeHtml(q)}</span></li>`).join('')}</ul>
</div>`
    : ''
}

<div class="footer">
  <div class="footer-grid">
    <div class="footer-brand">
      <div class="footer-brand-name">${escapeHtml(company.tradeName)}.nl</div>
      <div class="footer-brand-tagline">Nederlandse webshop UX-audit — gemaakt voor de NL-markt</div>
    </div>
    <div class="footer-company">
      <div class="footer-company-name">${escapeHtml(company.legalName)}</div>
      ${escapeHtml(company.address.street)}<br>
      ${escapeHtml(company.address.postalCode)} ${escapeHtml(company.address.city)}<br>
      KvK ${escapeHtml(company.kvk)} · BTW ${escapeHtml(company.btw)}
    </div>
  </div>
  <div class="footer-meta">
    Gegenereerd op ${escapeHtml(new Date().toLocaleString('nl-NL'))} · ${escapeHtml(company.url)}
  </div>
</div>

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
