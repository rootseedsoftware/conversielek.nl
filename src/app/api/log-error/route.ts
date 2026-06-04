// POST /api/log-error — public endpoint voor client error-logging.
//
// Geen auth: errors moeten OOK kunnen binnenkomen vanuit crashende /
// uitgelogde clients. Beschermd via:
//   - Body size cap (10 KB ruim genoeg voor stack + context)
//   - In-memory rate limit per IP (best-effort op Edge — module-globals
//     niet betrouwbaar tussen invocations, voor MVP voldoende tegen
//     accidental DoS-loops)
//   - Validatie van fingerprint-format
//
// Server-side errors gaan NIET via deze endpoint — die kunnen direct
// admin-client gebruiken. Deze route is voor browser-clients.

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'edge';
export const maxDuration = 5;

const MAX_BODY_BYTES = 10 * 1024; // 10 KB
const RATE_LIMIT_PER_MIN = 30; // per IP

// Best-effort rate-limit. Per-IP in-memory map. Cleanup elke minuut.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function ipFromRequest(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_PER_MIN) return false;
  bucket.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  if (!rateLimitOk(ip)) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return new Response('Payload too large', { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Veld-extractie + type-checks
  const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint : '';
  const message = typeof body.message === 'string' ? body.message : '';
  const level = typeof body.level === 'string' ? body.level : 'error';
  const source = typeof body.source === 'string' ? body.source : 'client';
  const stack = typeof body.stack === 'string' ? body.stack : null;
  const url = typeof body.url === 'string' ? body.url : null;
  const userAgent = typeof body.user_agent === 'string' ? body.user_agent : null;
  const context = body.context && typeof body.context === 'object' ? body.context : {};

  if (!fingerprint || fingerprint.length > 64) {
    return new Response('Invalid fingerprint', { status: 400 });
  }
  if (!message) {
    return new Response('Empty message', { status: 400 });
  }
  if (!['error', 'warning', 'info'].includes(level)) {
    return new Response('Invalid level', { status: 400 });
  }
  if (!['client', 'server', 'edge', 'cron'].includes(source)) {
    return new Response('Invalid source', { status: 400 });
  }

  // Upsert: zelfde fingerprint → bump occurrences + last_seen_at.
  // Werkt via Postgres unique-index op fingerprint.
  const admin = createAdminClient();

  // Eerst proberen: increment bestaande rij
  const { data: existing } = await admin
    .from('error_logs')
    .select('id, occurrences')
    .eq('fingerprint', fingerprint)
    .maybeSingle();

  if (existing) {
    await admin
      .from('error_logs')
      .update({
        occurrences: ((existing.occurrences as number) ?? 0) + 1,
        last_seen_at: new Date().toISOString(),
        // Re-open als ie eerder dismissed was — nieuwe occurrence is signal
        dismissed: false,
        dismissed_at: null,
        dismissed_by: null,
      })
      .eq('id', existing.id as string);
  } else {
    await admin.from('error_logs').insert({
      fingerprint,
      level,
      source,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000) ?? null,
      url,
      user_agent: userAgent,
      context,
    });
  }

  return new Response('OK', { status: 200 });
}
