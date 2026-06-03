// Sprint 4 — Catalog van NL-specifieke checks.
//
// Bevat 10 checks die specifiek voor Nederlandse webshops relevant zijn
// en die internationale UX-audit tools NIET dekken. Onze kern-USP.
//
// De catalog is OPEN voor de AI: Claude krijgt deze lijst en moet per
// check een status + bevinding + aanbeveling geven. Vaste IDs zodat
// renames in copy niet onze parsing breken.
//
// Status-conventie:
//   ok            → check geslaagd, prominente aanwezigheid
//   warning       → aanwezig maar suboptimaal (slecht zichtbaar, onvolledig)
//   missing       → ontbreekt volledig, conversie-blocker
//   not_applicable → niet relevant voor deze shop/flow (bv. retour bij digitaal product)

import {
  Award, Truck, RotateCcw, Receipt, Package, CreditCard, Star,
  MessageSquare, Cookie,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NlCheckStatus = 'ok' | 'warning' | 'missing' | 'not_applicable';
export type NlCheckImportance = 'critical' | 'recommended' | 'nice_to_have';

export type NlCheckMeta = {
  id: string;
  label: string;
  description: string;
  importance: NlCheckImportance;
  icon: LucideIcon;
  category: 'trust' | 'shipping' | 'payment' | 'legal' | 'service';
};

export const nlCheckCatalog: NlCheckMeta[] = [
  {
    id: 'thuiswinkel_waarborg',
    label: 'Thuiswinkel Waarborg / Webwinkel Keurmerk',
    description: 'Nederlandse keurmerk met wettelijke garanties (geschillen, retour). Verhoogt vertrouwen significant.',
    importance: 'critical',
    icon: Award,
    category: 'trust',
  },
  {
    id: 'shipping_transparency',
    label: 'Verzendkosten-transparantie',
    description: 'Worden verzendkosten VROEG getoond (homepage / productpagina)? Onverwachte kosten = #1 reden voor cart abandonment.',
    importance: 'critical',
    icon: Truck,
    category: 'shipping',
  },
  {
    id: 'return_policy_prominence',
    label: 'Retour-beleid prominent',
    description: '14 dagen bedenktijd wettelijk verplicht. Voorwaarden + retourkosten duidelijk op productpagina + footer.',
    importance: 'critical',
    icon: RotateCcw,
    category: 'legal',
  },
  {
    id: 'btw_clarity',
    label: 'BTW-vermelding',
    description: 'Duidelijke vermelding "incl. BTW" of "excl. BTW" — wettelijk verplicht en voorkomt onaangename verrassingen bij checkout.',
    importance: 'critical',
    icon: Receipt,
    category: 'legal',
  },
  {
    id: 'delivery_carrier',
    label: 'Bezorgvervoerder + verwachte tijd',
    description: 'PostNL/DHL/UPS vermeld + geschatte levertijd (zelfs "vandaag besteld, morgen in huis" als toepasbaar).',
    importance: 'recommended',
    icon: Package,
    category: 'shipping',
  },
  {
    id: 'afterpay_methods',
    label: 'Achteraf-betalen specifiek (Klarna / Riverty / Billink)',
    description: 'Welke aanbieder, voorwaarden duidelijk, leeftijdsvoorwaarden indien van toepassing.',
    importance: 'critical',
    icon: CreditCard,
    category: 'payment',
  },
  {
    id: 'ideal_prominence',
    label: 'iDEAL-prominent',
    description: 'iDEAL is dé NL-betaalmethode (60%+ aandeel). Moet als eerste optie zichtbaar in checkout.',
    importance: 'critical',
    icon: CreditCard,
    category: 'payment',
  },
  {
    id: 'reviews_visible',
    label: 'Kiyoh / Trustpilot / Google reviews',
    description: 'Echte sterren + aantal reviews + linkje naar review-pagina. Geen fake "We zijn 5 sterren" badges.',
    importance: 'critical',
    icon: Star,
    category: 'trust',
  },
  {
    id: 'gdpr_cookies',
    label: 'AVG cookie-banner',
    description: 'Weigeren even prominent als accepteren. Geen pre-checked vinkjes. Granulariteit per categorie.',
    importance: 'critical',
    icon: Cookie,
    category: 'legal',
  },
  {
    id: 'contact_visibility',
    label: 'Contact + bedrijfsgegevens zichtbaar',
    description: 'KvK, adres, telefoon/chat — vereist door Dienstenwet + bouwt vertrouwen ("achter de site zit een echt bedrijf").',
    importance: 'recommended',
    icon: MessageSquare,
    category: 'service',
  },
];

// ---- Status-styling -------------------------------------------------------

export const statusConfig: Record<
  NlCheckStatus,
  {
    label: string;
    iconName: 'check' | 'warning' | 'cross' | 'minus';
    color: string;
    badgeClass: string;
    hex: { bg: string; text: string; border: string };
  }
> = {
  ok: {
    label: 'Geslaagd',
    iconName: 'check',
    color: 'emerald',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    hex: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  },
  warning: {
    label: 'Verbeterpunt',
    iconName: 'warning',
    color: 'amber',
    badgeClass:
      'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
    hex: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  },
  missing: {
    label: 'Ontbreekt',
    iconName: 'cross',
    color: 'red',
    badgeClass:
      'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
    hex: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  },
  not_applicable: {
    label: 'N.v.t.',
    iconName: 'minus',
    color: 'slate',
    badgeClass:
      'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700',
    hex: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  },
};

// ---- Aggregatie: NL-score berekening --------------------------------------

/**
 * Berekent een NL-conformiteitsscore op basis van de checks.
 * - critical 'ok' = 10 punten, warning = 5, missing = 0
 * - recommended 'ok' = 5 punten, warning = 2, missing = 0
 * - nice_to_have 'ok' = 2 punten, warning = 1, missing = 0
 * - not_applicable: niet meegerekend in max-score
 *
 * Returnt percentage 0-100.
 */
export function calculateNlScore(
  checks: { id: string; status: NlCheckStatus }[]
): number {
  const weights = {
    critical: { ok: 10, warning: 5, missing: 0 },
    recommended: { ok: 5, warning: 2, missing: 0 },
    nice_to_have: { ok: 2, warning: 1, missing: 0 },
  };

  let earned = 0;
  let maxPossible = 0;

  for (const meta of nlCheckCatalog) {
    const result = checks.find((c) => c.id === meta.id);
    if (!result || result.status === 'not_applicable') continue;
    const max = weights[meta.importance].ok;
    maxPossible += max;
    if (result.status !== 'missing') {
      earned += weights[meta.importance][result.status];
    }
  }

  if (maxPossible === 0) return 0;
  return Math.round((earned / maxPossible) * 100);
}
