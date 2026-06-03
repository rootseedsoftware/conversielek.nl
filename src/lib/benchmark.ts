// Sprint 11 — Concurrentie-benchmark data-aggregaties.
//
// Pure functies die meerdere HistoryItems vergelijken. Geen DB-changes:
// alle data komt uit bestaande audits, we slicen + dicen.
//
// Inputs: 2-4 audits met zelfde flow_type (validatie elders).
// Outputs:
//   - rankedShops: shops gesorteerd op overall_score (hoogste eerst)
//   - checkMatrix: per NL/AVG-check de status per shop
//   - opportunities: issues waar minstens één andere shop 'ok' is maar
//                    deze shop 'warning'/'missing' (= directe leerkans)

import type { HistoryItem } from '@/lib/audit-store';
import type { NlDeepCheck } from '@/lib/claude';
import { nlCheckCatalog } from '@/lib/data/nl-checks';
import { avgCheckCatalog } from '@/lib/data/avg-checks';

export type RankedShop = {
  key: string;
  displayName: string;
  url: string | undefined;
  score: number;
  isYou?: boolean;
};

export type CheckMatrixRow = {
  id: string;
  label: string;
  /** Status per shop, in dezelfde volgorde als shops-input */
  statuses: (NlDeepCheck['status'] | undefined)[];
  category: 'nl' | 'avg';
};

export type Opportunity = {
  /** Originele key van de eigen-shop */
  ownerKey: string;
  /** Check-id waar kans ligt */
  checkId: string;
  checkLabel: string;
  /** Eigen status (warning/missing/...) */
  ownStatus: NlDeepCheck['status'];
  /** Bevinding op eigen shop */
  ownFinding: string;
  /** Welke andere shops het wél goed doen */
  betterShops: string[];
  category: 'nl' | 'avg';
};

// ─────────────────────────────────────────────────────────────────────────
// Ranking
// ─────────────────────────────────────────────────────────────────────────

export function rankShops(
  items: HistoryItem[],
  yourKey?: string
): RankedShop[] {
  return items
    .map((it) => ({
      key: it.key,
      displayName: it.webshopName || it.webshopUrl || 'Onbekend',
      url: it.webshopUrl,
      score: it.audit.overall_score,
      isYou: yourKey === it.key,
    }))
    .sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────────────────
// Check-matrix: per check de status van iedere shop
// ─────────────────────────────────────────────────────────────────────────

export function buildCheckMatrix(items: HistoryItem[]): CheckMatrixRow[] {
  const rows: CheckMatrixRow[] = [];

  // NL-checks
  for (const meta of nlCheckCatalog) {
    rows.push({
      id: meta.id,
      label: meta.label,
      category: 'nl',
      statuses: items.map((it) => findStatus(it.audit.nl_deep_checks, meta.id)),
    });
  }

  // AVG-checks
  for (const meta of avgCheckCatalog) {
    rows.push({
      id: meta.id,
      label: meta.label,
      category: 'avg',
      statuses: items.map((it) => findStatus(it.audit.avg_deep_checks, meta.id)),
    });
  }

  return rows;
}

function findStatus(
  checks: NlDeepCheck[] | undefined,
  id: string
): NlDeepCheck['status'] | undefined {
  if (!checks) return undefined;
  const hit = checks.find((c) => c.id === id);
  return hit?.status;
}

// ─────────────────────────────────────────────────────────────────────────
// Opportunities: kansen voor de eigen shop
// ─────────────────────────────────────────────────────────────────────────

/**
 * Voor de "yourKey"-shop: vind checks waar tenminste één andere shop
 * 'ok' is maar deze shop 'warning' of 'missing'. Dat is een directe
 * "kijk hoe zij het doen"-kans.
 *
 * Sorteert kansen op aantal betere shops (descending) → "alle concurrenten
 * doen het beter" staat bovenaan.
 */
export function findOpportunities(
  items: HistoryItem[],
  yourKey: string
): Opportunity[] {
  const yourIndex = items.findIndex((it) => it.key === yourKey);
  if (yourIndex === -1) return [];
  const yourAudit = items[yourIndex].audit;

  const opps: Opportunity[] = [];

  // NL-checks
  for (const meta of nlCheckCatalog) {
    const yourCheck = yourAudit.nl_deep_checks?.find((c) => c.id === meta.id);
    if (!yourCheck) continue;
    if (yourCheck.status !== 'warning' && yourCheck.status !== 'missing') continue;

    const betterShops = items
      .filter((it, idx) => idx !== yourIndex)
      .filter((it) => {
        const c = it.audit.nl_deep_checks?.find((x) => x.id === meta.id);
        return c?.status === 'ok';
      })
      .map((it) => it.webshopName || it.webshopUrl || 'Concurrent');

    if (betterShops.length > 0) {
      opps.push({
        ownerKey: yourKey,
        checkId: meta.id,
        checkLabel: meta.label,
        ownStatus: yourCheck.status,
        ownFinding: yourCheck.finding,
        betterShops,
        category: 'nl',
      });
    }
  }

  // AVG-checks
  for (const meta of avgCheckCatalog) {
    const yourCheck = yourAudit.avg_deep_checks?.find((c) => c.id === meta.id);
    if (!yourCheck) continue;
    if (yourCheck.status !== 'warning' && yourCheck.status !== 'missing') continue;

    const betterShops = items
      .filter((it, idx) => idx !== yourIndex)
      .filter((it) => {
        const c = it.audit.avg_deep_checks?.find((x) => x.id === meta.id);
        return c?.status === 'ok';
      })
      .map((it) => it.webshopName || it.webshopUrl || 'Concurrent');

    if (betterShops.length > 0) {
      opps.push({
        ownerKey: yourKey,
        checkId: meta.id,
        checkLabel: meta.label,
        ownStatus: yourCheck.status,
        ownFinding: yourCheck.finding,
        betterShops,
        category: 'avg',
      });
    }
  }

  // Sorteer: meest universele kans eerst (alle concurrenten doen het beter)
  opps.sort((a, b) => b.betterShops.length - a.betterShops.length);
  return opps;
}
