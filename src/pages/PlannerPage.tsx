import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Download, FileText, Share2, Check } from 'lucide-react';
import { IS_ZH } from '../lib/locale';
import InteractiveLoadPlanner, { PlannerBox } from '../components/InteractiveLoadPlanner';
import { packWithConstraints, computeStats, type PackItemSpec } from '../lib/binPacking';
import { toPackingCSV, downloadText, openPrintablePlan, type PlanMeta } from '../lib/exportPlan';
import { useEntitlement } from '../hooks/useEntitlement';
import { useAuth } from '../hooks/useAuth';
import PaywallModal from '../components/PaywallModal';
import { track } from '../lib/track';

/**
 * PlannerPage — the interactive load-planning workspace.
 *
 * Seeds an editable 3D plan with the real Extreme-Point bin-packer
 * (src/lib/binPacking.ts), honouring weight + max-stack constraints, then hands
 * control to the user (drag / rotate / stack). Live stats (volume, weight,
 * centre-of-gravity balance) recompute as the plan is edited.
 */

const CONTAINERS = {
  '20gp': { label: "20' GP", l: 589, w: 235, h: 239, maxWeight: 28200 },
  '40gp': { label: "40' GP", l: 1203, w: 235, h: 239, maxWeight: 26700 },
  '40hq': { label: "40' HQ", l: 1203, w: 235, h: 269, maxWeight: 26500 },
} as const;
type ContainerKey = keyof typeof CONTAINERS;

const PALETTE = [0xfbbf24, 0x60a5fa, 0x34d399, 0xf472b6, 0xa78bfa, 0xf87171];

type Spec = PackItemSpec;

// Quantities sized so the default view opens on a genuinely FULL container —
// the first impression must demonstrate high utilization, not an empty box.
const DEFAULT_SPECS: Spec[] = [
  { id: 's1', label: 'Master carton', l: 60, w: 50, h: 45, weight: 18, qty: 140, color: PALETTE[0], unloadOrder: 2 },
  { id: 's2', label: 'Half carton', l: 55, w: 45, h: 40, weight: 12, qty: 70, color: PALETTE[1], unloadOrder: 2 },
  { id: 's3', label: 'Fragile display', l: 45, w: 40, h: 30, weight: 6, qty: 30, color: PALETTE[2], maxStack: 0, unloadOrder: 1 },
];

/** Example scenarios reachable from the homepage via /planner?demo=... */
const PRESETS: Record<string, { container: ContainerKey; specs: Spec[] }> = {
  retail: {
    container: '20gp',
    specs: DEFAULT_SPECS,
  },
  furniture: {
    container: '40hq',
    specs: [
      { id: 'p1', label: 'Sofa boxes (this way up)', l: 200, w: 90, h: 80, weight: 45, qty: 25, color: PALETTE[3], keepUpright: true },
      { id: 'p2', label: 'Flat-pack (this way up)', l: 120, w: 80, h: 15, weight: 32, qty: 80, color: PALETTE[4], keepUpright: true },
      { id: 'p3', label: 'Chair boxes', l: 65, w: 60, h: 55, weight: 14, qty: 60, color: PALETTE[5] },
    ],
  },
  multistop: {
    container: '20gp',
    specs: [
      { id: 'p1', label: 'Stop 3 — deepest', l: 60, w: 50, h: 45, weight: 20, qty: 85, color: PALETTE[0], unloadOrder: 3 },
      { id: 'p2', label: 'Stop 2 — middle', l: 55, w: 45, h: 40, weight: 15, qty: 85, color: PALETTE[1], unloadOrder: 2 },
      { id: 'p3', label: 'Stop 1 — at the door', l: 50, w: 40, h: 35, weight: 10, qty: 95, color: PALETTE[2], unloadOrder: 1 },
    ],
  },
};

export default function PlannerPage() {
  const [params] = useSearchParams();
  const preset = PRESETS[params.get('demo') ?? ''];
  const [containerKey, setContainerKey] = useState<ContainerKey>(preset?.container ?? '20gp');
  const [specs, setSpecs] = useState<Spec[]>(preset?.specs ?? DEFAULT_SPECS);
  const [seed, setSeed] = useState(0); // bump to re-run the packer

  const container = CONTAINERS[containerKey];

  const result = useMemo(
    () => packWithConstraints(container, specs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerKey, seed],
  );

  // live stats reflect manual edits (falls back to the packer's own stats)
  const [liveBoxes, setLiveBoxes] = useState<PlannerBox[] | null>(null);
  // a plan opened from a share link (exact positions as shared)
  const [sharedBoxes, setSharedBoxes] = useState<PlannerBox[] | null>(null);
  const stats = useMemo(() => {
    const effective = liveBoxes ?? sharedBoxes;
    return effective ? computeStats(effective, container) : result.stats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBoxes, sharedBoxes, result, container]);

  const totalQty = specs.reduce((s, x) => s + x.qty, 0);
  const balanceWarn = Math.abs(stats.cogOffsetPct.x) > 15 || Math.abs(stats.cogOffsetPct.z) > 15;

  const updateSpec = (id: string, patch: Partial<Spec>) =>
    setSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSpec = () =>
    setSpecs((prev) => [
      ...prev,
      {
        id: `s${prev.length + 1}-${Date.now()}`,
        label: `Carton ${String.fromCharCode(65 + prev.length)}`,
        l: 40, w: 30, h: 30, weight: 10, qty: 12,
        color: PALETTE[prev.length % PALETTE.length],
      },
    ]);

  const removeSpec = (id: string) => setSpecs((prev) => prev.filter((s) => s.id !== id));

  const regen = () => { setLiveBoxes(null); setSharedBoxes(null); setSeed((n) => n + 1); };

  // ---- share links (free, no gate — sharing is the viral loop) ----
  const [shareState, setShareState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');
  const shareId = params.get('share');

  useEffect(() => {
    if (!shareId) return;
    (async () => {
      try {
        const res = await fetch(`/api/share?id=${shareId}`);
        if (!res.ok) return;
        const plan = await res.json();
        if (plan.containerKey && CONTAINERS[plan.containerKey as ContainerKey]) setContainerKey(plan.containerKey);
        if (Array.isArray(plan.specs) && plan.specs.length) setSpecs(plan.specs);
        if (Array.isArray(plan.boxes) && plan.boxes.length) setSharedBoxes(plan.boxes);
        track('share_open');
      } catch { /* leave defaults */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const sharePlan = async () => {
    setShareState('busy');
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerKey,
          container,
          specs,
          boxes: liveBoxes ?? sharedBoxes ?? result.boxes,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { id } = await res.json();
      const url = `${window.location.origin}${IS_ZH ? '/zh' : ''}/planner?share=${id}`;
      await navigator.clipboard.writeText(url);
      track('share_create');
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2500);
    } catch {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 2500);
    }
  };

  // export
  const snapshotFn = useRef<(() => string | null) | null>(null);
  const currentBoxes = liveBoxes ?? sharedBoxes ?? result.boxes;
  const meta = (): PlanMeta => ({
    title: 'Container Load Plan',
    containerLabel: container.label,
    container,
    unit: 'cm',
    weightUnit: 'kg',
    date: new Date().toLocaleDateString(),
  });
  const runCsv = () => {
    track('export_csv');
    downloadText('load-plan.csv', toPackingCSV(currentBoxes, result.zones, meta()));
  };
  const runPdf = () => {
    track('export_pdf');
    openPrintablePlan({
      meta: meta(),
      stats,
      zones: result.zones,
      boxes: currentBoxes,
      totalRequested: totalQty,
      imageDataUrl: snapshotFn.current?.() ?? null,
    });
  };

  // export gate: secure Pro (Supabase-verified) OR free email lead-capture
  const ent = useEntitlement();
  const auth = useAuth();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const pending = useRef<null | (() => void)>(null);
  const guardExport = (run: () => void) => {
    if (auth.isPro || ent.canExport) { run(); return; }
    pending.current = run;
    setPaywallOpen(true);
  };
  const exportCsv = () => guardExport(runCsv);
  const exportPdf = () => guardExport(runPdf);
  const onUnlock = (email: string, proWaitlist: boolean) => {
    ent.submitEmail(email, proWaitlist);
    setPaywallOpen(false);
    const run = pending.current;
    pending.current = null;
    // entitlement state updates async; run the queued export directly
    if (run) run();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Helmet>
        <title>Interactive 3D Load Planner | DimPack3D</title>
        <meta
          name="description"
          content="Real 3D bin-packing with weight & stacking limits, then drag, rotate and stack cartons by hand in an interactive editor. Free load planning from DimPack3D."
        />
      </Helmet>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Interactive 3D Load Planner</h1>
        <p className="text-slate-500 text-sm mt-1">
          Optimise a container with real bin-packing (weight &amp; stack limits), then fine-tune by hand.
        </p>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* left: inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Container</label>
            <div className="flex gap-1">
              {(Object.keys(CONTAINERS) as ContainerKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => { setContainerKey(k); setLiveBoxes(null); }}
                  className={`flex-1 px-2 py-1.5 rounded text-sm font-medium transition-colors ${
                    containerKey === k ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {CONTAINERS[k].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {container.l} × {container.w} × {container.h} cm · max {container.maxWeight} kg
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Carton types (cm / kg)</span>
              <button onClick={addSpec} className="text-xs text-blue-600 font-medium">+ Add</button>
            </div>
            {specs.map((s) => (
              <div key={s.id} className="p-2 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: `#${s.color.toString(16).padStart(6, '0')}` }} />
                  <input
                    value={s.label}
                    onChange={(e) => updateSpec(s.id, { label: e.target.value })}
                    className="flex-1 text-sm font-medium bg-transparent outline-none"
                  />
                  <button onClick={() => removeSpec(s.id)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(['l', 'w', 'h', 'weight', 'qty'] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-[10px] uppercase text-slate-400">{k === 'weight' ? 'kg' : k}</label>
                      <input
                        type="number"
                        min={k === 'weight' ? 0 : 1}
                        value={s[k] as number}
                        onChange={(e) => updateSpec(s.id, { [k]: Math.max(k === 'weight' ? 0 : 1, Number(e.target.value) || 0) })}
                        className="w-full text-sm px-1 py-0.5 rounded border border-slate-200"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={s.maxStack === 0}
                      onChange={(e) => updateSpec(s.id, { maxStack: e.target.checked ? 0 : undefined })}
                    />
                    Fragile (no stack on top)
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!s.keepUpright}
                      onChange={(e) => updateSpec(s.id, { keepUpright: e.target.checked })}
                    />
                    This way up
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Group</label>
                    <input
                      value={s.group ?? ''}
                      placeholder="(keep together)"
                      onChange={(e) => updateSpec(s.id, { group: e.target.value || undefined })}
                      className="w-full text-sm px-1 py-0.5 rounded border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Unload # (1=door)</label>
                    <input
                      type="number"
                      min={1}
                      value={s.unloadOrder ?? ''}
                      placeholder="—"
                      onChange={(e) => updateSpec(s.id, { unloadOrder: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })}
                      className="w-full text-sm px-1 py-0.5 rounded border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={regen}
            className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
          >
            Optimise pack
          </button>

          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
            >
              <Download size={15} /> CSV
            </button>
            <button
              onClick={exportPdf}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900"
            >
              <FileText size={15} /> PDF plan
            </button>
          </div>

          <button
            onClick={sharePlan}
            disabled={shareState === 'busy'}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
              shareState === 'copied'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : shareState === 'error'
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            {shareState === 'copied'
              ? (<><Check size={15} /> Link copied — send it to anyone</>)
              : shareState === 'error'
                ? 'Could not create link — try again'
                : (<><Share2 size={15} /> {shareState === 'busy' ? 'Creating link…' : 'Share this plan'}</>)}
          </button>

          <div className="text-sm text-slate-600 space-y-1 pt-2 border-t border-slate-100">
            <div className="flex justify-between"><span>Packed</span><span className="font-semibold">{result.boxes.length} / {totalQty}</span></div>
            <div className="flex justify-between"><span>Volume utilization</span><span className="font-semibold">{stats.volumeUtil.toFixed(1)}%</span></div>
            <div className="flex justify-between">
              <span>Total weight</span>
              <span className="font-semibold">
                {stats.totalWeight.toFixed(0)} kg
                {stats.weightUtil != null && <span className="text-slate-400"> ({stats.weightUtil.toFixed(0)}%)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span>CoG balance</span>
              <span className={`font-semibold ${balanceWarn ? 'text-amber-600' : 'text-green-600'}`}>
                {balanceWarn ? 'Off-centre' : 'Balanced'} ({stats.cogOffsetPct.x >= 0 ? '+' : ''}{stats.cogOffsetPct.x.toFixed(0)}%, {stats.cogOffsetPct.z >= 0 ? '+' : ''}{stats.cogOffsetPct.z.toFixed(0)}%)
              </span>
            </div>
            {result.zones.length > 1 && (
              <div className="pt-1">
                <span className="text-xs font-semibold text-slate-500">Load zones (back → door)</span>
                <div className="flex gap-1 mt-1">
                  {[...result.zones].map((z) => (
                    <div
                      key={z.unloadOrder}
                      className="flex-1 text-center text-[10px] py-1 rounded bg-slate-100 text-slate-600"
                      style={{ flexGrow: Math.max(1, z.xEnd - z.xStart) }}
                    >
                      #{z.unloadOrder} · {z.count}
                    </div>
                  ))}
                  <div className="text-[10px] py-1 px-1 rounded bg-green-100 text-green-700 font-semibold self-stretch flex items-center">DOOR</div>
                </div>
              </div>
            )}
            {result.unplaced > 0 && (
              <p className="text-xs text-amber-600">Not everything fits — {result.unplaced} carton(s) left out (volume or weight limit).</p>
            )}
            {stats.weightUtil != null && stats.weightUtil > 100 && (
              <p className="text-xs text-red-600">Over the container payload limit.</p>
            )}
          </div>
        </div>

        {/* right: 3D editor */}
        <div>
          <InteractiveLoadPlanner
            key={`${containerKey}-${seed}-${sharedBoxes ? shareId : ''}`}
            container={container}
            boxes={sharedBoxes ?? result.boxes}
            grid={1}
            unitLabel="cm"
            onChange={setLiveBoxes}
            registerSnapshot={(fn) => { snapshotFn.current = fn; }}
          />
        </div>
      </div>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onSubmit={onUnlock}
        auth={auth.enabled ? {
          enabled: true,
          isSignedIn: !!auth.userId,
          email: auth.email,
          isPro: auth.isPro,
          onSignIn: auth.signInWithEmail,
          onUpgrade: auth.startCheckout,
          onSignOut: auth.signOut,
        } : undefined}
      />
    </div>
  );
}
