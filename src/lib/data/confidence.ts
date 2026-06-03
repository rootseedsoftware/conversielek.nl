// Sprint 1 — UI-config voor confidence-labels.
//
// Centrale waarheid voor kleur, icoon en kopij zodat elke plek waar we
// een confidence-badge tonen (audit-view, PDF, mockup, hero) dezelfde
// look heeft.
//
// Beslisregel die we communiceren:
//   - high   → veilig om direct door te voeren
//   - medium → test eerst (microcopy A/B, knop-plaatsing valideren)
//   - low    → strategische beslissing — valideer met je team
//   - undefined → "Onbekend" badge voor oude audits (van vóór sprint 1)

import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IssueConfidence } from '@/lib/claude';

export type ConfidenceConfig = {
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind utility-set voor de badge (light + dark) */
  badgeClass: string;
  /** Pure colors voor PDF en SVG (geen Tailwind beschikbaar) */
  hex: { bg: string; text: string; border: string };
};

export const confidenceConfig: Record<IssueConfidence, ConfidenceConfig> = {
  high: {
    label: 'Hoge zekerheid',
    short: 'Direct doorvoeren',
    description: 'Duidelijk objectief probleem. Veilig om direct op te lossen.',
    icon: CheckCircle2,
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    hex: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  },
  medium: {
    label: 'Middel zekerheid',
    short: 'Test eerst',
    description: 'Waarschijnlijk een issue, maar context-afhankelijk. Test eerst.',
    icon: AlertTriangle,
    badgeClass:
      'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
    hex: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  },
  low: {
    label: 'Lage zekerheid',
    short: 'Valideer met team',
    description: 'Strategisch of context-blind. Niet zonder eigen oordeel doorvoeren.',
    icon: AlertCircle,
    badgeClass:
      'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
    hex: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  },
};

/** Fallback voor oude audits (vóór sprint 1) die geen confidence-veld hebben. */
export const confidenceUnknown: ConfidenceConfig = {
  label: 'Niet beoordeeld',
  short: 'Niet beoordeeld',
  description: 'Deze audit is gemaakt vóór confidence-scoring werd toegevoegd.',
  icon: HelpCircle,
  badgeClass:
    'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  hex: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

export function getConfidenceConfig(c: IssueConfidence | undefined): ConfidenceConfig {
  if (!c) return confidenceUnknown;
  return confidenceConfig[c];
}

// ---- ICE-score berekening -------------------------------------------------

/**
 * ICE-score = (impact × ease) zonder confidence-component (die hebben we al
 * apart). Range: 1-100. Hoger = "doe deze eerder".
 *
 * Issues zonder ice-veld (oude audits) krijgen score 0 zodat ze als laatste
 * sorteren en niet bovenaan staan zonder data.
 */
export function calculateIceScore(ice: { impact: number; ease: number } | undefined): number {
  if (!ice) return 0;
  const i = Math.max(1, Math.min(10, ice.impact));
  const e = Math.max(1, Math.min(10, ice.ease));
  return Math.round(i * e);
}

/**
 * Mensen-leesbare prioriteit-tag op basis van ICE.
 * 70+ = quick win (do first), 40-69 = standard, <40 = lange termijn / strategisch.
 */
export function getIcePriorityLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'Quick win', color: 'emerald' };
  if (score >= 40) return { label: 'Standaard', color: 'slate' };
  if (score > 0) return { label: 'Lange termijn', color: 'amber' };
  return { label: '', color: 'slate' };
}
