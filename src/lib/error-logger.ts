// M8 — Client-side error logger.
//
// Wordt aangeroepen vanuit error-boundaries (error.tsx) en
// global-error.tsx. Stuurt een fire-and-forget POST naar /api/log-error
// met `keepalive: true` zodat de request ook tijdens unload-flows
// (navigation, tab-close) gewoon doorgaat.
//
// Fingerprint-strategie: normaliseer de error-message zodat zelfde-soort
// errors gegroepeerd worden:
//   - Strip line/col numbers (":42:5")
//   - Strip URL paths in stacks (we behouden ze in stack-veld zelf)
//   - Strip UUIDs / hex-IDs van 8+ chars
//   - Lowercase
//
// SHA-1 hash van het genormaliseerde resultaat. Geen crypto-strength
// nodig — we groeperen, niet authenticate.

const NOISE_PATTERNS: Array<[RegExp, string]> = [
  [/:\d+:\d+/g, ''], // line:col
  [/\b[a-f0-9]{8,}\b/g, '<id>'], // UUIDs / hashes
  [/\bhttps?:\/\/\S+/g, '<url>'], // URLs
  [/\s+/g, ' '], // collapse whitespace
];

function normalizeForFingerprint(message: string): string {
  let s = message.toLowerCase();
  for (const [pattern, replacement] of NOISE_PATTERNS) {
    s = s.replace(pattern, replacement);
  }
  return s.trim().slice(0, 500);
}

// SHA-1 via Web Crypto (Edge + browser). Hex-output.
async function sha1Hex(input: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback: random fingerprint (zal niet groeperen maar voorkomt crash)
    return Math.random().toString(36).slice(2, 18);
  }
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export type LogErrorPayload = {
  message: string;
  stack?: string;
  level?: 'error' | 'warning' | 'info';
  context?: Record<string, unknown>;
};

/**
 * Stuurt een error naar /api/log-error. Fire-and-forget — error wordt
 * NIET re-thrown of awaited. Veilig om in catch-blocks te gebruiken
 * zonder de UI te blokken.
 */
export async function logError(payload: LogErrorPayload): Promise<void> {
  if (typeof window === 'undefined') return; // server-side: niet via deze flow
  try {
    const fingerprint = await sha1Hex(normalizeForFingerprint(payload.message));
    const body = JSON.stringify({
      fingerprint,
      level: payload.level ?? 'error',
      source: 'client',
      message: payload.message.slice(0, 2000),
      stack: payload.stack?.slice(0, 8000),
      url: window.location.href,
      user_agent: navigator.userAgent.slice(0, 500),
      context: payload.context ?? {},
    });

    // keepalive: true zodat unload-flows (tab close, navigation) de
    // request niet aborten. Geen .then/.catch — bewust silent.
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    /* fail-silent — een error-logger die zelf throwt is de duivel */
  }
}
