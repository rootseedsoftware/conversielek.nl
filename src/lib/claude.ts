// Claude API client.
// - In demo-modus: gebruikt mock data (geen API-key nodig)
// - In live-modus: roept de eigen /api/audit route aan (Next handler)
//
// Demo-mode wordt centraal hier bepaald. Lees nooit VITE_/NEXT_PUBLIC_*
// vars elders in de app om inconsistentie tussen client/server te
// voorkomen (was een P0-bug in de oude code).

export type AuditSource = {
  name: string;
  type: 'research' | 'book' | 'statistic' | 'guideline' | 'nl_specific';
  detail: string;
};

export type AuditIssue = {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  conversion_impact: string;
  recommendation: string;
  microcopy_suggestion: string | null;
  principle: string;
  sources: AuditSource[];
};

export type AuditResult = {
  overall_score: number;
  conversion_impact_estimate: string;
  summary: string;
  trust_score: number;
  trust_assessment: string;
  dutch_benchmarks: { what: string; example_shop: string; why: string }[];
  strengths: string[];
  issues: AuditIssue[];
  quick_wins: string[];
  nl_specific_checks: {
    ideal_visible: string;
    afterpay_klarna: string;
    free_shipping_communication: string;
    trust_badges: string;
    gdpr_cookies: string;
  };
};

export type Screenshot = {
  name: string;
  type: string;
  base64: string;
  preview: string;
};

export type AuditRequest = {
  prompt: string;
  screenshots: Screenshot[];
};

const mockAudit: AuditResult = {
  overall_score: 6.5,
  conversion_impact_estimate:
    'Op basis van deze screenshots laat je naar schatting 15-25% conversie liggen. De grootste lekken zijn vertrouwen en checkout.',
  summary:
    'Demo-modus actief — dit is een voorbeeldaudit. Voor echte AI-analyse op jouw screenshots, configureer je API-key (zie README).',
  trust_score: 6,
  trust_assessment:
    'In demo-modus krijg je vaste voorbeelddata. In live-modus analyseert Claude AI de daadwerkelijke screenshots tegen Nederlandse webshop-conventies.',
  dutch_benchmarks: [
    {
      what: 'Vertrouwensbalk bovenaan',
      example_shop: 'Coolblue',
      why: "Coolblue toont USP's bovenaan elke pagina.",
    },
  ],
  strengths: [
    'Demo-modus draait — installatie werkt!',
    'Storage werkt via localStorage',
    'UI is volledig functioneel',
  ],
  issues: [
    {
      title: 'Demo-modus actief',
      severity: 'medium',
      category: 'Setup',
      description:
        'Je draait nu in demo-modus. De AI-analyse is niet actief — je ziet vaste voorbeelddata.',
      conversion_impact: 'Geen — dit is een setup-melding.',
      recommendation:
        'Volg de README om je Anthropic API-key te configureren en de backend proxy te starten. Daarna krijg je echte AI-audits.',
      microcopy_suggestion: null,
      principle: 'Demo / Setup',
      sources: [
        {
          name: 'README.md',
          type: 'guideline',
          detail: 'Bevat installatie-instructies en hoe je live-modus activeert.',
        },
      ],
    },
  ],
  quick_wins: [
    "Start de backend proxy met 'npm run server'",
    'Voeg je Anthropic API-key toe aan .env',
    'Herlaad de pagina om in live-modus te komen',
  ],
  nl_specific_checks: {
    ideal_visible: 'Beschikbaar in live-modus',
    afterpay_klarna: 'Beschikbaar in live-modus',
    free_shipping_communication: 'Beschikbaar in live-modus',
    trust_badges: 'Beschikbaar in live-modus',
    gdpr_cookies: 'Beschikbaar in live-modus',
  },
};

/**
 * Demo-mode is true wanneer:
 *  - NEXT_PUBLIC_DEMO_MODE === 'true' (expliciete keuze), of
 *  - er geen NEXT_PUBLIC_DEMO_MODE is gezet (default = veilig demo).
 *
 * Eén bron van waarheid — geen verspreide checks meer in de app.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
}

export type AuditError =
  | { kind: 'demo'; message: string }
  | { kind: 'auth'; message: string }
  | { kind: 'quota'; message: string }
  | { kind: 'rate_limit'; message: string }
  | { kind: 'parse'; message: string; raw?: string }
  | { kind: 'network'; message: string }
  | { kind: 'server'; message: string; status?: number };

export class AuditFailure extends Error {
  readonly detail: AuditError;
  constructor(detail: AuditError) {
    super(detail.message);
    this.detail = detail;
  }
}

/**
 * Roept de audit aan. In demo-mode geeft het mock-data terug zonder
 * netwerkverkeer. In live-mode POST naar /api/audit (Next route handler)
 * die op zijn beurt naar api.anthropic.com proxyt en de key veilig houdt.
 */
export async function runAudit(req: AuditRequest): Promise<AuditResult> {
  if (isDemoMode()) {
    // Simuleer een korte vertraging zodat het natuurlijk voelt
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return mockAudit;
  }

  let response: Response;
  try {
    response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    throw new AuditFailure({
      kind: 'network',
      message:
        'Kan de audit-server niet bereiken. Check je internetverbinding of probeer opnieuw.',
    });
  }

  // Map HTTP-status naar gebruikersvriendelijke errors (P1.2)
  if (!response.ok) {
    const status = response.status;

    if (status === 401 || status === 403) {
      throw new AuditFailure({
        kind: 'auth',
        message:
          'API-key ontbreekt of is ongeldig. Beheerder moet ANTHROPIC_API_KEY controleren.',
      });
    }
    if (status === 429) {
      throw new AuditFailure({
        kind: 'rate_limit',
        message:
          'Te veel audits in korte tijd. Wacht een minuut en probeer opnieuw.',
      });
    }
    if (status === 402) {
      throw new AuditFailure({
        kind: 'quota',
        message:
          'Anthropic-budget is op. Beheerder moet credit bijladen op console.anthropic.com.',
      });
    }
    throw new AuditFailure({
      kind: 'server',
      message: `Server-fout (HTTP ${status}). Probeer opnieuw of neem contact op met support.`,
      status,
    });
  }

  // Server geeft al JSON met audit-resultaat terug
  const data = await response.json();
  if (data && typeof data === 'object' && 'overall_score' in data) {
    return data as AuditResult;
  }

  throw new AuditFailure({
    kind: 'parse',
    message:
      'De AI gaf een onverwacht antwoord. Probeer opnieuw of upload kleinere screenshots.',
  });
}
