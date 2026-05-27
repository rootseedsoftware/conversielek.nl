// POST /api/audit  —  streamt Anthropic-respons via Server-Sent Events.
//
// Waarom streaming + Edge runtime:
// Een Sonnet-vision call op 1-5 screenshots duurt typisch 30-90 seconden.
// Op Vercel Hobby Node runtime is dat over de 60s maxDuration → de
// function wordt gekilled → client krijgt 504. Op Edge runtime mag een
// streaming response veel langer doorlopen (zo lang er data blijft komen
// is de function "actief"), waardoor Sonnet wél past binnen de Hobby
// limieten. Bijkomend voordeel: client kan tekst-deltas tonen voor
// betere UX dan een 60s spinner.
//
// Events naar de client (SSE):
//   event: start  — bevestiging dat we Anthropic gaan aanroepen
//   event: delta  — { text: "..." } — incrementele tekst-deltas
//   event: done   — finale AuditResult JSON
//   event: error  — { code, message } — typed errors voor de client
//
// Hardening hieronder is gelijk aan de pre-streaming versie:
//  - Origin-whitelist via ALLOWED_ORIGINS env
//  - Body size cap (25 MB)
//  - In-memory rate limit per IP (best-effort op Edge — module-globals
//    leven niet betrouwbaar tussen invocations; voor echte rate limit
//    later @upstash/ratelimit, tracked in M3)
//  - JSON-repair vangnet (strip code fences, slice eerste/laatste accolade)
//  - Specifieke statuscodes per faalmodus

import { NextRequest } from 'next/server';

export const runtime = 'edge';

// ---- Config ----------------------------------------------------------------

const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25 MB
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 10);
// Anthropic model. Override via env voor snelle wissel zonder code-deploy
// (bv. claude-haiku-4-5 voor snelheid/kosten, of claude-opus-4-1 voor
// max kwaliteit). Default: huidige Sonnet 4.5 alias.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
const ANTHROPIC_MAX_TOKENS = 8000;

// ---- Origin whitelist ------------------------------------------------------

function allowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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

// ---- Rate limit (best-effort op Edge) --------------------------------------

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

class BodyTooLarge extends Error {}

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

// ---- JSON repair voor model-output ----------------------------------------

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

// ---- Types ----------------------------------------------------------------

type Screenshot = { name: string; type: string; base64: string };

type AnthropicStreamEvent = {
  type: string;
  delta?: { type?: string; text?: string };
  message?: { stop_reason?: string };
};

// ---- SSE helper -----------------------------------------------------------

const encoder = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ---- Handlers -------------------------------------------------------------

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  // 1. API-key check
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

  // 3. Body lezen
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

  // 4. Parsen
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

  // 5. Anthropic-messages opbouwen
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

  // 6. Stream-respons opbouwen
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(sseEvent(event, data));
      };
      const fail = (code: string, message: string) => {
        send('error', { code, message });
        controller.close();
      };

      try {
        // Eerste event: bevestig dat we leven. Houdt verbinding warm
        // voor de client en geeft Vercel een signaal van activiteit.
        send('start', { ok: true });

        // Anthropic met stream:true aanroepen
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
            stream: true,
            messages: [{ role: 'user', content: messageContent }],
          }),
        });

        if (!upstream.ok) {
          let errMessage = `Anthropic HTTP ${upstream.status}`;
          try {
            const errData = (await upstream.json()) as {
              error?: { message?: string };
            };
            errMessage = errData.error?.message ?? errMessage;
          } catch {
            /* response wasn't JSON */
          }
          console.error(`[audit] Anthropic ${upstream.status}: ${errMessage}`);

          if (upstream.status === 401 || upstream.status === 403) {
            return fail('auth', 'API-key ongeldig.');
          }
          if (upstream.status === 404 && /model/i.test(errMessage)) {
            return fail(
              'server',
              'Het geconfigureerde AI-model bestaat niet meer. Beheerder moet ANTHROPIC_MODEL bijwerken.'
            );
          }
          if (upstream.status === 429) {
            return fail('rate_limit', 'Anthropic rate-limit bereikt. Probeer over een minuut opnieuw.');
          }
          if (upstream.status === 402 || /credit/i.test(errMessage)) {
            return fail('quota', 'Anthropic-budget op. Beheerder moet credit bijladen.');
          }
          return fail('server', errMessage);
        }

        if (!upstream.body) {
          return fail('server', 'Anthropic gaf geen stream terug.');
        }

        // 7. Anthropic SSE stream lezen, tekst-deltas verzamelen + forwarden
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const evt = JSON.parse(dataStr) as AnthropicStreamEvent;
              if (
                evt.type === 'content_block_delta' &&
                evt.delta?.type === 'text_delta' &&
                typeof evt.delta.text === 'string'
              ) {
                const text = evt.delta.text;
                fullText += text;
                send('delta', { text });
              }
            } catch {
              // Skip malformed SSE event
            }
          }
        }

        // 8. Volledige tekst parsen naar AuditResult
        if (!fullText.trim()) {
          return fail(
            'parse',
            'Model gaf een leeg antwoord. Probeer opnieuw met andere screenshots.'
          );
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(repairJson(fullText));
        } catch {
          console.error('[audit] JSON parse fail. Raw output (first 500 chars):', fullText.slice(0, 500));
          return fail(
            'parse',
            'De AI gaf een onverwacht antwoord (geen geldige JSON). Probeer opnieuw of upload kleinere screenshots.'
          );
        }

        if (
          !parsed ||
          typeof parsed !== 'object' ||
          typeof (parsed as { overall_score?: unknown }).overall_score !== 'number'
        ) {
          return fail('parse', 'Audit-resultaat heeft onverwachte vorm. Probeer opnieuw.');
        }

        // 9. Klaar — finale event met parsed audit
        send('done', parsed);
        controller.close();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('[audit] stream error:', message);
        fail('network', 'Kan Anthropic niet bereiken. Probeer opnieuw.');
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
