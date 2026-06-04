// M8 admin — aggregaat-queries voor het admin dashboard.
//
// Gebruikt service-role client (bypasst RLS) want admin moet over alle
// tenants kunnen aggregeren. Alle queries zijn read-only — geen mutations
// via deze module. Voor admin-mutations (user-suspend, audit-delete, etc.)
// komen aparte Server Actions in een later commit.
//
// Performance: de queries hier zijn count- en list-queries op kleine tabellen
// (huidig audit-volume is <1k). Bij groei richting 100k+ audits moeten de
// dashboard-counts naar een materialized view of cached cron-job.

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

type PlanLite = { slug: string; name: string; price_cents: number };

/**
 * Plans één keer ophalen via admin-client (RLS-bypassed, geen cookies).
 * Returnt een map slug → plan voor snelle lookups in de loops hieronder.
 */
async function loadPlansMap(): Promise<Map<string, PlanLite>> {
  const admin = createAdminClient();
  const { data } = await admin.from('plans').select('slug, name, price_cents');
  const map = new Map<string, PlanLite>();
  for (const p of (data ?? []) as PlanLite[]) {
    map.set(p.slug, p);
  }
  return map;
}

// ---- Types -----------------------------------------------------------------

export type DashboardStats = {
  totalUsers: number;
  totalAudits: number;
  auditsLast7d: number;
  auditsLast30d: number;
  activeSubscriptions: number;
  estimatedMrrEur: number;
  planDistribution: Array<{ plan: string; count: number }>;
};

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  planSlug: string;
  planName: string;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  auditsThisMonth: number;
  auditsTotal: number;
};

export type AdminAuditRow = {
  id: string;
  createdAt: string;
  userId: string;
  userEmail: string;
  webshopName: string;
  webshopUrl: string | null;
  flowType: string;
  score: number | null;
};

export type AdminSubscriptionRow = {
  id: string;
  userId: string;
  userEmail: string;
  planSlug: string;
  planName: string;
  status: string;
  mollieCustomerId: string | null;
  mollieSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
};

export type AdminErrorLogRow = {
  id: string;
  fingerprint: string;
  level: 'error' | 'warning' | 'info';
  source: 'client' | 'server' | 'edge' | 'cron';
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  userId: string | null;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  dismissed: boolean;
};

export type AdminPaymentEventRow = {
  id: string;
  provider: string;
  externalId: string;
  eventType: string;
  processedAt: string | null;
  error: string | null;
  createdAt: string;
};

// ---- Dashboard -------------------------------------------------------------

export async function getDashboardStats(): Promise<DashboardStats> {
  const admin = createAdminClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Counts — parallel voor snelheid
  const [
    usersRes,
    auditsTotalRes,
    audits7dRes,
    audits30dRes,
    subsRes,
  ] = await Promise.all([
    // auth.users count via admin API (Supabase publiceert geen RLS-vrije
    // SELECT op auth.users — moet via admin.listUsers met page=1 om totals
    // te krijgen).
    admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    admin.from('audits').select('id', { count: 'exact', head: true }),
    admin
      .from('audits')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    admin
      .from('audits')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    admin
      .from('subscriptions')
      .select('plan_slug, status', { count: 'exact' })
      .eq('status', 'active'),
  ]);

  // Supabase typt listUsers' response als union — `total` zit alleen op de
  // success-branch. Cast naar partial-record om defensief te lezen.
  const usersData = usersRes.data as { total?: number } | null;
  const totalUsers = usersData?.total ?? 0;
  const totalAudits = auditsTotalRes.count ?? 0;
  const auditsLast7d = audits7dRes.count ?? 0;
  const auditsLast30d = audits30dRes.count ?? 0;

  // Plan-distributie + MRR — plans eenmalig laden voor snelle lookup
  const subs = (subsRes.data ?? []) as Array<{ plan_slug: string; status: string }>;
  const activeSubscriptions = subs.length;
  const plansMap = await loadPlansMap();

  const planCounts = new Map<string, number>();
  let estimatedMrrEur = 0;
  for (const s of subs) {
    planCounts.set(s.plan_slug, (planCounts.get(s.plan_slug) ?? 0) + 1);
    const plan = plansMap.get(s.plan_slug);
    if (plan && plan.price_cents) {
      estimatedMrrEur += plan.price_cents / 100;
    }
  }

  const planDistribution = Array.from(planCounts.entries()).map(([plan, count]) => ({
    plan,
    count,
  }));

  return {
    totalUsers,
    totalAudits,
    auditsLast7d,
    auditsLast30d,
    activeSubscriptions,
    estimatedMrrEur,
    planDistribution,
  };
}

// ---- Users-lijst -----------------------------------------------------------

export async function listAdminUsers(opts?: { limit?: number }): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 100;

  // 1. Eerst de users (Supabase admin API — kleine pagina-grootte fine voor
  //    MVP, paginatie wanneer dat nodig is)
  const usersRes = await admin.auth.admin.listUsers({ page: 1, perPage: limit });
  const users = usersRes.data?.users ?? [];

  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  // 2. Subscriptions per user — join op plans want subscriptions heeft alleen
  //    plan_id (FK), niet plan_slug. Eerdere bug: queryde plan_slug direct
  //    → query faalde silent → ALLE users zagen 'free'.
  const subsRes = await admin
    .from('subscriptions')
    .select('user_id, status, cancel_at_period_end, plan:plans(slug)')
    .in('user_id', userIds);

  const subsByUser = new Map<
    string,
    { planSlug: string; status: string; cancelAtPeriodEnd: boolean }
  >();
  type SubRow = {
    user_id: string;
    status: string;
    cancel_at_period_end: boolean;
    plan: { slug: string } | { slug: string }[] | null;
  };
  for (const s of (subsRes.data ?? []) as unknown as SubRow[]) {
    const planRow = Array.isArray(s.plan) ? s.plan[0] : s.plan;
    if (!planRow) continue;
    // Bij meerdere subs: prefer 'active' > 'incomplete' > anders eerste
    const existing = subsByUser.get(s.user_id);
    if (!existing || s.status === 'active') {
      subsByUser.set(s.user_id, {
        planSlug: planRow.slug,
        status: s.status,
        cancelAtPeriodEnd: s.cancel_at_period_end,
      });
    }
  }

  // 3. Audit-counts per user (in dezelfde maand + totaal). Voor MVP doen we
  //    twee aggregate-queries ipv per-user — schaalt veel beter.
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [thisMonthRes, totalRes] = await Promise.all([
    admin
      .from('audits')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', startOfMonth.toISOString()),
    admin.from('audits').select('user_id').in('user_id', userIds),
  ]);

  const countThisMonth = new Map<string, number>();
  for (const row of (thisMonthRes.data ?? []) as Array<{ user_id: string }>) {
    countThisMonth.set(row.user_id, (countThisMonth.get(row.user_id) ?? 0) + 1);
  }
  const countTotal = new Map<string, number>();
  for (const row of (totalRes.data ?? []) as Array<{ user_id: string }>) {
    countTotal.set(row.user_id, (countTotal.get(row.user_id) ?? 0) + 1);
  }

  // 4. Combineer + plan-name lookup (plans eenmalig geladen)
  const plansMap = await loadPlansMap();
  const rows: AdminUserRow[] = users.map((u) => {
    const sub = subsByUser.get(u.id);
    const planSlug = sub?.planSlug ?? 'free';
    const plan = plansMap.get(planSlug);
    return {
      id: u.id,
      email: u.email ?? '(geen email)',
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      planSlug,
      planName: plan?.name ?? planSlug,
      subscriptionStatus: sub?.status ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      auditsThisMonth: countThisMonth.get(u.id) ?? 0,
      auditsTotal: countTotal.get(u.id) ?? 0,
    } satisfies AdminUserRow;
  });

  // Sorteer op laatste sign-in (nieuwste eerst)
  rows.sort((a, b) => {
    const aTime = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
    const bTime = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
    return bTime - aTime;
  });

  return rows;
}

// ---- Recent audits ---------------------------------------------------------

export async function listRecentAudits(opts?: { limit?: number }): Promise<AdminAuditRow[]> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 50;

  const auditsRes = await admin
    .from('audits')
    .select('id, created_at, user_id, webshop_name, webshop_url, flow_type, audit')
    .order('created_at', { ascending: false })
    .limit(limit);

  const audits = (auditsRes.data ?? []) as Array<{
    id: string;
    created_at: string;
    user_id: string;
    webshop_name: string;
    webshop_url: string | null;
    flow_type: string;
    audit: { score?: number } | null;
  }>;

  if (audits.length === 0) return [];

  // Email-lookup per user_id
  const userIds = Array.from(new Set(audits.map((a) => a.user_id)));
  const emails = new Map<string, string>();

  // listUsers gefilterd kan niet — we halen 1 page op en map de id's.
  // Voor MVP (<1000 users) prima.
  const allUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of allUsers.data?.users ?? []) {
    if (userIds.includes(u.id) && u.email) {
      emails.set(u.id, u.email);
    }
  }

  return audits.map((a) => ({
    id: a.id,
    createdAt: a.created_at,
    userId: a.user_id,
    userEmail: emails.get(a.user_id) ?? '(onbekend)',
    webshopName: a.webshop_name,
    webshopUrl: a.webshop_url,
    flowType: a.flow_type,
    score: a.audit?.score ?? null,
  }));
}

// ---- Subscriptions ---------------------------------------------------------

/**
 * Alle subscriptions ongeacht status — voor debug van betalingsflow.
 * Toont 'incomplete' subs zodat je ziet of een checkout is gestart maar
 * de webhook niet is aangekomen.
 */
export async function listAllSubscriptions(opts?: {
  limit?: number;
}): Promise<AdminSubscriptionRow[]> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 100;

  const subsRes = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      mollie_customer_id,
      mollie_subscription_id,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      created_at,
      plan:plans(slug, name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  type Row = {
    id: string;
    user_id: string;
    status: string;
    mollie_customer_id: string | null;
    mollie_subscription_id: string | null;
    current_period_start: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
    plan: { slug: string; name: string } | { slug: string; name: string }[] | null;
  };

  const rows = (subsRes.data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  // Email-lookup
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const emails = new Map<string, string>();
  const allUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of allUsers.data?.users ?? []) {
    if (userIds.includes(u.id) && u.email) emails.set(u.id, u.email);
  }

  return rows.map((r) => {
    const planRow = Array.isArray(r.plan) ? r.plan[0] : r.plan;
    return {
      id: r.id,
      userId: r.user_id,
      userEmail: emails.get(r.user_id) ?? '(onbekend)',
      planSlug: planRow?.slug ?? '(geen plan)',
      planName: planRow?.name ?? '(geen plan)',
      status: r.status,
      mollieCustomerId: r.mollie_customer_id,
      mollieSubscriptionId: r.mollie_subscription_id,
      currentPeriodStart: r.current_period_start,
      currentPeriodEnd: r.current_period_end,
      cancelAtPeriodEnd: r.cancel_at_period_end,
      createdAt: r.created_at,
    } satisfies AdminSubscriptionRow;
  });
}

// ---- Payment events --------------------------------------------------------

/**
 * Alle Mollie webhook events. Cruciaal voor debug: als deze leeg is, is
 * Mollie's webhook NOOIT bij ons aangekomen → check Mollie dashboard +
 * webhookUrl. Als wel rijen maar geen processed_at → handler crashte;
 * error-kolom toont waarom.
 */
export async function listPaymentEvents(opts?: {
  limit?: number;
}): Promise<AdminPaymentEventRow[]> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 100;

  const res = await admin
    .from('payment_events')
    .select('id, provider, external_id, event_type, processed_at, error, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  type Row = {
    id: string;
    provider: string;
    external_id: string;
    event_type: string;
    processed_at: string | null;
    error: string | null;
    created_at: string;
  };

  return ((res.data ?? []) as Row[]).map((r) => ({
    id: r.id,
    provider: r.provider,
    externalId: r.external_id,
    eventType: r.event_type,
    processedAt: r.processed_at,
    error: r.error,
    createdAt: r.created_at,
  }));
}

// ---- Error logs (M8 monitoring) -------------------------------------------

/**
 * Recente error-logs voor /admin/errors. Filter "showDismissed" laat
 * gearchiveerde rijen optioneel zien (default: alleen actief).
 */
export async function listErrorLogs(opts?: {
  limit?: number;
  showDismissed?: boolean;
}): Promise<AdminErrorLogRow[]> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 100;

  let query = admin
    .from('error_logs')
    .select(
      'id, fingerprint, level, source, message, stack, url, user_agent, user_id, occurrences, first_seen_at, last_seen_at, dismissed'
    )
    .order('last_seen_at', { ascending: false })
    .limit(limit);

  if (!opts?.showDismissed) {
    query = query.eq('dismissed', false);
  }

  const res = await query;
  type Row = {
    id: string;
    fingerprint: string;
    level: 'error' | 'warning' | 'info';
    source: 'client' | 'server' | 'edge' | 'cron';
    message: string;
    stack: string | null;
    url: string | null;
    user_agent: string | null;
    user_id: string | null;
    occurrences: number;
    first_seen_at: string;
    last_seen_at: string;
    dismissed: boolean;
  };

  return ((res.data ?? []) as Row[]).map((r) => ({
    id: r.id,
    fingerprint: r.fingerprint,
    level: r.level,
    source: r.source,
    message: r.message,
    stack: r.stack,
    url: r.url,
    userAgent: r.user_agent,
    userId: r.user_id,
    occurrences: r.occurrences,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    dismissed: r.dismissed,
  }));
}
