// GET /api/billing/diagnose
//
// Admin-only diagnose-endpoint voor Mollie-integratie. Beantwoordt:
//   - Is MOLLIE_API_KEY ingesteld?
//   - test- of live-mode?
//   - Werkt de key (kunnen we /methods ophalen)?
//   - Welke betaalmethoden zijn actief op dit account?
//   - Welke statuses heeft de organisatie (in review, active, etc)?
//
// Geen secrets in de output — alleen status-info. Snelle 5-sec-check
// of we live kunnen gaan zonder een echte checkout te triggeren.

import { SequenceType, Locale, type Method } from '@mollie/api-client';
import { requireAdmin } from '@/lib/admin-auth';
import { mollieClient, getMollieApiKey } from '@/lib/mollie/client';

export const runtime = 'nodejs';
export const maxDuration = 15;

type DiagnoseResult = {
  apiKey: {
    present: boolean;
    mode: 'test' | 'live' | 'unknown';
    prefix: string; // bv. "test_..." — eerste 6 chars + ... voor identificatie zonder lek
    /** Uit welke env-var kwam de actieve key. Handig om te zien of live-var
     *  daadwerkelijk geladen is, of dat we per ongeluk terugvallen op de
     *  open dev-var. */
    source: 'MOLLIE_API_KEY_LIVE' | 'MOLLIE_API_KEY' | 'none';
  };
  methods?: {
    count: number;
    active: Array<{ id: string; description: string; status: string }>;
    error?: string;
  };
  /**
   * Cruciaal: welke methoden ondersteunen recurring (sequenceType: first) voor
   * onze concrete bedragen? Als deze lijst leeg is, weet je 100% dat het probleem
   * recurring-config is, niet onze code.
   */
  recurringMethods?: {
    webshop: { count: number; ids: string[]; error?: string };
    agency: { count: number; ids: string[]; error?: string };
  };
  profileCheck?: {
    ok: boolean;
    /** 'org-token' → normale OAuth-response; 'profile-key' → 403 want de
     *  key is scoped naar één profiel, niet naar de hele organisatie.
     *  Dat laatste is compleet OK voor payments — alleen de organizations
     *  endpoint werkt er niet mee. */
    keyType?: 'org-token' | 'profile-key' | 'unknown';
    error?: string;
    details?: {
      name: string;
      registrationNumber: string | null;
      vatNumber: string | null;
      locale: string | null;
    };
  };
};

export async function GET() {
  await requireAdmin();

  const rawKey = getMollieApiKey() ?? '';
  const source: DiagnoseResult['apiKey']['source'] = process.env.MOLLIE_API_KEY_LIVE
    ? 'MOLLIE_API_KEY_LIVE'
    : process.env.MOLLIE_API_KEY
      ? 'MOLLIE_API_KEY'
      : 'none';
  const result: DiagnoseResult = {
    apiKey: {
      present: rawKey.length > 0,
      mode: rawKey.startsWith('test_')
        ? 'test'
        : rawKey.startsWith('live_')
          ? 'live'
          : 'unknown',
      prefix: rawKey ? rawKey.slice(0, 6) + '…' : '(leeg)',
      source,
    },
  };

  if (!result.apiKey.present) {
    return Response.json(result);
  }

  // Probeer /methods op te halen — minst-invasieve API-call die direct
  // aangeeft of de key werkt + welke methoden actief zijn
  try {
    const mollie = mollieClient();
    const methodsPage = await mollie.methods.list({ resource: 'payments' });
    // SDK retourneert een page-object met iterator + count
    const methods: Array<{ id: string; description: string; status?: string }> = [];
    for (const m of methodsPage) {
      methods.push({
        id: m.id,
        description: m.description,
        status: 'activated', // /methods/list returnt alleen geactiveerde methoden
      });
    }
    result.methods = {
      count: methods.length,
      active: methods.map((m) => ({
        id: m.id,
        description: m.description,
        status: m.status ?? 'unknown',
      })),
    };
  } catch (e) {
    const err = e as { message?: string; statusCode?: number };
    result.methods = {
      count: 0,
      active: [],
      error: `${err.message ?? 'onbekend'} ${err.statusCode ? `[HTTP ${err.statusCode}]` : ''}`,
    };
  }

  // Mollie expliciet vragen: voor sequenceType:first met onze plan-bedragen,
  // welke methoden zijn beschikbaar? Lege lijst = geen enkele methode kan
  // recurring aan. Niet-leeg = code-probleem ergens anders.
  async function probeRecurring(amountEur: string) {
    try {
      const mollie = mollieClient();
      // SDK's methods.list met query params returnt Promise<Method[]>.
      // Cast nodig omdat de overload-typing slecht is bij combinaties van params.
      const list = (await mollie.methods.list({
        sequenceType: SequenceType.first,
        amount: { value: amountEur, currency: 'EUR' },
        locale: Locale.nl_NL,
        billingCountry: 'NL',
      })) as unknown as Method[];
      const ids = list.map((m) => m.id);
      return { count: ids.length, ids };
    } catch (e) {
      const err = e as { message?: string; statusCode?: number };
      return {
        count: 0,
        ids: [],
        error: `${err.message ?? 'onbekend'} ${err.statusCode ? `[HTTP ${err.statusCode}]` : ''}`,
      };
    }
  }
  result.recurringMethods = {
    webshop: await probeRecurring('29.00'),
    agency: await probeRecurring('59.00'),
  };

  // Probeer organisations.getCurrent — onthult of de key gekoppeld is aan
  // een gevalideerd profiel/account. Twee mogelijke uitkomsten:
  //   1. Werkt → OAuth-token of unrestricted API-key. Toont org-details.
  //   2. HTTP 403 "restricted to a specific profile" → normale profile-
  //      scoped API-key. Payments werken prima; alleen deze specifieke
  //      endpoint niet beschikbaar. Ok=true met keyType=profile-key.
  try {
    const mollie = mollieClient();
    const org = await mollie.organizations.getCurrent();
    result.profileCheck = {
      ok: true,
      keyType: 'org-token',
      details: {
        name: org.name,
        registrationNumber: org.registrationNumber ?? null,
        vatNumber: org.vatNumber ?? null,
        locale: org.locale ?? null,
      },
    };
  } catch (e) {
    const err = e as { message?: string; statusCode?: number };
    const isProfileScopedKey =
      err.statusCode === 403 &&
      (err.message ?? '').toLowerCase().includes('restricted to a specific profile');
    if (isProfileScopedKey) {
      // Verwacht bij een profile-scoped API-key. Niet blocking.
      result.profileCheck = {
        ok: true,
        keyType: 'profile-key',
      };
    } else {
      result.profileCheck = {
        ok: false,
        keyType: 'unknown',
        error: `${err.message ?? 'onbekend'} ${err.statusCode ? `[HTTP ${err.statusCode}]` : ''}`,
      };
    }
  }

  return Response.json(result);
}
