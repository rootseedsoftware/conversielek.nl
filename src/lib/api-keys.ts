// M7 — API-key management.
//
// Hashing: SHA-256 via Web Crypto API (werkt op Edge én Node).
// Format: cl_<32 hex chars>. Prefix voor display: eerste 11 chars
// + "..." + laatste 4 = "cl_a1b2c3...c3d4" (16 chars zichtbaar).
//
// Lookup-flow (auth.ts gebruikt dit):
//   1. Bearer-header → strip "Bearer " → plain key
//   2. Hash → SELECT FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL
//   3. Update last_used_at + usage_count
//   4. Return user_id voor downstream use

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number;
  revoked: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
// Key generation + hashing (server-only, Edge-compatible)
// ─────────────────────────────────────────────────────────────────────────

/** Genereert een 32-char hex random suffix (16 bytes entropy). */
function generateKeySuffix(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SHA-256 hex digest van een string. Werkt op Edge en Node via Web Crypto. */
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Display-prefix: "cl_a1b2c3...c3d4". 11 chars uit het begin + ... + 4 uit eind.
 * Voldoende om keys uit elkaar te houden in de UI, zonder de hele key te onthullen.
 */
function makePrefix(plainKey: string): string {
  if (plainKey.length < 16) return plainKey;
  return `${plainKey.slice(0, 11)}...${plainKey.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD voor owner (auth-gated)
// ─────────────────────────────────────────────────────────────────────────

export async function createApiKey(name: string): Promise<
  | { ok: true; plainKey: string; keyMeta: ApiKey }
  | { ok: false; error: string }
> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    return { ok: false, error: 'Naam moet 1-80 tekens zijn.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  const plainKey = `cl_${generateKeySuffix()}`;
  const keyHash = await sha256Hex(plainKey);
  const prefix = makePrefix(plainKey);

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name: trimmed,
      key_hash: keyHash,
      key_prefix: prefix,
    })
    .select('id, name, key_prefix, created_at, last_used_at, usage_count, revoked_at')
    .single();

  if (error || !data) {
    console.error('[createApiKey] insert failed:', error);
    return { ok: false, error: 'Kon key niet aanmaken.' };
  }

  return {
    ok: true,
    plainKey,
    keyMeta: {
      id: data.id as string,
      name: data.name as string,
      prefix: data.key_prefix as string,
      createdAt: data.created_at as string,
      lastUsedAt: (data.last_used_at as string | null) ?? null,
      usageCount: (data.usage_count as number) ?? 0,
      revoked: data.revoked_at !== null,
    },
  };
}

export async function listMyApiKeys(): Promise<ApiKey[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, usage_count, revoked_at')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (
    data as Array<{
      id: string;
      name: string;
      key_prefix: string;
      created_at: string;
      last_used_at: string | null;
      usage_count: number;
      revoked_at: string | null;
    }>
  ).map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.key_prefix,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    usageCount: r.usage_count,
    revoked: r.revoked_at !== null,
  }));
}

export async function revokeApiKey(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[revokeApiKey] update failed:', error);
    return { ok: false, error: 'Kon key niet intrekken.' };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Server-only key-authenticatie (gebruikt vanuit /api/v1/* routes)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolveert een plain API-key naar de user-id van de owner. Tracks
 * usage. Returns null als key onbekend of revoked.
 *
 * Caller mag deze verfijnen voor rate-limiting (zie /api/v1/audits).
 */
export async function resolveApiKey(plainKey: string): Promise<{ userId: string } | null> {
  if (!plainKey || !plainKey.startsWith('cl_') || plainKey.length !== 35) {
    return null;
  }

  const keyHash = await sha256Hex(plainKey);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at !== null) return null;

  // Fire-and-forget usage tracking — niet blokken op falende update
  void admin
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: ((data as { usage_count?: number }).usage_count ?? 0) + 1,
    })
    .eq('id', data.id as string);

  return { userId: data.user_id as string };
}
