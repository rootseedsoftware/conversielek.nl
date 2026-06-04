// POST /api/v1/audits — programmatic audit endpoint voor Agency-tier.
//
// Verschil met /api/audit:
//   - Bearer-auth via API-key (geen Supabase session)
//   - Non-streaming JSON response (geen SSE — eenvoudiger voor CLI/CI use)
//   - Node runtime (Edge zou ook kunnen, maar admin-client is eenvoudiger
//     in Node door consistent env-var-access)
//   - Audit wordt opgeslagen onder user-id van key-owner
//
// Request body:
//   {
//     "flowType": "homepage" | "product" | "cart" | "checkout" | "post_purchase",
//     "webshopName": "string",
//     "webshopUrl": "string?",
//     "productCategory": "string",
//     "targetAudience": "string?",
//     "currentChallenge": "string?",
//     "screenshots": [
//       { "name": "...", "type": "image/png", "base64": "..." }
//     ]
//   }
//
// Response:
//   { "ok": true, "auditId": "uuid", "result": AuditResult }
//
// Errors: 401 (bad auth), 400 (validation), 502 (Anthropic), 500 (DB/other).

import { NextRequest } from 'next/server';
import { resolveApiKey } from '@/lib/api-keys';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAuditPrompt } from '@/lib/prompt';
import { flowTypes, type FlowType } from '@/lib/data/flow-types';
import type { AuditResult } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 300; // Sonnet kan tot 90s duren; royale marge

const MAX_BODY_BYTES = 25 * 1024 * 1024;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
const ANTHROPIC_MAX_TOKENS = 8000;
const MAX_SCREENSHOTS = 5;

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function errJson(status: number, error: string, code?: string): Response {
  return Response.json(
    code ? { ok: false, error, code } : { ok: false, error },
    { status }
  );
}

function isValidFlowType(v: unknown): v is FlowType['value'] {
  return typeof v === 'string' && flowTypes.some((f) => f.value === v);
}

type ScreenshotInput = {
  name?: string;
  type: string;
  base64: string;
};

function isScreenshotInput(v: unknown): v is ScreenshotInput {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.type === 'string' && typeof o.base64 === 'string';
}

/** Strip ```json wrappers + isoleert {...} fragment om JSON-repair te doen. */
function tryParseJson(raw: string): unknown {
  // Eerste poging: directe parse
  try {
    return JSON.parse(raw);
  } catch {
    /* repair below */
  }
  // Code-fence strip
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      /* continue */
    }
  }
  // Isoleer eerste { tot laatste }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(raw.slice(first, last + 1));
    } catch {
      /* fall through */
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth via Bearer-header
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errJson(401, 'Missing or invalid Authorization header. Use "Bearer <api-key>".', 'AUTH_MISSING');
  }
  const plainKey = authHeader.slice('Bearer '.length).trim();
  const resolved = await resolveApiKey(plainKey);
  if (!resolved) {
    return errJson(401, 'Invalid or revoked API key.', 'AUTH_INVALID');
  }
  const userId = resolved.userId;

  // 2. Body size guard
  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return errJson(413, 'Request body exceeds 25 MB limit.', 'BODY_TOO_LARGE');
  }

  // 3. Parse + validate body
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errJson(400, 'Invalid JSON body.', 'BAD_JSON');
  }

  const flowType = body.flowType;
  const webshopName = typeof body.webshopName === 'string' ? body.webshopName : '';
  const webshopUrl = typeof body.webshopUrl === 'string' ? body.webshopUrl : '';
  const productCategory =
    typeof body.productCategory === 'string' ? body.productCategory : '';
  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience : '';
  const currentChallenge =
    typeof body.currentChallenge === 'string' ? body.currentChallenge : '';
  const screenshotsRaw = Array.isArray(body.screenshots) ? body.screenshots : [];

  if (!isValidFlowType(flowType)) {
    return errJson(
      400,
      `flowType moet één van: ${flowTypes.map((f) => f.value).join(', ')}`,
      'BAD_FLOW'
    );
  }
  if (!webshopName.trim() && !webshopUrl.trim()) {
    return errJson(
      400,
      'Either webshopName or webshopUrl is required.',
      'BAD_INPUT'
    );
  }
  if (!productCategory.trim()) {
    return errJson(400, 'productCategory is required.', 'BAD_INPUT');
  }
  const screenshots = screenshotsRaw.filter(isScreenshotInput);
  if (screenshots.length === 0) {
    return errJson(400, 'At least one screenshot is required.', 'NO_SCREENSHOTS');
  }
  if (screenshots.length > MAX_SCREENSHOTS) {
    return errJson(
      400,
      `Maximum ${MAX_SCREENSHOTS} screenshots per call.`,
      'TOO_MANY_SCREENSHOTS'
    );
  }

  // 4. Build prompt
  const prompt = buildAuditPrompt({
    flowType,
    webshopName: webshopName || webshopUrl || 'Onbekende webshop',
    webshopUrl,
    productCategory,
    targetAudience,
    currentChallenge,
  });

  // 5. Call Anthropic via REST (zelfde aanpak als /api/audit — geen SDK)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errJson(500, 'Server misconfiguration: ANTHROPIC_API_KEY missing.', 'NO_AI_KEY');
  }

  let rawText = '';
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...screenshots.map((s) => ({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: s.type || 'image/png',
                  data: s.base64,
                },
              })),
            ],
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return errJson(502, `AI provider HTTP ${upstream.status}: ${errText.slice(0, 200)}`, 'AI_ERROR');
    }

    type AnthropicMessageResponse = {
      content?: Array<{ type: string; text?: string }>;
    };
    const json = (await upstream.json()) as AnthropicMessageResponse;
    rawText = (json.content ?? [])
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text as string)
      .join('\n');
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown AI error';
    console.error('[v1/audits] Anthropic error:', e);
    return errJson(502, `AI provider error: ${msg}`, 'AI_ERROR');
  }

  // 6. Parse JSON-output
  const parsed = tryParseJson(rawText);
  if (!parsed || typeof parsed !== 'object') {
    return errJson(502, 'AI returned non-JSON output.', 'AI_PARSE_FAIL');
  }
  const result = parsed as AuditResult;

  // 7. Persist in audits-tabel
  const admin = createAdminClient();
  const { data: inserted, error: insertErr } = await admin
    .from('audits')
    .insert({
      user_id: userId,
      flow_type: flowType,
      webshop_name: webshopName || webshopUrl || 'Onbekende webshop',
      webshop_url: webshopUrl || null,
      product_category: productCategory,
      audit: result,
      resolved_issues: {},
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    console.error('[v1/audits] insert failed:', insertErr);
    // Audit is wel gegenereerd — return result zonder ID zodat caller
    // niet helemaal leeg uitkomt.
    return Response.json({
      ok: true,
      auditId: null,
      result,
      warning: 'Audit gegenereerd maar niet opgeslagen.',
    });
  }

  return Response.json({
    ok: true,
    auditId: inserted.id,
    result,
  });
}
