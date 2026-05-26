// Audit-opslag met hybrid backend.
//
// Ingelogd  → Supabase Postgres (per-user, persistent, gedeeld tussen apparaten)
// Uitgelogd → browser localStorage (huidige flow voor anonieme demo-bezoekers)
//
// Page.tsx kent dit onderscheid niet — roept alleen saveAudit/loadHistory/
// deleteAudit/updateResolved aan. Bij login kan de oude localStorage-data
// later eenmalig gemigreerd worden (M2d, "importeer mijn lokale audits"-knop).

import { createClient } from '@/lib/supabase/client';
import { storage } from '@/lib/storage';
import type { AuditResult } from '@/lib/claude';
import type { FlowType } from '@/lib/data/flow-types';

// ---- Shared types ----------------------------------------------------------

export type HistoryItem = {
  key: string; // localStorage-key OF Supabase row-uuid
  timestamp: number; // ms since epoch — voor sortering
  flowType: FlowType['value'];
  webshopName: string;
  webshopUrl?: string;
  productCategory: string;
  email?: string | null;
  audit: AuditResult;
};

export type SaveAuditInput = Omit<HistoryItem, 'key' | 'timestamp'>;

// ---- Helpers --------------------------------------------------------------

/** Probeert de ingelogde user op te halen. null = uitgelogd of fout. */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ---- saveAudit -------------------------------------------------------------

export async function saveAudit(input: SaveAuditInput): Promise<string> {
  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('audits')
      .insert({
        user_id: userId,
        flow_type: input.flowType,
        webshop_name: input.webshopName,
        webshop_url: input.webshopUrl || null,
        product_category: input.productCategory,
        email: input.email ?? null,
        audit: input.audit,
        resolved_issues: {},
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Supabase insert failed:', error);
      throw new Error('Kon audit niet opslaan op de server.');
    }
    return data.id;
  }

  // Fallback: localStorage (uitgelogde flow)
  const key = `audit:${Date.now()}`;
  const payload = {
    timestamp: Date.now(),
    flowType: input.flowType,
    webshopName: input.webshopName,
    webshopUrl: input.webshopUrl,
    productCategory: input.productCategory,
    email: input.email ?? null,
    audit: input.audit,
  };
  await storage.set(key, JSON.stringify(payload));
  return key;
}

// ---- loadHistory -----------------------------------------------------------

export async function loadHistory(): Promise<HistoryItem[]> {
  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('audits')
      .select(
        'id, created_at, flow_type, webshop_name, webshop_url, product_category, email, audit'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase select failed:', error);
      return [];
    }

    return (data ?? []).map((row): HistoryItem => ({
      key: row.id,
      timestamp: new Date(row.created_at).getTime(),
      flowType: row.flow_type as FlowType['value'],
      webshopName: row.webshop_name,
      webshopUrl: row.webshop_url ?? undefined,
      productCategory: row.product_category,
      email: row.email,
      audit: row.audit as AuditResult,
    }));
  }

  // Fallback: localStorage
  const result = await storage.list('audit:');
  if (!result?.keys || result.keys.length === 0) return [];

  const audits: HistoryItem[] = [];
  for (const key of result.keys) {
    try {
      const item = await storage.get(key);
      if (item?.value) {
        const parsed = JSON.parse(item.value) as Omit<HistoryItem, 'key'>;
        audits.push({ key, ...parsed });
      }
    } catch {
      // skip corrupt entry
    }
  }
  audits.sort((a, b) => b.timestamp - a.timestamp);
  return audits;
}

// ---- deleteAudit -----------------------------------------------------------

export async function deleteAudit(key: string): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = createClient();
    const { error } = await supabase.from('audits').delete().eq('id', key);
    if (error) {
      console.error('Supabase delete failed:', error);
      throw new Error('Kon audit niet verwijderen.');
    }
    return;
  }

  // Fallback: localStorage
  await storage.delete(key);
  await storage.delete(`resolved:${key}`);
}

// ---- updateResolved --------------------------------------------------------

export async function updateResolved(
  key: string,
  resolvedIssues: Record<number, boolean>
): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = createClient();
    const { error } = await supabase
      .from('audits')
      .update({ resolved_issues: resolvedIssues })
      .eq('id', key);
    if (error) {
      console.error('Supabase update failed:', error);
    }
    return;
  }

  // Fallback: localStorage
  await storage.set(`resolved:${key}`, JSON.stringify(resolvedIssues));
}

// ---- Migration helpers (lokale audits → Supabase) -------------------------

/** Aantal audits dat momenteel alleen in localStorage staat. */
export async function getLocalAuditsCount(): Promise<number> {
  const result = await storage.list('audit:');
  return result?.keys?.length ?? 0;
}

/**
 * Migreert alle localStorage-audits naar Supabase voor de ingelogde user.
 * Op succes per item: verwijder uit localStorage zodat dubbele migratie
 * onmogelijk is. Retourneert tellingen voor user-feedback.
 */
export async function migrateLocalAuditsToSupabase(): Promise<{
  migrated: number;
  failed: number;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Niet ingelogd — kan niet migreren.');
  }

  const supabase = createClient();
  const list = await storage.list('audit:');
  if (!list?.keys || list.keys.length === 0) {
    return { migrated: 0, failed: 0 };
  }

  let migrated = 0;
  let failed = 0;

  for (const key of list.keys) {
    try {
      const item = await storage.get(key);
      if (!item?.value) {
        failed++;
        continue;
      }
      const parsed = JSON.parse(item.value) as Omit<HistoryItem, 'key'>;

      // Probeer ook bijbehorende resolved-state mee te nemen
      let resolved: Record<number, boolean> = {};
      try {
        const r = await storage.get(`resolved:${key}`);
        if (r?.value) resolved = JSON.parse(r.value);
      } catch {
        /* geen resolved-state — OK */
      }

      const { error } = await supabase.from('audits').insert({
        user_id: userId,
        flow_type: parsed.flowType,
        webshop_name: parsed.webshopName,
        webshop_url: parsed.webshopUrl || null,
        product_category: parsed.productCategory,
        email: parsed.email ?? null,
        audit: parsed.audit,
        resolved_issues: resolved,
      });

      if (error) {
        console.error('Migratie-insert mislukt:', error);
        failed++;
      } else {
        await storage.delete(key);
        await storage.delete(`resolved:${key}`);
        migrated++;
      }
    } catch (e) {
      console.error('Migratie-loop fout:', e);
      failed++;
    }
  }

  return { migrated, failed };
}

// ---- loadResolved ----------------------------------------------------------

export async function loadResolved(
  key: string
): Promise<Record<number, boolean>> {
  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('audits')
      .select('resolved_issues')
      .eq('id', key)
      .single();
    if (error || !data) return {};
    return (data.resolved_issues as Record<number, boolean>) ?? {};
  }

  try {
    const item = await storage.get(`resolved:${key}`);
    if (item?.value) return JSON.parse(item.value) as Record<number, boolean>;
  } catch {
    /* no resolved-state yet */
  }
  return {};
}
