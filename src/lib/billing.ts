// Billing-helpers: huidige plan ophalen + quota-check.
//
// getCurrentPlan() valt terug op 'free' als er geen actieve subscription
// is. checkAuditQuota() telt audits in de huidige kalendermaand via de
// audits_this_month SQL helper.

import { createClient } from '@/lib/supabase/server';

export type Plan = {
  id: string;
  slug: 'free' | 'webshop' | 'agency';
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_interval: 'monthly' | 'yearly';
  audit_quota_per_month: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
};

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'incomplete'
  | 'expired';

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as Plan;
}

export async function getCurrentPlan(userId: string): Promise<{
  plan: Plan;
  status: SubscriptionStatus | 'free';
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}> {
  const supabase = await createClient();

  // Zoek de laatste actieve sub (active of past_due, niet incomplete).
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, cancel_at_period_end, plan:plans(*)')
    .eq('user_id', userId)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sub?.plan) {
    return {
      plan: sub.plan as unknown as Plan,
      status: sub.status as SubscriptionStatus,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
    };
  }

  // Fallback: free plan
  const freePlan = await getPlanBySlug('free');
  if (!freePlan) {
    throw new Error('Free plan ontbreekt in plans-tabel — voer migratie 002 uit.');
  }
  return {
    plan: freePlan,
    status: 'free',
    current_period_end: null,
    cancel_at_period_end: false,
  };
}

export async function checkAuditQuota(userId: string): Promise<{
  ok: boolean;
  used: number;
  quota: number | null;
  planSlug: string;
}> {
  const { plan } = await getCurrentPlan(userId);

  if (plan.audit_quota_per_month === null) {
    return { ok: true, used: 0, quota: null, planSlug: plan.slug };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('audits_this_month', { p_user_id: userId });
  if (error) {
    console.error('[billing] audits_this_month RPC failed:', error);
    // Fail-open: laat audit door als we de teller niet kunnen lezen, anders
    // breken we functionaliteit bij DB-storingen. Logged voor diagnose.
    return { ok: true, used: 0, quota: plan.audit_quota_per_month, planSlug: plan.slug };
  }

  const used = typeof data === 'number' ? data : 0;
  return {
    ok: used < plan.audit_quota_per_month,
    used,
    quota: plan.audit_quota_per_month,
    planSlug: plan.slug,
  };
}
