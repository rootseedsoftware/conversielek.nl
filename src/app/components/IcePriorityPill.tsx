// Sprint 1 — Compacte ICE-prioriteit-pill voor in issue-cards.
//
// Geeft een snel-scanbaar label op basis van impact × ease:
//   - 70+  → "Quick win" (groen) — doe deze eerst
//   - 40-69 → "Standaard" (grijs)
//   - <40  → "Lange termijn" (amber) — strategisch
//
// Toont ook de numerieke score (impact/ease/totaal) als kleine hover-tip
// zodat power-users de berekening kunnen zien.

import { Zap, ChevronRight, Clock } from 'lucide-react';
import type { IssueIce } from '@/lib/claude';
import { calculateIceScore, getIcePriorityLabel } from '@/lib/data/confidence';

const colorClasses: Record<string, string> = {
  emerald:
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  slate:
    'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  amber:
    'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
};

const iconMap = {
  emerald: Zap,
  slate: ChevronRight,
  amber: Clock,
};

export default function IcePriorityPill({ ice }: { ice: IssueIce | undefined }) {
  if (!ice) return null;
  const score = calculateIceScore(ice);
  const { label, color } = getIcePriorityLabel(score);
  if (!label) return null;
  const Icon = iconMap[color as keyof typeof iconMap] ?? ChevronRight;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${colorClasses[color] ?? colorClasses.slate}`}
      title={`Impact ${ice.impact}/10 · Ease ${ice.ease}/10 · Score ${score}/100`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
