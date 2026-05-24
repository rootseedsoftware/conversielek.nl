// POST /api/audit
//
// Proxy naar de Anthropic API zodat de API-key serverside blijft.
// Bouwt zelf de Anthropic-payload uit { prompt, screenshots } zodat de
// client niets van het Anthropic-formaat hoeft te weten.
//
// Hardening (uit de P0-lijst van de oude server.js review):
//  - Origin-whitelist via ALLOWED_ORIGINS env (comma-separated)
//  - Body size cap (~25 MB voor 5 screenshots)
//  - In-memory rate limit per IP (dev-bruikbaar; voor productie op Vercel
//    later vervangen door Upstash Redis — comment in code)
//  - JSON-parse vangnet met repair (strip markdown fences, slice tussen
//    eerste/laatste accolade)
//  - max_tokens 8000 (was 4000 — was te krap voor 5 screenshots + 8 issues)
//  - Specifieke statuscodes per faalmodus

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// ---- Config ----------------------------------------------------------------

const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25 MB
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 10);
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_MAX_TOKENS = 8000;

// ---- Origin whitelist ------------------------------------------------------

function allowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Dev-fallback: als niets is gezet, sta localhost toe.
  if (list.length === 0) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }
  return list;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigins();
  const allow = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

// ---- Rate limit (in-memory) ------------------------------------------------
//
// LET OP: in-memory state werkt alleen op een single Node-instance. Op
// Vercel serverless wordt elke functie-invocatie geïsoleerd → deze limiter
// faalt zachtjes (laat alles door). Voor productie: vervangen door
// @upstash/ratelimit met Redis. Tracked als follow-up in M3.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_PER_MIN) return true;
  return false;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return '0.0.0.0';
}

// ---- Body reading met size cap --------------------------------------------

async function readBodyWithCap(req: NextRequest): Promise<string> {
  const lengthHeader = req.headers.get('content-length');
  if (lengthHeader && Number(lengthHeader) > MAX_BODY_BYTES) {
    throw new BodyTooLarge();
  }

  const reader = req.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new BodyTooLarge();
      }
      chunks.push(value);
    }
  }

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buf);
}

class BodyTooLarge extends Error {}

// ---- JSON repair voor model-output ----------------------------------------
//
// Het model wrapt soms toch in markdown fences of voegt afsluitende tekst
// toe. We pellen die af en pakken vervolgens de eerste t/m laatste {…}.

function repairJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    s = s.substring(first, last + 1);
  }
  return s;
}

// ---- Anthropic types (minimaal wat we gebruiken) --------------------------

type Screenshot = { name: string; type: string; base64: string };

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { type: string; message: string };
};

// ---- Handlers -------------------------------------------------------------

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  // 1. API-key check (fail fast voor de operator, niet voor de eindgebruiker)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Server config: ANTHROPIC_API_KEY ontbreekt.' },
      { status: 500, headers: cors }
    );
  }

  // 2. Rate limit
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return Response.json(
      { error: 'Te veel audits in korte tijd. Wacht een minuut en probeer opnieuw.' },
      { status: 429, headers: cors }
    );
  }

  // 3. Body lezen met size cap
  let bodyText: string;
  try {
    bodyText = await readBodyWithCap(req);
  } catch (e) {
    if (e instanceof BodyTooLarge) {
      return Response.json(
        { error: `Verzoek te groot (>${MAX_BODY_BYTES / 1024 / 1024} MB). Upload kleinere screenshots.` },
        { status: 413, headers: cors }
      );
    }
    return Response.json({ error: 'Body lezen mislukt.' }, { status: 400, headers: cors });
  }

  // 4. Body parsen
  let payload: { prompt?: string; screenshots?: Screenshot[] };
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: 'Ongeldige JSON in body.' }, { status: 400, headers: cors });
  }

  const prompt = payload.prompt;
  const screenshots = payload.screenshots ?? [];
  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ error: 'Veld "prompt" ontbreekt.' }, { status: 400, headers: cors });
  }

  // 5. Anthropic-messages opbouwen (screenshots eerst, dan prompt-tekst)
  const messageContent: Array<
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'text'; text: string }
  > = [
    ...screenshots.map((s) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: s.type, data: s.base64 },
    })),
    { type: 'text', text: prompt },
  ];

  // 6. Call Anthropic
  let anthropic: AnthropicResponse;
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    anthropic = (await upstream.json()) as AnthropicResponse;

    if (!upstream.ok) {
      // Map Anthropic status door naar zinvolle code voor de client
      const status = upstream.status;
      const message = anthropic.error?.message ?? 'Onbekende Anthropic-fout.';
      console.error(`[audit] Anthropic ${status}: ${message}`);

      if (status === 401 || status === 403) {
        return Response.json({ error: 'API-key ongeldig.' }, { status: 401, headers: cors });
      }
      if (status === 429) {
        return Response.json(
          { error: 'Anthropic rate-limit bereikt. Probeer over een minuut opnieuw.' },
          { status: 429, headers: cors }
        );
      }
      if (status === 402 || /credit/i.test(message)) {
        return Response.json(
          { error: 'Anthropic-budget op. Beheerder moet credit bijladen.' },
          { status: 402, headers: cors }
        );
      }
      return Response.json({ error: message }, { status: 502, headers: cors });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[audit] fetch failed:', message);
    return Response.json(
      { error: 'Kan Anthropic niet bereiken. Probeer opnieuw.' },
      { status: 502, headers: cors }
    );
  }

  // 7. Tekst-blokken samenvoegen en JSON repairen
  const text = (anthropic.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('\n');

  if (!text.trim()) {
    return Response.json(
      { error: 'Model gaf een leeg antwoord. Probeer opnieuw met andere screenshots.' },
      { status: 502, headers: cors }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(repairJson(text));
  } catch {
    console.error('[audit] JSON parse fail. Raw output (first 500 chars):', text.slice(0, 500));
    return Response.json(
      {
        error:
          'De AI gaf een onverwacht antwoord (geen geldige JSON). Probeer opnieuw of upload kleinere screenshots.',
      },
      { status: 502, headers: cors }
    );
  }

  // 8. Basale shape-check zodat de client niet crasht op missende velden
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { overall_score?: unknown }).overall_score !== 'number'
  ) {
    return Response.json(
      { error: 'Audit-resultaat heeft onverwachte vorm. Probeer opnieuw.' },
      { status: 502, headers: cors }
    );
  }

  return Response.json(parsed, { status: 200, headers: cors });
}
