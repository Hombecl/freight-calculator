/**
 * plans.ts — saved load plans (Tier 1 data gravity; see ENTERPRISE.md §3).
 *
 * ⛔ DATA LOCATION: DimPack3D shares the commerce-ops SG Supabase project
 * (iaglkklgzykowzqgphym) TEMPORARILY. Every DimPack3D table uses the `dp_`
 * prefix — this module touches `dp_plans` only. Full map: DATA.md.
 */

import { supabase } from './supabaseClient';
import type { PlannerBox } from './plannerBox';
import type { PackItemSpec, PackContainer, PackStats } from './binPacking';

export type PlanStatus = 'draft' | 'pending_review' | 'approved' | 'changes_requested';

export interface SavedPlan {
  id: string;
  name: string;
  status: PlanStatus;
  container_key: string;
  container: PackContainer;
  specs: PackItemSpec[];
  boxes: PlannerBox[];
  stats: Pick<PackStats, 'volumeUtil' | 'totalWeight' | 'placedCount'> & Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlanEvent {
  action: string;
  actor_email: string | null;
  note: string | null;
  at: string;
}

export async function savePlan(plan: {
  name: string;
  container_key: string;
  container: PackContainer;
  specs: PackItemSpec[];
  boxes: PlannerBox[];
  stats: SavedPlan['stats'];
}): Promise<{ id: string | null; error: string | null }> {
  if (!supabase) return { id: null, error: 'Accounts are not configured' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, error: 'Sign in first' };
  const { data, error } = await supabase
    .from('dp_plans')
    .insert({ ...plan, user_id: user.id })
    .select('id')
    .single();
  if (data?.id) {
    // audit trail: creation event (owner-insert policy)
    await supabase.from('dp_plan_events').insert({
      plan_id: data.id, actor_id: user.id, actor_email: user.email, action: 'created',
    });
  }
  return { id: data?.id ?? null, error: error?.message ?? null };
}

const PLAN_COLS = 'id, name, status, container_key, container, specs, boxes, stats, created_at, updated_at';

export async function listPlans(): Promise<SavedPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dp_plans')
    .select(PLAN_COLS)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []) as unknown as SavedPlan[];
}

export async function getPlan(id: string): Promise<SavedPlan | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dp_plans')
    .select(PLAN_COLS)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as SavedPlan;
}

/** Owner: submit for review → returns the review link token. */
export async function submitForReview(id: string): Promise<{ token: string | null; error: string | null }> {
  if (!supabase) return { token: null, error: 'not configured' };
  const { data, error } = await supabase.rpc('dp_submit_for_review', { p_plan: id });
  return { token: (data as string) ?? null, error: error?.message ?? null };
}

/** Anyone with the link: read plan + audit trail (view-only). */
export async function getPlanForReview(id: string, token: string): Promise<(SavedPlan & { events: PlanEvent[] }) | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('dp_get_plan_for_review', { p_plan: id, p_token: token });
  if (error || !data) return null;
  return data as unknown as SavedPlan & { events: PlanEvent[] };
}

/** Signed-in reviewer: approve / request changes / comment (identity recorded). */
export async function reviewAction(
  id: string, token: string, action: 'approved' | 'changes_requested' | 'comment', note: string,
): Promise<string | null> {
  if (!supabase) return 'not configured';
  const { error } = await supabase.rpc('dp_review_action', { p_plan: id, p_token: token, p_action: action, p_note: note });
  return error?.message ?? null;
}

/** Owner: audit trail for own plan. */
export async function getPlanEvents(id: string): Promise<PlanEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dp_plan_events')
    .select('action, actor_email, note, created_at')
    .eq('plan_id', id)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map((e: any) => ({ action: e.action, actor_email: e.actor_email, note: e.note, at: e.created_at }));
}

export async function deletePlan(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('dp_plans').delete().eq('id', id);
  return !error;
}
