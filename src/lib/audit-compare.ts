// Diff-helper voor twee AuditResults van dezelfde webshop + flow.
//
// Issues worden gematcht op genormaliseerde titel (lowercase + trimmed).
// Niet 100% accuraat — als Claude per audit andere bewoordingen kiest
// voor hetzelfde probleem, telt het als "opgelost + nieuw" ipv "blijft".
// Voor MVP voldoende. Later eventueel via embeddings/LLM-dedup verfijnen.

import type { AuditIssue, AuditResult } from '@/lib/claude';

export type AuditDiff = {
  /** Issues in oude audit, niet in nieuwe — gemarkeerd als opgelost */
  resolved: AuditIssue[];
  /** Issues in beide audits — blijft bestaan */
  persisting: AuditIssue[];
  /** Issues alleen in nieuwe audit — nieuw probleem */
  newIssues: AuditIssue[];
};

function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function compareAudits(
  oldAudit: AuditResult,
  newAudit: AuditResult
): AuditDiff {
  const oldTitles = new Set(oldAudit.issues.map((i) => normalizeTitle(i.title)));
  const newTitles = new Set(newAudit.issues.map((i) => normalizeTitle(i.title)));

  const resolved = oldAudit.issues.filter(
    (i) => !newTitles.has(normalizeTitle(i.title))
  );
  const persisting = oldAudit.issues.filter((i) =>
    newTitles.has(normalizeTitle(i.title))
  );
  const newIssues = newAudit.issues.filter(
    (i) => !oldTitles.has(normalizeTitle(i.title))
  );

  return { resolved, persisting, newIssues };
}
