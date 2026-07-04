import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Guarded Supabase client. The app is a static site that works fully WITHOUT a
 * backend (falls back to the client-side lead-capture gate in entitlement.ts).
 * Supabase auth + billing only activate when these env vars are present:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Use a DEDICATED Supabase project for this public app — do not reuse a
 * private/internal database.
 */
const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnabled = Boolean(url && anon);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anon as string)
  : null;
