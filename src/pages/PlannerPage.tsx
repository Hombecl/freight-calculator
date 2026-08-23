import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Download, FileText, Share2, Check, Save } from 'lucide-react';
import { IS_ZH } from '../lib/locale';
import { savePlan, getPlan } from '../lib/plans';
import ImportModal from '../components/ImportModal';
import InteractiveLoadPlanner, { PlannerBox } from '../components/InteractiveLoadPlanner';
import { packWithConstraints, computeStats, type PackItemSpec } from '../lib/binPacking';
import { axleLoads, mckeeSafeLoad, palletOverhang, heavyOverLight, cogHeight, loadVoids, type AxleConfig } from '../lib/realism';
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

// Vessels: sea containers, road trailers and pallets — one engine serves all.
// door = the aperture cargo must PASS THROUGH — smaller than the interior
// (ISO door ≈ 234×228, high-cube 234×258). Tools that skip this let you plan
// loads that physically cannot enter the box.
const CONTAINERS = {
  '20gp': { label: "20' GP", l: 589, w: 235, h: 239, maxWeight: 28200, group: 'Containers', door: { w: 234, h: 228 }, tare: 2300 },
  '40gp': { label: "40' GP", l: 1203, w: 235, h: 239, maxWeight: 26700, group: 'Containers', door: { w: 234, h: 228 }, tare: 3750 },
  '40hq': { label: "40' HQ", l: 1203, w: 235, h: 269, maxWeight: 26500, group: 'Containers', door: { w: 234, h: 258 }, tare: 3900 },
  '53ft': { label: "53' trailer", l: 1602, w: 254, h: 269, maxWeight: 20000, group: 'Trucks', door: { w: 254, h: 269 }, axles: { frontPos: 90, rearPos: 1450, frontLimit: 13600, rearLimit: 15400 } as AxleConfig },
  'eusemi': { label: 'EU 13.6m', l: 1360, w: 245, h: 270, maxWeight: 24000, group: 'Trucks', door: { w: 245, h: 270 }, axles: { frontPos: 120, rearPos: 1050, frontLimit: 12000, rearLimit: 24000 } as AxleConfig },
  'eurpal': { label: 'EUR pallet', l: 120, w: 80, h: 165, maxWeight: 1500, group: 'Pallets', door: null },
  'gmapal': { label: 'GMA 48×40"', l: 122, w: 102, h: 152, maxWeight: 1134, group: 'Pallets', door: null },
  // Amazon FBA LTL: 40×48 GMA, 72" total incl ~15 cm pallet → 167 cm cargo,
  // 1,500 lb (680 kg), zero overhang — Amazon rejects overhanging pallets
  'fbapal': { label: 'FBA pallet', l: 122, w: 102, h: 167, maxWeight: 680, group: 'Pallets', door: null },
} as const;

/**
 * Can this carton pass through the door in ANY allowed orientation? Moving
 * along the container axis, its cross-section (two of its dims) must fit the
 * door aperture. keepUpright pins the h-dimension vertical.
 */
function fitsDoor(s: Spec, door: { w: number; h: number } | null): boolean {
  if (!door) return true; // pallets are open — no aperture
  const dims = [s.l, s.w, s.h];
  if (s.keepUpright) return Math.min(s.l, s.w) <= door.w && s.h <= door.h;
  for (let vert = 0; vert < 3; vert++) {
    for (let across = 0; across < 3; across++) {
      if (across === vert) continue;
      if (dims[across] <= door.w && dims[vert] <= door.h) return true;
    }
  }
  return false;
}
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
  pallet: {
    container: 'gmapal',
    specs: [
      { id: 'c1', label: 'Case 40×30×25', l: 40, w: 30, h: 25, weight: 12, qty: 45, color: PALETTE[0] },
      { id: 'c2', label: 'Case 30×25×20', l: 30, w: 25, h: 20, weight: 8, qty: 18, color: PALETTE[1] },
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
  // pallets may allow a small overhang per side — standard practice, but it
  // cuts carton compression strength ~30%, so we pack it AND warn about it
  const [overhangCm, setOverhangCm] = useState(0);
  const packSpace = useMemo(() => {
    // FBA locks overhang to zero — Amazon rejects overhanging pallets outright
    const ov = container.group === 'Pallets' && containerKey !== 'fbapal' ? overhangCm : 0;
    return ov > 0 ? { ...container, l: container.l + 2 * ov, w: container.w + 2 * ov } : container;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, overhangCm, containerKey]);

  const result = useMemo(
    () => packWithConstraints(packSpace, specs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerKey, seed, packSpace],
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
  const shownBoxes = liveBoxes ?? sharedBoxes ?? result.boxes;
  const axles = useMemo(
    () => ('axles' in container && container.axles ? axleLoads(shownBoxes as (PlannerBox & { weight?: number })[], container.axles) : null),
    [shownBoxes, container],
  );
  const overhang = useMemo(
    () => (container.group === 'Pallets' ? palletOverhang(shownBoxes, { l: container.l, w: container.w }) : null),
    [shownBoxes, container],
  );
  const voids = useMemo(
    () => (container.group !== 'Pallets' ? loadVoids(shownBoxes, packSpace) : null),
    [shownBoxes, container, packSpace],
  );
  const voidWarn = voids != null && (voids.doorSlack > 15 || voids.biggestGap > 15);
  const stackWarn = useMemo(() => heavyOverLight(shownBoxes as (PlannerBox & { weight?: number })[]), [shownBoxes]);
  const cogH = useMemo(() => cogHeight(shownBoxes as (PlannerBox & { weight?: number })[]), [shownBoxes]);
  const topHeavy = cogH != null && cogH.pct > 55;
  // real-world check other tools skip: the door aperture is SMALLER than the interior
  const doorBlocked = useMemo(
    () => specs.filter((s) => s.qty > 0 && !fitsDoor(s, CONTAINERS[containerKey].door)),
    [specs, containerKey],
  );

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

  // ---- Excel/CSV import (Tier 2 switching-cost killer — ENTERPRISE.md §4) ----
  const [importOpen, setImportOpen] = useState(false);
  const onImport = (imported: Spec[]) => {
    setSpecs(imported);
    track('import_cartons', String(imported.length));
    regen();
  };

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
        else setSeed((n) => n + 1); // specs without boxes: repack for the new specs
        track('share_open');
      } catch { /* leave defaults */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  // ---- save to account (Tier 1 data gravity — see ENTERPRISE.md) ----
  const [saveState, setSaveState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');
  const savedId = params.get('saved');

  useEffect(() => {
    if (!savedId) return;
    (async () => {
      const plan = await getPlan(savedId);
      if (!plan) return;
      if (CONTAINERS[plan.container_key as ContainerKey]) setContainerKey(plan.container_key as ContainerKey);
      if (plan.specs?.length) setSpecs(plan.specs);
      if (plan.boxes?.length) setSharedBoxes(plan.boxes);
      else setSeed((n) => n + 1); // specs without boxes: repack for the new specs
      track('saved_open');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedId]);

  const saveToAccount = async () => {
    const name = window.prompt('Plan name:', `${container.label} · ${new Date().toLocaleDateString()}`);
    if (!name) return;
    setSaveState('busy');
    const { error } = await savePlan({
      name,
      container_key: containerKey,
      container,
      specs,
      boxes: currentBoxes,
      stats: { volumeUtil: stats.volumeUtil, totalWeight: stats.totalWeight, placedCount: stats.placedCount },
    });
    if (error) {
      setSaveState('error');
    } else {
      track('plan_saved');
      setSaveState('saved');
    }
    setTimeout(() => setSaveState('idle'), 2500);
  };

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
        {/* Intent split (2026-08-23): the homepage owned "3d packing simulator" at
            pos 1-2 until this page's title was exact-matched to the same query in
            137b419 — after which BOTH pages ranked (7.4 / 13.6) and clicks went to
            zero. This page now targets its own cluster: "3d load planner",
            "container loading simulator", "load plan". Do not re-add
            "packing simulator" here; that phrase belongs to the homepage. */}
        <title>3D Load Planner — container loading simulator, drag & stack, free | DimPack3D</title>
        <meta
          name="description"
          content="Interactive 3D load planner for containers, trucks and pallets. Auto-arrange with real bin-packing (weight & stack limits), then drag, rotate and stack cartons by hand. Free, no signup."
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
            {(['Containers', 'Trucks', 'Pallets'] as const).map((g) => (
              <div key={g} className="flex gap-1 mb-1 items-center">
                <span className="w-16 shrink-0 text-[10px] uppercase text-slate-400">{g}</span>
                {(Object.keys(CONTAINERS) as ContainerKey[]).filter((k) => CONTAINERS[k].group === g).map((k) => (
                  <button
                    key={k}
                    onClick={() => { setContainerKey(k); setLiveBoxes(null); setSharedBoxes(null); setSeed((n) => n + 1); }}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      containerKey === k ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {CONTAINERS[k].label}
                  </button>
                ))}
              </div>
            ))}
            <p className="text-xs text-slate-400 mt-1">
              {container.l} × {container.w} × {container.h} cm · max {container.maxWeight} kg
            </p>
            {containerKey === 'fbapal' && (
              <p className="text-xs text-amber-600 mt-1">Amazon FBA: 72" total height, 680 kg, zero overhang — allowance locked to none. Amazon rejects hundreds of pallets a day for bad stacking.</p>
            )}
            {container.group === 'Pallets' && containerKey !== 'fbapal' && (
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span>Overhang allowance</span>
                {[0, 2.5, 5].map((ov) => (
                  <button
                    key={ov}
                    onClick={() => { setOverhangCm(ov); setLiveBoxes(null); setSharedBoxes(null); setSeed((n) => n + 1); }}
                    className={`px-2 py-0.5 rounded ${overhangCm === ov ? 'bg-teal-600 text-white' : 'bg-slate-100'}`}
                  >
                    {ov === 0 ? 'none' : `${ov} cm/side`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Carton types (cm / kg)</span>
              <div className="flex gap-3">
                <button onClick={() => { setImportOpen(true); track('import_open'); }} className="text-xs text-emerald-700 font-semibold">
                  ⬆ Import Excel/CSV
                </button>
                <button onClick={addSpec} className="text-xs text-blue-600 font-medium">+ Add</button>
              </div>
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
                  <label className="flex items-center gap-1" title="Crush limit: max total weight resting on ONE carton. 'est.' uses the McKee formula for a single-wall ECT-32 box with safety factor 4 — check your board grade.">
                    Max on top
                    <input
                      type="number"
                      min={0}
                      value={s.maxStack === 0 ? '' : s.maxStack ?? ''}
                      placeholder="∞"
                      disabled={s.maxStack === 0}
                      onChange={(e) => updateSpec(s.id, { maxStack: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })}
                      className="w-14 text-xs px-1 py-0.5 rounded border border-slate-200"
                    />
                    kg
                    <button
                      onClick={() => updateSpec(s.id, { maxStack: Math.round(mckeeSafeLoad(32, s.l, s.w)) })}
                      className="px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px]"
                      title="Estimate from McKee formula (ECT-32 single-wall, SF 4)"
                    >est.</button>
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

          {auth.enabled && (
            auth.userId ? (
              <button
                onClick={saveToAccount}
                disabled={saveState === 'busy'}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  saveState === 'saved'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : saveState === 'error'
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {saveState === 'saved'
                  ? (<><Check size={15} /> Saved — see My Plans</>)
                  : saveState === 'error'
                    ? 'Save failed — try again'
                    : (<><Save size={15} /> {saveState === 'busy' ? 'Saving…' : 'Save to my plans'}</>)}
              </button>
            ) : (
              <p className="text-xs text-slate-400 text-center">
                <Link to="/plans" className="text-blue-600 font-medium">Sign in</Link> to save plans &amp; track utilization over time
              </p>
            )
          )}

          <div className="text-sm text-slate-600 space-y-1 pt-2 border-t border-slate-100">
            {doorBlocked.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-1">
                🚪 <b>Won't fit through the door:</b> {doorBlocked.map((s) => s.label).join(', ')} — the {CONTAINERS[containerKey].label} door aperture is {CONTAINERS[containerKey].door!.w}×{CONTAINERS[containerKey].door!.h} cm (smaller than the interior). Rotate, resize, or allow a different orientation.
              </div>
            )}
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
            {'tare' in container && container.tare != null && (
              <div className="flex justify-between" title="SOLAS Verified Gross Mass = cargo + container tare. Required on shipping docs; misdeclaration is fined.">
                <span>VGM (cargo + {container.tare.toLocaleString()} kg tare)</span>
                <span className="font-semibold">{(stats.totalWeight + container.tare).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</span>
              </div>
            )}
            {topHeavy && cogH && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                ⚠️ <b>Top-heavy load:</b> centre of gravity sits at {cogH.pct.toFixed(0)}% of the load height — braking and cornering work on a long lever. Move heavy cartons to the floor.
              </div>
            )}
            {stackWarn.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                🧱 <b>{stackWarn.length} heavy-on-light stack{stackWarn.length === 1 ? '' : 's'}:</b> a carton ≥25% heavier than the one beneath it crushes goods. Re-order the stack — heavy at the bottom.
              </div>
            )}
            {axles && 'axles' in container && container.axles && (
              <>
                <div className="flex justify-between">
                  <span>Front axle group</span>
                  <span className={`font-semibold ${axles.frontOver ? 'text-red-600' : 'text-green-600'}`}>
                    {(axles.front / 1000).toFixed(1)} t / {(container.axles.frontLimit / 1000).toFixed(1)} t
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rear axle group</span>
                  <span className={`font-semibold ${axles.rearOver ? 'text-red-600' : 'text-green-600'}`}>
                    {(axles.rear / 1000).toFixed(1)} t / {(container.axles.rearLimit / 1000).toFixed(1)} t
                  </span>
                </div>
                {(axles.frontOver || axles.rearOver) && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    ⚖️ <b>Axle overload:</b> weight sits too far {axles.frontOver ? 'forward' : 'back'} — slide heavy cartons toward the {axles.frontOver ? 'rear' : 'front'} and re-check. Typical legal splits shown; verify your rig's plated limits.
                  </div>
                )}
              </>
            )}
            {overhang && overhang.ids.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                📦 <b>{overhang.ids.length} carton{overhang.ids.length === 1 ? '' : 's'} overhang</b> the pallet by up to {overhang.maxCm.toFixed(1)} cm — stretch-wrap tightly; overhang cuts carton compression strength ≈ 30%.
              </div>
            )}
            {voidWarn && voids && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                🚚 <b>Load-shift risk:</b> {voids.doorSlack > 15 ? `${voids.doorSlack.toFixed(0)} cm free run at the door` : ''}{voids.doorSlack > 15 && voids.biggestGap > 15 ? ' + ' : ''}{voids.biggestGap > 15 ? `a ${voids.biggestGap.toFixed(0)} cm gap mid-stow` : ''}. Brace the last rows or fill the gap with dunnage airbags — slack is where cargo slams during braking and sea motion.
              </div>
            )}
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
            container={packSpace}
            boxes={sharedBoxes ?? result.boxes}
            grid={1}
            unitLabel="cm"
            onChange={setLiveBoxes}
            registerSnapshot={(fn) => { snapshotFn.current = fn; }}
          />
        </div>
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport} />

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
