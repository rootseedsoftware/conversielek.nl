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

import { requireAdmin } from '@/lib/admin-auth';
import { mollieClient } from '@/lib/mollie/client';

export const runtime = 'nodejs';
export const maxDuration = 15;

type DiagnoseResult = {
  apiKey: {
    present: boolean;
    mode: 'test' | 'live' | 'unknown';
    prefix: string; // bv. "test_..." — eerste 6 chars + ... voor identificatie zonder lek
  };
  methods?: {
    count: number;
    active: Array<{ id: string; description: string; status: string }>;
    error?: string;
  };
  profileCheck?: {
    ok: boolean;
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

  const rawKey = process.env.MOLLIE_API_KEY ?? '';
  const result: DiagnoseResult = {
    apiKey: {
      present: rawKey.length > 0,
      mode: rawKey.startsWith('test_')
        ? 'test'
        : rawKey.startsWith('live_')
          ? 'live'
          : 'unknown',
      prefix: rawKey ? rawKey.slice(0, 6) + '…' : '(leeg)',
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

  // Probeer organisations.getCurrent — onthult of de key gekoppeld is aan
  // een gevalideerd profiel/account (Mollie schorst betalingen als de
  // organisatie nog in review staat)
  try {
    const mollie = mollieClient();
    const org = await mollie.organizations.getCurrent();
    result.profileCheck = {
      ok: true,
      details: {
        name: org.name,
        registrationNumber: org.registrationNumber ?? null,
        vatNumber: org.vatNumber ?? null,
        locale: org.locale ?? null,
      },
    };
  } catch (e) {
    const err = e as { message?: string; statusCode?: number };
    result.profileCheck = {
      ok: false,
      error: `${err.message ?? 'onbekend'} ${err.statusCode ? `[HTTP ${err.statusCode}]` : ''}`,
    };
  }

  return Response.json(result);
}
