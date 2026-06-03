// Sprint 1 — Confidence-badge die in elke audit-issue-card verschijnt.
//
// Twee varianten:
//   - "pill"   : compact, voor in een rij met severity-badge etc.
//   - "card"   : groter met description-tekst, voor verbose contexten
//
// Hover-tooltip met uitleg zodat eerste-keer-users snappen wat het label
// betekent. Geen JS-tooltip lib — pure title-attribute voor MVP.

import type { IssueConfidence } from '@/lib/claude';
import { getConfidenceConfig } from '@/lib/data/confidence';

type Variant = 'pill' | 'card';

export default function IssueConfidenceBadge({
  confidence,
  variant = 'pill',
}: {
  confidence: IssueConfidence | undefined;
  variant?: Variant;
}) {
  const cfg = getConfidenceConfig(confidence);
  const Icon = cfg.icon;

  if (variant === 'card') {
    return (
      <div
        className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${cfg.badgeClass}`}
        title={cfg.description}
      >
        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-xs font-semibold leading-tight">{cfg.label}</div>
          <div className="text-[11px] opacity-80 leading-tight mt-0.5">{cfg.short}</div>
        </div>
      </div>
    );
  }

  // pill
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${cfg.badgeClass}`}
      title={cfg.description}
    >
      <Icon className="w-3 h-3" />
      {cfg.short}
    </span>
  );
}
