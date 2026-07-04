import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabaseClient';
import { fetchSubscription, isActive, checkoutUrl, type Subscription } from '../lib/billing';

export interface AuthState {
  enabled: boolean;
  ready: boolean;
  userId: string | null;
  email: string | null;
  sub: Subscription | null;
  isPro: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  startCheckout: () => void;
  refresh: () => Promise<void>;
}

/** Supabase Auth (magic link) + Lemon Squeezy subscription state. */
export function useAuth(): AuthState {
  const [ready, setReady] = useState(!supabaseEnabled);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setReady(true); return; }
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    setEmail(user?.email ?? null);
    setSub(user ? await fetchSubscription() : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const signInWithEmail = useCallback(async (addr: string) => {
    if (!supabase) return { error: 'Auth not configured' };
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: window.location.href },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setUserId(null); setEmail(null); setSub(null);
  }, []);

  const startCheckout = useCallback(() => {
    if (!userId || !email) return;
    const url = checkoutUrl(userId, email);
    if (url) window.open(url, '_blank');
  }, [userId, email]);

  return {
    enabled: supabaseEnabled,
    ready,
    userId,
    email,
    sub,
    isPro: isActive(sub),
    signInWithEmail,
    signOut,
    startCheckout,
    refresh: load,
  };
}
