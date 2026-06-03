// Sprint 7 — Audit-versioning helpers.
//
// MVP-keuze: groeperen op genormaliseerde (webshop_name + url) — geen
// DB-schema-wijziging nodig. Later refactorable naar formele 'webshops'
// tabel als data-relaties belangrijker worden.
//
// Normalisatie-strategie:
//   - webshop_name lowercased + trimmed + punctuation stripped
//   - URL: hostname extractie (www. stripped, query/path weggegooid)
//   - Match-key: hostname als URL aanwezig is, anders name
//
// Zo groepeer je "Webshop A" + "webshop a" + "https://www.webshop-a.nl/checkout"
// allemaal als één webshop.

import type { HistoryItem } from '@/lib/audit-store';

export type WebshopGroup = {
  /** Genormaliseerde key voor groepering (intern) */
  key: string;
  /** Display-naam — origineel uit eerste audit */
  displayName: string;
  /** Schoongemaakte URL (hostname) — `null` als geen URL ooit gegeven */
  displayUrl: string | null;
  /** Alle audits voor deze webshop, gesorteerd nieuwste eerst */
  audits: HistoryItem[];
  /** Huidige (laatste) score */
  currentScore: number;
  /** Vorige score (één-voor-laatste) — `null` als slechts 1 audit */
  previousScore: number | null;
  /** Score-delta t.o.v. vorige audit. Positief = beter. `null` bij 1 audit. */
  delta: number | null;
  /** Score-tijdreeks (oudste eerst) voor de sparkline */
  scoreSeries: { score: number; timestamp: number }[];
};

// ---- Normalisatie --------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]+/gu, '') // remove punctuation (Unicode-aware)
    .replace(/\s+/g, ' ');
}

function extractHostname(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function groupKey(item: HistoryItem): string {
  const host = extractHostname(item.webshopUrl);
  if (host) return `host:${host}`;
  return `name:${normalizeName(item.webshopName)}`;
}

// ---- Public API ----------------------------------------------------------

/**
 * Groepeert een lijst HistoryItems op webshop. Sorteert binnen elke groep
 * op timestamp (nieuwste eerst), berekent delta + sparkline-series.
 *
 * Singletons (één audit per webshop) hebben delta=null + previousScore=null
 * — UI moet die graceful renderen.
 */
export function groupAuditsByWebshop(items: HistoryItem[]): WebshopGroup[] {
  const buckets = new Map<string, HistoryItem[]>();

  for (const item of items) {
    const key = groupKey(item);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  const groups: WebshopGroup[] = [];
  for (const [key, bucket] of buckets) {
    // Sort by timestamp desc (nieuwste eerst voor UI-lijsten)
    bucket.sort((a, b) => b.timestamp - a.timestamp);

    const first = bucket[0];
    const currentScore = first.audit.overall_score;
    const previousScore = bucket.length > 1 ? bucket[1].audit.overall_score : null;
    const delta = previousScore !== null ? currentScore - previousScore : null;

    // Score-series oudste-eerst voor sparkline
    const scoreSeries = bucket
      .map((it) => ({ score: it.audit.overall_score, timestamp: it.timestamp }))
      .sort((a, b) => a.timestamp - b.timestamp);

    groups.push({
      key,
      displayName: first.webshopName || 'Onbekende webshop',
      displayUrl: extractHostname(first.webshopUrl),
      audits: bucket,
      currentScore,
      previousScore,
      delta,
      scoreSeries,
    });
  }

  // Default sort: meest recent geüpdate eerst (= bucket met nieuwste audit)
  groups.sort((a, b) => b.audits[0].timestamp - a.audits[0].timestamp);
  return groups;
}

// ---- Delta-formatting ---------------------------------------------------

export type DeltaConfig = {
  label: string; // bv. "+1.2", "−0.4", "0.0"
  color: 'emerald' | 'red' | 'slate';
  trend: 'up' | 'down' | 'flat';
};

export function formatDelta(delta: number | null): DeltaConfig | null {
  if (delta === null) return null;
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded) < 0.05) {
    return { label: '0.0', color: 'slate', trend: 'flat' };
  }
  const sign = rounded > 0 ? '+' : '−';
  const absStr = Math.abs(rounded).toFixed(1);
  return {
    label: `${sign}${absStr}`,
    color: rounded > 0 ? 'emerald' : 'red',
    trend: rounded > 0 ? 'up' : 'down',
  };
}
