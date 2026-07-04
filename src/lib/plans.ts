/**
 * plans.ts — saved load plans (Tier 1 data gravity; see ENTERPRISE.md §3).
 *
 * ⛔ DATA LOCATION: DimPack3D shares the commerce-ops SG Supabase project
 * (iaglkklgzykowzqgphym) TEMPORARILY. Every DimPack3D table uses the `dp_`
 * prefix — this module touches `dp_plans` only. Full map: DATA.md.
 */

import { supabase } from './supabaseClient';
import type { PlannerBox } from '../components/InteractiveLoadPlanner';
import type { PackItemSpec, PackContainer, PackStats } from './binPacking';

export interface SavedPlan {
  id: string;
  name: string;
  container_key: string;
  container: PackContainer;
  specs: PackItemSpec[];
  boxes: PlannerBox[];
  stats: Pick<PackStats, 'volumeUtil' | 'totalWeight' | 'placedCount'> & Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
  return { id: data?.id ?? null, error: error?.message ?? null };
}

export async function listPlans(): Promise<SavedPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dp_plans')
    .select('id, name, container_key, container, specs, boxes, stats, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []) as unknown as SavedPlan[];
}

export async function getPlan(id: string): Promise<SavedPlan | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dp_plans')
    .select('id, name, container_key, container, specs, boxes, stats, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as SavedPlan;
}

export async function deletePlan(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('dp_plans').delete().eq('id', id);
  return !error;
}
