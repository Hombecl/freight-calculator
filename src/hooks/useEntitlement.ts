import { useState, useCallback } from 'react';
import {
  readEntitlement, canExport, captureLead, setPlan,
  type Entitlement,
} from '../lib/entitlement';

/** React wrapper over the entitlement store (see entitlement.ts caveats). */
export function useEntitlement() {
  const [ent, setEnt] = useState<Entitlement>(readEntitlement);

  const submitEmail = useCallback((email: string, proWaitlist = false) => {
    setEnt(captureLead(email, { proWaitlist, source: proWaitlist ? 'pro-waitlist' : 'planner-export' }));
  }, []);

  const upgradeLocal = useCallback(() => setEnt(setPlan('pro')), []);

  return {
    ...ent,
    isPro: ent.plan === 'pro',
    canExport: canExport(ent),
    submitEmail,
    upgradeLocal,
  };
}
