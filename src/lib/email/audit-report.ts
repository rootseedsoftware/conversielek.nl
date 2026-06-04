// HTML-template voor de audit-rapport e-mail. Plain string ipv React
// Email zodat we geen extra deps + JSX-runtime in een server action
// hoeven. Alle dynamische content gaat door escapeHtml zodat AI-output
// of user-input geen invalid HTML kan veroorzaken (zelfde XSS-safety
// als de PDF-export).
//
// White-label ondersteuning: branding-param laat agency hun eigen kleuren,
// brand-naam en footer-tekst gebruiken in plaats van Conversielek-default.
// isWhiteLabel-flag bepaalt of we een "Powered by"-credit tonen.

import type { AuditResult } from '@/lib/claude';
import { DEFAULT_RESOLVED_BRANDING, type ResolvedBranding } from '@/lib/branding-types';
import { company } from '@/lib/data/company';

function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const severityColors: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const severityLabels: Record<string, string> = {
  critical: 'Kritiek',
  high: 'Hoog',
  medium: 'Middel',
  low: 'Laag',
};

export type AuditEmailInput = {
  webshopName: string;
  audit: AuditResult;
  /** Volledige URL waar de user 't rapport op de site kan openen */
  reportUrl: string;
  /** Optioneel — branding van audit-eigenaar voor white-label rendering */
  branding?: ResolvedBranding;
};

export function renderAuditEmail({
  webshopName,
  audit,
  reportUrl,
  branding = DEFAULT_RESOLVED_BRANDING,
}: AuditEmailInput): { html: string; subject: string; text: string } {
  // Score-kleur blijft semantisch (groen=goed/rood=slecht), brand-kleur
  // wordt apart gebruikt voor header + CTA.
  const scoreColor =
    audit.overall_score >= 7
      ? '#10b981'
      : audit.overall_score >= 5
      ? '#f97316'
      : '#dc2626';

  const topIssues = audit.issues.slice(0, 3);
  const safeName = escapeHtml(webshopName || 'jouw webshop');
  const safeBrandName = escapeHtml(branding.brandName);

  const subject = `UX-audit voor ${webshopName || 'jouw webshop'} — score ${audit.overall_score}/10`;

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

    <!-- Header met dynamische branding -->
    <div style="background:linear-gradient(135deg,${branding.primaryHex} 0%,${branding.secondaryHex} 100%);padding:32px 24px;text-align:center;">
      ${
        branding.logoUrl
          ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${safeBrandName}" style="max-height:48px;max-width:200px;margin:0 auto 12px;display:block;background:white;border-radius:8px;padding:4px;" />`
          : ''
      }
      <h1 style="color:white;margin:0 0 4px 0;font-size:22px;font-weight:700;letter-spacing:-0.01em;">${safeBrandName}</h1>
      <p style="color:rgba(255,255,255,0.95);margin:0;font-size:14px;">UX-audit voor ${safeName}</p>
    </div>

    <!-- Score -->
    <div style="padding:32px 24px;text-align:center;border-bottom:1px solid #e2e8f0;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">UX Score</div>
      <div style="font-size:64px;font-weight:800;color:${scoreColor};line-height:1;">${audit.overall_score}<span style="font-size:28px;color:#cbd5e1;font-weight:600;">/10</span></div>
    </div>

    <!-- Summary -->
    <div style="padding:24px;">
      <p style="color:#334155;line-height:1.6;margin:0;font-size:15px;">${escapeHtml(audit.summary)}</p>
    </div>

    ${
      audit.conversion_impact_estimate
        ? `
    <!-- Impact -->
    <div style="padding:0 24px 24px 24px;">
      <div style="background:linear-gradient(135deg,#fef3c7 0%,#fee2e2 100%);padding:20px;border-radius:12px;border:1px solid #fde68a;">
        <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">💶 Geschatte conversie-impact</div>
        <p style="font-size:15px;color:#78350f;margin:0;line-height:1.5;font-weight:500;">${escapeHtml(audit.conversion_impact_estimate)}</p>
      </div>
    </div>`
        : ''
    }

    <!-- Top issues -->
    ${
      topIssues.length > 0
        ? `
    <div style="padding:0 24px 24px 24px;">
      <h2 style="font-size:16px;margin:0 0 12px 0;color:#0f172a;font-weight:700;">Top ${topIssues.length} verbeterpunten</h2>
      ${topIssues
        .map(
          (issue, i) => `
        <div style="border-left:3px solid ${severityColors[issue.severity] ?? '#94a3b8'};padding:12px 16px;margin-bottom:10px;background:#f8fafc;border-radius:4px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="background:${severityColors[issue.severity] ?? '#94a3b8'};color:white;font-size:10px;padding:2px 8px;border-radius:999px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(severityLabels[issue.severity] ?? issue.severity)}</span>
            <span style="font-size:14px;font-weight:600;color:#0f172a;">${i + 1}. ${escapeHtml(issue.title)}</span>
          </div>
          <div style="font-size:13px;color:#475569;line-height:1.5;">${escapeHtml(issue.recommendation)}</div>
        </div>`
        )
        .join('')}
    </div>`
        : ''
    }

    ${
      audit.quick_wins && audit.quick_wins.length > 0
        ? `
    <!-- Quick wins -->
    <div style="padding:0 24px 24px 24px;">
      <h2 style="font-size:16px;margin:0 0 12px 0;color:#0f172a;font-weight:700;">Quick wins</h2>
      <ul style="margin:0;padding:0 0 0 20px;color:#475569;font-size:14px;line-height:1.7;">
        ${audit.quick_wins
          .slice(0, 3)
          .map((win) => `<li style="margin-bottom:4px;">${escapeHtml(win)}</li>`)
          .join('')}
      </ul>
    </div>`
        : ''
    }

    <!-- CTA met brand-gradient -->
    <div style="padding:24px;text-align:center;border-top:1px solid #e2e8f0;background:#f8fafc;">
      <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:linear-gradient(135deg,${branding.primaryHex},${branding.secondaryHex});color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">
        Volledig rapport bekijken
      </a>
      <p style="font-size:12px;color:#64748b;margin:12px 0 0 0;">
        ${audit.issues.length} verbeterpunten · ${audit.quick_wins?.length ?? 0} quick wins · NL-benchmarks
      </p>
    </div>

    ${
      branding.isWhiteLabel && branding.footerText
        ? `
    <!-- Custom footer-tekst voor white-label -->
    <div style="padding:20px 24px;background:${branding.primaryHex}10;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="font-size:13px;color:${branding.primaryHex};margin:0 0 6px 0;font-weight:600;">${safeBrandName}</p>
      <p style="font-size:12px;color:#64748b;margin:0;line-height:1.5;white-space:pre-line;">${escapeHtml(branding.footerText)}</p>
    </div>`
        : ''
    }

  </div>

  ${
    branding.isWhiteLabel
      ? `
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;line-height:1.6;">
    Powered by <a href="${escapeHtml(company.url)}" style="color:#94a3b8;text-decoration:underline;">${escapeHtml(company.tradeName)}</a>
  </p>`
      : `
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;line-height:1.6;">
    Je krijgt deze mail omdat je een UX-audit hebt aangevraagd op ${escapeHtml(company.domain)}<br>
    <a href="${escapeHtml(company.url)}" style="color:#94a3b8;text-decoration:underline;">${escapeHtml(company.domain)}</a>
  </p>`
  }
</div>
</body>
</html>`;

  // Plain-text versie voor spam-filters + mail-clients zonder HTML
  const text = `${branding.brandName} — UX-audit voor ${webshopName || 'jouw webshop'}

Score: ${audit.overall_score}/10

${audit.summary}

${audit.conversion_impact_estimate ? `Geschatte conversie-impact:\n${audit.conversion_impact_estimate}\n\n` : ''}TOP VERBETERPUNTEN:
${topIssues.map((issue, i) => `${i + 1}. ${issue.title} [${severityLabels[issue.severity] ?? issue.severity}]\n   ${issue.recommendation}`).join('\n\n')}

${audit.quick_wins && audit.quick_wins.length > 0 ? `QUICK WINS:\n${audit.quick_wins.slice(0, 3).map((w) => `• ${w}`).join('\n')}\n\n` : ''}Volledig rapport: ${reportUrl}

${branding.isWhiteLabel ? `${branding.footerText ?? ''}\n\nPowered by ${company.tradeName} · ${company.url}` : `— ${company.tradeName}.nl`}`;

  return { html, subject, text };
}
