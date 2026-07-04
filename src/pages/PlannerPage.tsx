import { useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, FileText } from 'lucide-react';
import InteractiveLoadPlanner, { PlannerBox } from '../components/InteractiveLoadPlanner';
import { packWithConstraints, computeStats, type PackItemSpec } from '../lib/binPacking';
import { toPackingCSV, downloadText, openPrintablePlan, type PlanMeta } from '../lib/exportPlan';

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

const DEFAULT_SPECS: Spec[] = [
  { id: 's1', label: 'Carton A', l: 60, w: 40, h: 40, weight: 18, qty: 40, color: PALETTE[0], unloadOrder: 2 },
  { id: 's2', label: 'Carton B (fragile)', l: 50, w: 30, h: 30, weight: 8, qty: 24, color: PALETTE[1], maxStack: 0, unloadOrder: 1 },
];

export default function PlannerPage() {
  const [containerKey, setContainerKey] = useState<ContainerKey>('20gp');
  const [specs, setSpecs] = useState<Spec[]>(DEFAULT_SPECS);
  const [seed, setSeed] = useState(0); // bump to re-run the packer

  const container = CONTAINERS[containerKey];

  const result = useMemo(
    () => packWithConstraints(container, specs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerKey, seed],
  );

  // live stats reflect manual edits (falls back to the packer's own stats)
  const [liveBoxes, setLiveBoxes] = useState<PlannerBox[] | null>(null);
  const stats = useMemo(
    () => (liveBoxes ? computeStats(liveBoxes, container) : result.stats),
    [liveBoxes, result, container],
  );

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

  const regen = () => { setLiveBoxes(null); setSeed((n) => n + 1); };

  // export
  const snapshotFn = useRef<(() => string | null) | null>(null);
  const currentBoxes = liveBoxes ?? result.boxes;
  const meta = (): PlanMeta => ({
    title: 'Container Load Plan',
    containerLabel: container.label,
    container,
    unit: 'cm',
    weightUnit: 'kg',
    date: new Date().toLocaleDateString(),
  });
  const exportCsv = () =>
    downloadText('load-plan.csv', toPackingCSV(currentBoxes, result.zones, meta()));
  const exportPdf = () =>
    openPrintablePlan({
      meta: meta(),
      stats,
      zones: result.zones,
      boxes: currentBoxes,
      totalRequested: totalQty,
      imageDataUrl: snapshotFn.current?.() ?? null,
    });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Helmet>
        <title>Interactive 3D Load Planner | DimPack3D</title>
        <meta
          name="description"
          content="Real 3D bin-packing with weight & stacking limits, then drag, rotate and stack cartons by hand in an interactive editor. Free load planning from DimPack3D."
        />
        <link rel="canonical" href="https://www.dimpack3d.com/planner" />
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
            key={`${containerKey}-${seed}`}
            container={container}
            boxes={result.boxes}
            grid={1}
            unitLabel="cm"
            onChange={setLiveBoxes}
            registerSnapshot={(fn) => { snapshotFn.current = fn; }}
          />
        </div>
      </div>
    </div>
  );
}
