// Sprint 3 — "Stuur naar developer"-export.
//
// Generators die een AuditIssue (of een lijstje issues) omzetten naar
// vier verschillende formats die de gebruiker direct kan kopiëren of
// openen:
//
//   - plain   : ASCII-tekst, universeel (Outlook, Word, etc.)
//   - markdown: Slack, Teams, Discord, GitHub, Linear, Notion
//   - email   : mailto-URI met subject + body al gevuld
//   - jira    : Atlassian wiki-markup (Jira native syntax) of voor
//               Linear / Asana ook bruikbaar als plain
//
// Marketing-vehikel: elke export eindigt met een subtle credit
// "Gegenereerd door Conversielek.nl" zodat het bericht zichzelf
// brand-distributeert. Niet pushy — één regel, plain text.
//
// Geen netwerk-calls — pure string-bouw, snel en betrouwbaar.

import type { AuditIssue } from '@/lib/claude';
import { severityLabels } from '@/lib/data/severity';
import { getConfidenceConfig, calculateIceScore } from '@/lib/data/confidence';
import { company } from '@/lib/data/company';

export type ExportContext = {
  webshopName: string;
  webshopUrl?: string;
  flowLabel: string;
  /** Optioneel: directe link naar de audit (bv. /report/abc123) zodat ontvanger context kan opzoeken. */
  auditUrl?: string;
};

/* ────────────────────────────────────────────────────────────────────────
 * PLAIN-TEXT
 * Universeel — voor in Outlook, Word, of "ouderwetse" email-clients.
 * ──────────────────────────────────────────────────────────────────────── */

function severityPrefix(sev: AuditIssue['severity']): string {
  return `[${severityLabels[sev].toUpperCase()}]`;
}

export function issueToPlainText(issue: AuditIssue, ctx: ExportContext): string {
  const confCfg = getConfidenceConfig(issue.confidence);
  const iceScore = issue.ice ? calculateIceScore(issue.ice) : 0;

  const lines: string[] = [];
  lines.push(`${severityPrefix(issue.severity)} ${issue.title}`);
  lines.push('');
  lines.push(`Webshop:   ${ctx.webshopName}${ctx.webshopUrl ? ` (${ctx.webshopUrl})` : ''}`);
  lines.push(`Flow:      ${ctx.flowLabel}`);
  lines.push(`Categorie: ${issue.category}`);
  if (issue.confidence) {
    lines.push(`Zekerheid: ${confCfg.label} (${confCfg.short})`);
  }
  if (iceScore > 0) {
    lines.push(`Prioriteit: ICE-score ${iceScore}/100 (impact ${issue.ice!.impact}, ease ${issue.ice!.ease})`);
  }
  lines.push('');
  lines.push('PROBLEEM');
  lines.push(issue.description);
  lines.push('');
  if (issue.conversion_impact) {
    lines.push('CONVERSIE-IMPACT');
    lines.push(issue.conversion_impact);
    lines.push('');
  }
  lines.push('AANBEVELING');
  lines.push(issue.recommendation);
  if (issue.microcopy_suggestion) {
    lines.push('');
    lines.push('MICROCOPY-SUGGESTIE');
    lines.push(`"${issue.microcopy_suggestion}"`);
  }
  if (issue.sources && issue.sources.length > 0) {
    lines.push('');
    lines.push('BRONVERMELDING');
    for (const s of issue.sources.slice(0, 2)) {
      lines.push(`- ${s.name}${s.detail ? `: ${s.detail}` : ''}`);
    }
  }
  lines.push('');
  lines.push(`Onderbouwing-principe: ${issue.principle}`);
  if (ctx.auditUrl) {
    lines.push('');
    lines.push(`Volledig rapport: ${ctx.auditUrl}`);
  }
  lines.push('');
  lines.push(`— Gegenereerd door ${company.tradeName} · ${company.url}`);
  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────────────────────
 * MARKDOWN
 * Voor Slack, Teams, Discord, GitHub, Linear, Notion — overal waar
 * **bold** en bullets werken.
 * ──────────────────────────────────────────────────────────────────────── */

const severityEmoji: Record<AuditIssue['severity'], string> = {
  critical: '🚨',
  high: '🔴',
  medium: '🟡',
  low: '🔵',
};

export function issueToMarkdown(issue: AuditIssue, ctx: ExportContext): string {
  const emoji = severityEmoji[issue.severity];
  const iceScore = issue.ice ? calculateIceScore(issue.ice) : 0;
  const confCfg = getConfidenceConfig(issue.confidence);

  const lines: string[] = [];
  lines.push(`${emoji} **${issue.title}**`);
  lines.push('');
  lines.push(
    `> _${ctx.webshopName}${ctx.webshopUrl ? ` · ${ctx.webshopUrl}` : ''} · ${ctx.flowLabel} · ${issue.category}_`
  );
  if (issue.confidence || iceScore > 0) {
    const meta: string[] = [];
    if (issue.confidence) meta.push(`Zekerheid: \`${confCfg.short}\``);
    if (iceScore > 0) meta.push(`ICE: \`${iceScore}/100\``);
    lines.push(`> ${meta.join(' · ')}`);
  }
  lines.push('');
  lines.push('**Probleem**');
  lines.push(issue.description);
  if (issue.conversion_impact) {
    lines.push('');
    lines.push('**Conversie-impact**');
    lines.push(`💶 ${issue.conversion_impact}`);
  }
  lines.push('');
  lines.push('**Aanbeveling**');
  lines.push(issue.recommendation);
  if (issue.microcopy_suggestion) {
    lines.push('');
    lines.push(`**Microcopy:** _"${issue.microcopy_suggestion}"_`);
  }
  if (issue.sources && issue.sources.length > 0) {
    lines.push('');
    lines.push('**Bronnen**');
    for (const s of issue.sources.slice(0, 2)) {
      lines.push(`- ${s.name}${s.detail ? ` — _${s.detail}_` : ''}`);
    }
  }
  if (ctx.auditUrl) {
    lines.push('');
    lines.push(`📎 [Volledig rapport](${ctx.auditUrl})`);
  }
  lines.push('');
  lines.push(`---`);
  lines.push(`_Gegenereerd door [${company.tradeName}](${company.url})_`);
  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────────────────────
 * EMAIL — mailto-URI
 * Subject + body URL-encoded. Klant klikt en z'n email-client opent met
 * alles al klaar; hoeft alleen ontvanger toe te voegen.
 * ──────────────────────────────────────────────────────────────────────── */

export function issueToMailto(issue: AuditIssue, ctx: ExportContext): string {
  const subject = `[${severityLabels[issue.severity]}] ${issue.title} — ${ctx.webshopName}`;
  const body = issueToPlainText(issue, ctx);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ────────────────────────────────────────────────────────────────────────
 * JIRA / ATLASSIAN — wiki-markup
 * Voor Jira Cloud / Server / Data Center. Werkt ook in Confluence.
 * Linear/Asana/Shortcut accepteren meestal markdown — verwijs daar dus
 * naar de markdown-versie.
 * ──────────────────────────────────────────────────────────────────────── */

export function issueToJira(issue: AuditIssue, ctx: ExportContext): string {
  const lines: string[] = [];
  lines.push(`h2. ${issue.title}`);
  lines.push('');
  lines.push(
    `_${ctx.webshopName}${ctx.webshopUrl ? ` · ${ctx.webshopUrl}` : ''} · ${ctx.flowLabel}_`
  );
  lines.push('');
  lines.push(`*Severity:* ${severityLabels[issue.severity]}`);
  lines.push(`*Categorie:* ${issue.category}`);
  if (issue.confidence) {
    lines.push(`*Zekerheid:* ${getConfidenceConfig(issue.confidence).label}`);
  }
  if (issue.ice) {
    lines.push(`*ICE-score:* ${calculateIceScore(issue.ice)}/100 (impact ${issue.ice.impact}, ease ${issue.ice.ease})`);
  }
  lines.push('');
  lines.push('h3. Probleem');
  lines.push(issue.description);
  if (issue.conversion_impact) {
    lines.push('');
    lines.push('h3. Conversie-impact');
    lines.push(issue.conversion_impact);
  }
  lines.push('');
  lines.push('h3. Aanbeveling');
  lines.push(issue.recommendation);
  if (issue.microcopy_suggestion) {
    lines.push('');
    lines.push(`h3. Microcopy-suggestie`);
    lines.push(`{quote}${issue.microcopy_suggestion}{quote}`);
  }
  if (issue.sources && issue.sources.length > 0) {
    lines.push('');
    lines.push('h3. Bronnen');
    for (const s of issue.sources.slice(0, 2)) {
      lines.push(`* ${s.name}${s.detail ? ` — ${s.detail}` : ''}`);
    }
  }
  if (ctx.auditUrl) {
    lines.push('');
    lines.push(`[Volledig rapport|${ctx.auditUrl}]`);
  }
  lines.push('');
  lines.push(`---`);
  lines.push(`_Gegenereerd door [${company.tradeName}|${company.url}]_`);
  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────────────────────
 * BULK-EXPORT — meerdere issues bundelen voor "stuur top 3 naar dev"
 * ──────────────────────────────────────────────────────────────────────── */

export function issuesToBulkMarkdown(
  issues: AuditIssue[],
  ctx: ExportContext
): string {
  const intro: string[] = [];
  intro.push(`# Conversie-audit acties voor ${ctx.webshopName}`);
  intro.push('');
  intro.push(
    `Hierbij ${issues.length} ${issues.length === 1 ? 'actie' : 'acties'} uit onze audit van de **${ctx.flowLabel}**-flow${ctx.webshopUrl ? ` op ${ctx.webshopUrl}` : ''}. Per actie staat erbij hoe zeker we zijn en hoe groot de impact-per-uur-werk is.`
  );
  intro.push('');
  intro.push('---');
  intro.push('');

  const blocks = issues.map((issue, i) => {
    const md = issueToMarkdown(issue, ctx);
    // Voeg een visuele scheiding tussen issues
    return `## ${i + 1}. ${issue.title}\n\n${md}`;
  });

  const footer: string[] = [];
  footer.push('');
  footer.push('---');
  footer.push('');
  if (ctx.auditUrl) {
    footer.push(`📎 **Volledig rapport:** ${ctx.auditUrl}`);
    footer.push('');
  }
  footer.push(`_Gegenereerd door [${company.tradeName}](${company.url}) — Nederlandse webshop-UX-audit_`);

  return [...intro, ...blocks, ...footer].join('\n');
}

export function issuesToBulkPlainText(
  issues: AuditIssue[],
  ctx: ExportContext
): string {
  const lines: string[] = [];
  lines.push(`Conversie-audit acties voor ${ctx.webshopName}`);
  lines.push('═'.repeat(50));
  lines.push('');
  lines.push(
    `${issues.length} ${issues.length === 1 ? 'actie' : 'acties'} uit onze audit van de "${ctx.flowLabel}"-flow${ctx.webshopUrl ? ` op ${ctx.webshopUrl}` : ''}.`
  );
  lines.push('');

  issues.forEach((issue, i) => {
    lines.push(`─── ${i + 1}/${issues.length} ${'─'.repeat(40 - String(i).length)}`);
    lines.push('');
    lines.push(issueToPlainText(issue, ctx));
    lines.push('');
  });

  if (ctx.auditUrl) {
    lines.push(`Volledig rapport: ${ctx.auditUrl}`);
    lines.push('');
  }
  lines.push(`— Gegenereerd door ${company.tradeName} · ${company.url}`);
  return lines.join('\n');
}

export function issuesToBulkMailto(issues: AuditIssue[], ctx: ExportContext): string {
  const subject = `${issues.length} conversie-acties voor ${ctx.webshopName}`;
  const body = issuesToBulkPlainText(issues, ctx);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
