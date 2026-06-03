// Sprint 5 — AVG/GDPR-diepe-checks catalog.
//
// Bouwt verder op Sprint 4 (gdpr_cookies was één algemene check). Hier
// gaan we per AP-richtlijn (Autoriteit Persoonsgegevens) controleren of
// de webshop voldoet. Onze unieke positionering: geen enkele andere
// audit-tool doet dit specifiek voor NL + EU-context.
//
// Achtergrond uit 2024-2025 research: 6 nationale DPA-zaken tegen GA4 in
// alleen al H1 2025. EU-US Data Privacy Framework + Transparency &
// Consent Framework gevallen. Webshops worden actief gecontroleerd —
// dit is geen theoretisch risico meer.
//
// BELANGRIJK: deze checks zijn geen vervanging van juridisch advies.
// We tonen prominent een disclaimer in de UI én in de PDF. Onze checks
// signaleren risico's; de webshop-eigenaar moet zelf besluiten of een
// jurist nodig is.

import {
  Cookie, MousePointerClick, FileText, Eye, Clock, AlertOctagon,
  ServerCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NlCheckStatus } from './nl-checks';

export type AvgCheckImportance = 'critical' | 'recommended' | 'nice_to_have';

export type AvgCheckMeta = {
  id: string;
  label: string;
  description: string;
  /** Link naar AP-richtlijn of AVG-artikel waarop deze check is gebaseerd */
  reference: string;
  importance: AvgCheckImportance;
  icon: LucideIcon;
};

export const avgCheckCatalog: AvgCheckMeta[] = [
  {
    id: 'cookie_banner_equal_prominence',
    label: 'Cookie-banner: weigeren even prominent als accepteren',
    description: 'Knop "Weigeren" moet visueel gelijkwaardig zijn aan "Accepteren". Verstopt onder "Instellingen" = niet conform.',
    reference: 'AP-richtlijn cookies (2023) — equal prominence-eis',
    importance: 'critical',
    icon: MousePointerClick,
  },
  {
    id: 'cookie_banner_no_prechecks',
    label: 'Cookie-banner: geen pre-checked vinkjes',
    description: 'Niet-functionele cookies mogen niet vooraf aangevinkt staan. Consent moet actief gegeven worden.',
    reference: 'AVG art. 7 + ePrivacy-richtlijn — opt-in vereist',
    importance: 'critical',
    icon: Cookie,
  },
  {
    id: 'cookie_banner_granularity',
    label: 'Cookie-banner: granulariteit per categorie',
    description: 'Gebruiker moet apart kunnen kiezen voor functioneel / analytisch / marketing. Eén grote "OK"-knop = niet conform.',
    reference: 'AP-richtlijn cookies — gespecificeerde toestemming',
    importance: 'critical',
    icon: Cookie,
  },
  {
    id: 'privacy_policy_accessible',
    label: 'Privacyverklaring vindbaar',
    description: 'Link naar privacy-policy zichtbaar in footer + cookie-banner. Niet alleen "ergens in de FAQ".',
    reference: 'AVG art. 13 — informatieplicht',
    importance: 'critical',
    icon: FileText,
  },
  {
    id: 'tracking_pixels_disclosed',
    label: 'Tracking-pixels gedeclareerd',
    description: 'Meta Pixel / Google Analytics / TikTok / etc. moeten benoemd zijn in privacy-policy met doel + bewaartermijn.',
    reference: 'AVG art. 13 + 14 — transparantie over verwerkers',
    importance: 'critical',
    icon: Eye,
  },
  {
    id: 'data_retention_specified',
    label: 'Bewaartermijnen concreet',
    description: 'Geen vage "zo lang als nodig"-tekst. Concreet: "account-data 7 jaar na laatste login", "marketingmail tot intrekking".',
    reference: 'AVG art. 5 lid 1e — opslagbeperking',
    importance: 'recommended',
    icon: Clock,
  },
  {
    id: 'data_subject_rights',
    label: 'Rechten van betrokkenen uitgelegd',
    description: 'Inzage / correctie / verwijdering / dataportabiliteit + contactadres voor verzoeken expliciet benoemd.',
    reference: 'AVG art. 15-22 — rechten van betrokkenen',
    importance: 'recommended',
    icon: Eye,
  },
  {
    id: 'sub_processors_listed',
    label: 'Sub-verwerkers gelijst',
    description: 'Alle externe dienstverleners (Supabase, AWS, Mailchimp, etc.) met EU/EER/SCC-status. Vooral relevant bij B2B-shops.',
    reference: 'AVG art. 28 — verwerkers + sub-verwerkers',
    importance: 'recommended',
    icon: ServerCog,
  },
  {
    id: 'breach_procedure',
    label: 'Datalek-meldprocedure',
    description: 'Privacy-policy vermeldt: binnen 72 uur melding aan AP + betrokkenen informeren bij hoog risico.',
    reference: 'AVG art. 33 + 34 — meldingsplicht datalekken',
    importance: 'recommended',
    icon: AlertOctagon,
  },
];

// ---- AVG-score berekening -------------------------------------------------

/**
 * Berekent een AVG-conformiteitsscore (0-100%).
 * - critical OK = 10, warning = 4, missing = 0
 * - recommended OK = 5, warning = 2, missing = 0
 * - critical missing telt extra zwaar — het is een wet, geen aanbeveling
 * - not_applicable wordt niet meegerekend
 */
export function calculateAvgScore(
  checks: { id: string; status: NlCheckStatus }[]
): number {
  const weights = {
    critical: { ok: 10, warning: 4, missing: 0 },
    recommended: { ok: 5, warning: 2, missing: 0 },
    nice_to_have: { ok: 2, warning: 1, missing: 0 },
  };

  let earned = 0;
  let maxPossible = 0;

  for (const meta of avgCheckCatalog) {
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

/**
 * Tellen hoeveel critical-missing items er zijn — directe juridische
 * risico's. Wordt prominent boven in de banner getoond.
 */
export function countCriticalGaps(
  checks: { id: string; status: NlCheckStatus }[]
): number {
  const criticalIds = new Set(
    avgCheckCatalog.filter((m) => m.importance === 'critical').map((m) => m.id)
  );
  return checks.filter((c) => criticalIds.has(c.id) && c.status === 'missing').length;
}
